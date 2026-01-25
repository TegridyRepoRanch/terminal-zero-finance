// Terminal Zero - LLM Prompt Templates
// Version: 1.0.0
// All prompts for Gemini API calls

// =============================================================================
// FULL FINANCIAL EXTRACTION PROMPT
// Used by: extractFinancialsWithGemini()
// Model: Gemini 3 Flash (fast) or Gemini 3 Pro (accurate)
// =============================================================================

export const FINANCIAL_EXTRACTION_PROMPT = `You are a financial analyst AI. Extract key financial data from the following SEC 10-K or 10-Q filing.

Return a JSON object with the following structure. Use numbers only (no currency symbols or commas). Use null for any values you cannot find. All monetary values should be in dollars (not thousands or millions - convert if needed).

{
  "financials": {
    "companyName": "string",
    "ticker": "string or null",
    "filingType": "10-K" | "10-Q" | "unknown",
    "fiscalYear": number,
    "fiscalPeriod": "string",
    "revenue": number,
    "costOfRevenue": number,
    "grossProfit": number,
    "operatingExpenses": number,
    "sgaExpense": number or null,
    "rdExpense": number or null,
    "depreciationAmortization": number,
    "operatingIncome": number,
    "interestExpense": number,
    "incomeBeforeTax": number,
    "incomeTaxExpense": number,
    "netIncome": number,
    "totalCurrentAssets": number,
    "accountsReceivable": number,
    "inventory": number,
    "totalAssets": number,
    "propertyPlantEquipment": number,
    "totalCurrentLiabilities": number,
    "accountsPayable": number,
    "totalDebt": number,
    "shortTermDebt": number,
    "longTermDebt": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "retainedEarnings": number,
    "cashAndEquivalents": number,
    "sharesOutstandingBasic": number,
    "sharesOutstandingDiluted": number,
    "priorYearRevenue": number or null,
    "extractionNotes": []
  },
  "confidence": {
    "companyName": 0.0-1.0,
    "revenue": 0.0-1.0,
    "costOfRevenue": 0.0-1.0,
    "operatingExpenses": 0.0-1.0,
    "depreciationAmortization": 0.0-1.0,
    "interestExpense": 0.0-1.0,
    "incomeTaxExpense": 0.0-1.0,
    "accountsReceivable": 0.0-1.0,
    "inventory": 0.0-1.0,
    "accountsPayable": 0.0-1.0,
    "propertyPlantEquipment": 0.0-1.0,
    "totalDebt": 0.0-1.0,
    "sharesOutstanding": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "warnings": []
}

Filing text:
`;

// =============================================================================
// SEGMENT BREAKDOWN EXTRACTION PROMPT
// Used by: extractSegmentsWithGemini()
// Model: Gemini 3 Pro
// =============================================================================

export const SEGMENT_EXTRACTION_PROMPT = `You are an expert financial analyst. Extract detailed segment/business unit breakdowns from this SEC filing.

Return a JSON object with:
{
  "segments": [
    {
      "name": "Segment name",
      "revenue": number,
      "operatingIncome": number,
      "assets": number,
      "revenuePercent": number (% of total),
      "growthRate": number or null (YoY %),
      "geography": "string or null",
      "description": "Brief description of segment"
    }
  ],
  "totalRevenue": number,
  "revenueByGeography": {
    "region": number
  },
  "notes": ["Any important observations about segment reporting"]
}

Be thorough - SEC filings often have segment data in multiple places (Item 1, Item 7, notes to financials).

Filing text:
`;

// =============================================================================
// MD&A QUALITATIVE ANALYSIS PROMPT
// Used by: analyzeMDAWithGemini()
// Model: Gemini 3 Pro
// =============================================================================

