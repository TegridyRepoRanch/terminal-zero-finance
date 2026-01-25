// Response Caching Middleware
// Implements intelligent caching for expensive API operations
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Cache entry structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  size: number; // approximate size in bytes
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
}

/**
 * In-memory LRU cache with TTL support
 */
class ResponseCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number; // Max cache size in bytes
  private maxAge: number; // TTL in milliseconds
  private stats: CacheStats;

  constructor(maxSizeMB: number = 100, maxAgeMinutes: number = 60) {
    this.cache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxAge = maxAgeMinutes * 60 * 1000; // Convert minutes to ms
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
    };
  }

  /**
   * Generate cache key from request body content
   */
  private generateKey(data: Record<string, unknown>): string {
    const content = JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: unknown): number {
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > this.maxAge;
  }

  /**
   * Evict least recently used entries to free space
   */
  private evictLRU(requiredSpace: number): void {
    // Sort entries by hits (LRU approximation)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.hits - b.hits
    );

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;

      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.size -= entry.size;
      this.stats.entries--;
      this.stats.evictions++;
    }
  }

  /**
   * Get cached response
   */
  get<T>(data: Record<string, unknown>): T | null {
    const key = this.generateKey(data);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.size -= entry.size;
      this.stats.entries--;
      this.stats.misses++;
      return null;
    }

    // Update hit count (LRU tracking)
    entry.hits++;
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Set cached response
   */
  set<T>(data: Record<string, unknown>, response: T): void {
    const key = this.generateKey(data);
    const size = this.estimateSize(response);

    // Check if we need to evict entries
    if (this.stats.size + size > this.maxSize) {
      this.evictLRU(size);
    }

    // Add to cache
    const entry: CacheEntry<T> = {
      data: response,
      timestamp: Date.now(),
      hits: 0,
      size,
    };

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.size -= oldEntry.size;
      this.stats.entries--;
    }

    this.cache.set(key, entry);
    this.stats.size += size;
    this.stats.entries++;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }
}

// Global cache instance
const geminiCache = new ResponseCache(100, 60); // 100MB, 60 minutes

/**
 * Cache middleware for Gemini API responses
 * Only caches successful responses, not errors
 */
export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only cache POST requests (our API endpoints)
  if (req.method !== 'POST') {
    return next();
  }

  // Try to get from cache
  const cached = geminiCache.get(req.body);
  if (cached) {
    console.log(`[Cache] HIT - Returning cached response (Hit rate: ${geminiCache.getHitRate().toFixed(1)}%)`);
    return res.json({ data: cached, cached: true });
  }

  console.log(`[Cache] MISS - Fetching from API (Hit rate: ${geminiCache.getHitRate().toFixed(1)}%)`);

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to cache response
  res.json = function (body: { data?: unknown; error?: string }) {
    // Only cache successful responses
    if (body.data && !body.error) {
      geminiCache.set(req.body, body.data);
      console.log(`[Cache] STORED - Response cached (Entries: ${geminiCache.getStats().entries})`);
    }

    // Call original json method
    return originalJson(body);
  } as typeof res.json;

  next();
}

/**
 * Endpoint to get cache statistics
 */
export function getCacheStats(req: Request, res: Response) {
  const stats = geminiCache.getStats();
  const hitRate = geminiCache.getHitRate();

  res.json({
    success: true,
    stats: {
      ...stats,
      hitRate: `${hitRate.toFixed(2)}%`,
      sizeMB: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    },
  });
}

/**
 * Endpoint to clear cache
 */
export function clearCache(req: Request, res: Response) {
  geminiCache.clear();
  console.log('[Cache] Cache cleared manually');

  res.json({
    success: true,
    message: 'Cache cleared successfully',
  });
}

// Export cache instance for testing
export { geminiCache };
