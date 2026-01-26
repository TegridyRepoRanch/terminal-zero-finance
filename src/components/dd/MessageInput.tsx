// MessageInput - Input area with mode selector
import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, Sparkles, Bot, Users, MessagesSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMode } from '../../store/useDDStore';

interface MessageInputProps {
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onSendMessage: (content: string, target: 'claude' | 'gemini' | 'both') => void;
  isDisabled: boolean;
  placeholder?: string;
}

const MODES = [
  {
    id: 'both' as const,
    label: 'Both AIs',
    shortLabel: 'Both',
    icon: Users,
    description: 'Send to both Claude and Gemini',
  },
  {
    id: 'claude-only' as const,
    label: 'Claude Only',
    shortLabel: 'Claude',
    icon: Sparkles,
    description: 'Send to Claude only',
  },
  {
    id: 'gemini-only' as const,
    label: 'Gemini Only',
    shortLabel: 'Gemini',
    icon: Bot,
    description: 'Send to Gemini only',
  },
  {
    id: 'ai-to-ai' as const,
    label: 'AI Discussion',
    shortLabel: 'AI vs AI',
    icon: MessagesSquare,
    description: 'Let the AIs discuss with each other',
  },
];

export function MessageInput({
  chatMode,
  onChatModeChange,
  onSendMessage,
  isDisabled,
  placeholder = 'Ask about the company financials...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find(m => m.id === chatMode) || MODES[0];

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || isDisabled || chatMode === 'ai-to-ai') return;

    const target =
      chatMode === 'claude-only'
        ? 'claude'
        : chatMode === 'gemini-only'
        ? 'gemini'
        : 'both';

    onSendMessage(trimmed, target);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-end gap-2">
        {/* Mode selector */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
              'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            )}
          >
            <currentMode.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{currentMode.shortLabel}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Mode dropdown */}
          {showModeMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
              {MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    onChatModeChange(mode.id);
                    setShowModeMenu(false);
                  }}
                  className={cn(
                    'flex items-start gap-3 w-full px-3 py-2.5 text-left transition-colors',
                    'first:rounded-t-lg last:rounded-b-lg',
                    chatMode === mode.id
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-300 hover:bg-zinc-700/50'
                  )}
                >
                  <mode.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{mode.label}</div>
                    <div className="text-xs text-zinc-500">{mode.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'ai-to-ai'
                ? 'Use the controls above to start an AI discussion'
                : placeholder
            }
            disabled={isDisabled || chatMode === 'ai-to-ai'}
            rows={1}
            className={cn(
              'w-full px-4 py-2.5 pr-12 bg-zinc-800 border border-zinc-700 rounded-lg',
              'text-sm text-zinc-100 placeholder-zinc-500',
              'focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600',
              'resize-none overflow-hidden',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isDisabled || chatMode === 'ai-to-ai'}
            className={cn(
              'absolute right-2 bottom-2 p-1.5 rounded-md transition-colors',
              message.trim() && !isDisabled && chatMode !== 'ai-to-ai'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hint text */}
      <div className="mt-2 text-xs text-zinc-600 px-1">
        {chatMode === 'ai-to-ai' ? (
          <span>Configure the discussion topic and turns above, then click Start</span>
        ) : (
          <span>Press Enter to send, Shift+Enter for new line</span>
        )}
      </div>
    </div>
  );
}
