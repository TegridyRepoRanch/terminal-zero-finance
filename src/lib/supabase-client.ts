// Supabase Client - Database for caching extraction results
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedFinancials, ExtractionConfidence, ExtractionWarning, ExtractionSource } from './extraction-types';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Database types
export interface CachedExtraction {
  id: string;
  ticker: string;
  filing_type: '10-K' | '10-Q';
  accession_number: string;
  filing_date: string;
  company_name: string;
  financials: ExtractedFinancials;
  confidence: ExtractionConfidence;
  warnings: ExtractionWarning[];
  extraction_source: ExtractionSource;
  xbrl_field_count: number;
  ai_field_count: number;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CacheInsertData {
  ticker: string;
  filing_type: '10-K' | '10-Q';
  accession_number: string;
  filing_date: string;
  company_name: string;
  financials: ExtractedFinancials;
  confidence: ExtractionConfidence;
  warnings: ExtractionWarning[];
  extraction_source: ExtractionSource;
  xbrl_field_count: number;
  ai_field_count: number;
  source_url: string | null;
}

// Singleton client
let supabase: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn('[Supabase] Not configured - caching disabled');
    return null;
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client initialized');
  }

  return supabase;
}

/**
 * Look up cached extraction by accession number (unique filing identifier)
 */
export async function getCachedExtraction(
  accessionNumber: string
): Promise<CachedExtraction | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('extractions')
      .select('*')
      .eq('accession_number', accessionNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not an error, just not cached
        return null;
      }
      console.error('[Supabase] Cache lookup error:', error);
      return null;
    }

    console.log(`[Supabase] Cache hit for ${accessionNumber}`);
    return data as CachedExtraction;
  } catch (err) {
    console.error('[Supabase] Cache lookup failed:', err);
    return null;
  }
}

/**
 * Look up cached extraction by ticker and filing type
 * Returns the most recent extraction for that ticker/type combo
 */
export async function getCachedExtractionByTicker(
  ticker: string,
  filingType: '10-K' | '10-Q'
): Promise<CachedExtraction | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('extractions')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('filing_type', filingType)
      .order('filing_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[Supabase] Cache lookup error:', error);
      return null;
    }

    console.log(`[Supabase] Cache hit for ${ticker} ${filingType}`);
    return data as CachedExtraction;
  } catch (err) {
    console.error('[Supabase] Cache lookup failed:', err);
    return null;
  }
}

/**
 * Save extraction result to cache
 */
export async function cacheExtraction(
  data: CacheInsertData
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Upsert - update if exists, insert if not
    const { error } = await client
      .from('extractions')
      .upsert(
        {
          ...data,
          ticker: data.ticker.toUpperCase(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'accession_number',
        }
      );

    if (error) {
      console.error('[Supabase] Cache save error:', error);
      return false;
    }

    console.log(`[Supabase] Cached extraction for ${data.ticker} ${data.filing_type}`);
    return true;
  } catch (err) {
    console.error('[Supabase] Cache save failed:', err);
    return false;
  }
}

/**
 * Get extraction statistics
 */
export async function getExtractionStats(): Promise<{
  totalExtractions: number;
  xbrlExtractions: number;
  aiExtractions: number;
  hybridExtractions: number;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('extractions')
      .select('extraction_source');

    if (error) {
      console.error('[Supabase] Stats query error:', error);
      return null;
    }

    const stats = {
      totalExtractions: data.length,
      xbrlExtractions: data.filter(d => d.extraction_source === 'xbrl').length,
      aiExtractions: data.filter(d => d.extraction_source === 'ai').length,
      hybridExtractions: data.filter(d => d.extraction_source === 'hybrid').length,
    };

    return stats;
  } catch (err) {
    console.error('[Supabase] Stats query failed:', err);
    return null;
  }
}

/**
 * Delete cached extraction
 */
export async function deleteCachedExtraction(accessionNumber: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('extractions')
      .delete()
      .eq('accession_number', accessionNumber);

    if (error) {
      console.error('[Supabase] Delete error:', error);
      return false;
    }

    console.log(`[Supabase] Deleted cache for ${accessionNumber}`);
    return true;
  } catch (err) {
    console.error('[Supabase] Delete failed:', err);
    return false;
  }
}
