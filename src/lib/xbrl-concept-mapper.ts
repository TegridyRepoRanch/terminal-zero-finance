// XBRL Concept Mapper - Maps US-GAAP XBRL concepts to ExtractedFinancials fields
// US-GAAP taxonomy has many alternative concepts for the same financial item

import type { ExtractedFinancials } from './extraction-types';
import type { XBRLDataPoint, XBRLContext } from './xbrl-parser';
import {
  findCurrentPeriodContext,
  findBalanceSheetContext,
  findPriorPeriodContext,
  getDataPointsForContext,
} from './xbrl-parser';

// Type for the numeric fields we can map from XBRL
type NumericFinancialField = keyof Pick<ExtractedFinancials,
  | 'revenue' | 'costOfRevenue' | 'grossProfit' | 'operatingExpenses'
  | 'sgaExpense' | 'rdExpense' | 'depreciationAmortization' | 'operatingIncome'
  | 'interestExpense' | 'incomeBeforeTax' | 'incomeTaxExpense' | 'netIncome'
  | 'totalCurrentAssets' | 'accountsReceivable' | 'inventory' | 'totalAssets'
  | 'propertyPlantEquipment' | 'totalCurrentLiabilities' | 'accountsPayable'
  | 'totalDebt' | 'shortTermDebt' | 'longTermDebt' | 'totalLiabilities'
  | 'totalEquity' | 'retainedEarnings' | 'cashAndEquivalents'
  | 'sharesOutstandingBasic' | 'sharesOutstandingDiluted' | 'priorYearRevenue'
  | 'capitalExpenditures' | 'operatingCashFlow' | 'freeCashFlow'
>;