export const MDA_ANALYSIS_PROMPT = `You are an expert financial analyst. Perform qualitative analysis of the Management Discussion & Analysis (MD&A) section.

Return a JSON object with:
{
  "keyThemes": [
    {
      "theme": "string",
      "sentiment": "positive" | "negative" | "neutral",
      "significance": "high" | "medium" | "low",
      "quote": "Relevant quote from filing"
    }
  ],
  "risks": [
    {
      "risk": "Description",
      "category": "operational" | "financial" | "regulatory" | "market" | "other",
      "severity": "high" | "medium" | "low",
      "newOrEscalated": boolean
    }
  ],
  "guidance": {
    "hasGuidance": boolean,
    "revenueGuidance": "string or null",
    "marginGuidance": "string or null",
    "capitalAllocation": "string or null",
    "otherGuidance": ["strings"]
  },
  "competitivePosition": {
    "strengths": ["strings"],
    "weaknesses": ["strings"],
    "marketTrends": ["strings"]
  },
  "managementTone": "optimistic" | "cautious" | "concerned" | "neutral",
  "summary": "2-3 sentence executive summary"
}

Filing text:
`;

// =============================================================================
// COMPLEX TABLE EXTRACTION PROMPT
// Used by: extractTablesWithGemini()
// Model: Gemini 3 Pro
// =============================================================================

export const TABLE_EXTRACTION_PROMPT = `You are an expert at extracting financial data from complex tables in SEC filings.

The following text may contain poorly formatted tables. Extract ALL numerical financial data accurately.

Pay special attention to:
- Multi-year comparative data
- Footnotes that modify reported numbers
- Pro-forma vs GAAP figures (prefer GAAP)
- Numbers in thousands vs millions (convert all to actual dollars)
- Negative numbers shown in parentheses

Return a JSON object with:
{
  "financials": {
    "revenue": number,
    "costOfRevenue": number,
    "grossProfit": number,
    "operatingExpenses": number,
    "sgaExpense": number or null,
    "rdExpense": number or null,
    "depreciationAmortization": number,
    "operatingIncome": number,
    "interestExpense": number,
    "incomeBeforeTax": number,
    "incomeTaxExpense": number,
    "netIncome": number,
    "totalCurrentAssets": number,
    "accountsReceivable": number,
    "inventory": number,
    "totalAssets": number,
    "propertyPlantEquipment": number,
    "totalCurrentLiabilities": number,
    "accountsPayable": number,
    "totalDebt": number,
    "shortTermDebt": number,
    "longTermDebt": number,
    "totalLiabilities": number,
    "totalEquity": number,
    "cashAndEquivalents": number,
    "sharesOutstandingBasic": number,
    "sharesOutstandingDiluted": number
  },
  "tableNotes": ["Any footnotes or adjustments found"],
  "dataQuality": {
    "confidence": 0.0-1.0,
    "issues": ["Any data quality issues encountered"]
  }
}

Filing text:
`;

// =============================================================================
// VALIDATION COMPARISON PROMPT
// Used by: validateExtractionWithGemini()
// Model: Gemini 3 Pro
// Note: Uses string replacement for {extraction1} and {extraction2}
// =============================================================================

export const VALIDATION_PROMPT = `You are a senior financial analyst performing a final validation of extracted SEC filing data.

Compare the two extractions below and identify any discrepancies. For each discrepancy, determine which value is more likely correct based on typical financial reporting patterns.

Extraction 1 (Primary):
{extraction1}

Extraction 2 (Verification):
{extraction2}

Return a JSON object with:
{
  "validated": {
    // Final validated values - use the most accurate from either extraction
    // Same structure as ExtractedFinancials
  },
  "discrepancies": [
    {
      "field": "field name",
      "primaryValue": number,
      "verificationValue": number,
      "selectedValue": number,
      "reason": "Why this value was selected"
    }
  ],
  "confidence": {
    // Confidence scores for each field
  },
  "validationNotes": ["Any important observations from validation"],
  "overallConfidence": 0.0-1.0
}
`;

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Builds the full extraction prompt with the filing text appended
 */
export function buildExtractionPrompt(filingText: string): string {
  return FINANCIAL_EXTRACTION_PROMPT + filingText;
}

/**
 * Builds the validation prompt with extractions substituted
 */
export function buildValidationPrompt(
  extraction1: string,
  extraction2: string
): string {
  return VALIDATION_PROMPT
    .replace('{extraction1}', extraction1)
    .replace('{extraction2}', extraction2);
}
