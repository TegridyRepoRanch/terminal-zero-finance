-- Migration: Add RAG (Retrieval Augmented Generation) Support
-- Run this in Supabase SQL Editor after the initial schema

-- ============================================================================
-- 1. Enable pgvector extension for embeddings
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Add filing document storage to extractions table
-- ============================================================================
ALTER TABLE extractions
ADD COLUMN IF NOT EXISTS filing_text TEXT,
ADD COLUMN IF NOT EXISTS filing_html TEXT;

-- ============================================================================
-- 3. Add AI verification tracking to extractions table
-- ============================================================================
ALTER TABLE extractions
ADD COLUMN IF NOT EXISTS ai_verification JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS validation_checks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS anomalies_detected JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- 4. Create filing_chunks table for RAG
-- ============================================================================
CREATE TABLE IF NOT EXISTS filing_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,

  -- Chunk identification
  chunk_index INTEGER NOT NULL,
  section_name VARCHAR(100),  -- "Item 1", "Item 1A", "Item 7", "Item 8", etc.
  section_title VARCHAR(255), -- Full section title

  -- Content
  content TEXT NOT NULL,
  content_length INTEGER GENERATED ALWAYS AS (length(content)) STORED,

  -- Embedding vector (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536),

  -- Metadata
  start_position INTEGER,  -- Character position in original document
  end_position INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for filing_chunks
CREATE INDEX IF NOT EXISTS idx_filing_chunks_extraction ON filing_chunks(extraction_id);
CREATE INDEX IF NOT EXISTS idx_filing_chunks_section ON filing_chunks(section_name);

-- Create vector similarity search index (IVFFlat for faster approximate search)
-- Only create if there are enough rows, otherwise use exact search
CREATE INDEX IF NOT EXISTS idx_filing_chunks_embedding
ON filing_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS on filing_chunks
ALTER TABLE filing_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for filing_chunks (allow all operations for anonymous)
CREATE POLICY "Allow anonymous access to filing_chunks" ON filing_chunks
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. Create vector similarity search function
-- ============================================================================
CREATE OR REPLACE FUNCTION match_filing_chunks(
  query_embedding vector(1536),
  match_extraction_id UUID DEFAULT NULL,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  extraction_id UUID,
  chunk_index INTEGER,
  section_name VARCHAR(100),
  section_title VARCHAR(255),
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.extraction_id,
    fc.chunk_index,
    fc.section_name,
    fc.section_title,
    fc.content,
    1 - (fc.embedding <=> query_embedding) AS similarity
  FROM filing_chunks fc
  WHERE
    (match_extraction_id IS NULL OR fc.extraction_id = match_extraction_id)
    AND fc.embedding IS NOT NULL
    AND 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 6. Create function to get chunks by section
-- ============================================================================
CREATE OR REPLACE FUNCTION get_filing_sections(
  p_extraction_id UUID
)
RETURNS TABLE (
  section_name VARCHAR(100),
  section_title VARCHAR(255),
  chunk_count BIGINT,
  total_length BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.section_name,
    fc.section_title,
    COUNT(*) AS chunk_count,
    SUM(fc.content_length) AS total_length
  FROM filing_chunks fc
  WHERE fc.extraction_id = p_extraction_id
  GROUP BY fc.section_name, fc.section_title
  ORDER BY MIN(fc.chunk_index);
END;
$$;

-- ============================================================================
-- 7. Update extraction_stats view to include new fields
-- ============================================================================
DROP VIEW IF EXISTS extraction_stats;
CREATE OR REPLACE VIEW extraction_stats AS
SELECT
  COUNT(*) as total_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'xbrl') as xbrl_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'ai') as ai_extractions,
  COUNT(*) FILTER (WHERE extraction_source = 'hybrid') as hybrid_extractions,
  COUNT(*) FILTER (WHERE verified_at IS NOT NULL) as verified_extractions,
  COUNT(*) FILTER (WHERE filing_text IS NOT NULL) as extractions_with_text,
  COUNT(DISTINCT ticker) as unique_tickers,
  MIN(created_at) as first_extraction,
  MAX(created_at) as last_extraction,
  (SELECT COUNT(*) FROM filing_chunks) as total_chunks
FROM extractions;

-- Grant access to the view
GRANT SELECT ON extraction_stats TO anon;

-- ============================================================================
-- 8. Create chunk statistics view
-- ============================================================================
CREATE OR REPLACE VIEW chunk_stats AS
SELECT
  e.ticker,
  e.filing_type,
  e.filing_date,
  COUNT(fc.id) as chunk_count,
  SUM(fc.content_length) as total_content_length,
  COUNT(fc.id) FILTER (WHERE fc.embedding IS NOT NULL) as embedded_chunks
FROM extractions e
LEFT JOIN filing_chunks fc ON fc.extraction_id = e.id
GROUP BY e.id, e.ticker, e.filing_type, e.filing_date
ORDER BY e.filing_date DESC;

GRANT SELECT ON chunk_stats TO anon;

-- ============================================================================
-- 9. Add delete policy for filing_chunks
-- ============================================================================
CREATE POLICY "Allow anonymous delete on filing_chunks" ON filing_chunks
  FOR DELETE USING (true);
