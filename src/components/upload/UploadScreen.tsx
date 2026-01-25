// Upload Screen Component
// Entry point for PDF upload flow

import { FileText, ArrowRight, Key, Settings } from 'lucide-react';
import { FileDropZone } from './FileDropZone';
import { ApiKeyModal } from './ApiKeyModal';
import { useUploadStore } from '../../store/useUploadStore';

interface UploadScreenProps {
  onFileSelected: () => void;
  onSkip: () => void;
}

export function UploadScreen({ onFileSelected, onSkip }: UploadScreenProps) {
  const {
    setFile,
    apiKey,
    setApiKey,
    showApiKeyModal,
    setShowApiKeyModal,
  } = useUploadStore();

  const handleFileSelect = (file: File) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      // Store file temporarily
      setFile(file);
      return;
    }
    setFile(file);
    onFileSelected();
  };

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    // If a file was already selected, proceed
    const { file } = useUploadStore.getState();
    if (file) {
      onFileSelected();
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
            <span>{apiKey ? 'API Key Set' : 'Set API Key'}</span>
            {apiKey && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
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

          {/* File Drop Zone */}
          <FileDropZone
            onFileSelect={handleFileSelect}
            accept=".pdf"
            maxSize={50 * 1024 * 1024}
          />

          {/* API Key Warning */}
          {!apiKey && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Settings className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-200">
                  You'll need an OpenAI API key to extract financial data.
                </p>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="text-sm text-amber-400 hover:text-amber-300 underline"
                >
                  Configure API key
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
              <div className="text-2xl font-bold text-emerald-400">AI</div>
              <div className="text-xs text-zinc-500">Powered by GPT-4</div>
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
          <span>Your API key is stored locally and never sent to our servers</span>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeySave}
        currentKey={apiKey}
      />
    </div>
  );
}
