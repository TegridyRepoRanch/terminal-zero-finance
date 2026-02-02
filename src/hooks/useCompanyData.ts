// React hook for unified company data fetching
// Handles loading states, caching, and incremental updates

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchCompanyData,
  getCompanyDataStatus,
  type CompanyDataStatus,
  type DataFetchResult,
  type SmartExtractionOptions,
} from '../lib/unified-data-service';
import { isFinnhubConfigured } from '../lib/finnhub-api';
import { isAlphaVantageConfigured } from '../lib/alpha-vantage-api';
import { isSupabaseConfigured } from '../lib/supabase';

export interface UseCompanyDataResult {
  // State
  status: CompanyDataStatus | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  lastResult: DataFetchResult | null;

  // Actions
  fetchData: (options?: Partial<SmartExtractionOptions>) => Promise<DataFetchResult>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;

  // Service status
  services: {
    supabase: boolean;
    finnhub: boolean;
    alphaVantage: boolean;
  };
}

export interface UseCompanyDataOptions {
  autoFetch?: boolean;              // Automatically fetch on mount
  autoRefreshInterval?: number;     // Auto-refresh interval in ms (0 = disabled)
  skipIfComplete?: boolean;         // Skip fetch if data completeness > 90%
  onProgress?: (message: string) => void;
}

const DEFAULT_OPTIONS: UseCompanyDataOptions = {
  autoFetch: false,
  autoRefreshInterval: 0,
  skipIfComplete: false,
};

/**
 * Hook for fetching and managing company financial data
 *
 * @example
 * ```tsx
 * const { status, isLoading, fetchData } = useCompanyData('AAPL');
 *
 * useEffect(() => {
 *   if (status?.dataCompleteness < 80) {
 *     fetchData();
 *   }
 * }, [status]);
 * ```
 */
export function useCompanyData(
  ticker: string,
  options: UseCompanyDataOptions = {}
): UseCompanyDataResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedTicker = ticker.toUpperCase();

  // State
  const [status, setStatus] = useState<CompanyDataStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DataFetchResult | null>(null);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Service availability
  const services = {
    supabase: isSupabaseConfigured,
    finnhub: isFinnhubConfigured(),
    alphaVantage: isAlphaVantageConfigured(),
  };

  // Refresh company status from database
  const refreshStatus = useCallback(async () => {
    if (!normalizedTicker) return;

    try {
      const newStatus = await getCompanyDataStatus(normalizedTicker);
      if (mountedRef.current) {
        setStatus(newStatus);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('[useCompanyData] Status refresh error:', e);
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [normalizedTicker]);

  // Fetch data from all sources
  const fetchData = useCallback(async (
    fetchOptions?: Partial<SmartExtractionOptions>
  ): Promise<DataFetchResult> => {
    if (!normalizedTicker) {
      return {
        success: false,
        ticker: '',
        metricsUpdated: 0,
        metricsUnchanged: 0,
        metricsFailed: 0,
        sources: [],
        errors: ['No ticker specified'],
        processingTimeMs: 0,
      };
    }

    setIsFetching(true);
    setError(null);

    try {
      const result = await fetchCompanyData(
        normalizedTicker,
        fetchOptions,
        opts.onProgress
      );

      if (mountedRef.current) {
        setLastResult(result);

        if (!result.success && result.errors.length > 0) {
          setError(result.errors.join('; '));
        }

        // Refresh status after fetch
        await refreshStatus();
      }

      return result;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';

      if (mountedRef.current) {
        setError(errorMsg);
      }

      return {
        success: false,
        ticker: normalizedTicker,
        metricsUpdated: 0,
        metricsUnchanged: 0,
        metricsFailed: 0,
        sources: [],
        errors: [errorMsg],
        processingTimeMs: 0,
      };
    } finally {
      if (mountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [normalizedTicker, opts.onProgress, refreshStatus]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refreshStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [refreshStatus]);

  // Auto-fetch on mount
  useEffect(() => {
    if (opts.autoFetch && status !== null && !isFetching) {
      // Check if we should skip
      if (opts.skipIfComplete && status.dataCompleteness >= 90) {
        console.log('[useCompanyData] Skipping fetch - data is complete');
        return;
      }

      fetchData();
    }
  }, [opts.autoFetch, opts.skipIfComplete, status, isFetching, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (opts.autoRefreshInterval && opts.autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refreshStatus();
      }, opts.autoRefreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [opts.autoRefreshInterval, refreshStatus]);

  return {
    status,
    isLoading,
    isFetching,
    error,
    lastResult,
    fetchData,
    refreshStatus,
    clearError,
    services,
  };
}

/**
 * Hook for fetching data for multiple companies
 */
export function useMultipleCompanyData(
  tickers: string[],
  options: UseCompanyDataOptions = {}
): {
  results: Map<string, UseCompanyDataResult>;
  isAnyLoading: boolean;
  isAnyFetching: boolean;
  fetchAll: () => Promise<Map<string, DataFetchResult>>;
} {
  const normalizedTickers = tickers.map(t => t.toUpperCase());

  // Create individual hooks for each ticker
  const resultsMap = new Map<string, UseCompanyDataResult>();

  // This is a simplified implementation - in production you might want
  // to use a more sophisticated state management approach
  const [isAnyLoading, setIsAnyLoading] = useState(true);
  const [isAnyFetching, setIsAnyFetching] = useState(false);

  const fetchAll = useCallback(async (): Promise<Map<string, DataFetchResult>> => {
    setIsAnyFetching(true);
    const results = new Map<string, DataFetchResult>();

    try {
      // Fetch in parallel with concurrency limit
      const CONCURRENCY = 3;
      for (let i = 0; i < normalizedTickers.length; i += CONCURRENCY) {
        const batch = normalizedTickers.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(ticker =>
            fetchCompanyData(ticker, {}, options.onProgress)
              .then(result => ({ ticker, result }))
              .catch(e => ({
                ticker,
                result: {
                  success: false,
                  ticker,
                  metricsUpdated: 0,
                  metricsUnchanged: 0,
                  metricsFailed: 0,
                  sources: [],
                  errors: [e instanceof Error ? e.message : 'Unknown error'],
                  processingTimeMs: 0,
                } as DataFetchResult
              }))
          )
        );

        for (const { ticker, result } of batchResults) {
          results.set(ticker, result);
        }
      }
    } finally {
      setIsAnyFetching(false);
    }

    return results;
  }, [normalizedTickers, options.onProgress]);

  return {
    results: resultsMap,
    isAnyLoading,
    isAnyFetching,
    fetchAll,
  };
}

export default useCompanyData;
