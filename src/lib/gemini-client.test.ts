// Integration Tests for Gemini Extraction
// These tests mock the Gemini API to test extraction logic
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LLMExtractionResponse } from './extraction-types';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFinancialResponse: LLMExtractionResponse = {
  financials: {
    companyName: 'Apple Inc.',
    ticker: 'AAPL',
    filingType: '10-K',
    fiscalYear: 2023,
    fiscalPeriod: 'FY2023',
    revenue: 383_285_000_000,
    costOfRevenue: 214_137_000_000,
    grossProfit: 169_148_000_000,
    operatingExpenses: 54_847_000_000,
    sgaExpense: 24_932_000_000,
    rdExpense: 29_915_000_000,
    depreciationAmortization: 11_519_000_000,
    operatingIncome: 114_301_000_000,
    interestExpense: 3_933_000_000,
    incomeBeforeTax: 113_736_000_000,
    incomeTaxExpense: 16_741_000_000,
    netIncome: 96_995_000_000,
    totalCurrentAssets: 143_566_000_000,
    accountsReceivable: 29_508_000_000,
    inventory: 6_331_000_000,
    totalAssets: 352_755_000_000,
    propertyPlantEquipment: 43_715_000_000,
    totalCurrentLiabilities: 145_308_000_000,
    accountsPayable: 62_611_000_000,
    totalDebt: 109_280_000_000,
    shortTermDebt: 9_822_000_000,
    longTermDebt: 99_458_000_000,
    totalLiabilities: 290_437_000_000,
    totalEquity: 62_146_000_000,
    retainedEarnings: -214_000_000,
    cashAndEquivalents: 29_965_000_000,
    sharesOutstandingBasic: 15_552_752_000,
    sharesOutstandingDiluted: 15_744_231_000,
    priorYearRevenue: 394_328_000_000,
    operatingCashFlow: 110_543_000_000,
    capitalExpenditures: 10_959_000_000,
    freeCashFlow: 99_584_000_000,
    extractionNotes: ['Data extracted from consolidated financial statements'],
  },
  confidence: {
    overall: 0.95,
    companyName: 0.99,
    revenue: 0.98,
    costOfRevenue: 0.97,
    operatingExpenses: 0.95,
    depreciationAmortization: 0.90,
    interestExpense: 0.92,
    incomeTaxExpense: 0.94,
    accountsReceivable: 0.93,
    inventory: 0.91,
    accountsPayable: 0.94,
    propertyPlantEquipment: 0.92,
    totalDebt: 0.96,
    sharesOutstanding: 0.98,
  },
  warnings: [],
};

const mockSegmentResponse = {
  segments: [
    {
      name: 'iPhone',
      revenue: 200_583_000_000,
      operatingIncome: 70_000_000_000,
      assets: 0,
      revenuePercent: 52.3,
      growthRate: -2.8,
      geography: null,
      description: 'iPhone product line including hardware and accessories',
    },
    {
      name: 'Services',
      revenue: 85_200_000_000,
      operatingIncome: 30_000_000_000,
      assets: 0,
      revenuePercent: 22.2,
      growthRate: 9.1,
      geography: null,
      description: 'Digital services including App Store, Apple Music, iCloud',
    },
  ],
  totalRevenue: 383_285_000_000,
  revenueByGeography: {
    Americas: 162_560_000_000,
    Europe: 94_294_000_000,
    'Greater China': 72_559_000_000,
    Japan: 24_257_000_000,
    'Rest of Asia Pacific': 29_615_000_000,
  },
  notes: ['Segment data extracted from Notes to Financial Statements'],
};

const mockMDAResponse = {
  keyThemes: [
    {
      theme: 'Services growth driving revenue diversification',
      sentiment: 'positive' as const,
      significance: 'high' as const,
      quote: 'Services revenue reached an all-time high of $85.2 billion',
    },
  ],
  risks: [
    {
      risk: 'Supply chain concentration in Asia',
      category: 'operational' as const,
      severity: 'high' as const,
      newOrEscalated: false,
    },
  ],
  guidance: {
    hasGuidance: false,
    revenueGuidance: null,
    marginGuidance: null,
    capitalAllocation: 'Continue returning cash to shareholders',
    otherGuidance: [],
  },
  competitivePosition: {
    strengths: ['Strong brand loyalty', 'Integrated ecosystem'],
    weaknesses: ['High price points', 'Dependence on iPhone sales'],
    marketTrends: ['5G adoption', 'AR/VR emerging'],
  },
  managementTone: 'optimistic' as const,
  summary: 'Apple continues to show strong performance with services growth offsetting iPhone decline.',
};

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock generateContent function
const mockGenerateContent = vi.fn();

