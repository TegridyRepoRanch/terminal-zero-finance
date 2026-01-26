// Terminal Zero - Application Constants
// Centralized configuration for magic numbers and default values

// =============================================================================
// GEMINI MODEL CONFIGURATION
// =============================================================================

export const GEMINI_MODELS = {
  PRO: 'gemini-3-pro-preview',
  FLASH: 'gemini-3-flash-preview',
} as const;

export const ANTHROPIC_MODELS = {
  OPUS: 'claude-opus-4-5-20251101',
  SONNET: 'claude-sonnet-4-20250514',
} as const;

export const MODEL_CONFIG = {
  TEMPERATURE_EXTRACTION: 0.1,
  TEMPERATURE_ANALYSIS: 0.2,
  TEMPERATURE_REVIEW: 0.0, // Deterministic for final review
  MAX_TEXT_LENGTH: 100000, // Characters to send to LLM
  TIMEOUT_MS: 180000, // 3 minute timeout per call
} as const;

// Legacy - keeping for backwards compatibility
export const GEMINI_CONFIG = {
  TEMPERATURE_EXTRACTION: 0.1,
  TEMPERATURE_ANALYSIS: 0.2,
  RESPONSE_MIME_TYPE: 'application/json',
  MAX_TEXT_LENGTH: 100000,
} as const;

// =============================================================================
// DEFAULT FINANCIAL ASSUMPTIONS
// =============================================================================

export const DEFAULT_ASSUMPTIONS = {
  // Base data
  BASE_REVENUE: 1_000_000_000, // $1B
  PROJECTION_YEARS: 5,

  // Income Statement (percentages)
  REVENUE_GROWTH_RATE: 8,
  COGS_PERCENT: 60,
  SGA_PERCENT: 20,
  TAX_RATE: 25,

  // Working Capital (days)
  DAYS_RECEIVABLES: 45, // DSO
  DAYS_INVENTORY: 60, // DIO
  DAYS_PAYABLES: 30, // DPO

  // CapEx & Depreciation
  CAPEX_PERCENT: 5, // % of revenue
  DEPRECIATION_YEARS: 10,

  // Debt
  DEBT_BALANCE: 200_000_000, // $200M
  INTEREST_RATE: 5,
  YEARLY_REPAYMENT: 20_000_000, // $20M/year

  // Valuation
  WACC: 10,
  TERMINAL_GROWTH_RATE: 2.5,
  SHARES_OUTSTANDING: 100_000_000, // 100M shares
} as const;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

export const VALIDATION_LIMITS = {
  // Revenue
  MIN_REVENUE: 0,
  MAX_REVENUE: 10_000_000_000_000, // $10T (sanity check)

  // Percentages
  MIN_PERCENT: 0,
  MAX_PERCENT: 100,

  // Margins (reasonable ranges)
  COGS_MIN: 20,
  COGS_MAX: 95,
  COGS_WARNING_HIGH: 85,
  COGS_WARNING_LOW: 30,

  SGA_MIN: 5,
  SGA_MAX: 50,

  TAX_MIN: 10,
  TAX_MAX: 40,
  TAX_WARNING_LOW: 15,
  TAX_WARNING_HIGH: 35,

  // Growth rates
  GROWTH_MIN: -50,
  GROWTH_MAX: 100,
  GROWTH_WARNING_HIGH: 50,

  // Working capital days
  DSO_MIN: 15,
  DSO_MAX: 120,
  DSO_WARNING: 90,

  DIO_MIN: 0,
  DIO_MAX: 180,

  DPO_MIN: 10,
  DPO_MAX: 120,
  DPO_WARNING: 90,

  // Projection period (extended to 20 for infrastructure/mining sectors)
  MIN_PROJECTION_YEARS: 1,
  MAX_PROJECTION_YEARS: 20,

  // Valuation
  WACC_MIN: 5,
  WACC_MAX: 20,
  TERMINAL_GROWTH_MIN: 0,
  TERMINAL_GROWTH_MAX: 5,
} as const;

// =============================================================================
// UI CONFIGURATION
// =============================================================================

export const UI_CONFIG = {
  // Formatting
  CURRENCY_DECIMALS: 0,
  PERCENT_DECIMALS: 1,
  SHARE_PRICE_DECIMALS: 2,

  // Display thresholds
  LARGE_NUMBER_THRESHOLD: 1_000_000_000, // When to show in billions
  MEDIUM_NUMBER_THRESHOLD: 1_000_000, // When to show in millions

  // Animation
  PULSE_ANIMATION_DURATION: 2000,
} as const;

// =============================================================================
// FINANCIAL CALCULATION CONSTANTS
// =============================================================================

export const CALCULATION_CONSTANTS = {
  DAYS_IN_YEAR: 365,
  INITIAL_PPE_YEARS: 2, // Assume 2 years of CapEx as starting PPE
  DEFAULT_DEBT_PAYOFF_YEARS: 10,
} as const;

// =============================================================================
// APPLICATION INFO
// =============================================================================

export const APP_INFO = {
  NAME: 'Terminal Zero',
  TAGLINE: 'DCF Valuation Workstation',
  VERSION: '1.0.0',
} as const;
