// Supabase Client Configuration
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client (may be null if not configured)
export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    : null;

// Types for our database tables
export interface DbValuation {
    id: string;
    user_id: string;
    company_ticker: string;
    company_name: string;
    scenarios: Record<string, unknown>;
    assumptions: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface DbUser {
    id: string;
    email: string;
    created_at: string;
    display_name?: string;
}

// Filing chunk for RAG
export interface DbFilingChunk {
    id: string;
    extraction_id: string;
    chunk_index: number;
    section_name: string;
    section_title: string;
    content: string;
    content_length: number;
    embedding: number[] | null;
    start_position: number;
    end_position: number;
    created_at: string;
}

// Vector search result
export interface ChunkSearchResult {
    id: string;
    extraction_id: string;
    chunk_index: number;
    section_name: string;
    section_title: string;
    content: string;
    similarity: number;
}

/**
 * Store filing chunks in Supabase
 */
export async function storeFilingChunks(
    extractionId: string,
    chunks: Array<{
        chunkIndex: number;
        sectionName: string;
        sectionTitle: string;
        content: string;
        embedding: number[];
        startPosition: number;
        endPosition: number;
    }>
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        console.warn('[Supabase] Not configured, skipping chunk storage');
        return { success: false, error: 'Supabase not configured' };
    }

    console.log(`[Supabase] Storing ${chunks.length} chunks for extraction ${extractionId}`);

    // Format chunks for insertion
    const rows = chunks.map(chunk => ({
        extraction_id: extractionId,
        chunk_index: chunk.chunkIndex,
        section_name: chunk.sectionName,
        section_title: chunk.sectionTitle,
        content: chunk.content,
        embedding: chunk.embedding,
        start_position: chunk.startPosition,
        end_position: chunk.endPosition,
    }));

    // Insert in batches of 50 to avoid payload limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from('filing_chunks')
            .insert(batch);

        if (error) {
            console.error('[Supabase] Chunk insert error:', error);
            return { success: false, error: error.message };
        }
    }

    console.log(`[Supabase] Successfully stored ${chunks.length} chunks`);
    return { success: true };
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
    queryEmbedding: number[],
    extractionId?: string,
    limit: number = 5,
    threshold: number = 0.5
): Promise<ChunkSearchResult[]> {
    if (!supabase) {
        console.warn('[Supabase] Not configured, returning empty results');
        return [];
    }

    console.log(`[Supabase] Searching for similar chunks${extractionId ? ` in extraction ${extractionId}` : ''}`);

    // Call the match_filing_chunks function
    const { data, error } = await supabase.rpc('match_filing_chunks', {
        query_embedding: queryEmbedding,
        match_extraction_id: extractionId || null,
        match_count: limit,
        match_threshold: threshold,
    });

    if (error) {
        console.error('[Supabase] Vector search error:', error);
        return [];
    }

    console.log(`[Supabase] Found ${data?.length || 0} similar chunks`);
    return data || [];
}

/**
 * Get all chunks for an extraction
 */
export async function getChunksForExtraction(
    extractionId: string
): Promise<DbFilingChunk[]> {
    if (!supabase) {
        console.warn('[Supabase] Not configured');
        return [];
    }

    const { data, error } = await supabase
        .from('filing_chunks')
        .select('*')
        .eq('extraction_id', extractionId)
        .order('chunk_index', { ascending: true });

    if (error) {
        console.error('[Supabase] Get chunks error:', error);
        return [];
    }

    return data || [];
}

/**
 * Get filing sections summary for an extraction
 */
export async function getFilingSections(
    extractionId: string
): Promise<Array<{ section_name: string; section_title: string; chunk_count: number; total_length: number }>> {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase.rpc('get_filing_sections', {
        p_extraction_id: extractionId,
    });

    if (error) {
        console.error('[Supabase] Get sections error:', error);
        return [];
    }

    return data || [];
}

/**
 * Delete chunks for an extraction (cleanup)
 */
export async function deleteChunksForExtraction(
    extractionId: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    const { error } = await supabase
        .from('filing_chunks')
        .delete()
        .eq('extraction_id', extractionId);

    if (error) {
        console.error('[Supabase] Delete chunks error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Store filing text in extraction record
 */
export async function storeFilingText(
    extractionId: string,
    filingText: string,
    filingHtml?: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    const updateData: Record<string, string> = { filing_text: filingText };
    if (filingHtml) {
        updateData.filing_html = filingHtml;
    }

    const { error } = await supabase
        .from('extractions')
        .update(updateData)
        .eq('id', extractionId);

    if (error) {
        console.error('[Supabase] Store filing text error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Store AI verification results
 */
export async function storeVerificationResults(
    extractionId: string,
    verification: {
        verified: boolean;
        checks: Array<{ name: string; passed: boolean; note?: string }>;
        anomalies: Array<{ field: string; issue: string; severity: string }>;
        notes: string[];
    }
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    const { error } = await supabase
        .from('extractions')
        .update({
            ai_verification: verification,
            validation_checks: verification.checks,
            anomalies_detected: verification.anomalies,
            verified_at: new Date().toISOString(),
        })
        .eq('id', extractionId);

    if (error) {
        console.error('[Supabase] Store verification error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
