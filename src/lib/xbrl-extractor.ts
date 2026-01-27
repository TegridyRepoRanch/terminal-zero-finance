// XBRL Extractor - Orchestrates XBRL parsing and AI extraction
// Uses XBRL data when available, falls back to AI for missing fields

import { parseXBRL, detectIXBRL } from './xbrl-parser';
import { mapXBRLToFinancials } from './xbrl-concept-mapper';
import type { ExtractedFinancials, ExtractionConfidence, ExtractionWarning, LLMExtractionResponse } from './extraction-types';

export type ExtractionSource = 'xbrl' | 'ai' | 'hybrid';

export interface XBRLExtractionResult {
  source: ExtractionSource;
  financials: ExtractedFinancials;
  confidence: ExtractionConfidence;
  warnings: ExtractionWarning[];
  xbrlFieldsUsed: string[];
  aiFieldsUsed: string[];
  xbrlDataPointCount: number;
  xbrlContextCount: number;
}

// Default confidence scores for XBRL-extracted data (always high)
const XBRL_FIELD_CONFIDENCE = 95;

// Minimum confidence threshold to use XBRL as primary source
// Lower threshold (40%) to accept partial XBRL data and reduce AI fallback timeouts
const XBRL_MIN_CONFIDENCE = 0.4;

// Fields that MUST be found for XBRL to be usable
// Only require revenue - totalAssets often uses different XBRL concepts
const REQUIRED_XBRL_FIELDS = ['revenue'];

/**
 * Try to extract financials from XBRL data in HTML
 * Returns null if XBRL extraction fails or has insufficient data
 */
export function tryExtractFromXBRL(
  rawHtml: string,
  filingType: '10-K' | '10-Q',
  onProgress?: (message: string) => void
): XBRLExtractionResult | null {
  // Check if document has XBRL
  if (!detectIXBRL(rawHtml)) {
    console.log('[XBRL Extractor] No iXBRL detected in document');
    return null;
  }

  onProgress?.('Parsing iXBRL structured data...');

  // Parse XBRL
  const parseResult = parseXBRL(rawHtml);

  if (!parseResult.hasXBRL || parseResult.dataPoints.length === 0) {
    console.log('[XBRL Extractor] No XBRL data points found');
    return null;
  }

  console.log(`[XBRL Extractor] Found ${parseResult.dataPoints.length} data points, ${parseResult.contexts.size} contexts`);

  // Map to financials
  const mapped = mapXBRLToFinancials(
    parseResult.dataPoints,
    parseResult.contexts,
    filingType,
    parseResult.companyName,
    parseResult.ticker
  );

  // Check if we have required fields
  const fieldsFoundAsStrings = mapped.fieldsFound as string[];
  const hasRequiredFields = REQUIRED_XBRL_FIELDS.every(
    field => fieldsFoundAsStrings.includes(field)
  );

  if (!hasRequiredFields) {
    console.log('[XBRL Extractor] Missing required fields:', REQUIRED_XBRL_FIELDS.filter(
      f => !fieldsFoundAsStrings.includes(f)
    ));
    return null;
  }

  // Check confidence threshold
  if (mapped.confidence < XBRL_MIN_CONFIDENCE) {
    console.log(`[XBRL Extractor] Confidence ${mapped.confidence} below threshold ${XBRL_MIN_CONFIDENCE}`);
    return null;
  }

  onProgress?.(`Extracted ${mapped.fieldsFound.length} fields from iXBRL (${Math.round(mapped.confidence * 100)}% confidence)`);

  // Build confidence scores - XBRL fields get high confidence
  const confidence = buildXBRLConfidence(mapped.fieldsFound, mapped.confidence);

  // Build warnings for missing fields
  const warnings: ExtractionWarning[] = [];
  if (mapped.fieldsNotFound.length > 0) {
    warnings.push({
      field: 'coverage',
      message: `XBRL data missing ${mapped.fieldsNotFound.length} fields: ${mapped.fieldsNotFound.slice(0, 5).join(', ')}${mapped.fieldsNotFound.length > 5 ? '...' : ''}`,
      severity: mapped.fieldsNotFound.length > 10 ? 'medium' : 'low',
    });
  }

  // Fill in missing required fields with defaults
  const financials = fillMissingDefaults(mapped.data);

  return {
    source: 'xbrl',
    financials,
    confidence,
    warnings,
    xbrlFieldsUsed: mapped.fieldsFound,
    aiFieldsUsed: [],
    xbrlDataPointCount: parseResult.dataPoints.length,
    xbrlContextCount: parseResult.contexts.size,
  };
}

/**
 * Merge XBRL extraction with AI extraction
 * XBRL data takes priority, AI fills gaps
 */