// Primary US-GAAP concept mappings (most common variants)
export const USGAAP_CONCEPT_MAP: Record<string, NumericFinancialField> = {
  // === INCOME STATEMENT - REVENUE ===
  'us-gaap:Revenues': 'revenue',
  'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax': 'revenue',
  'us-gaap:SalesRevenueNet': 'revenue',
  'us-gaap:SalesRevenueGoodsNet': 'revenue',
  'us-gaap:SalesRevenueServicesNet': 'revenue',
  'us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax': 'revenue',

  // === INCOME STATEMENT - COST OF REVENUE ===
  'us-gaap:CostOfRevenue': 'costOfRevenue',
  'us-gaap:CostOfGoodsAndServicesSold': 'costOfRevenue',
  'us-gaap:CostOfGoodsSold': 'costOfRevenue',
  'us-gaap:CostOfServices': 'costOfRevenue',

  // === INCOME STATEMENT - GROSS PROFIT ===
  'us-gaap:GrossProfit': 'grossProfit',

  // === INCOME STATEMENT - OPERATING EXPENSES ===
  'us-gaap:OperatingExpenses': 'operatingExpenses',
  'us-gaap:CostsAndExpenses': 'operatingExpenses',

  // === INCOME STATEMENT - SG&A ===
  'us-gaap:SellingGeneralAndAdministrativeExpense': 'sgaExpense',
  'us-gaap:GeneralAndAdministrativeExpense': 'sgaExpense',
  'us-gaap:SellingAndMarketingExpense': 'sgaExpense',

  // === INCOME STATEMENT - R&D ===
  'us-gaap:ResearchAndDevelopmentExpense': 'rdExpense',
  'us-gaap:ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost': 'rdExpense',

  // === INCOME STATEMENT - DEPRECIATION & AMORTIZATION ===
  'us-gaap:DepreciationDepletionAndAmortization': 'depreciationAmortization',
  'us-gaap:Depreciation': 'depreciationAmortization',
  'us-gaap:DepreciationAndAmortization': 'depreciationAmortization',
  'us-gaap:DepreciationAmortizationAndAccretionNet': 'depreciationAmortization',

  // === INCOME STATEMENT - OPERATING INCOME ===
  'us-gaap:OperatingIncomeLoss': 'operatingIncome',
  'us-gaap:IncomeLossFromOperations': 'operatingIncome',

  // === INCOME STATEMENT - INTEREST EXPENSE ===
  'us-gaap:InterestExpense': 'interestExpense',
  'us-gaap:InterestExpenseDebt': 'interestExpense',
  'us-gaap:InterestAndDebtExpense': 'interestExpense',

  // === INCOME STATEMENT - INCOME BEFORE TAX ===
  'us-gaap:IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest': 'incomeBeforeTax',
  'us-gaap:IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments': 'incomeBeforeTax',
  'us-gaap:IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic': 'incomeBeforeTax',

  // === INCOME STATEMENT - TAX EXPENSE ===
  'us-gaap:IncomeTaxExpenseBenefit': 'incomeTaxExpense',
  'us-gaap:IncomeTaxesPaidNet': 'incomeTaxExpense',

  // === INCOME STATEMENT - NET INCOME ===
  'us-gaap:NetIncomeLoss': 'netIncome',
  'us-gaap:ProfitLoss': 'netIncome',
  'us-gaap:NetIncomeLossAvailableToCommonStockholdersBasic': 'netIncome',
  'us-gaap:NetIncomeLossAttributableToParent': 'netIncome',

  // === BALANCE SHEET - CURRENT ASSETS ===
  'us-gaap:AssetsCurrent': 'totalCurrentAssets',

  // === BALANCE SHEET - CASH ===
  'us-gaap:CashAndCashEquivalentsAtCarryingValue': 'cashAndEquivalents',
  'us-gaap:CashCashEquivalentsAndShortTermInvestments': 'cashAndEquivalents',
  'us-gaap:Cash': 'cashAndEquivalents',

  // === BALANCE SHEET - RECEIVABLES ===
  'us-gaap:AccountsReceivableNetCurrent': 'accountsReceivable',
  'us-gaap:ReceivablesNetCurrent': 'accountsReceivable',
  'us-gaap:AccountsReceivableNet': 'accountsReceivable',

  // === BALANCE SHEET - INVENTORY ===
  'us-gaap:InventoryNet': 'inventory',
  'us-gaap:InventoryFinishedGoodsNetOfReserves': 'inventory',

  // === BALANCE SHEET - TOTAL ASSETS ===
  'us-gaap:Assets': 'totalAssets',

  // === BALANCE SHEET - PP&E ===
  'us-gaap:PropertyPlantAndEquipmentNet': 'propertyPlantEquipment',
  'us-gaap:PropertyPlantAndEquipmentGross': 'propertyPlantEquipment',

  // === BALANCE SHEET - CURRENT LIABILITIES ===
  'us-gaap:LiabilitiesCurrent': 'totalCurrentLiabilities',

  // === BALANCE SHEET - ACCOUNTS PAYABLE ===
  'us-gaap:AccountsPayableCurrent': 'accountsPayable',
  'us-gaap:AccountsPayableAndAccruedLiabilitiesCurrent': 'accountsPayable',

  // === BALANCE SHEET - TOTAL LIABILITIES ===
  'us-gaap:Liabilities': 'totalLiabilities',
  // Note: LiabilitiesAndStockholdersEquity = total liabilities + equity, not mapped directly

  // === BALANCE SHEET - DEBT ===
  'us-gaap:ShortTermBorrowings': 'shortTermDebt',
  'us-gaap:DebtCurrent': 'shortTermDebt',
  'us-gaap:LongTermDebt': 'longTermDebt',
  'us-gaap:LongTermDebtNoncurrent': 'longTermDebt',
  'us-gaap:LongTermDebtAndCapitalLeaseObligations': 'longTermDebt',
  'us-gaap:DebtLongtermAndShorttermCombinedAmount': 'totalDebt',

  // === BALANCE SHEET - EQUITY ===
  'us-gaap:StockholdersEquity': 'totalEquity',
  'us-gaap:StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest': 'totalEquity',

  // === BALANCE SHEET - RETAINED EARNINGS ===
  'us-gaap:RetainedEarningsAccumulatedDeficit': 'retainedEarnings',

  // === SHARES OUTSTANDING ===
  'us-gaap:CommonStockSharesOutstanding': 'sharesOutstandingBasic',
  'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic': 'sharesOutstandingBasic',
  'us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding': 'sharesOutstandingDiluted',
  'us-gaap:CommonStockSharesIssued': 'sharesOutstandingBasic',

  // === CASH FLOW - CAPITAL EXPENDITURES ===
  'us-gaap:PaymentsToAcquirePropertyPlantAndEquipment': 'capitalExpenditures',
  'us-gaap:PaymentsToAcquireProductiveAssets': 'capitalExpenditures',
  'us-gaap:PaymentsForCapitalImprovements': 'capitalExpenditures',
  'us-gaap:CapitalExpendituresIncurredButNotYetPaid': 'capitalExpenditures',
  'us-gaap:PaymentsToAcquireOtherPropertyPlantAndEquipment': 'capitalExpenditures',

  // === CASH FLOW - OPERATING CASH FLOW ===
  'us-gaap:NetCashProvidedByUsedInOperatingActivities': 'operatingCashFlow',
  'us-gaap:NetCashProvidedByUsedInOperatingActivitiesContinuingOperations': 'operatingCashFlow',
  'us-gaap:CashProvidedByUsedInOperatingActivitiesDiscontinuedOperations': 'operatingCashFlow',
};

