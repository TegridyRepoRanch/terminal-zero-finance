// Upload Screen Component
// Entry point for PDF upload flow - Multi-Model Validated Extraction

import { ArrowRight, Shield, Zap, Sparkles, Brain } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { useUploadStore } from '../../store/useUploadStore';
import { hasGeminiKey, hasAnthropicKey } from '../../lib/api-config';

interface UploadScreenProps {
  onFileSelected: () => void;
  onSkip: () => void;
}

export function UploadScreen({ onFileSelected, onSkip }: UploadScreenProps) {
  const { setFile } = useUploadStore();

  const geminiAvailable = hasGeminiKey();
  const anthropicAvailable = hasAnthropicKey();
  const allKeysConfigured = geminiAvailable && anthropicAvailable;

  const handleFileSelect = (file: File) => {
    setFile(file);
    onFileSelected();
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
              Upload SEC Filing
            </h2>
            <p className="text-lg text-zinc-400 max-w-md mx-auto">
              Upload a 10-K or 10-Q PDF and our AI will extract the financial data
              to populate your DCF model automatically.
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

          {/* File Drop Zone */}
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept=".pdf"
            maxSize={50 * 1024 * 1024}
            disabled={!allKeysConfigured}
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
              <div className="text-2xl font-bold text-purple-400">50+</div>
              <div className="text-xs text-zinc-500">Data Points</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span>Terminal Zero v1.0</span>
          <span>Powered by Gemini 3 & Claude Opus</span>
        </div>
      </footer>
    </div>
  );
}
