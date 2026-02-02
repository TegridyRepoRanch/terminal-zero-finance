-- Migration: Incremental Data Processing System
-- Adds multi-source financial data tracking with incremental updates
-- Run this in Supabase SQL Editor after 001_add_rag_support.sql

-- ============================================================================
-- 1. Create companies table (master record for each company)
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  ticker VARCHAR(10) NOT NULL UNIQUE,
  cik VARCHAR(20),                        -- SEC CIK number
  name VARCHAR(255) NOT NULL,

  -- Classification
  sector VARCHAR(100),
  industry VARCHAR(100),
  exchange VARCHAR(20),                   -- NYSE, NASDAQ, etc.
  country VARCHAR(50) DEFAULT 'US',

  -- Latest filing info
  last_10k_accession VARCHAR(30),
  last_10k_date DATE,
  last_10q_accession VARCHAR(30),
  last_10q_date DATE,

  -- Data completeness tracking (0-100 score)
  data_completeness_score INTEGER DEFAULT 0,
  income_statement_completeness INTEGER DEFAULT 0,
  balance_sheet_completeness INTEGER DEFAULT 0,
  cash_flow_completeness INTEGER DEFAULT 0,

  -- API data freshness
  finnhub_last_sync TIMESTAMPTZ,
  alpha_vantage_last_sync TIMESTAMPTZ,
  yahoo_last_sync TIMESTAMPTZ,
  sec_last_sync TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_cik ON companies(cik);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- ============================================================================
-- 2. Create data_sources enum and table
-- ============================================================================
CREATE TYPE data_source_type AS ENUM (
  'sec_xbrl',           -- Structured XBRL from SEC filing
  'sec_ai_extraction',  -- AI-extracted from SEC filing text
  'finnhub',            -- Finnhub API
  'alpha_vantage',      -- Alpha Vantage API
  'yahoo_finance',      -- Yahoo Finance
  'manual_entry',       -- Manually entered/corrected
  'calculated'          -- Derived from other fields
);

CREATE TYPE period_type AS ENUM (
  'annual',       -- Full year (FY)
  'quarterly',    -- Quarter (Q1, Q2, Q3, Q4)
  'ttm',          -- Trailing Twelve Months
  'ltm',          -- Last Twelve Months (same as TTM)
  'ytd',          -- Year to Date
  'point_in_time' -- Balance sheet snapshot
);

-- ============================================================================
-- 3. Create financial_metrics table (normalized financial data points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Metric identification
  metric_name VARCHAR(100) NOT NULL,      -- e.g., 'revenue', 'netIncome', 'totalAssets'
  metric_category VARCHAR(50) NOT NULL,   -- 'income_statement', 'balance_sheet', 'cash_flow', 'ratio'

  -- Value
  metric_value NUMERIC(20, 2),            -- The actual value
  metric_unit VARCHAR(20) DEFAULT 'USD',  -- USD, shares, ratio, percent

  -- Time period
  period_type period_type NOT NULL,
  period_end_date DATE NOT NULL,          -- End date of the period
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,                 -- NULL for annual, 1-4 for quarterly

  -- Source tracking
  source data_source_type NOT NULL,
  source_filing_accession VARCHAR(30),    -- SEC accession number if from filing
  source_api_response_id VARCHAR(100),    -- API request ID for debugging
  confidence_score INTEGER DEFAULT 100,   -- 0-100, lower if AI-extracted or interpolated

  -- Data quality
  is_restated BOOLEAN DEFAULT FALSE,      -- True if this corrects a previous value
  restates_id UUID REFERENCES financial_metrics(id),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one value per metric/period/source combination
  UNIQUE(company_id, metric_name, period_end_date, period_type, source)
);

