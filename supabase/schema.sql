-- Terminal Zero Finance - Extraction Cache Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zkuqpiesezynxpfedysj/sql

-- Create extractions table for caching SEC filing extractions
CREATE TABLE IF NOT EXISTS extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Filing identification
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(10) NOT NULL CHECK (filing_type IN ('10-K', '10-Q')),
  accession_number VARCHAR(30) NOT NULL UNIQUE,
  filing_date DATE NOT NULL,
  company_name VARCHAR(255) NOT NULL,

  -- Extracted data (stored as JSONB for flexibility)
  financials JSONB NOT NULL,
  confidence JSONB NOT NULL,
  warnings JSONB DEFAULT '[]'::jsonb,

  -- Extraction metadata
  extraction_source VARCHAR(10) NOT NULL CHECK (extraction_source IN ('xbrl', 'ai', 'hybrid')),
  xbrl_field_count INTEGER DEFAULT 0,
  ai_field_count INTEGER DEFAULT 0,
  source_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_extractions_ticker ON extractions(ticker);
CREATE INDEX IF NOT EXISTS idx_extractions_ticker_type ON extractions(ticker, filing_type);
CREATE INDEX IF NOT EXISTS idx_extractions_filing_date ON extractions(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_extractions_created_at ON extractions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous reads (for cache lookups)
CREATE POLICY "Allow anonymous read access" ON extractions
  FOR SELECT
  USING (true);

-- Create policy to allow anonymous inserts (for cache saves)
CREATE POLICY "Allow anonymous insert access" ON extractions
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anonymous updates (for cache updates)
CREATE POLICY "Allow anonymous update access" ON extractions
  FOR UPDATE
  USING (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_extractions_updated_at ON extractions;
CREATE TRIGGER update_extractions_updated_at
  BEFORE UPDATE ON extractions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for extraction statistics
CREATE OR REPLACE VIEW extraction_stats AS
SELECT
  COUNT(*) as total_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'xbrl') as xbrl_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'ai') as ai_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'hybrid') as hybrid_extractions,
  COUNT(DISTINCT ticker) as unique_tickers,
  MIN(created_at) as first_extraction,
  MAX(created_at) as last_extraction
FROM extractions;

-- Grant access to the view
GRANT SELECT ON extraction_stats TO anon;

-- ============================================================================
-- DD Chat Tables - Due Diligence Dual AI Chat Feature
-- ============================================================================

-- DD Chat conversations
CREATE TABLE IF NOT EXISTS dd_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  extraction_id UUID REFERENCES extractions(id),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Snapshot of financial context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DD Chat messages
CREATE TABLE IF NOT EXISTS dd_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dd_conversations(id) ON DELETE CASCADE,
  model VARCHAR(10) NOT NULL CHECK (model IN ('claude', 'gemini', 'user', 'system')),
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for DD tables
CREATE INDEX IF NOT EXISTS idx_dd_conversations_ticker ON dd_conversations(ticker);
CREATE INDEX IF NOT EXISTS idx_dd_conversations_created_at ON dd_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dd_messages_conversation ON dd_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dd_messages_created_at ON dd_messages(created_at);

-- Enable RLS on DD tables
ALTER TABLE dd_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for DD conversations (allow all operations for anonymous)
CREATE POLICY "Allow anonymous access to dd_conversations" ON dd_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for DD messages (allow all operations for anonymous)
CREATE POLICY "Allow anonymous access to dd_messages" ON dd_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for dd_conversations updated_at
DROP TRIGGER IF EXISTS update_dd_conversations_updated_at ON dd_conversations;
CREATE TRIGGER update_dd_conversations_updated_at
  BEFORE UPDATE ON dd_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
