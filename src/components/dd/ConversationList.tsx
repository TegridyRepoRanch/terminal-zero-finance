// ConversationList - Sidebar showing conversation history
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { DDConversation } from '../../lib/dd-client';

interface ConversationListProps {
  conversations: DDConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isLoading,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300">Conversations</h3>
        <button
          onClick={onCreate}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-zinc-400 rounded-full" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No conversations yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Start chatting to create one
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onSelect={() => onSelect(conv.id)}
              onDelete={() => onDelete(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: DDConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDelete();
    }
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors group',
        isActive
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      )}
    >
      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {conversation.companyName || conversation.ticker}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Clock className="w-3 h-3" />
          {formatDate(conversation.createdAt)}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className={cn(
          'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
        )}
        title="Delete conversation"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </button>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