export function mergeXBRLWithAI(
  xbrlResult: XBRLExtractionResult,
  aiResult: LLMExtractionResponse,
  onProgress?: (message: string) => void
): XBRLExtractionResult {
  onProgress?.('Merging XBRL data with AI extraction...');

  const mergedFinancials = { ...xbrlResult.financials };
  const aiFieldsUsed: string[] = [];

  // Fill missing fields from AI
  const numericFields = [
    'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
    'sgaExpense', 'rdExpense', 'depreciationAmortization', 'operatingIncome',
    'interestExpense', 'incomeBeforeTax', 'incomeTaxExpense', 'netIncome',
    'totalCurrentAssets', 'accountsReceivable', 'inventory', 'totalAssets',
    'propertyPlantEquipment', 'totalCurrentLiabilities', 'accountsPayable',
    'totalDebt', 'shortTermDebt', 'longTermDebt', 'totalLiabilities',
    'totalEquity', 'retainedEarnings', 'cashAndEquivalents',
    'sharesOutstandingBasic', 'sharesOutstandingDiluted', 'priorYearRevenue',
  ];

  for (const field of numericFields) {
    const mergedRecord = mergedFinancials as unknown as Record<string, unknown>;
    const aiRecord = aiResult.financials as unknown as Record<string, unknown>;
    const xbrlValue = mergedRecord[field];
    const aiValue = aiRecord[field];

    // If XBRL doesn't have the value, use AI value
    if (xbrlValue === undefined || xbrlValue === null || xbrlValue === 0) {
      if (aiValue !== undefined && aiValue !== null) {
        mergedRecord[field] = aiValue;
        aiFieldsUsed.push(field);
      }
    }
  }

  // Also copy non-numeric fields from AI if missing
  if (!mergedFinancials.companyName || mergedFinancials.companyName === 'Unknown Company') {
    mergedFinancials.companyName = aiResult.financials.companyName;
  }
  if (!mergedFinancials.ticker) {
    mergedFinancials.ticker = aiResult.financials.ticker;
  }
  if (!mergedFinancials.fiscalPeriod) {
    mergedFinancials.fiscalPeriod = aiResult.financials.fiscalPeriod;
  }
  if (!mergedFinancials.fiscalYear) {
    mergedFinancials.fiscalYear = aiResult.financials.fiscalYear;
  }

  // Build merged confidence (XBRL fields stay high, AI fields get AI confidence)
  const mergedConfidence = buildMergedConfidence(
    xbrlResult.xbrlFieldsUsed,
    aiFieldsUsed,
    aiResult.confidence
  );

  // Combine warnings
  const warnings = [...xbrlResult.warnings, ...aiResult.warnings];

  // Add note about hybrid extraction
  mergedFinancials.extractionNotes = [
    ...(mergedFinancials.extractionNotes || []),
    `Hybrid extraction: ${xbrlResult.xbrlFieldsUsed.length} fields from iXBRL, ${aiFieldsUsed.length} fields from AI`,
  ];

  console.log(`[XBRL Extractor] Merged: ${xbrlResult.xbrlFieldsUsed.length} XBRL + ${aiFieldsUsed.length} AI fields`);

  return {
    source: 'hybrid',
    financials: mergedFinancials,
    confidence: mergedConfidence,
    warnings,
    xbrlFieldsUsed: xbrlResult.xbrlFieldsUsed,
    aiFieldsUsed,
    xbrlDataPointCount: xbrlResult.xbrlDataPointCount,
    xbrlContextCount: xbrlResult.xbrlContextCount,
  };
}

/**
 * Build confidence scores for XBRL-only extraction
 */
function buildXBRLConfidence(
  fieldsFound: string[],
  overallConfidence: number
): ExtractionConfidence {
  const hasField = (field: string) => fieldsFound.includes(field);

  return {
    companyName: 90,
    revenue: hasField('revenue') ? XBRL_FIELD_CONFIDENCE : 0,
    costOfRevenue: hasField('costOfRevenue') ? XBRL_FIELD_CONFIDENCE : 0,
    operatingExpenses: hasField('operatingExpenses') ? XBRL_FIELD_CONFIDENCE : 0,
    depreciationAmortization: hasField('depreciationAmortization') ? XBRL_FIELD_CONFIDENCE : 0,
    interestExpense: hasField('interestExpense') ? XBRL_FIELD_CONFIDENCE : 0,
    incomeTaxExpense: hasField('incomeTaxExpense') ? XBRL_FIELD_CONFIDENCE : 0,
    accountsReceivable: hasField('accountsReceivable') ? XBRL_FIELD_CONFIDENCE : 0,
    inventory: hasField('inventory') ? XBRL_FIELD_CONFIDENCE : 0,
    accountsPayable: hasField('accountsPayable') ? XBRL_FIELD_CONFIDENCE : 0,
    propertyPlantEquipment: hasField('propertyPlantEquipment') ? XBRL_FIELD_CONFIDENCE : 0,
    totalDebt: hasField('totalDebt') ? XBRL_FIELD_CONFIDENCE : 0,
    sharesOutstanding: hasField('sharesOutstandingBasic') ? XBRL_FIELD_CONFIDENCE : 0,
    overall: Math.round(overallConfidence * 100),
  };
}

/**
 * Build confidence scores for hybrid extraction
 */
