// Embedding Service - Generate vector embeddings for RAG
// Uses Gemini text-embedding-004 model (768 dimensions, expandable to 1536)

import type { FilingChunk } from './filing-chunker';

// Embedding dimensions - Gemini uses 768 by default, we'll pad to 1536 for compatibility
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 5; // Process chunks in batches to avoid rate limits

export interface EmbeddedChunk extends FilingChunk {
  embedding: number[];
}

export interface EmbeddingResult {
  embeddedChunks: EmbeddedChunk[];
  totalTokens: number;
  failedChunks: number;
}

// Backend URL for embedding generation
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://server-self-eight.vercel.app'
    : 'http://localhost:3001');

/**
 * Generate embeddings for a batch of texts via backend
 */
async function generateEmbeddingsBatch(
  texts: string[],
  onProgress?: (message: string) => void
): Promise<number[][]> {
  onProgress?.(`Generating embeddings for ${texts.length} chunks...`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/embeddings/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error(result.error || 'Embedding generation failed');
    }

    return result.data.embeddings;
  } catch (error) {
    console.error('[Embedding] Batch generation error:', error);
    throw error;
  }
}

/**
 * Pad or truncate embedding to target dimensions
 */
function normalizeEmbedding(embedding: number[], targetDimensions: number = EMBEDDING_DIMENSIONS): number[] {
  if (embedding.length === targetDimensions) {
    return embedding;
  }

  if (embedding.length > targetDimensions) {
    // Truncate
    return embedding.slice(0, targetDimensions);
  }

  // Pad with zeros
  const padded = [...embedding];
  while (padded.length < targetDimensions) {
    padded.push(0);
  }
  return padded;
}

/**
 * Generate embeddings for filing chunks
 */
export async function embedFilingChunks(
  chunks: FilingChunk[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<EmbeddingResult> {
  console.log(`[Embedding] Processing ${chunks.length} chunks`);

  const embeddedChunks: EmbeddedChunk[] = [];
  let totalTokens = 0;
  let failedChunks = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map(chunk => {
      // Create context-rich text for embedding
      // Include section name for better semantic search
      return `Section: ${chunk.sectionName} - ${chunk.sectionTitle}\n\n${chunk.content}`;
    });

    onProgress?.(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`, i, chunks.length);

    try {
      const embeddings = await generateEmbeddingsBatch(batchTexts);

      // Map embeddings to chunks
      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j]) {
          embeddedChunks.push({
            ...batch[j],
            embedding: normalizeEmbedding(embeddings[j]),
          });
          // Rough token estimate: ~4 chars per token
          totalTokens += Math.ceil(batchTexts[j].length / 4);
        } else {
          console.warn(`[Embedding] No embedding for chunk ${batch[j].chunkIndex}`);
          failedChunks++;
        }
      }
    } catch (error) {
      console.error(`[Embedding] Batch ${i / BATCH_SIZE} failed:`, error);
      failedChunks += batch.length;
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[Embedding] Complete: ${embeddedChunks.length} embedded, ${failedChunks} failed`);

  return {
    embeddedChunks,
    totalTokens,
    failedChunks,
  };
}

/**
 * Generate embedding for a single query (for similarity search)
 */
export async function embedQuery(query: string): Promise<number[]> {
  console.log(`[Embedding] Embedding query: "${query.substring(0, 50)}..."`);

  const embeddings = await generateEmbeddingsBatch([query]);

  if (!embeddings || embeddings.length === 0) {
    throw new Error('Failed to generate query embedding');
  }

  return normalizeEmbedding(embeddings[0]);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find most similar chunks to a query (client-side fallback)
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  embeddedChunks: EmbeddedChunk[],
  topK: number = 5,
  threshold: number = 0.5
): Array<EmbeddedChunk & { similarity: number }> {
  const scored = embeddedChunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .filter(chunk => chunk.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