-- Indexes for financial_metrics
CREATE INDEX IF NOT EXISTS idx_fm_company ON financial_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_fm_metric ON financial_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_fm_period ON financial_metrics(period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_fm_company_metric ON financial_metrics(company_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_fm_company_period ON financial_metrics(company_id, period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_fm_source ON financial_metrics(source);

-- ============================================================================
-- 4. Create processing_history table (track all data processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS processing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- What was processed
  source_type data_source_type NOT NULL,
  source_identifier VARCHAR(100),         -- Filing accession, API request ID, etc.

  -- Processing details
  processing_status VARCHAR(20) NOT NULL CHECK (processing_status IN ('started', 'completed', 'failed', 'partial')),

  -- Metrics tracking
  metrics_extracted INTEGER DEFAULT 0,
  metrics_updated INTEGER DEFAULT 0,
  metrics_unchanged INTEGER DEFAULT 0,
  metrics_failed INTEGER DEFAULT 0,

  -- Fields detail (for debugging)
  fields_extracted JSONB DEFAULT '[]'::jsonb,
  fields_missing JSONB DEFAULT '[]'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,

  -- Performance
  processing_time_ms INTEGER,
  ai_tokens_used INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for processing_history
CREATE INDEX IF NOT EXISTS idx_ph_company ON processing_history(company_id);
CREATE INDEX IF NOT EXISTS idx_ph_source ON processing_history(source_type);
CREATE INDEX IF NOT EXISTS idx_ph_status ON processing_history(processing_status);
CREATE INDEX IF NOT EXISTS idx_ph_created ON processing_history(created_at DESC);

-- ============================================================================
-- 5. Create stock_prices table (for price history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Price data
  price_date DATE NOT NULL,
  open_price NUMERIC(12, 4),
  high_price NUMERIC(12, 4),
  low_price NUMERIC(12, 4),
  close_price NUMERIC(12, 4) NOT NULL,
  adjusted_close NUMERIC(12, 4),
  volume BIGINT,

  -- Source
  source data_source_type NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(company_id, price_date)
);

-- Index for stock_prices
CREATE INDEX IF NOT EXISTS idx_sp_company_date ON stock_prices(company_id, price_date DESC);

-- ============================================================================
-- 6. Update extractions table to link to companies
-- ============================================================================
ALTER TABLE extractions
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_extractions_company ON extractions(company_id);

-- ============================================================================
-- 7. Enable RLS on new tables
-- ============================================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for anonymous - adjust for production)
CREATE POLICY "Allow anonymous access to companies" ON companies
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access to financial_metrics" ON financial_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access to processing_history" ON processing_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous access to stock_prices" ON stock_prices
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 8. Create update timestamp triggers
-- ============================================================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_metrics_updated_at ON financial_metrics;
CREATE TRIGGER update_financial_metrics_updated_at
  BEFORE UPDATE ON financial_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Create helper functions
-- ============================================================================

-- Get or create company by ticker
CREATE OR REPLACE FUNCTION get_or_create_company(
  p_ticker VARCHAR(10),
  p_name VARCHAR(255) DEFAULT NULL,
  p_cik VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Try to find existing company
  SELECT id INTO v_company_id
  FROM companies
  WHERE ticker = UPPER(p_ticker);

  -- Create if not exists
  IF v_company_id IS NULL THEN
    INSERT INTO companies (ticker, name, cik)
    VALUES (UPPER(p_ticker), COALESCE(p_name, UPPER(p_ticker)), p_cik)
    RETURNING id INTO v_company_id;
  END IF;

  RETURN v_company_id;
END;
$$;

-- Get latest metric value for a company
CREATE OR REPLACE FUNCTION get_latest_metric(
  p_company_id UUID,
  p_metric_name VARCHAR(100),
  p_period_type period_type DEFAULT 'annual'
)
RETURNS TABLE (
  metric_value NUMERIC(20, 2),
  period_end_date DATE,
  fiscal_year INTEGER,
  source data_source_type,
  confidence_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fm.metric_value,
    fm.period_end_date,
    fm.fiscal_year,
    fm.source,
    fm.confidence_score
  FROM financial_metrics fm
  WHERE fm.company_id = p_company_id
    AND fm.metric_name = p_metric_name
    AND fm.period_type = p_period_type
  ORDER BY fm.period_end_date DESC
  LIMIT 1;
END;
$$;

-- Get company data completeness
CREATE OR REPLACE FUNCTION calculate_data_completeness(p_company_id UUID)
RETURNS TABLE (
  overall_score INTEGER,
  income_statement_score INTEGER,
  balance_sheet_score INTEGER,
  cash_flow_score INTEGER,
  missing_income_fields TEXT[],
  missing_balance_fields TEXT[],
  missing_cashflow_fields TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_income_required TEXT[] := ARRAY['revenue', 'costOfRevenue', 'grossProfit', 'operatingIncome', 'netIncome'];
  v_balance_required TEXT[] := ARRAY['totalAssets', 'totalLiabilities', 'totalEquity', 'cashAndEquivalents', 'totalDebt'];
  v_cashflow_required TEXT[] := ARRAY['operatingCashFlow', 'capitalExpenditures', 'freeCashFlow'];
  v_income_found TEXT[];
  v_balance_found TEXT[];
  v_cashflow_found TEXT[];
BEGIN
  -- Get found metrics (annual, most recent year)
  SELECT ARRAY_AGG(DISTINCT fm.metric_name) INTO v_income_found
  FROM financial_metrics fm
  WHERE fm.company_id = p_company_id
    AND fm.metric_name = ANY(v_income_required)
    AND fm.period_type = 'annual';

  SELECT ARRAY_AGG(DISTINCT fm.metric_name) INTO v_balance_found
  FROM financial_metrics fm
  WHERE fm.company_id = p_company_id
    AND fm.metric_name = ANY(v_balance_required)
    AND fm.period_type IN ('annual', 'point_in_time');

  SELECT ARRAY_AGG(DISTINCT fm.metric_name) INTO v_cashflow_found
  FROM financial_metrics fm
  WHERE fm.company_id = p_company_id
    AND fm.metric_name = ANY(v_cashflow_required)
    AND fm.period_type = 'annual';

  -- Handle nulls
  v_income_found := COALESCE(v_income_found, ARRAY[]::TEXT[]);
  v_balance_found := COALESCE(v_balance_found, ARRAY[]::TEXT[]);
  v_cashflow_found := COALESCE(v_cashflow_found, ARRAY[]::TEXT[]);

  RETURN QUERY SELECT
    ((COALESCE(array_length(v_income_found, 1), 0) + COALESCE(array_length(v_balance_found, 1), 0) + COALESCE(array_length(v_cashflow_found, 1), 0)) * 100 /
     (array_length(v_income_required, 1) + array_length(v_balance_required, 1) + array_length(v_cashflow_required, 1)))::INTEGER,
    (COALESCE(array_length(v_income_found, 1), 0) * 100 / array_length(v_income_required, 1))::INTEGER,
    (COALESCE(array_length(v_balance_found, 1), 0) * 100 / array_length(v_balance_required, 1))::INTEGER,
    (COALESCE(array_length(v_cashflow_found, 1), 0) * 100 / array_length(v_cashflow_required, 1))::INTEGER,
    ARRAY(SELECT unnest(v_income_required) EXCEPT SELECT unnest(v_income_found)),
    ARRAY(SELECT unnest(v_balance_required) EXCEPT SELECT unnest(v_balance_found)),
    ARRAY(SELECT unnest(v_cashflow_required) EXCEPT SELECT unnest(v_cashflow_found));
END;
$$;

-- Upsert financial metric (insert or update if newer)
CREATE OR REPLACE FUNCTION upsert_financial_metric(
  p_company_id UUID,
  p_metric_name VARCHAR(100),
  p_metric_category VARCHAR(50),
  p_metric_value NUMERIC(20, 2),
  p_period_type period_type,
  p_period_end_date DATE,
  p_fiscal_year INTEGER,
  p_fiscal_quarter INTEGER,
  p_source data_source_type,
  p_confidence_score INTEGER DEFAULT 100,
  p_source_filing_accession VARCHAR(30) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_confidence INTEGER;
  v_result_id UUID;
BEGIN
  -- Check for existing record
  SELECT id, confidence_score INTO v_existing_id, v_existing_confidence
  FROM financial_metrics
  WHERE company_id = p_company_id
    AND metric_name = p_metric_name
    AND period_end_date = p_period_end_date
    AND period_type = p_period_type
    AND source = p_source;

  IF v_existing_id IS NOT NULL THEN
    -- Update if new data has higher or equal confidence
    IF p_confidence_score >= v_existing_confidence THEN
      UPDATE financial_metrics
      SET metric_value = p_metric_value,
          confidence_score = p_confidence_score,
          source_filing_accession = COALESCE(p_source_filing_accession, source_filing_accession),
          notes = COALESCE(p_notes, notes),
          updated_at = NOW()
      WHERE id = v_existing_id;
    END IF;
    v_result_id := v_existing_id;
  ELSE
    -- Insert new record
    INSERT INTO financial_metrics (
      company_id, metric_name, metric_category, metric_value,
      period_type, period_end_date, fiscal_year, fiscal_quarter,
      source, confidence_score, source_filing_accession, notes
    ) VALUES (
      p_company_id, p_metric_name, p_metric_category, p_metric_value,
      p_period_type, p_period_end_date, p_fiscal_year, p_fiscal_quarter,
      p_source, p_confidence_score, p_source_filing_accession, p_notes
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

-- ============================================================================
-- 10. Create views for easy querying
-- ============================================================================

-- Company financial summary view
CREATE OR REPLACE VIEW company_financial_summary AS
SELECT
  c.id as company_id,
  c.ticker,
  c.name,
  c.sector,
  c.industry,
  c.data_completeness_score,
  (SELECT fm.metric_value FROM financial_metrics fm
   WHERE fm.company_id = c.id AND fm.metric_name = 'revenue'
   ORDER BY fm.period_end_date DESC LIMIT 1) as latest_revenue,
  (SELECT fm.metric_value FROM financial_metrics fm
   WHERE fm.company_id = c.id AND fm.metric_name = 'netIncome'
   ORDER BY fm.period_end_date DESC LIMIT 1) as latest_net_income,
  (SELECT fm.metric_value FROM financial_metrics fm
   WHERE fm.company_id = c.id AND fm.metric_name = 'totalAssets'
   ORDER BY fm.period_end_date DESC LIMIT 1) as latest_total_assets,
  (SELECT fm.period_end_date FROM financial_metrics fm
   WHERE fm.company_id = c.id AND fm.metric_name = 'revenue'
   ORDER BY fm.period_end_date DESC LIMIT 1) as latest_period,
  (SELECT COUNT(DISTINCT fm.metric_name) FROM financial_metrics fm
   WHERE fm.company_id = c.id) as metrics_count,
  c.finnhub_last_sync,
  c.alpha_vantage_last_sync,
  c.sec_last_sync,
  c.updated_at
FROM companies c;

GRANT SELECT ON company_financial_summary TO anon;

-- Processing history summary
CREATE OR REPLACE VIEW processing_summary AS
SELECT
  c.ticker,
  c.name,
  ph.source_type,
  ph.processing_status,
  ph.metrics_extracted,
  ph.metrics_updated,
  ph.processing_time_ms,
  ph.ai_tokens_used,
  ph.created_at
FROM processing_history ph
JOIN companies c ON c.id = ph.company_id
ORDER BY ph.created_at DESC;

GRANT SELECT ON processing_summary TO anon;
