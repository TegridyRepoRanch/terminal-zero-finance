// API Key Modal Component
// Configure OpenAI and Gemini API keys for extraction

import { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink, Sparkles, Zap } from 'lucide-react';

type KeyTab = 'openai' | 'gemini';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOpenAI: (apiKey: string) => void;
  onSaveGemini: (apiKey: string) => void;
  currentOpenAIKey?: string | null;
  currentGeminiKey?: string | null;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  onSaveOpenAI,
  onSaveGemini,
  currentOpenAIKey,
  currentGeminiKey,
}: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<KeyTab>('openai');
  const [openaiKey, setOpenaiKey] = useState(currentOpenAIKey || '');
  const [geminiKey, setGeminiKey] = useState(currentGeminiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'openai') {
      const trimmedKey = openaiKey.trim();
      if (!trimmedKey) {
        setError('Please enter an API key');
        return;
      }
      if (!trimmedKey.startsWith('sk-')) {
        setError('Invalid API key format. Key should start with "sk-"');
        return;
      }
      onSaveOpenAI(trimmedKey);
    } else {
      const trimmedKey = geminiKey.trim();
      if (!trimmedKey) {
        setError('Please enter an API key');
        return;
      }
      if (!trimmedKey.startsWith('AI')) {
        setError('Invalid API key format. Gemini keys typically start with "AI"');
        return;
      }
      onSaveGemini(trimmedKey);
    }
  };

  const maskKey = (key: string | null | undefined, prefix: string) => {
    if (!key) return null;
    return `${prefix}...${key.slice(-4)}`;
  };

  const currentKey = activeTab === 'openai' ? openaiKey : geminiKey;
  const setCurrentKey = activeTab === 'openai' ? setOpenaiKey : setGeminiKey;
  const maskedKey = activeTab === 'openai'
    ? maskKey(currentOpenAIKey, 'sk-')
    : maskKey(currentGeminiKey, 'AI');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-100">
              API Keys
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => { setActiveTab('openai'); setError(null); }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3
              text-sm font-medium transition-colors
              ${activeTab === 'openai'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            <Zap className="w-4 h-4" />
            OpenAI (GPT-4)
            {currentOpenAIKey && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
          </button>
          <button
            onClick={() => { setActiveTab('gemini'); setError(null); }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3
              text-sm font-medium transition-colors
              ${activeTab === 'gemini'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                : 'text-zinc-400 hover:text-zinc-200'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            Gemini 2.5 Pro
            {currentGeminiKey && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {activeTab === 'openai' ? (
            <>
              <p className="text-sm text-zinc-400">
                GPT-4 is used for primary financial data extraction. Fast and reliable
                for standard SEC filings.
              </p>
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Best for:</p>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>• Standard 10-K/10-Q extraction</li>
                  <li>• Quick turnaround</li>
                  <li>• Cost-effective processing</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                Gemini 2.5 Pro provides enhanced accuracy for complex filings and
                additional analysis capabilities.
              </p>
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Best for:</p>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>• Complex segment breakdowns</li>
                  <li>• MD&A qualitative analysis</li>
                  <li>• Tricky table extraction</li>
                  <li>• Final validation pass</li>
                </ul>
              </div>
            </>
          )}

          {maskedKey && (
            <div className="text-sm text-zinc-500">
              Current key: <span className="font-mono">{maskedKey}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-zinc-300"
            >
              {activeTab === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={currentKey}
                onChange={(e) => setCurrentKey(e.target.value)}
                placeholder={activeTab === 'openai' ? 'sk-...' : 'AI...'}
                className={`
                  w-full px-3 py-2 pr-10
                  bg-zinc-800 border border-zinc-700 rounded-md
                  text-zinc-100 placeholder-zinc-500
                  focus:outline-none focus:ring-2 focus:border-transparent
                  font-mono text-sm
                  ${activeTab === 'openai'
                    ? 'focus:ring-emerald-500/50'
                    : 'focus:ring-blue-500/50'
                  }
                `}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <a
            href={activeTab === 'openai'
              ? 'https://platform.openai.com/api-keys'
              : 'https://aistudio.google.com/app/apikey'
            }
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center gap-1 text-sm
              ${activeTab === 'openai'
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-blue-400 hover:text-blue-300'
              }
            `}
          >
            Get an API key from {activeTab === 'openai' ? 'OpenAI' : 'Google AI Studio'}
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-4 py-2
                bg-zinc-800 text-zinc-300 rounded-md
                hover:bg-zinc-700 transition-colors
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`
                flex-1 px-4 py-2 text-white rounded-md transition-colors
                ${activeTab === 'openai'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
                }
              `}
            >
              Save {activeTab === 'openai' ? 'OpenAI' : 'Gemini'} Key
            </button>
          </div>
        </form>

        {/* Footer note */}
        <div className="px-4 pb-4">
          <p className="text-xs text-zinc-600 text-center">
            API keys are stored locally and never sent to our servers
          </p>
        </div>
      </div>
    </div>
  );
}