function buildMergedConfidence(
  xbrlFields: string[],
  aiFields: string[],
  aiConfidence: ExtractionConfidence
): ExtractionConfidence {
  const getFieldConfidence = (field: string, confidenceKey: keyof ExtractionConfidence): number => {
    if (xbrlFields.includes(field)) {
      return XBRL_FIELD_CONFIDENCE;
    }
    if (aiFields.includes(field)) {
      return aiConfidence[confidenceKey] as number;
    }
    return 0;
  };

  // Calculate overall based on weighted average
  const totalFields = xbrlFields.length + aiFields.length;
  const xbrlWeight = xbrlFields.length / Math.max(totalFields, 1);
  const aiWeight = aiFields.length / Math.max(totalFields, 1);
  const overall = Math.round(
    xbrlWeight * XBRL_FIELD_CONFIDENCE + aiWeight * aiConfidence.overall
  );

  return {
    companyName: 90,
    revenue: getFieldConfidence('revenue', 'revenue'),
    costOfRevenue: getFieldConfidence('costOfRevenue', 'costOfRevenue'),
    operatingExpenses: getFieldConfidence('operatingExpenses', 'operatingExpenses'),
    depreciationAmortization: getFieldConfidence('depreciationAmortization', 'depreciationAmortization'),
    interestExpense: getFieldConfidence('interestExpense', 'interestExpense'),
    incomeTaxExpense: getFieldConfidence('incomeTaxExpense', 'incomeTaxExpense'),
    accountsReceivable: getFieldConfidence('accountsReceivable', 'accountsReceivable'),
    inventory: getFieldConfidence('inventory', 'inventory'),
    accountsPayable: getFieldConfidence('accountsPayable', 'accountsPayable'),
    propertyPlantEquipment: getFieldConfidence('propertyPlantEquipment', 'propertyPlantEquipment'),
    totalDebt: getFieldConfidence('totalDebt', 'totalDebt'),
    sharesOutstanding: getFieldConfidence('sharesOutstandingBasic', 'sharesOutstanding'),
    overall,
  };
}

/**
 * Fill in missing required fields with defaults to satisfy ExtractedFinancials interface
 */
function fillMissingDefaults(data: Partial<ExtractedFinancials>): ExtractedFinancials {
  return {
    // Company info
    companyName: data.companyName || 'Unknown Company',
    ticker: data.ticker || null,
    filingType: data.filingType || 'unknown',
    fiscalYear: data.fiscalYear || new Date().getFullYear(),
    fiscalPeriod: data.fiscalPeriod || 'Unknown',

    // Income statement
    revenue: data.revenue || 0,
    costOfRevenue: data.costOfRevenue || 0,
    grossProfit: data.grossProfit || 0,
    operatingExpenses: data.operatingExpenses || 0,
    sgaExpense: data.sgaExpense ?? null,
    rdExpense: data.rdExpense ?? null,
    depreciationAmortization: data.depreciationAmortization || 0,
    operatingIncome: data.operatingIncome || 0,
    interestExpense: data.interestExpense || 0,
    incomeBeforeTax: data.incomeBeforeTax || 0,
    incomeTaxExpense: data.incomeTaxExpense || 0,
    netIncome: data.netIncome || 0,

    // Balance sheet
    totalCurrentAssets: data.totalCurrentAssets || 0,
    accountsReceivable: data.accountsReceivable || 0,
    inventory: data.inventory || 0,
    totalAssets: data.totalAssets || 0,
    propertyPlantEquipment: data.propertyPlantEquipment || 0,
    totalCurrentLiabilities: data.totalCurrentLiabilities || 0,
    accountsPayable: data.accountsPayable || 0,
    totalDebt: data.totalDebt || 0,
    shortTermDebt: data.shortTermDebt || 0,
    longTermDebt: data.longTermDebt || 0,
    totalLiabilities: data.totalLiabilities || 0,
    totalEquity: data.totalEquity || 0,
    retainedEarnings: data.retainedEarnings || 0,
    cashAndEquivalents: data.cashAndEquivalents || 0,

    // Shares
    sharesOutstandingBasic: data.sharesOutstandingBasic || 0,
    sharesOutstandingDiluted: data.sharesOutstandingDiluted || 0,

    // Historical
    priorYearRevenue: data.priorYearRevenue ?? null,

    // Cash Flow
    operatingCashFlow: data.operatingCashFlow ?? null,
    capitalExpenditures: data.capitalExpenditures ?? null,
    freeCashFlow: data.freeCashFlow ?? null,

    // Notes
    extractionNotes: data.extractionNotes || [],
  };
}

/**
 * Convert AI extraction result to match XBRL result format
 */
export function wrapAIResult(aiResult: LLMExtractionResponse): XBRLExtractionResult {
  const financialsRecord = aiResult.financials as unknown as Record<string, unknown>;
  return {
    source: 'ai',
    financials: aiResult.financials,
    confidence: aiResult.confidence,
    warnings: aiResult.warnings,
    xbrlFieldsUsed: [],
    aiFieldsUsed: Object.keys(aiResult.financials).filter(k =>
      typeof financialsRecord[k] === 'number'
    ),
    xbrlDataPointCount: 0,
    xbrlContextCount: 0,
  };
}
