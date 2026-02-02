// DD Store - State management for Due Diligence Dual AI Chat
import { create } from 'zustand';
import type { ChatMessage, ChatContext, DDConversation, StreamChunk } from '../lib/dd-client';
import {
  streamClaudeChat,
  streamGeminiChat,
  streamAIDiscussion,
  createConversation,
  saveMessage,
  loadConversations,
  loadMessages,
  deleteConversation,
} from '../lib/dd-client';
import { useFinanceStore } from './useFinanceStore';
import { embedQuery } from '../lib/embedding-service';
import { searchSimilarChunks, type ChunkSearchResult } from '../lib/supabase';
import { getCachedExtraction } from '../lib/supabase-client';

// Chat mode types
export type ChatMode = 'both' | 'claude-only' | 'gemini-only' | 'ai-to-ai';

// Store state interface
interface DDState {
  // Conversations
  conversations: DDConversation[];
  activeConversationId: string | null;

  // Messages (current conversation)
  claudeMessages: ChatMessage[];
  geminiMessages: ChatMessage[];

  // Mode & streaming state
  chatMode: ChatMode;
  isClaudeStreaming: boolean;
  isGeminiStreaming: boolean;
  claudeStreamingContent: string;
  geminiStreamingContent: string;

  // AI-to-AI settings
  aiDiscussionTurns: number;
  aiDiscussionMaxTurns: number;
  aiDiscussionTopic: string;
  isAIDiscussionActive: boolean;
  currentDiscussionModel: 'claude' | 'gemini' | null;

  // Context (synced from finance store)
  context: ChatContext;

  // Abort controllers for cancellation
  claudeAbortController: AbortController | null;
  geminiAbortController: AbortController | null;
  discussionAbortController: AbortController | null;

  // Error state
  claudeError: string | null;
  geminiError: string | null;