// Mock the Google Generative AI module
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      constructor(_apiKey: string) {
        // Constructor accepts API key
      }
      getGenerativeModel(_config: { model: string }) {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

// Import after mocking
import {
  extractFinancialsWithGemini,
  extractSegmentsWithGemini,
  analyzeMDAWithGemini,
  extractTablesWithGemini,
} from './gemini-client';

// =============================================================================
// EXTRACTION TESTS
// =============================================================================

describe('extractFinancialsWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should extract financials from filing text', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockFinancialResponse),
      },
    });

    const result = await extractFinancialsWithGemini(
      'Sample SEC filing text...',
      'test-api-key'
    );

    expect(result.financials.companyName).toBe('Apple Inc.');
    expect(result.financials.revenue).toBe(383_285_000_000);
    expect(result.confidence.overall).toBe(0.95);
  });

  it('should call progress callback when provided', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockFinancialResponse),
      },
    });

    const progressCallback = vi.fn();
    await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key',
      progressCallback
    );

    expect(progressCallback).toHaveBeenCalled();
  });

  it('should use Flash model when specified', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockFinancialResponse),
      },
    });

    const progressCallback = vi.fn();
    await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key',
      progressCallback,
      true // useFlash
    );

    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining('Flash')
    );
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API rate limit exceeded'));

    await expect(
      extractFinancialsWithGemini('Sample text', 'test-api-key')
    ).rejects.toThrow('Gemini API error');
  });

  it('should handle invalid JSON responses', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'This is not valid JSON',
      },
    });

    await expect(
      extractFinancialsWithGemini('Sample text', 'test-api-key')
    ).rejects.toThrow('Failed to parse');
  });
});

describe('extractSegmentsWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract segment data', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockSegmentResponse),
      },
    });

    const result = await extractSegmentsWithGemini(
      'Sample segment text...',
      'test-api-key'
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].name).toBe('iPhone');
    expect(result.totalRevenue).toBe(383_285_000_000);
    expect(result.revenueByGeography).toHaveProperty('Americas');
  });

  it('should handle segment extraction errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Timeout'));

    await expect(
      extractSegmentsWithGemini('Sample text', 'test-api-key')
    ).rejects.toThrow('Segment extraction failed');
  });
});

describe('analyzeMDAWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze MD&A section', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockMDAResponse),
      },
    });

    const result = await analyzeMDAWithGemini(
      'Sample MD&A text...',
      'test-api-key'
    );

    expect(result.keyThemes).toHaveLength(1);
    expect(result.risks).toHaveLength(1);
    expect(result.managementTone).toBe('optimistic');
    expect(result.competitivePosition.strengths).toContain('Strong brand loyalty');
  });

  it('should handle MDA analysis errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Model overloaded'));

    await expect(
      analyzeMDAWithGemini('Sample text', 'test-api-key')
    ).rejects.toThrow('MD&A analysis failed');
  });
});

describe('extractTablesWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract table data', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            financials: {
              revenue: 383_285_000_000,
              netIncome: 96_995_000_000,
            },
            tableNotes: ['Extracted from consolidated statements'],
            dataQuality: { confidence: 0.9, issues: [] },
          }),
      },
    });

    const result = await extractTablesWithGemini(
      'Sample table text...',
      'test-api-key'
    );

    expect(result.financials.revenue).toBe(383_285_000_000);
    expect(result.confidence.overall).toBe(0.9);
  });
});

// =============================================================================
// DATA VALIDATION TESTS
// =============================================================================

