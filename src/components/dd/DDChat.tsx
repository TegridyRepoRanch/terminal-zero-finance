// DDChat - Main container for DD Dual AI Chat feature
import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDDStore } from '../../store/useDDStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { ChatPanel } from './ChatPanel';
import { MessageInput } from './MessageInput';
import { AIDiscussionControls } from './AIDiscussionControls';
import { ContextPanel } from './ContextPanel';
import { ConversationList } from './ConversationList';
import { DDPromptSelector } from './DDPromptSelector';

export default function DDChat() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [completedTemplates, setCompletedTemplates] = useState<string[]>([]);

  // Finance store for context
  const company = useFinanceStore(s => s.company);

  // DD store
  const {
    conversations,
    activeConversationId,
    claudeMessages,
    geminiMessages,
    chatMode,
    isClaudeStreaming,
    isGeminiStreaming,
    claudeStreamingContent,
    geminiStreamingContent,
    aiDiscussionTurns,
    aiDiscussionMaxTurns,
    aiDiscussionTopic,
    isAIDiscussionActive,
    currentDiscussionModel,
    context,
    claudeError,
    geminiError,
    setChatMode,
    setMaxTurns,
    setAIDiscussionTopic,
    sendMessage,
    startAIDiscussion,
    stopAIDiscussion,
    stopStreaming,
    syncContext,
    loadConversationHistory,
    loadConversation,
    createNewConversation,
    deleteCurrentConversation,
  } = useDDStore();

  // Sync context when company changes
  useEffect(() => {
    syncContext();
  }, [company, syncContext]);

  // Load conversation history when company changes
  useEffect(() => {
    if (company?.ticker) {
      setIsLoadingHistory(true);
      loadConversationHistory(company.ticker).finally(() => {
        setIsLoadingHistory(false);
      });
    }
  }, [company?.ticker, loadConversationHistory]);

  // Auto-create conversation on first message if none exists
  const handleSendMessage = async (content: string, target: 'claude' | 'gemini' | 'both') => {
    if (!activeConversationId && company?.ticker) {
      await createNewConversation();
    }
    sendMessage(content, target);
  };

  // Handle template selection
  const handleSelectTemplate = async (prompt: string, templateId: string) => {
    if (!activeConversationId && company?.ticker) {
      await createNewConversation();
    }
    // Send to both AIs by default for analysis templates
    sendMessage(prompt, 'both');
    // Track completed templates
    if (!completedTemplates.includes(templateId)) {
      setCompletedTemplates(prev => [...prev, templateId]);
    }
  };

  // Handle starting AI discussion
  const handleStartDiscussion = async () => {
    if (!activeConversationId && company?.ticker) {
      await createNewConversation();
    }
    startAIDiscussion();
  };

  const isStreaming = isClaudeStreaming || isGeminiStreaming || isAIDiscussionActive;

  // No company selected warning
  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-200 mb-2">
          No Company Selected
        </h2>
        <p className="text-zinc-400 max-w-md">
          Please select a company by uploading a filing or searching for a ticker.
          The DD Chat feature works best with financial data loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Sidebar - Conversation History */}
      {showSidebar && (
        <div className="w-64 flex-shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={loadConversation}
            onCreate={createNewConversation}
            onDelete={async (id) => {
              if (id === activeConversationId) {
                await deleteCurrentConversation();
              }
            }}
            isLoading={isLoadingHistory}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1" />

          {/* Refresh context button */}
          <button
            onClick={syncContext}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh financial context"
          >
            <RefreshCw className="w-3 h-3" />
            Sync Context
          </button>
        </div>

        {/* Context panel */}
        <ContextPanel context={context} />

        {/* AI Discussion controls (only in ai-to-ai mode) */}
        {chatMode === 'ai-to-ai' && (
          <div className="px-4 pt-4">
            <AIDiscussionControls
              topic={aiDiscussionTopic}
              onTopicChange={setAIDiscussionTopic}
              maxTurns={aiDiscussionMaxTurns}
              onMaxTurnsChange={setMaxTurns}
              currentTurn={aiDiscussionTurns}
              isActive={isAIDiscussionActive}
              currentModel={currentDiscussionModel}
              onStart={handleStartDiscussion}
              onStop={stopAIDiscussion}
            />
          </div>
        )}

        {/* DD Analysis Templates - show when no messages or always as collapsible */}
        {chatMode !== 'ai-to-ai' && (
          <div className="px-4 pt-4">
            <DDPromptSelector
              onSelectPrompt={handleSelectTemplate}
              completedTemplates={completedTemplates}
              disabled={isStreaming}
            />
          </div>
        )}

        {/* Chat panels */}
        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {/* Claude panel */}
          <div
            className={cn(
              'flex-1 min-w-0',
              chatMode === 'gemini-only' && 'hidden'
            )}
          >
            <ChatPanel
              model="claude"
              messages={claudeMessages}
              isStreaming={isClaudeStreaming}
              streamingContent={claudeStreamingContent}
              error={claudeError}
              onStopStreaming={() => stopStreaming('claude')}
              visible={chatMode !== 'gemini-only'}
            />
          </div>

          {/* Gemini panel */}
          <div
            className={cn(
              'flex-1 min-w-0',
              chatMode === 'claude-only' && 'hidden'
            )}
          >
            <ChatPanel
              model="gemini"
              messages={geminiMessages}
              isStreaming={isGeminiStreaming}
              streamingContent={geminiStreamingContent}
              error={geminiError}
              onStopStreaming={() => stopStreaming('gemini')}
              visible={chatMode !== 'claude-only'}
            />
          </div>
        </div>

        {/* Message input */}
        <MessageInput
          chatMode={chatMode}
          onChatModeChange={setChatMode}
          onSendMessage={handleSendMessage}
          isDisabled={isStreaming}
          placeholder={`Ask about ${company.name || company.ticker} financials...`}
        />
      </div>
    </div>
  );
}
