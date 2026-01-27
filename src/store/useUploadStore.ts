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

// SEC filing data from SEC EDGAR API
export interface SECFilingData {
  text: string;
  rawHtml: string; // Raw HTML for XBRL parsing
  originalLength: number;
  source: 'sec';
  metadata: {
    ticker: string;
    companyName: string;
    filingType: '10-K' | '10-Q' | 'unknown';
    filingDate: string;
    accessionNumber: string;
    url: string;
  };
}

interface UploadState {
  // File (for PDF upload)
  file: File | null;
  fileName: string | null;
  fileSize: number | null;

  // SEC filing data (for ticker fetch)
  secFilingData: SECFilingData | null;

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

  // Force re-extraction flag (skip cache)
  forceReextract: boolean;

  // Error handling
  error: string | null;

  // Actions
  setFile: (file: File) => void;
  setSecFilingData: (data: SECFilingData) => void;
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
  setForceReextract: (force: boolean) => void;
  reset: () => void;
}

const initialState = {
  file: null,
  fileName: null,
  fileSize: null,
  secFilingData: null,
  status: 'idle' as ExtractionStatus,
  currentStep: '',
  progress: 0,
  extractedData: null,
  confidence: null,
  derivedMetrics: null,
  warnings: [],
  metadata: null,
  forceReextract: false,
  error: null,
};

export const useUploadStore = create<UploadState>((set) => ({
  ...initialState,

  setFile: (file: File) => {
    set({
      file,
      fileName: file.name,
      fileSize: file.size,
      secFilingData: null, // Clear SEC data when uploading file
      status: 'idle',
      error: null,
    });
  },

  setSecFilingData: (data: SECFilingData) => {
    set({
      file: null, // Clear file when fetching from SEC
      fileName: data.metadata.companyName + ' ' + data.metadata.filingType,
      fileSize: data.originalLength,
      secFilingData: data,
      status: 'idle',
      error: null,
    });
  },

  clearFile: () => {
    set({
      file: null,
      fileName: null,
      fileSize: null,
      secFilingData: null,
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

  setForceReextract: (force: boolean) => {
    set({ forceReextract: force });
  },

  reset: () => {
    set(initialState);
  },
}));
