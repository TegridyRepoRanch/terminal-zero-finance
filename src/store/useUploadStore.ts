// Terminal Zero - Upload Flow Store
// Manages state for PDF upload and extraction flow

import { create } from 'zustand';
import type {
  ExtractionStatus,
  ExtractedFinancials,
  ExtractionConfidence,
  ExtractionWarning,
  ExtractionMetadata,
  DerivedMetrics,
} from '../lib/extraction-types';

const OPENAI_API_KEY_STORAGE_KEY = 'terminal-zero-openai-api-key';
const GEMINI_API_KEY_STORAGE_KEY = 'terminal-zero-gemini-api-key';

// Extraction mode determines which models are used
export type ExtractionMode = 'fast' | 'thorough' | 'validated';

interface UploadState {
  // File
  file: File | null;
  fileName: string | null;
  fileSize: number | null;

  // Processing status
  status: ExtractionStatus;
  currentStep: string;
  progress: number; // 0-100

  // Extracted data
  extractedData: ExtractedFinancials | null;
  confidence: ExtractionConfidence | null;
  derivedMetrics: DerivedMetrics | null;
  warnings: ExtractionWarning[];
  metadata: ExtractionMetadata | null;

  // Error handling
  error: string | null;

  // API Keys
  apiKey: string | null; // OpenAI
  geminiApiKey: string | null; // Gemini
  showApiKeyModal: boolean;

  // Extraction mode
  extractionMode: ExtractionMode;

  // Actions
  setFile: (file: File) => void;
  clearFile: () => void;
  setStatus: (status: ExtractionStatus, step?: string) => void;
  setProgress: (progress: number) => void;
  setExtractedData: (
    data: ExtractedFinancials,
    confidence: ExtractionConfidence,
    warnings: ExtractionWarning[]
  ) => void;
  setDerivedMetrics: (metrics: DerivedMetrics) => void;
  setMetadata: (metadata: ExtractionMetadata) => void;
  setError: (error: string) => void;
  clearError: () => void;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  setGeminiApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;
  setShowApiKeyModal: (show: boolean) => void;
  setExtractionMode: (mode: ExtractionMode) => void;
  reset: () => void;
}

// Load API key from localStorage
function loadApiKey(): string | null {
  try {
    return localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Save API key to localStorage
function saveApiKey(key: string): void {
  try {
    localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, key);
  } catch {
    console.warn('Failed to save API key to localStorage');
  }
}

// Remove API key from localStorage
function removeApiKey(): void {
  try {
    localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
  } catch {
    console.warn('Failed to remove API key from localStorage');
  }
}

// Load Gemini API key from localStorage
function loadGeminiApiKey(): string | null {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Save Gemini API key to localStorage
function saveGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
  } catch {
    console.warn('Failed to save Gemini API key to localStorage');
  }
}

// Remove Gemini API key from localStorage
function removeGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    console.warn('Failed to remove Gemini API key from localStorage');
  }
}

const initialState = {
  file: null,
  fileName: null,
  fileSize: null,
  status: 'idle' as ExtractionStatus,
  currentStep: '',
  progress: 0,
  extractedData: null,
  confidence: null,
  derivedMetrics: null,
  warnings: [],
  metadata: null,
  error: null,
  apiKey: loadApiKey(),
  geminiApiKey: loadGeminiApiKey(),
  showApiKeyModal: false,
  extractionMode: 'fast' as ExtractionMode,
};

export const useUploadStore = create<UploadState>((set) => ({
  ...initialState,

  setFile: (file: File) => {
    set({
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'idle',
      error: null,
    });
  },

  clearFile: () => {
    set({
      file: null,
      fileName: null,
      fileSize: null,
      status: 'idle',
      progress: 0,
    });
  },

  setStatus: (status: ExtractionStatus, step?: string) => {
    set({ status, currentStep: step ?? '' });
  },

  setProgress: (progress: number) => {
    set({ progress: Math.min(100, Math.max(0, progress)) });
  },

  setExtractedData: (
    data: ExtractedFinancials,
    confidence: ExtractionConfidence,
    warnings: ExtractionWarning[]
  ) => {
    set({
      extractedData: data,
      confidence,
      warnings,
    });
  },

  setDerivedMetrics: (metrics: DerivedMetrics) => {
    set({ derivedMetrics: metrics });
  },

  setMetadata: (metadata: ExtractionMetadata) => {
    set({ metadata });
  },

  setError: (error: string) => {
    set({ error, status: 'error' });
  },

  clearError: () => {
    set({ error: null });
  },

  setApiKey: (key: string) => {
    saveApiKey(key);
    set({ apiKey: key, showApiKeyModal: false });
  },

  clearApiKey: () => {
    removeApiKey();
    set({ apiKey: null });
  },

  setGeminiApiKey: (key: string) => {
    saveGeminiApiKey(key);
    set({ geminiApiKey: key });
  },

  clearGeminiApiKey: () => {
    removeGeminiApiKey();
    set({ geminiApiKey: null });
  },

  setShowApiKeyModal: (show: boolean) => {
    set({ showApiKeyModal: show });
  },

  setExtractionMode: (mode: ExtractionMode) => {
    set({ extractionMode: mode });
  },

  reset: () => {
    set({
      ...initialState,
      apiKey: loadApiKey(), // Preserve API keys
      geminiApiKey: loadGeminiApiKey(),
    });
  },
}));