// Result of mapping XBRL data to financials
export interface XBRLMappedFinancials {
  data: Partial<ExtractedFinancials>;
  fieldsFound: NumericFinancialField[];
  fieldsNotFound: NumericFinancialField[];
  confidence: number;
  currentContextId: string | null;
  balanceSheetContextId: string | null;
  priorContextId: string | null;
}

// All expected numeric fields for confidence calculation
const ALL_NUMERIC_FIELDS: NumericFinancialField[] = [
  'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
  'sgaExpense', 'rdExpense', 'depreciationAmortization', 'operatingIncome',
  'interestExpense', 'incomeBeforeTax', 'incomeTaxExpense', 'netIncome',
  'totalCurrentAssets', 'accountsReceivable', 'inventory', 'totalAssets',
  'propertyPlantEquipment', 'totalCurrentLiabilities', 'accountsPayable',
  'totalDebt', 'shortTermDebt', 'longTermDebt', 'totalLiabilities',
  'totalEquity', 'retainedEarnings', 'cashAndEquivalents',
  'sharesOutstandingBasic', 'sharesOutstandingDiluted', 'capitalExpenditures',
  'operatingCashFlow', 'freeCashFlow',
];

// Critical fields - must have these for reasonable confidence
const CRITICAL_FIELDS: NumericFinancialField[] = [
  'revenue', 'netIncome', 'totalAssets', 'totalLiabilities', 'totalEquity',
];

/**
 * Map XBRL data points to ExtractedFinancials structure
 */
