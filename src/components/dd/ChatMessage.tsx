// ChatMessage - Individual message bubble component
import { memo } from 'react';
import { User, Sparkles, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessage as ChatMessageType } from '../../lib/dd-client';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  streamingContent?: string;
}

// Simple markdown-like rendering (bold, italic, code)
function renderContent(content: string): React.ReactNode {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, i) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3);
      const [lang, ...lines] = code.split('\n');
      const codeContent = lines.join('\n').trim();
      return (
        <pre
          key={i}
          className="bg-zinc-900 rounded-md p-3 overflow-x-auto text-sm my-2"
        >
          {lang && (
            <div className="text-zinc-500 text-xs mb-1">{lang}</div>
          )}
          <code>{codeContent || lang}</code>
        </pre>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Regular text - handle bold and italic
    return (
      <span key={i}>
        {part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((segment, j) => {
          if (segment.startsWith('**') && segment.endsWith('**')) {
            return <strong key={j}>{segment.slice(2, -2)}</strong>;
          }
          if (segment.startsWith('*') && segment.endsWith('*')) {
            return <em key={j}>{segment.slice(1, -1)}</em>;
          }
          return segment;
        })}
      </span>
    );
  });
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  streamingContent,
}: ChatMessageProps) {
  const isUser = message.model === 'user';
  const isClaude = message.model === 'claude';
  const content = isStreaming ? streamingContent || '' : message.content;

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'bg-zinc-800/30' : 'bg-transparent'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-zinc-700'
            : isClaude
            ? 'bg-emerald-500/20'
            : 'bg-cyan-500/20'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-zinc-300" />
        ) : isClaude ? (
          <Sparkles className="w-4 h-4 text-emerald-400" />
        ) : (
          <Bot className="w-4 h-4 text-cyan-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'text-sm font-medium',
              isUser
                ? 'text-zinc-300'
                : isClaude
                ? 'text-emerald-400'
                : 'text-cyan-400'
            )}
          >
            {isUser ? 'You' : isClaude ? 'Claude' : 'Gemini'}
          </span>
          {!isStreaming && (
            <span className="text-xs text-zinc-600">
              {message.createdAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {isStreaming && (
            <span className="text-xs text-zinc-500 animate-pulse">
              typing...
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
          {renderContent(content)}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
});
