// DD Client - API client for DD chat feature with SSE support
import { getSupabaseClient } from './supabase-client';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: 'claude' | 'gemini' | 'user' | 'system';
  createdAt: Date;
}

export interface ChatContext {
  ticker?: string;
  companyName?: string;
  financials?: Record<string, unknown>;
  extractionMetadata?: Record<string, unknown>;
  relevantDocumentSections?: Array<{
    section: string;
    title: string;
    content: string;
    similarity: number;
  }>;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error' | 'turn_start' | 'turn_end';
  content?: string;
  model?: 'claude' | 'gemini';
  error?: string;
  turnNumber?: number;
}

export interface DDConversation {
  id: string;
  ticker: string;
  companyName: string | null;
  extractionId: string | null;
  context: ChatContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface DDMessage {
  id: string;
  conversationId: string;
  model: 'claude' | 'gemini' | 'user' | 'system';
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://server-self-eight.vercel.app';

// Get CSRF token
async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/csrf-token`, {
    credentials: 'include',
  });
  const data = await res.json();
  return data.token;
}

/**
 * Stream chat with Claude
 */
export async function streamClaudeChat(
  messages: Array<{ role: string; content: string }>,
  context: ChatContext,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<AbortController> {
  const controller = new AbortController();
  const csrfToken = await getCsrfToken();

  try {
    const response = await fetch(`${API_BASE}/api/chat/claude/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ messages, context }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            if (chunk.type === 'error') {
              onError(chunk.error || 'Unknown error');
            } else if (chunk.type === 'done') {
              onDone();
            } else {
              onChunk(chunk);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError((error as Error).message);
    }
  }

  return controller;
}

/**
 * Stream chat with Gemini
 */
export async function streamGeminiChat(
  messages: Array<{ role: string; content: string }>,
  context: ChatContext,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<AbortController> {
  const controller = new AbortController();
  const csrfToken = await getCsrfToken();

  try {
    const response = await fetch(`${API_BASE}/api/chat/gemini/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ messages, context }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            if (chunk.type === 'error') {
              onError(chunk.error || 'Unknown error');
            } else if (chunk.type === 'done') {
              onDone();
            } else {
              onChunk(chunk);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError((error as Error).message);
    }
  }

  return controller;
}

/**
 * Stream AI-to-AI discussion
 */
export async function streamAIDiscussion(
  topic: string,
  context: ChatContext,
  maxTurns: number,
  startingModel: 'claude' | 'gemini',
  onChunk: (chunk: StreamChunk) => void,
  onTurnStart: (model: 'claude' | 'gemini', turnNumber: number) => void,
  onTurnEnd: (model: 'claude' | 'gemini', turnNumber: number) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<AbortController> {
  const controller = new AbortController();
  const csrfToken = await getCsrfToken();

  try {
    const response = await fetch(`${API_BASE}/api/chat/ai-discussion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ topic, context, maxTurns, startingModel }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const chunk = JSON.parse(data) as StreamChunk;
            switch (chunk.type) {
              case 'turn_start':
                if (chunk.model && chunk.turnNumber) {
                  onTurnStart(chunk.model, chunk.turnNumber);
                }
                break;
              case 'turn_end':
                if (chunk.model && chunk.turnNumber) {
                  onTurnEnd(chunk.model, chunk.turnNumber);
                }
                break;
              case 'text':
                onChunk(chunk);
                break;
              case 'done':
                onDone();
                break;
              case 'error':
                onError(chunk.error || 'Unknown error');
                break;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      onError((error as Error).message);
    }
  }

  return controller;
}

// ============================================================================
// Supabase Persistence Functions
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(
  ticker: string,
  companyName: string | null,
  context: ChatContext,
  extractionId?: string
): Promise<DDConversation | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('dd_conversations')
      .insert({
        ticker: ticker.toUpperCase(),
        company_name: companyName,
        extraction_id: extractionId || null,
        context,
      })
      .select()
      .single();

    if (error) {
      console.error('[DD] Create conversation error:', error);
      return null;
    }

    return {
      id: data.id,
      ticker: data.ticker,
      companyName: data.company_name,
      extractionId: data.extraction_id,
      context: data.context,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  } catch (err) {
    console.error('[DD] Create conversation failed:', err);
    return null;
  }
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: string,
  model: 'claude' | 'gemini' | 'user' | 'system',
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<DDMessage | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('dd_messages')
      .insert({
        conversation_id: conversationId,
        model,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('[DD] Save message error:', error);
      return null;
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      model: data.model,
      role: data.role,
      content: data.content,
      createdAt: new Date(data.created_at),
    };
  } catch (err) {
    console.error('[DD] Save message failed:', err);
    return null;
  }
}

/**
 * Load conversations for a ticker
 */
export async function loadConversations(ticker: string): Promise<DDConversation[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('dd_conversations')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DD] Load conversations error:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      ticker: row.ticker,
      companyName: row.company_name,
      extractionId: row.extraction_id,
      context: row.context,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  } catch (err) {
    console.error('[DD] Load conversations failed:', err);
    return [];
  }
}

/**
 * Load messages for a conversation
 */
export async function loadMessages(conversationId: string): Promise<DDMessage[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('dd_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DD] Load messages error:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      model: row.model,
      role: row.role,
      content: row.content,
      createdAt: new Date(row.created_at),
    }));
  } catch (err) {
    console.error('[DD] Load messages failed:', err);
    return [];
  }
}

/**
 * Delete a conversation and its messages
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('dd_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('[DD] Delete conversation error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[DD] Delete conversation failed:', err);
    return false;
  }
}
