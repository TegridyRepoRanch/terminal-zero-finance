// Upload Screen Component
// Entry point for PDF upload flow

import { FileText, ArrowRight, Key, Settings, Zap, Sparkles, Shield } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { ApiKeyModal } from './ApiKeyModal';
import { useUploadStore } from '../../store/useUploadStore';
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
    apiKey,
    geminiApiKey,
    setApiKey,
    setGeminiApiKey,
    showApiKeyModal,
    setShowApiKeyModal,
    extractionMode,
    setExtractionMode,
  } = useUploadStore();

  const handleFileSelect = (file: File) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      setFile(file);
      return;
    }
    // Check if Gemini key is needed for selected mode
    if ((extractionMode === 'thorough' || extractionMode === 'validated') && !geminiApiKey) {
      setShowApiKeyModal(true);
      setFile(file);
      return;
    }
    setFile(file);
    onFileSelected();
  };

  const handleOpenAIKeySave = (key: string) => {
    setApiKey(key);
    checkAndProceed();
  };

  const handleGeminiKeySave = (key: string) => {
    setGeminiApiKey(key);
    checkAndProceed();
  };

  const checkAndProceed = () => {
    const state = useUploadStore.getState();
    if (!state.file) return;

    // Check if we have all required keys
    const needsGemini = state.extractionMode === 'thorough' || state.extractionMode === 'validated';
    if (state.apiKey && (!needsGemini || state.geminiApiKey)) {
      onFileSelected();
    }
  };

  const getKeyStatus = () => {
    const hasOpenAI = !!apiKey;
    const hasGemini = !!geminiApiKey;
    const needsGemini = extractionMode !== 'fast';

    if (hasOpenAI && (!needsGemini || hasGemini)) {
      return { ready: true, message: 'Ready to extract' };
    }
    if (!hasOpenAI) {
      return { ready: false, message: 'OpenAI key required' };
    }
    if (needsGemini && !hasGemini) {
      return { ready: false, message: 'Gemini key required for this mode' };
    }
    return { ready: false, message: 'Configure API keys' };
  };

  const keyStatus = getKeyStatus();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Terminal Zero</h1>
            <p className="text-sm text-zinc-500">DCF Valuation Workstation</p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="
              flex items-center gap-2 px-3 py-2
              text-sm text-zinc-400 hover:text-zinc-200
              bg-zinc-900 rounded-md border border-zinc-800
              hover:border-zinc-700 transition-colors
            "
          >
            <Key className="w-4 h-4" />
            <span>API Keys</span>
            <div className="flex gap-1">
              {apiKey && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
              {geminiApiKey && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
          </button>
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
                const isDisabled = mode.requiresGemini && !geminiApiKey && !apiKey;

                return (
                  <button
                    key={mode.id}
                    onClick={() => setExtractionMode(mode.id)}
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
                    {mode.requiresGemini && !geminiApiKey && (
                      <p className="text-xs text-amber-400 mt-1">Requires Gemini key</p>
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

          {/* API Key Warning */}
          {!keyStatus.ready && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Settings className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-200">
                  {keyStatus.message}
                </p>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-sm text-amber-400 hover:text-amber-300 underline"
                >
                  Configure API keys
                </button>
              </div>
            </div>
          )}

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
              <div className="text-xs text-zinc-500">Client-Side Processing</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span>Terminal Zero v1.0</span>
          <span>API keys are stored locally and never sent to our servers</span>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaveOpenAI={handleOpenAIKeySave}
        onSaveGemini={handleGeminiKeySave}
        currentOpenAIKey={apiKey}
        currentGeminiKey={geminiApiKey}
      />
    </div>
  );
}