export function mapXBRLToFinancials(
  dataPoints: XBRLDataPoint[],
  contexts: Map<string, XBRLContext>,
  filingType: '10-K' | '10-Q',
  companyName: string | null,
  ticker: string | null
): XBRLMappedFinancials {
  // Find appropriate contexts
  const currentContext = findCurrentPeriodContext(contexts, filingType);
  const balanceSheetContext = findBalanceSheetContext(contexts);
  const priorContext = currentContext ? findPriorPeriodContext(contexts, currentContext) : null;

  console.log(`[XBRL Mapper] Contexts found:`, {
    current: currentContext?.id,
    balanceSheet: balanceSheetContext?.id,
    prior: priorContext?.id,
  });

  const data: Partial<ExtractedFinancials> = {
    companyName: companyName || 'Unknown Company',
    ticker: ticker,
    filingType: filingType === '10-K' || filingType === '10-Q' ? filingType : 'unknown',
    fiscalYear: 0,
    fiscalPeriod: '',
    extractionNotes: ['Data extracted from iXBRL structured data'],
  };

  // Extract fiscal year from context
  if (currentContext?.endDate) {
    const endDate = new Date(currentContext.endDate);
    data.fiscalYear = endDate.getFullYear();
    data.fiscalPeriod = filingType === '10-K'
      ? `FY${endDate.getFullYear()}`
      : `Q${Math.ceil((endDate.getMonth() + 1) / 3)} ${endDate.getFullYear()}`;
  }

  const fieldsFound: NumericFinancialField[] = [];
  const mappedFields = new Set<NumericFinancialField>();

  // Helper to map data points for a specific context
  const mapContextData = (
    contextId: string | null,
    fieldFilter?: NumericFinancialField[]
  ) => {
    if (!contextId) return;

    const contextPoints = getDataPointsForContext(dataPoints, contextId);

    for (const dp of contextPoints) {
      const field = USGAAP_CONCEPT_MAP[dp.concept];

      if (!field) continue;
      if (mappedFields.has(field)) continue; // Already mapped
      if (fieldFilter && !fieldFilter.includes(field)) continue;

      // Set the value
      (data as Record<string, unknown>)[field] = dp.value;
      mappedFields.add(field);
      fieldsFound.push(field);
    }
  };

  // Map income statement and cash flow fields from current period context
  const periodBasedFields: NumericFinancialField[] = [
    // Income statement
    'revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses',
    'sgaExpense', 'rdExpense', 'depreciationAmortization', 'operatingIncome',
    'interestExpense', 'incomeBeforeTax', 'incomeTaxExpense', 'netIncome',
    // Cash flow statement
    'operatingCashFlow', 'capitalExpenditures',
  ];

  if (currentContext) {
    mapContextData(currentContext.id, periodBasedFields);
  }

  // Map balance sheet fields from balance sheet (instant) context
  const balanceSheetFields: NumericFinancialField[] = [
    'totalCurrentAssets', 'accountsReceivable', 'inventory', 'totalAssets',
    'propertyPlantEquipment', 'totalCurrentLiabilities', 'accountsPayable',
    'totalDebt', 'shortTermDebt', 'longTermDebt', 'totalLiabilities',
    'totalEquity', 'retainedEarnings', 'cashAndEquivalents',
    'sharesOutstandingBasic', 'sharesOutstandingDiluted',
  ];

  if (balanceSheetContext) {
    mapContextData(balanceSheetContext.id, balanceSheetFields);
  }

  // Map prior year revenue for growth calculation
  if (priorContext) {
    const priorPoints = getDataPointsForContext(dataPoints, priorContext.id);
    for (const dp of priorPoints) {
      const field = USGAAP_CONCEPT_MAP[dp.concept];
      if (field === 'revenue') {
        data.priorYearRevenue = dp.value;
        fieldsFound.push('priorYearRevenue');
        break;
      }
    }
  }

  // Calculate derived fields if we have components
  // Total debt = short term + long term (if total not directly available)
  if (!mappedFields.has('totalDebt') && data.shortTermDebt !== undefined && data.longTermDebt !== undefined) {
    data.totalDebt = (data.shortTermDebt || 0) + (data.longTermDebt || 0);
    fieldsFound.push('totalDebt');
    mappedFields.add('totalDebt');
  }

  // Gross profit = revenue - cost of revenue (if not directly available)
  if (!mappedFields.has('grossProfit') && data.revenue !== undefined && data.costOfRevenue !== undefined) {
    data.grossProfit = data.revenue - data.costOfRevenue;
    fieldsFound.push('grossProfit');
    mappedFields.add('grossProfit');
  }

  // Free Cash Flow = Operating Cash Flow - CapEx
  if (!mappedFields.has('freeCashFlow') && data.operatingCashFlow !== undefined && data.operatingCashFlow !== null && data.capitalExpenditures !== undefined) {
    // CapEx is typically reported as a negative number (cash outflow)
    const capex = data.capitalExpenditures || 0;
    // If capex is positive, it was reported as absolute value, subtract it
    // If capex is negative, it was reported as outflow, so add it (subtracting negative)
    data.freeCashFlow = data.operatingCashFlow - Math.abs(capex);
    fieldsFound.push('freeCashFlow');
    mappedFields.add('freeCashFlow');
  }

  // Calculate fields not found
  const fieldsNotFound = ALL_NUMERIC_FIELDS.filter(f => !mappedFields.has(f));

  // Calculate confidence score
  const confidence = calculateConfidence(fieldsFound);

  console.log(`[XBRL Mapper] Mapped ${fieldsFound.length} fields, confidence: ${(confidence * 100).toFixed(1)}%`);

  return {
    data,
    fieldsFound,
    fieldsNotFound,
    confidence,
    currentContextId: currentContext?.id || null,
    balanceSheetContextId: balanceSheetContext?.id || null,
    priorContextId: priorContext?.id || null,
  };
}

/**
 * Calculate confidence score based on field coverage
 */
function calculateConfidence(fieldsFound: NumericFinancialField[]): number {
  // Base confidence from field coverage
  const coverage = fieldsFound.length / ALL_NUMERIC_FIELDS.length;

  // Bonus for critical fields
  const criticalFound = CRITICAL_FIELDS.filter(f => fieldsFound.includes(f)).length;
  const criticalBonus = (criticalFound / CRITICAL_FIELDS.length) * 0.3;

  // Final confidence (weighted average, capped at 1.0)
  return Math.min(1.0, coverage * 0.7 + criticalBonus);
}

/**
 * Get a data point value for a specific concept and context
 */
export function getConceptValue(
  dataPoints: XBRLDataPoint[],
  concept: string,
  contextId: string
): number | null {
  const dp = dataPoints.find(
    p => p.concept === concept && p.contextRef === contextId
  );
  return dp ? dp.value : null;
}

/**
 * List all unique concepts found in data points
 */
export function listUniqueConcepts(dataPoints: XBRLDataPoint[]): string[] {
  const concepts = new Set<string>();
  for (const dp of dataPoints) {
    concepts.add(dp.concept);
  }
  return Array.from(concepts).sort();
}
