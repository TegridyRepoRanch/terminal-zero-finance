// ChatPanel - Single chat panel for Claude or Gemini
import { useRef, useEffect } from 'react';
import { Sparkles, Bot, AlertCircle, Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../lib/dd-client';

interface ChatPanelProps {
  model: 'claude' | 'gemini';
  messages: ChatMessageType[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  onStopStreaming: () => void;
  visible?: boolean;
}

export function ChatPanel({
  model,
  messages,
  isStreaming,
  streamingContent,
  error,
  onStopStreaming,
  visible = true,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isClaude = model === 'claude';

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isClaude ? 'border-emerald-500/20' : 'border-cyan-500/20'
        )}
      >
        <div className="flex items-center gap-2">
          {isClaude ? (
            <Sparkles className="w-5 h-5 text-emerald-400" />
          ) : (
            <Bot className="w-5 h-5 text-cyan-400" />
          )}
          <span
            className={cn(
              'font-medium',
              isClaude ? 'text-emerald-400' : 'text-cyan-400'
            )}
          >
            {isClaude ? 'Claude 4.5 Opus' : 'Gemini 3 Pro'}
          </span>
        </div>

        {/* Streaming indicator / stop button */}
        {isStreaming && (
          <button
            onClick={onStopStreaming}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
              isClaude
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
            )}
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming && !error && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                isClaude ? 'bg-emerald-500/10' : 'bg-cyan-500/10'
              )}
            >
              {isClaude ? (
                <Sparkles className="w-6 h-6 text-emerald-400/50" />
              ) : (
                <Bot className="w-6 h-6 text-cyan-400/50" />
              )}
            </div>
            <p className="text-sm text-center">
              Send a message to start chatting with{' '}
              {isClaude ? 'Claude' : 'Gemini'}
            </p>
          </div>
        )}

        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: '',
              model,
              createdAt: new Date(),
            }}
            isStreaming
            streamingContent={streamingContent}
          />
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 m-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
