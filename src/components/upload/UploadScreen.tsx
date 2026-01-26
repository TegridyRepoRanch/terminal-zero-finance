// Upload Screen Component
// Entry point for PDF upload flow - Multi-Model Validated Extraction

import { useState } from 'react';
import { ArrowRight, Shield, Zap, Sparkles, Brain, Search, Loader2, FileText, Globe } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { useUploadStore } from '../../store/useUploadStore';
import { hasGeminiKey, hasAnthropicKey } from '../../lib/api-config';
import { fetchLatest10K, fetchLatest10Q } from '../../lib/sec-edgar-client';
import { truncateForLLM } from '../../lib/pdf-parser';

interface UploadScreenProps {
  onFileSelected: () => void;
  onSkip: () => void;
}

export function UploadScreen({ onFileSelected, onSkip }: UploadScreenProps) {
  const { setFile, setSecFilingData } = useUploadStore();
  const [ticker, setTicker] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);

  const geminiAvailable = hasGeminiKey();
  const anthropicAvailable = hasAnthropicKey();
  const allKeysConfigured = geminiAvailable && anthropicAvailable;

  const handleFileSelect = (file: File) => {
    setFile(file);
    onFileSelected();
  };

  const handleFetchFiling = async (type: '10-K' | '10-Q') => {
    if (!ticker.trim()) {
      setFetchError('Please enter a ticker symbol');
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    setFetchProgress(`Looking up ${ticker.toUpperCase()}...`);

    try {
      const fetchFn = type === '10-K' ? fetchLatest10K : fetchLatest10Q;
      const result = await fetchFn(ticker, (msg) => setFetchProgress(msg));

      // Truncate text for LLM processing
      const truncatedText = truncateForLLM(result.text, 120000);

      // Store the SEC filing data
      setSecFilingData({
        text: truncatedText,
        originalLength: result.text.length,
        source: 'sec',
        metadata: {
          ticker: result.metadata.ticker,
          companyName: result.metadata.companyName,
          filingType: result.metadata.form as '10-K' | '10-Q' | 'unknown',
          filingDate: result.metadata.filingDate,
          accessionNumber: result.metadata.accessionNumber,
          url: result.url,
        },
      });

      setFetchProgress(`Found ${result.metadata.companyName} ${type} - processing...`);
      onFileSelected();
    } catch (error) {
      console.error('[Upload] SEC fetch error:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch filing');
    } finally {
      setIsFetching(false);
      setFetchProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Terminal Zero</h1>
            <p className="text-sm text-zinc-500">DCF Valuation Workstation</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full">
              <Shield className="w-8 h-8 text-purple-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">
              Import SEC Filing
            </h2>
            <p className="text-lg text-zinc-400 max-w-md mx-auto">
              Fetch directly from SEC EDGAR by ticker, or upload a 10-K/10-Q PDF.
            </p>
          </div>

          {/* Multi-Model Badge */}
          <div className="p-4 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 via-orange-500/5 to-purple-500/5 border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold text-zinc-200">4-Layer Validated Extraction</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-zinc-400">Gemini Flash</span>
              </div>
              <div className="text-zinc-600">→</div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Gemini Pro</span>
              </div>
              <div className="text-zinc-600">→</div>
              <div className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-zinc-400">Claude Opus</span>
              </div>
              <div className="text-zinc-600">→</div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-400">Final Review</span>
              </div>
            </div>
          </div>

          {/* API Key Status */}
          {!allKeysConfigured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400 font-medium mb-2">API Keys Required</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={geminiAvailable ? 'text-emerald-400' : 'text-red-400'}>
                    {geminiAvailable ? '✓' : '✗'}
                  </span>
                  <span className="text-zinc-400">
                    VITE_GEMINI_API_KEY {geminiAvailable ? 'configured' : 'missing'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={anthropicAvailable ? 'text-emerald-400' : 'text-red-400'}>
                    {anthropicAvailable ? '✓' : '✗'}
                  </span>
                  <span className="text-zinc-400">
                    VITE_ANTHROPIC_API_KEY {anthropicAvailable ? 'configured' : 'missing'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ticker Search - SEC EDGAR Integration */}
          <div className="p-6 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-200">Fetch from SEC EDGAR</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">NEW</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="Enter ticker symbol (e.g., AAPL)"
                  disabled={isFetching || !allKeysConfigured}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-3 pl-10 pr-4
                    text-zinc-100 placeholder-zinc-500
                    focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all font-mono text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchFiling('10-K')}
                />
              </div>
              <button
                onClick={() => handleFetchFiling('10-K')}
                disabled={isFetching || !ticker.trim() || !allKeysConfigured}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 
                  text-white font-semibold rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                10-K
              </button>
              <button
                onClick={() => handleFetchFiling('10-Q')}
                disabled={isFetching || !ticker.trim() || !allKeysConfigured}
                className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 
                  text-white font-semibold rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                10-Q
              </button>
            </div>

            {/* Progress/Error Messages */}
            {fetchProgress && !fetchError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                {fetchProgress}
              </div>
            )}
            {fetchError && (
              <div className="mt-3 text-sm text-red-400">
                {fetchError}
              </div>
            )}

            <p className="mt-3 text-xs text-zinc-500">
              Fetches the latest filing directly from SEC.gov - no file upload needed!
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-sm text-zinc-500">or upload a file</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* File Drop Zone */}
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept=".pdf"
            maxSize={50 * 1024 * 1024}
            disabled={!allKeysConfigured || isFetching}
          />

          {/* Skip Option */}
          <div className="text-center pt-4">
            <button
              onClick={onSkip}
              className="
                inline-flex items-center gap-2
                text-zinc-400 hover:text-zinc-200
                transition-colors group
              "
            >
              <span>Skip to manual entry</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">3</div>
              <div className="text-xs text-zinc-500">AI Models</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">4</div>
              <div className="text-xs text-zinc-500">Validation Layers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">SEC</div>
              <div className="text-xs text-zinc-500">Direct Access</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span>Terminal Zero v1.0</span>
          <span>Powered by Gemini 3, Claude Opus & SEC EDGAR</span>
        </div>
      </footer>
    </div>
  );
}

