// API Key Modal Component
// Configure OpenAI API key for extraction

import { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentKey?: string | null;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  onSave,
  currentKey,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentKey || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    if (!trimmedKey.startsWith('sk-')) {
      setError('Invalid API key format. Key should start with "sk-"');
      return;
    }

    onSave(trimmedKey);
  };

  const maskedKey = currentKey
    ? `sk-...${currentKey.slice(-4)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-100">
              OpenAI API Key
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-zinc-400">
            Your API key is stored locally in your browser and never sent to our
            servers. It's used only to communicate directly with OpenAI.
          </p>

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
              API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="
                  w-full px-3 py-2 pr-10
                  bg-zinc-800 border border-zinc-700 rounded-md
                  text-zinc-100 placeholder-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
                  font-mono text-sm
                "
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
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
          >
            Get an API key from OpenAI
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
              className="
                flex-1 px-4 py-2
                bg-emerald-600 text-white rounded-md
                hover:bg-emerald-500 transition-colors
              "
            >
              Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