describe('Extraction Data Validation', () => {
  it('should validate extracted financials have required fields', () => {
    const financials = mockFinancialResponse.financials;

    // Required fields should be present
    expect(financials.companyName).toBeTruthy();
    expect(financials.revenue).toBeGreaterThan(0);
    expect(financials.costOfRevenue).toBeGreaterThan(0);
    expect(financials.netIncome).toBeDefined();
  });

  it('should validate gross profit calculation', () => {
    const financials = mockFinancialResponse.financials;
    const expectedGrossProfit = financials.revenue - financials.costOfRevenue;

    expect(financials.grossProfit).toBeCloseTo(expectedGrossProfit, -6);
  });

  it('should validate balance sheet equation approximately', () => {
    const financials = mockFinancialResponse.financials;
    const assetsMinusLiabilities = financials.totalAssets - financials.totalLiabilities;

    // Assets - Liabilities ≈ Equity (allowing for rounding)
    // Note: Apple has negative retained earnings which affects this calculation
    expect(Math.abs(assetsMinusLiabilities - financials.totalEquity)).toBeLessThan(1_000_000_000);
  });

  it('should validate share counts are positive', () => {
    const financials = mockFinancialResponse.financials;

    expect(financials.sharesOutstandingBasic).toBeGreaterThan(0);
    expect(financials.sharesOutstandingDiluted).toBeGreaterThan(0);
    expect(financials.sharesOutstandingDiluted).toBeGreaterThanOrEqual(
      financials.sharesOutstandingBasic
    );
  });

  it('should validate confidence scores are in valid range', () => {
    const confidence = mockFinancialResponse.confidence;

    Object.values(confidence).forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Extraction Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle company with null prior year revenue', async () => {
    const responseWithNullPrior = {
      ...mockFinancialResponse,
      financials: {
        ...mockFinancialResponse.financials,
        priorYearRevenue: null,
      },
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(responseWithNullPrior),
      },
    });

    const result = await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key'
    );

    expect(result.financials.priorYearRevenue).toBeNull();
  });

  it('should handle company with zero inventory (services company)', async () => {
    const servicesCompanyResponse = {
      ...mockFinancialResponse,
      financials: {
        ...mockFinancialResponse.financials,
        inventory: 0,
      },
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(servicesCompanyResponse),
      },
    });

    const result = await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key'
    );

    expect(result.financials.inventory).toBe(0);
  });

  it('should handle negative retained earnings', async () => {
    const negativeREResponse = {
      ...mockFinancialResponse,
      financials: {
        ...mockFinancialResponse.financials,
        retainedEarnings: -50_000_000_000, // Accumulated deficit
      },
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(negativeREResponse),
      },
    });

    const result = await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key'
    );

    expect(result.financials.retainedEarnings).toBeLessThan(0);
  });

  it('should handle warnings in response', async () => {
    const responseWithWarnings = {
      ...mockFinancialResponse,
      warnings: [
        {
          field: 'depreciationAmortization',
          message: 'Depreciation estimated from PPE changes',
          severity: 'low' as const,
        },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(responseWithWarnings),
      },
    });

    const result = await extractFinancialsWithGemini(
      'Sample text',
      'test-api-key'
    );

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('depreciationAmortization');
  });
});

// =============================================================================
// RESPONSE FORMAT TESTS
// =============================================================================

describe('Response Format Validation', () => {
  it('should have correct income statement fields', () => {
    const financials = mockFinancialResponse.financials;

    // Income statement items
    expect(financials).toHaveProperty('revenue');
    expect(financials).toHaveProperty('costOfRevenue');
    expect(financials).toHaveProperty('grossProfit');
    expect(financials).toHaveProperty('operatingExpenses');
    expect(financials).toHaveProperty('operatingIncome');
    expect(financials).toHaveProperty('interestExpense');
    expect(financials).toHaveProperty('netIncome');
  });

  it('should have correct balance sheet fields', () => {
    const financials = mockFinancialResponse.financials;

    // Balance sheet items
    expect(financials).toHaveProperty('totalAssets');
    expect(financials).toHaveProperty('totalLiabilities');
    expect(financials).toHaveProperty('totalEquity');
    expect(financials).toHaveProperty('accountsReceivable');
    expect(financials).toHaveProperty('accountsPayable');
    expect(financials).toHaveProperty('totalDebt');
  });

  it('should have correct company metadata fields', () => {
    const financials = mockFinancialResponse.financials;

    expect(financials).toHaveProperty('companyName');
    expect(financials).toHaveProperty('ticker');
    expect(financials).toHaveProperty('filingType');
    expect(financials).toHaveProperty('fiscalYear');
    expect(financials).toHaveProperty('fiscalPeriod');
  });
});

// =============================================================================
// CALCULATION CONSISTENCY TESTS
// =============================================================================

describe('Financial Calculation Consistency', () => {
  const financials = mockFinancialResponse.financials;

  it('gross profit = revenue - cost of revenue', () => {
    const calculated = financials.revenue - financials.costOfRevenue;
    expect(financials.grossProfit).toBe(calculated);
  });

  it('operating income should be less than gross profit', () => {
    expect(financials.operatingIncome).toBeLessThan(financials.grossProfit);
  });

  it('net income should be less than operating income', () => {
    expect(financials.netIncome).toBeLessThan(financials.operatingIncome);
  });

  it('total debt = short term + long term debt', () => {
    const calculatedTotalDebt = financials.shortTermDebt + financials.longTermDebt;
    expect(financials.totalDebt).toBe(calculatedTotalDebt);
  });

  it('diluted shares should be >= basic shares', () => {
    expect(financials.sharesOutstandingDiluted).toBeGreaterThanOrEqual(
      financials.sharesOutstandingBasic
    );
  });
});
