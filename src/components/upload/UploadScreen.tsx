// Upload Screen Component
// Entry point for PDF upload flow

import { FileText, ArrowRight, Zap, Sparkles, Shield } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { useUploadStore } from '../../store/useUploadStore';
import { hasGeminiKey } from '../../lib/api-config';
import type { ExtractionMode } from '../../store/useUploadStore';

interface UploadScreenProps {
  onFileSelected: () => void;
  onSkip: () => void;
}

const EXTRACTION_MODES: Array<{
  id: ExtractionMode;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  requiresGemini: boolean;
}> = [
  {
    id: 'fast',
    name: 'Fast',
    description: 'GPT-4 only - quick extraction for standard filings',
    icon: Zap,
    color: 'emerald',
    requiresGemini: false,
  },
  {
    id: 'thorough',
    name: 'Thorough',
    description: 'Gemini for complex segments & MD&A analysis',
    icon: Sparkles,
    color: 'blue',
    requiresGemini: true,
  },
  {
    id: 'validated',
    name: 'Validated',
    description: 'Both models with cross-validation for maximum accuracy',
    icon: Shield,
    color: 'purple',
    requiresGemini: true,
  },
];

export function UploadScreen({ onFileSelected, onSkip }: UploadScreenProps) {
  const {
    setFile,
    extractionMode,
    setExtractionMode,
  } = useUploadStore();

  const geminiAvailable = hasGeminiKey();

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full">
              <FileText className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">
              Upload SEC Filing
            </h2>
            <p className="text-lg text-zinc-400 max-w-md mx-auto">
              Upload a 10-K or 10-Q PDF and our AI will extract the financial data
              to populate your DCF model automatically.
            </p>
          </div>

          {/* Extraction Mode Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-400 text-center">
              Extraction Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {EXTRACTION_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = extractionMode === mode.id;
                const isDisabled = mode.requiresGemini && !geminiAvailable;

                return (
                  <button
                    key={mode.id}
                    onClick={() => !isDisabled && setExtractionMode(mode.id)}
                    disabled={isDisabled}
                    className={`
                      relative p-4 rounded-lg border text-left transition-all
                      ${isSelected
                        ? mode.color === 'emerald'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : mode.color === 'blue'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${
                        isSelected
                          ? mode.color === 'emerald'
                            ? 'text-emerald-400'
                            : mode.color === 'blue'
                              ? 'text-blue-400'
                              : 'text-purple-400'
                          : 'text-zinc-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-zinc-100' : 'text-zinc-300'
                      }`}>
                        {mode.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{mode.description}</p>
                    {mode.requiresGemini && !geminiAvailable && (
                      <p className="text-xs text-amber-400 mt-1">Gemini not configured</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Drop Zone */}
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept=".pdf"
            maxSize={50 * 1024 * 1024}
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
              <div className="text-2xl font-bold text-emerald-400">2</div>
              <div className="text-xs text-zinc-500">AI Models Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">50+</div>
              <div className="text-xs text-zinc-500">Data Points Extracted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">100%</div>
              <div className="text-xs text-zinc-500">Automated Analysis</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span>Terminal Zero v1.0</span>
          <span>Powered by GPT-4 & Gemini</span>
        </div>
      </footer>
    </div>
  );
}