  // Actions
  setChatMode: (mode: ChatMode) => void;
  setMaxTurns: (turns: number) => void;
  setAIDiscussionTopic: (topic: string) => void;
  sendMessage: (content: string, target: 'claude' | 'gemini' | 'both') => Promise<void>;
  startAIDiscussion: () => Promise<void>;
  stopAIDiscussion: () => void;
  stopStreaming: (model: 'claude' | 'gemini' | 'both') => void;
  syncContext: () => void;
  loadConversationHistory: (ticker: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  createNewConversation: () => Promise<void>;
  deleteCurrentConversation: () => Promise<void>;
  reset: () => void;
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const useDDStore = create<DDState>((set, get) => ({
  // Initial state
  conversations: [],
  activeConversationId: null,
  claudeMessages: [],
  geminiMessages: [],
  chatMode: 'both',
  isClaudeStreaming: false,
  isGeminiStreaming: false,
  claudeStreamingContent: '',
  geminiStreamingContent: '',
  aiDiscussionTurns: 0,
  aiDiscussionMaxTurns: 5,
  aiDiscussionTopic: '',
  isAIDiscussionActive: false,
  currentDiscussionModel: null,
  context: {},
  claudeAbortController: null,
  geminiAbortController: null,
  discussionAbortController: null,
  claudeError: null,
  geminiError: null,

  // Set chat mode
  setChatMode: (mode: ChatMode) => {
    set({ chatMode: mode });
  },

  // Set max turns for AI discussion
  setMaxTurns: (turns: number) => {
    const clampedTurns = Math.min(Math.max(1, turns), 20);
    set({ aiDiscussionMaxTurns: clampedTurns });
  },

  // Set AI discussion topic
  setAIDiscussionTopic: (topic: string) => {
    set({ aiDiscussionTopic: topic });
  },

  // Sync context from finance store
  syncContext: () => {
    const financeState = useFinanceStore.getState();
    const context: ChatContext = {
      ticker: financeState.company?.ticker,
      companyName: financeState.company?.name,
      financials: financeState.assumptions as unknown as Record<string, unknown>,
      extractionMetadata: financeState.extractionMetadata as unknown as Record<string, unknown>,
    };
    set({ context });
  },

  // Send message to one or both models
  sendMessage: async (content: string, target: 'claude' | 'gemini' | 'both') => {
    const state = get();

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      model: 'user',
      createdAt: new Date(),
    };

    // Add to appropriate message arrays
    if (target === 'claude' || target === 'both') {
      set(s => ({ claudeMessages: [...s.claudeMessages, userMessage] }));
    }
    if (target === 'gemini' || target === 'both') {
      set(s => ({ geminiMessages: [...s.geminiMessages, userMessage] }));
    }

    // Save to Supabase if we have an active conversation
    if (state.activeConversationId) {
      await saveMessage(state.activeConversationId, 'user', 'user', content);
    }

    // Sync context before sending
    get().syncContext();
    let context = get().context;

    // RAG: Search for relevant document chunks
    if (context.ticker) {
      try {
        // Get the extraction ID for this ticker
        const cached = await getCachedExtraction(context.ticker);
        if (cached?.id) {
          // Generate embedding for the user's question
          const queryEmbedding = await embedQuery(content);

          // Search for similar chunks
          const relevantChunks: ChunkSearchResult[] = await searchSimilarChunks(
            queryEmbedding,
            cached.id,
            5, // Top 5 chunks
            0.4 // Lower threshold for better recall
          );

          if (relevantChunks.length > 0) {
            console.log(`[DD] Found ${relevantChunks.length} relevant chunks for RAG`);

            // Add relevant document sections to context
            const ragContext = relevantChunks.map(chunk => ({
              section: chunk.section_name,
              title: chunk.section_title,
              content: chunk.content,
              similarity: chunk.similarity,
            }));

            context = {
              ...context,
              relevantDocumentSections: ragContext,
            } as ChatContext;
          }
        }
      } catch (ragError) {
        console.warn('[DD] RAG context retrieval failed:', ragError);
        // Continue without RAG context
      }
    }

    // Stream to Claude
    if (target === 'claude' || target === 'both') {
      set({ isClaudeStreaming: true, claudeStreamingContent: '', claudeError: null });

      const messages = get().claudeMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const controller = await streamClaudeChat(
        messages,
        context,
        (chunk: StreamChunk) => {
          if (chunk.content) {
            set(s => ({
              claudeStreamingContent: s.claudeStreamingContent + chunk.content,
            }));
          }
        },
        () => {
          const fullContent = get().claudeStreamingContent;
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            model: 'claude',
            createdAt: new Date(),
          };
          set(s => ({
            claudeMessages: [...s.claudeMessages, assistantMessage],
            isClaudeStreaming: false,
            claudeStreamingContent: '',
            claudeAbortController: null,
          }));

          // Save to Supabase
          const convId = get().activeConversationId;
          if (convId) {
            saveMessage(convId, 'claude', 'assistant', fullContent);
          }
        },
        (error: string) => {
          set({
            isClaudeStreaming: false,
            claudeError: error,
            claudeAbortController: null,
          });
        }
      );

      set({ claudeAbortController: controller });
    }

    // Stream to Gemini
    if (target === 'gemini' || target === 'both') {
      set({ isGeminiStreaming: true, geminiStreamingContent: '', geminiError: null });

      const messages = get().geminiMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const controller = await streamGeminiChat(
        messages,
        context,
        (chunk: StreamChunk) => {
          if (chunk.content) {
            set(s => ({
              geminiStreamingContent: s.geminiStreamingContent + chunk.content,
            }));
          }
        },
        () => {
          const fullContent = get().geminiStreamingContent;
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            model: 'gemini',
            createdAt: new Date(),
          };
          set(s => ({
            geminiMessages: [...s.geminiMessages, assistantMessage],
            isGeminiStreaming: false,
            geminiStreamingContent: '',
            geminiAbortController: null,
          }));

          // Save to Supabase
          const convId = get().activeConversationId;
          if (convId) {
            saveMessage(convId, 'gemini', 'assistant', fullContent);
          }
        },
        (error: string) => {
          set({
            isGeminiStreaming: false,
            geminiError: error,
            geminiAbortController: null,
          });
        }
      );

      set({ geminiAbortController: controller });
    }
  },

  // Start AI-to-AI discussion
  startAIDiscussion: async () => {
    const state = get();
    const topic = state.aiDiscussionTopic.trim();

    if (!topic || topic.length < 5) {
      set({ claudeError: 'Please enter a discussion topic (at least 5 characters)' });
      return;
    }

    // Sync context
    get().syncContext();
    const context = get().context;

    // Clear previous messages and set discussion mode
    set({
      claudeMessages: [],
      geminiMessages: [],
      isAIDiscussionActive: true,
      aiDiscussionTurns: 0,
      claudeStreamingContent: '',
      geminiStreamingContent: '',
      claudeError: null,
      geminiError: null,
    });

    const controller = await streamAIDiscussion(
      topic,
      context,
      state.aiDiscussionMaxTurns,
      'claude', // Start with Claude
      (chunk: StreamChunk) => {
        // Handle text chunks
        if (chunk.content && chunk.model) {
          if (chunk.model === 'claude') {
            set(s => ({
              claudeStreamingContent: s.claudeStreamingContent + chunk.content,
            }));
          } else {
            set(s => ({
              geminiStreamingContent: s.geminiStreamingContent + chunk.content,
            }));
          }
        }
      },
      (model: 'claude' | 'gemini', turnNumber: number) => {
        // Turn started
        set({
          currentDiscussionModel: model,
          aiDiscussionTurns: turnNumber,
        });
        if (model === 'claude') {
          set({ isClaudeStreaming: true, claudeStreamingContent: '' });
        } else {
          set({ isGeminiStreaming: true, geminiStreamingContent: '' });
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (model: 'claude' | 'gemini', _turnNumber: number) => {
        // Turn ended - save the message
        const state = get();
        if (model === 'claude') {
          const content = state.claudeStreamingContent;
          const message: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content,
            model: 'claude',
            createdAt: new Date(),
          };
          set(s => ({
            claudeMessages: [...s.claudeMessages, message],
            isClaudeStreaming: false,
            claudeStreamingContent: '',
          }));

          // Save to Supabase
          const convId = get().activeConversationId;
          if (convId) {
            saveMessage(convId, 'claude', 'assistant', content);
          }
        } else {
          const content = state.geminiStreamingContent;
          const message: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content,
            model: 'gemini',
            createdAt: new Date(),
          };
          set(s => ({
            geminiMessages: [...s.geminiMessages, message],
            isGeminiStreaming: false,
            geminiStreamingContent: '',
          }));

          // Save to Supabase
          const convId = get().activeConversationId;
          if (convId) {
            saveMessage(convId, 'gemini', 'assistant', content);
          }
        }
      },
      () => {
        // Discussion complete
        set({
          isAIDiscussionActive: false,
          isClaudeStreaming: false,
          isGeminiStreaming: false,
          currentDiscussionModel: null,
          discussionAbortController: null,
        });
      },
      (error: string) => {
        set({
          isAIDiscussionActive: false,
          isClaudeStreaming: false,
          isGeminiStreaming: false,
          claudeError: error,
          discussionAbortController: null,
        });
      }
    );

    set({ discussionAbortController: controller });
  },

  // Stop AI discussion
  stopAIDiscussion: () => {
    const state = get();
    if (state.discussionAbortController) {
      state.discussionAbortController.abort();
    }
    set({
      isAIDiscussionActive: false,
      isClaudeStreaming: false,
      isGeminiStreaming: false,
      currentDiscussionModel: null,
      discussionAbortController: null,
    });
  },

  // Stop streaming for specific model
  stopStreaming: (model: 'claude' | 'gemini' | 'both') => {
    const state = get();

    if (model === 'claude' || model === 'both') {
      if (state.claudeAbortController) {
        state.claudeAbortController.abort();
      }
      set({
        isClaudeStreaming: false,
        claudeAbortController: null,
      });
    }

    if (model === 'gemini' || model === 'both') {
      if (state.geminiAbortController) {
        state.geminiAbortController.abort();
      }
      set({
        isGeminiStreaming: false,
        geminiAbortController: null,
      });
    }
  },

  // Load conversation history for a ticker
  loadConversationHistory: async (ticker: string) => {
    const conversations = await loadConversations(ticker);
    set({ conversations });
  },

  // Load a specific conversation
  loadConversation: async (conversationId: string) => {
    const messages = await loadMessages(conversationId);

    // Split messages by model
    const claudeMsgs: ChatMessage[] = [];
    const geminiMsgs: ChatMessage[] = [];

    for (const msg of messages) {
      const chatMsg: ChatMessage = {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        createdAt: msg.createdAt,
      };

      if (msg.model === 'user') {
        // User messages go to both
        claudeMsgs.push(chatMsg);
        geminiMsgs.push(chatMsg);
      } else if (msg.model === 'claude') {
        claudeMsgs.push(chatMsg);
      } else if (msg.model === 'gemini') {
        geminiMsgs.push(chatMsg);
      }
    }

    set({
      activeConversationId: conversationId,
      claudeMessages: claudeMsgs,
      geminiMessages: geminiMsgs,
    });
  },

  // Create a new conversation
  createNewConversation: async () => {
    const state = get();
    const context = state.context;

    if (!context.ticker) {
      console.warn('[DD] Cannot create conversation without ticker');
      return;
    }

    const conversation = await createConversation(
      context.ticker,
      context.companyName || null,
      context
    );

    if (conversation) {
      set(s => ({
        conversations: [conversation, ...s.conversations],
        activeConversationId: conversation.id,
        claudeMessages: [],
        geminiMessages: [],
      }));
    }
  },

  // Delete current conversation
  deleteCurrentConversation: async () => {
    const state = get();
    if (!state.activeConversationId) return;

    const success = await deleteConversation(state.activeConversationId);
    if (success) {
      set(s => ({
        conversations: s.conversations.filter(c => c.id !== s.activeConversationId),
        activeConversationId: null,
        claudeMessages: [],
        geminiMessages: [],
      }));
    }
  },

  // Reset store
  reset: () => {
    const state = get();

    // Abort any ongoing streams
    if (state.claudeAbortController) state.claudeAbortController.abort();
    if (state.geminiAbortController) state.geminiAbortController.abort();
    if (state.discussionAbortController) state.discussionAbortController.abort();

    set({
      conversations: [],
      activeConversationId: null,
      claudeMessages: [],
      geminiMessages: [],
      chatMode: 'both',
      isClaudeStreaming: false,
      isGeminiStreaming: false,
      claudeStreamingContent: '',
      geminiStreamingContent: '',
      aiDiscussionTurns: 0,
      aiDiscussionMaxTurns: 5,
      aiDiscussionTopic: '',
      isAIDiscussionActive: false,
      currentDiscussionModel: null,
      context: {},
      claudeAbortController: null,
      geminiAbortController: null,
      discussionAbortController: null,
      claudeError: null,
      geminiError: null,
    });
  },
}));
