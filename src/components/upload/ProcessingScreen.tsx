// Processing Screen Component - Multi-Model Validated Extraction
// Pipeline: XBRL Parse -> Gemini Flash -> Gemini Pro -> Claude Opus -> Final Review

import { useEffect, useState } from 'react';
import { FileText, Check, Loader2, AlertCircle, ArrowLeft, Zap, Sparkles, Brain, Shield, Database } from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { extractTextFromPDF, truncateForLLM } from '../../lib/pdf-parser';
import { extractFinancialsWithGemini } from '../../lib/gemini-client';
import { extractFinancialsWithClaude, performFinalReview } from '../../lib/anthropic-client';
import { extractFinancialsWithBackend, extractFinancialsWithClaudeBackend, performFinalReviewBackend } from '../../lib/backend-client';
import { calculateDerivedMetrics, mapToAssumptions, validateAssumptions } from '../../lib/extraction-mapper';
import { getConfigMode, getGeminiApiKey, hasGeminiKey, getAnthropicApiKey, hasAnthropicKey } from '../../lib/api-config';
import { FINANCIAL_EXTRACTION_PROMPT } from '../../lib/prompts';
import { tryExtractFromXBRL, mergeXBRLWithAI, type XBRLExtractionResult } from '../../lib/xbrl-extractor';
import type { ExtractionMetadata, ExtractionWarning, LLMExtractionResponse, ExtractionSource } from '../../lib/extraction-types';
import { getCachedExtraction, cacheExtraction, deleteCachedExtraction, isSupabaseConfigured } from '../../lib/supabase-client';
import { chunkSecFiling } from '../../lib/filing-chunker';
import { embedFilingChunks } from '../../lib/embedding-service';
 
import { storeFilingChunks, storeFilingText, storeVerificationResults, isSupabaseConfigured as supabaseClientConfigured } from '../../lib/supabase';

// Backend URL for verification API
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://server-self-eight.vercel.app'
    : 'http://localhost:3001');

interface ProcessingScreenProps {
  onComplete: () => void;
  onError: () => void;
  onCancel: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error' | 'skipped';
  icon: 'flash' | 'pro' | 'claude' | 'review' | 'parse' | 'map' | 'xbrl';
}

const STEPS: ProcessingStep[] = [
  { id: 'parse', label: 'Parsing document', status: 'pending', icon: 'parse' },
  { id: 'xbrl', label: 'XBRL structured data extraction', status: 'pending', icon: 'xbrl' },
  { id: 'flash', label: 'AI extraction pass 1 (Gemini Flash)', status: 'pending', icon: 'flash' },
  { id: 'pro', label: 'AI extraction pass 2 (Gemini Pro)', status: 'pending', icon: 'pro' },
  { id: 'claude', label: 'AI extraction pass 3 (Claude Opus)', status: 'pending', icon: 'claude' },
  { id: 'review', label: 'Final validation', status: 'pending', icon: 'review' },
  { id: 'rag', label: 'Preparing document for Q&A', status: 'pending', icon: 'xbrl' },
  { id: 'map', label: 'Processing results', status: 'pending', icon: 'map' },
];

// Confidence threshold to skip AI extraction entirely (XBRL data is sufficient)
// When XBRL confidence >= 50%, we trust the structured data and skip hallucination-prone AI
// This prevents AI timeout issues on Vercel (55s limit) while ensuring reasonable data quality
// Note: confidence is stored as decimal (0-1), so 0.5 = 50%
const XBRL_SKIP_AI_THRESHOLD = 0.5;

export function ProcessingScreen({ onComplete, onError, onCancel }: ProcessingScreenProps) {
  const {
    file,
    secFilingData,
    forceReextract,
    setStatus,
    setProgress,
    setExtractedData,
    setDerivedMetrics,
    setMetadata,
    setError,
    setForceReextract,
  } = useUploadStore();

  const [steps, setSteps] = useState<ProcessingStep[]>(STEPS);
  const [currentStepMessage, setCurrentStepMessage] = useState('Initializing extraction pipeline...');
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const updateStep = (stepId: string, status: ProcessingStep['status']) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  useEffect(() => {
    if (!file && !secFilingData) {
      setError('No file or SEC filing data available');
      onError();
      return;
    }

    // Detect configuration mode
    const configMode = getConfigMode();
    console.log('[Processing] Configuration mode:', configMode);

    // Check configuration based on mode
    if (configMode === 'unconfigured') {
      const msg = 'No API configuration found. Please set VITE_BACKEND_URL or VITE_GEMINI_API_KEY.';
      console.error('[Processing]', msg);
      setError(msg);
      setErrorMessage(msg);
      setIsStarting(false);
      return;
    }

    // Get API key
    let geminiApiKey: string = '';

    if (configMode === 'legacy') {
      console.log('[Processing] Running in LEGACY mode (frontend API keys)');
      console.log('[Processing] Gemini key present:', hasGeminiKey());

      if (!hasGeminiKey()) {
        const msg = 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.';
        console.error('[Processing]', msg);
        setError(msg);
        setErrorMessage(msg);
        setIsStarting(false);
        return;
      }

      try {
        geminiApiKey = getGeminiApiKey();
        console.log('[Processing] API key retrieved successfully');
      } catch (keyError) {
        const msg = `Failed to get API key: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`;
        console.error('[Processing]', msg);
        setError(msg);
        setErrorMessage(msg);
        setIsStarting(false);
        return;
      }
    } else {
      console.log('[Processing] Running in BACKEND mode (API keys on server)');
      // Check if we have legacy keys as fallback
      if (hasGeminiKey()) {
        try {
          geminiApiKey = getGeminiApiKey();
          console.log('[Processing] Legacy fallback API key available');
        } catch {
          // Ignore - we'll try backend first
        }
      }
    }

    let cancelled = false;

    const runExtraction = async () => {
      console.log('[Processing] Starting extraction pipeline...');
      console.log('[Processing] File:', file?.name, file?.size);

      try {
        // Signal that we've started
        setIsStarting(false);
        setCurrentStepMessage('Starting extraction pipeline...');

        const totalSteps = steps.length;
        let currentStep = 0;

        const progressForStep = (stepProgress: number) => {
          const baseProgress = (currentStep / totalSteps) * 100;
          const stepSize = 100 / totalSteps;
          return baseProgress + (stepProgress * stepSize / 100);
        };

        // Step 1: Get text from PDF or SEC filing
        console.log('[Processing] Step 1: Getting document text...');
        updateStep('parse', 'active');

        let documentText: string;

        // Check if we have SEC filing data (no PDF parsing needed)
        if (secFilingData) {
          console.log('[Processing] Using SEC EDGAR text, length:', secFilingData.text.length);
          documentText = secFilingData.text;
          setStatus('parsing', `Using ${secFilingData.metadata.ticker} ${secFilingData.metadata.filingType}...`);
          setCurrentStepMessage(`Loaded ${secFilingData.metadata.companyName} ${secFilingData.metadata.filingType} from SEC EDGAR...`);
          // Brief pause for UI
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (file) {
          // Parse PDF file
          setStatus('parsing', 'Reading PDF...');
          setCurrentStepMessage('Extracting text from PDF document...');

          try {
            const pdfData = await extractTextFromPDF(file, (progress) => {
              setProgress(progressForStep(progress.percent));
              setCurrentStepMessage(`Reading page ${progress.currentPage} of ${progress.totalPages}...`);
            });
            console.log('[Processing] PDF text extracted, length:', pdfData.text.length, 'pages:', pdfData.pageCount);

            if (!pdfData.text || pdfData.text.length < 100) {
              throw new Error('Could not extract text from PDF. The file may be scanned or corrupted.');
            }

            documentText = truncateForLLM(pdfData.text); // Uses default 60k limit for faster processing
          } catch (parseError) {
            console.error('[Processing] PDF parse error:', parseError);
            throw new Error(`PDF parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error('No file or SEC filing data available for processing');
        }

        if (cancelled) return;

        updateStep('parse', 'complete');
        currentStep++;
        setProgress(progressForStep(0));

        console.log('[Processing] Text length for extraction:', documentText.length);

        // Check cache for SEC filings (before doing expensive AI extraction)
        // Skip cache if forceReextract is true
        if (secFilingData && isSupabaseConfigured() && !forceReextract) {
          console.log('[Processing] Checking cache for:', secFilingData.metadata.accessionNumber);
          setCurrentStepMessage('Checking extraction cache...');

          const cached = await getCachedExtraction(secFilingData.metadata.accessionNumber);

          if (cached) {
            console.log('[Processing] Cache hit! Using cached extraction');
            setCurrentStepMessage('Found cached extraction!');

            // Skip all AI steps - mark as complete/skipped
            updateStep('xbrl', 'skipped');
            updateStep('flash', 'skipped');
            updateStep('pro', 'skipped');
            updateStep('claude', 'skipped');
            updateStep('review', 'skipped');

            // Use cached data
            const derivedMetrics = calculateDerivedMetrics(cached.financials);

            setExtractedData(cached.financials, cached.confidence, cached.warnings);
            setDerivedMetrics(derivedMetrics);

            updateStep('map', 'complete');
            setProgress(100);

            const metadata: ExtractionMetadata = {
              fileName: `${cached.ticker} ${cached.filing_type}`,
              fileSize: secFilingData.originalLength,
              filingType: cached.financials.filingType,
              companyName: cached.company_name,
              fiscalPeriod: cached.financials.fiscalPeriod,
              extractedAt: new Date(cached.created_at),
              confidence: cached.confidence.overall,
              pageCount: 0,
              processingTimeMs: Date.now() - startTime,
              sourceUrl: cached.source_url || undefined,
              extractionSource: cached.extraction_source,
              xbrlFieldCount: cached.xbrl_field_count,
              aiFieldCount: cached.ai_field_count,
            };

            setMetadata(metadata);
            setStatus('complete', 'Done! (from cache)');

            await new Promise((resolve) => setTimeout(resolve, 300));
            if (!cancelled) onComplete();
            return;
          }

          console.log('[Processing] No cache hit, proceeding with extraction');
        } else if (forceReextract && secFilingData && isSupabaseConfigured()) {
          // Force re-extract: delete old cache entry
          console.log('[Processing] Force re-extract: deleting cached extraction for:', secFilingData.metadata.accessionNumber);
          setCurrentStepMessage('Clearing cached extraction...');
          await deleteCachedExtraction(secFilingData.metadata.accessionNumber);
          // Reset the flag
          setForceReextract(false);
        }

        let finalFinancials;
        let finalConfidence;
        let allWarnings: ExtractionWarning[] = [];
        let extractionSource: ExtractionSource = 'ai';
        let xbrlResult: XBRLExtractionResult | null = null;
        let xbrlFieldCount = 0;
        let aiFieldCount = 0;
        let xbrlFieldsUsed: string[] = [];
        let aiFieldsUsed: string[] = [];

        // Step 1.5: Try XBRL extraction (only for SEC filings with raw HTML)
        console.log('[Processing] Step 1.5: XBRL extraction...');
        updateStep('xbrl', 'active');
        setCurrentStepMessage('Checking for iXBRL structured data...');

        if (secFilingData?.rawHtml) {
          const filingType = secFilingData.metadata.filingType === '10-K' || secFilingData.metadata.filingType === '10-Q'
            ? secFilingData.metadata.filingType
            : '10-K';

          xbrlResult = tryExtractFromXBRL(
            secFilingData.rawHtml,
            filingType,
            (msg) => setCurrentStepMessage(msg)
          );

          if (xbrlResult) {
            const confidencePct = Math.round(xbrlResult.confidence.overall * 100);
            console.log(`[Processing] XBRL extraction successful: ${xbrlResult.xbrlFieldsUsed.length} fields, ${confidencePct}% confidence`);
            xbrlFieldCount = xbrlResult.xbrlFieldsUsed.length;
            extractionSource = 'xbrl';
            allWarnings = [...allWarnings, ...xbrlResult.warnings];
            updateStep('xbrl', 'complete');

            // Skip AI extraction if XBRL confidence is high enough
            // This prevents AI hallucination and speeds up extraction
            if (xbrlResult.confidence.overall >= XBRL_SKIP_AI_THRESHOLD) {
              console.log(`[Processing] XBRL confidence ${confidencePct}% >= ${XBRL_SKIP_AI_THRESHOLD * 100}%, skipping AI extraction`);
              setCurrentStepMessage(`High-confidence iXBRL extraction (${confidencePct}%) - skipping AI`);

              // Skip all AI steps
              updateStep('flash', 'skipped');
              updateStep('pro', 'skipped');
              updateStep('claude', 'skipped');
              updateStep('review', 'skipped');

              // Use XBRL result directly
              finalFinancials = xbrlResult.financials;
              finalConfidence = xbrlResult.confidence;
              aiFieldCount = 0;

              // Add note about pure XBRL extraction
              finalFinancials.extractionNotes = [
                ...(finalFinancials.extractionNotes || []),
                `Pure iXBRL extraction: ${xbrlFieldCount} fields at ${confidencePct}% confidence (AI skipped)`,
              ];

              // Jump to mapping step
              updateStep('map', 'active');
              setStatus('mapping', 'Processing results...');
              setCurrentStepMessage('Calculating derived metrics...');

              const derivedMetrics = calculateDerivedMetrics(finalFinancials);
              const assumptions = mapToAssumptions(finalFinancials, derivedMetrics);
              const validationWarnings = validateAssumptions(assumptions, finalFinancials);
              allWarnings = [...allWarnings, ...validationWarnings];

              setExtractedData(finalFinancials, finalConfidence, allWarnings);
              setDerivedMetrics(derivedMetrics);

              updateStep('map', 'complete');
              setProgress(100);

              // Create metadata
              const metadata: ExtractionMetadata = {
                fileName: secFilingData
                  ? `${secFilingData.metadata.ticker} ${secFilingData.metadata.filingType}`
                  : (file?.name || 'Unknown'),
                fileSize: secFilingData
                  ? secFilingData.originalLength
                  : (file?.size || 0),
                filingType: finalFinancials.filingType,
                companyName: finalFinancials.companyName,
                fiscalPeriod: finalFinancials.fiscalPeriod,
                extractedAt: new Date(),
                confidence: finalConfidence.overall,
                pageCount: 0,
                processingTimeMs: Date.now() - startTime,
                sourceUrl: secFilingData?.metadata?.url,
                extractionSource: 'xbrl',
                xbrlFieldCount,
                aiFieldCount: 0,
                xbrlFieldsUsed: xbrlResult.xbrlFieldsUsed,
                aiFieldsUsed: [],
              };

              setMetadata(metadata);
              setStatus('complete', 'Done! (iXBRL only)');

              // Save to cache
              if (secFilingData && isSupabaseConfigured()) {
                console.log('[Processing] Saving XBRL-only extraction to cache...');
                cacheExtraction({
                  ticker: secFilingData.metadata.ticker,
                  filing_type: filingType,
                  accession_number: secFilingData.metadata.accessionNumber,
                  filing_date: secFilingData.metadata.filingDate,
                  company_name: finalFinancials.companyName,
                  financials: finalFinancials,
                  confidence: finalConfidence,
                  warnings: allWarnings,
                  extraction_source: 'xbrl',
                  xbrl_field_count: xbrlFieldCount,
                  ai_field_count: 0,
                  source_url: secFilingData.metadata.url || null,
                });
              }

              await new Promise((resolve) => setTimeout(resolve, 500));
              if (!cancelled) onComplete();
              return;
            }
          } else {
            console.log('[Processing] No usable XBRL data found, proceeding with AI extraction');
            setCurrentStepMessage('No iXBRL data found, using AI extraction...');
            updateStep('xbrl', 'complete');
          }
        } else {
          console.log('[Processing] No raw HTML available for XBRL parsing (PDF upload)');
          setCurrentStepMessage('Skipping iXBRL (PDF upload)...');
          updateStep('xbrl', 'skipped');
        }

        if (cancelled) return;
        currentStep++;
        setProgress(progressForStep(0));

        // Get Anthropic API key if available
        let anthropicApiKey: string = '';
        if (hasAnthropicKey()) {
          try {
            anthropicApiKey = getAnthropicApiKey();
          } catch {
            console.warn('[Processing] Anthropic API key not available, Claude steps will be skipped');
          }
        }

        // Store extraction results for final comparison
        let flashResult: LLMExtractionResponse | null = null;
        let proResult: LLMExtractionResponse | null = null;
        let claudeResult: LLMExtractionResponse | null = null;

        // Use document text (already truncated if from PDF, or from SEC filing)
        const truncatedText = documentText;
        console.log('[Processing] Using document text, length:', truncatedText.length);

        // Determine if we're using backend or legacy mode
        const useBackend = configMode === 'backend';
        console.log('[Processing] Using backend mode:', useBackend);

        // Step 2: Gemini Flash extraction (fast first pass)
        console.log('[Processing] Step 2: Gemini Flash extraction...');
        updateStep('flash', 'active');
        setStatus('extracting', 'Gemini 2.0 Flash (pass 1)...');
        setCurrentStepMessage('Running extraction pass 1 with Gemini 2.0 Flash (fast)...');

        try {
          if (useBackend) {
            flashResult = await extractFinancialsWithBackend(
              truncatedText,
              FINANCIAL_EXTRACTION_PROMPT,
              (message: string) => setCurrentStepMessage(message),
              true // useFlash = true
            );
          } else {
            if (!geminiApiKey) {
              throw new Error('Gemini API key not available. Please add VITE_GEMINI_API_KEY to your environment.');
            }
            flashResult = await extractFinancialsWithGemini(
              truncatedText,
              geminiApiKey,
              (message: string) => setCurrentStepMessage(message),
              true // useFlash = true
            );
          }
          console.log('[Processing] Gemini Flash extraction complete, confidence:', flashResult.confidence.overall);

          // Log extraction notes for debugging
          if (flashResult.financials.extractionNotes?.length) {
            console.log('[Processing] Extraction notes:', flashResult.financials.extractionNotes);
          }

          // Warn if confidence is low, but don't try raw PDF (too slow/timeout prone)
          if (flashResult.confidence.overall < 0.3) {
            console.warn('[Processing] Low confidence extraction - PDF may be missing Item 8 financial statements');
            setCurrentStepMessage('Warning: Low confidence - financial data may be incomplete');
          }

          updateStep('flash', 'complete');
        } catch (flashError) {
          console.error('[Processing] Gemini Flash error:', flashError);
          throw new Error(`Gemini Flash extraction failed: ${flashError instanceof Error ? flashError.message : 'Unknown error'}`);
        }

        if (cancelled) return;
        currentStep++;
        setProgress(progressForStep(0));

        // Step 3: Gemini Pro extraction (more accurate)
        console.log('[Processing] Step 3: Gemini Pro extraction...');
        updateStep('pro', 'active');
        setStatus('extracting', 'Gemini 1.5 Pro (pass 2)...');
        setCurrentStepMessage('Running extraction pass 2 with Gemini 1.5 Pro (accurate)...');

        try {
          if (useBackend) {
            proResult = await extractFinancialsWithBackend(
              truncatedText,
              FINANCIAL_EXTRACTION_PROMPT,
              (message: string) => setCurrentStepMessage(message),
              false // useFlash = false (use Pro)
            );
          } else {
            proResult = await extractFinancialsWithGemini(
              truncatedText,
              geminiApiKey,
              (message: string) => setCurrentStepMessage(message),
              false // useFlash = false (use Pro)
            );
          }
          console.log('[Processing] Gemini Pro extraction complete');
          updateStep('pro', 'complete');
        } catch (proError) {
          console.error('[Processing] Gemini Pro error:', proError);
          // If Pro fails, use Flash result as fallback
          console.warn('[Processing] Using Flash result as Pro fallback');
          proResult = flashResult;
          updateStep('pro', 'complete');
        }

        if (cancelled) return;
        currentStep++;
        setProgress(progressForStep(0));

        // Step 4: Claude Opus extraction (backend mode always has access, legacy needs key)
        console.log('[Processing] Step 4: Claude Opus extraction...');
        updateStep('claude', 'active');

        const canUseClaude = useBackend || !!anthropicApiKey;
        if (canUseClaude) {
          setStatus('extracting', 'Claude Opus (pass 3)...');
          setCurrentStepMessage('Running extraction pass 3 with Claude Opus (best reasoning)...');

          try {
            if (useBackend) {
              claudeResult = await extractFinancialsWithClaudeBackend(
                truncatedText,
                FINANCIAL_EXTRACTION_PROMPT,
                (message: string) => setCurrentStepMessage(message)
              );
            } else {
              claudeResult = await extractFinancialsWithClaude(
                truncatedText,
                anthropicApiKey,
                (message: string) => setCurrentStepMessage(message)
              );
            }
            console.log('[Processing] Claude Opus extraction complete');
            updateStep('claude', 'complete');
          } catch (claudeError) {
            console.error('[Processing] Claude Opus error:', claudeError);
            // If Claude fails, use Pro result as fallback
            console.warn('[Processing] Using Pro result as Claude fallback');
            claudeResult = proResult;
            updateStep('claude', 'complete');
          }
        } else {
          console.log('[Processing] Skipping Claude (no API key)');
          setCurrentStepMessage('Skipping Claude Opus (API key not configured)...');
          claudeResult = proResult;
          updateStep('claude', 'complete');
        }

        if (cancelled) return;
        currentStep++;
        setProgress(progressForStep(0));

        // Step 5: Final cross-model validation
        console.log('[Processing] Step 5: Final validation...');
        updateStep('review', 'active');
        setStatus('extracting', 'Final validation...');
        setCurrentStepMessage('Comparing all extractions against source document...');

        let finalResult: LLMExtractionResponse & { validationSummary?: { agreementRate: number; majorDiscrepancies: string[]; resolvedBy: string; notes: string } };

        if (canUseClaude && flashResult && proResult && claudeResult) {
          try {
            if (useBackend) {
              // Build the final review prompt for backend
              const finalReviewPrompt = JSON.stringify({
                flash: flashResult,
                pro: proResult,
                claude: claudeResult,
                sourceText: truncatedText.substring(0, 50000), // Limit source text for prompt size
              });
              finalResult = await performFinalReviewBackend(
                finalReviewPrompt,
                (message: string) => setCurrentStepMessage(message)
              ) as LLMExtractionResponse & { validationSummary?: { agreementRate: number; majorDiscrepancies: string[]; resolvedBy: string; notes: string } };
            } else {
              finalResult = await performFinalReview(
                flashResult,
                proResult,
                claudeResult,
                truncatedText,
                anthropicApiKey,
                (message: string) => setCurrentStepMessage(message)
              );
            }
            console.log('[Processing] Final validation complete');

            // Add validation summary to notes
            if (finalResult.validationSummary) {
              finalResult.financials.extractionNotes.push(
                `Cross-model agreement rate: ${(finalResult.validationSummary.agreementRate * 100).toFixed(0)}%`,
                `Validation notes: ${finalResult.validationSummary.notes}`
              );
              if (finalResult.validationSummary.majorDiscrepancies.length > 0) {
                allWarnings.push({
                  field: 'validation',
                  message: `Discrepancies found in: ${finalResult.validationSummary.majorDiscrepancies.join(', ')}`,
                  severity: 'medium',
                });
              }
            }
          } catch (reviewError) {
            console.error('[Processing] Final review error:', reviewError);
            // Fall back to the best single extraction (Pro is typically most reliable)
            console.warn('[Processing] Using Pro result as final fallback');
            finalResult = proResult!;
          }
        } else {
          // No Claude access - just use the best Gemini result (Pro)
          console.log('[Processing] Using Gemini Pro as final result (no Claude API key)');
          finalResult = proResult!;
          finalResult.financials.extractionNotes.push(
            'Note: Single-model extraction (Claude Opus validation not available)'
          );
        }

        updateStep('review', 'complete');
        currentStep++;

        // Defensive check: ensure finalResult has expected structure
        if (!finalResult?.financials) {
          console.warn('[Processing] Final result missing financials, falling back to Flash result');
          finalResult = flashResult!;
        }

        // If we have XBRL data, merge it with AI result (XBRL takes priority)
        if (xbrlResult && xbrlResult.xbrlFieldsUsed.length > 0) {
          console.log('[Processing] Merging XBRL data with AI extraction...');
          const mergedResult = mergeXBRLWithAI(xbrlResult, finalResult, (msg) => setCurrentStepMessage(msg));
          finalFinancials = mergedResult.financials;
          finalConfidence = mergedResult.confidence;
          extractionSource = mergedResult.source;
          xbrlFieldCount = mergedResult.xbrlFieldsUsed.length;
          aiFieldCount = mergedResult.aiFieldsUsed.length;
          xbrlFieldsUsed = mergedResult.xbrlFieldsUsed;
          aiFieldsUsed = mergedResult.aiFieldsUsed;
          allWarnings = [...allWarnings, ...mergedResult.warnings];
          console.log(`[Processing] Final extraction: ${xbrlFieldCount} XBRL fields, ${aiFieldCount} AI fields`);
        } else {
          finalFinancials = finalResult.financials;
          finalConfidence = finalResult.confidence;
          extractionSource = 'ai';
          const financialsRecord = finalResult.financials as unknown as Record<string, unknown>;
          aiFieldsUsed = Object.keys(finalResult.financials).filter(k =>
            typeof financialsRecord[k] === 'number'
          );
          aiFieldCount = aiFieldsUsed.length;
          allWarnings = [...allWarnings, ...(finalResult.warnings || [])];
        }

        if (cancelled) return;

        // Step: RAG Processing - Chunk and embed document for Q&A
        updateStep('rag', 'active');
        setStatus('extracting', 'Preparing document for Q&A...');
        setCurrentStepMessage('Chunking document into sections...');

        // Variables to store RAG data for later persistence
        type ChunkData = {
          chunkIndex: number;
          sectionName: string;
          sectionTitle: string;
          content: string;
          embedding: number[];
          startPosition: number;
          endPosition: number;
        };
        type VerificationData = {
          verified: boolean;
          checks: Array<{ name: string; passed: boolean; note?: string }>;
          anomalies: Array<{ field: string; issue: string; severity: string }>;
          notes: string[];
        };
        let pendingChunks: ChunkData[] = [];
        let pendingFilingText: string = '';
        let pendingVerification: VerificationData | null = null;

        // Only do RAG processing for SEC filings with text
        if (secFilingData && supabaseClientConfigured) {
          try {
            // Chunk the document by SEC sections
            const filingType = secFilingData.metadata.filingType === '10-K' || secFilingData.metadata.filingType === '10-Q'
              ? secFilingData.metadata.filingType
              : '10-K';

            const chunkedFiling = chunkSecFiling(documentText, filingType);
            console.log(`[Processing] Created ${chunkedFiling.chunks.length} chunks from ${chunkedFiling.sectionCount} sections`);

            setCurrentStepMessage(`Generating embeddings for ${chunkedFiling.chunks.length} chunks...`);

            // Generate embeddings for chunks
            const embeddingResult = await embedFilingChunks(
              chunkedFiling.chunks,
              (msg, current, total) => {
                setCurrentStepMessage(`${msg} (${current}/${total})`);
              }
            );

            console.log(`[Processing] Generated embeddings: ${embeddingResult.embeddedChunks.length} success, ${embeddingResult.failedChunks} failed`);

            // Run AI verification on the extracted data
            if (finalFinancials && embeddingResult.embeddedChunks.length > 0) {
              setCurrentStepMessage('Running AI verification...');

              // Get key sections for verification context
              const keyChunks = embeddingResult.embeddedChunks
                .filter(chunk =>
                  chunk.sectionName.includes('Item 7') ||
                  chunk.sectionName.includes('Item 8') ||
                  chunk.sectionName.includes('Item 1A')
                )
                .slice(0, 5)
                .map(chunk => chunk.content);

              if (keyChunks.length > 0) {
                try {
                  const verifyResponse = await fetch(`${BACKEND_URL}/api/embeddings/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      extractedData: finalFinancials,
                      relevantChunks: keyChunks,
                    }),
                  });

                  if (verifyResponse.ok) {
                    const verifyResult = await verifyResponse.json();
                    if (verifyResult.status === 'success') {
                      const verification = verifyResult.data;
                      console.log(`[Processing] AI verification: ${verification.verified ? 'PASSED' : 'ISSUES FOUND'}`);

                      // Add verification results to extraction notes
                      finalFinancials.extractionNotes = [
                        ...(finalFinancials.extractionNotes || []),
                        `AI Verification: ${verification.verified ? 'Passed' : 'Issues detected'}`,
                        ...verification.notes,
                      ];

                      // Add any anomalies as warnings
                      for (const anomaly of verification.anomalies) {
                        allWarnings.push({
                          field: anomaly.field,
                          message: anomaly.issue,
                          severity: anomaly.severity as 'low' | 'medium' | 'high',
                        });
                      }

                      // Store verification for later use (will be used when RAG storage is implemented)
                       
                      pendingVerification = verification;
                    }
                  }
                } catch (verifyError) {
                  console.warn('[Processing] AI verification failed:', verifyError);
                  // Non-fatal - continue without verification
                }
              }
            }

            // Store chunks data for later use (after we get extraction ID from cache)
            // Will be used when RAG storage is fully implemented
            if (embeddingResult.embeddedChunks.length > 0) {
               
              pendingChunks = embeddingResult.embeddedChunks.map(chunk => ({
                chunkIndex: chunk.chunkIndex,
                sectionName: chunk.sectionName,
                sectionTitle: chunk.sectionTitle,
                content: chunk.content,
                embedding: chunk.embedding,
                startPosition: chunk.startPosition,
                endPosition: chunk.endPosition,
              }));
               
              pendingFilingText = documentText;
            }

            updateStep('rag', 'complete');
          } catch (ragError) {
            console.warn('[Processing] RAG processing failed:', ragError);
            // Non-fatal - continue without RAG
            updateStep('rag', 'complete');
          }
        } else {
          console.log('[Processing] Skipping RAG processing (no SEC filing data or Supabase not configured)');
          updateStep('rag', 'skipped');
        }

        if (cancelled) return;

        // Step: Map to assumptions
        updateStep('map', 'active');
        setStatus('mapping', 'Processing results...');
        setCurrentStepMessage('Calculating derived metrics...');

        const derivedMetrics = calculateDerivedMetrics(finalFinancials);
        const assumptions = mapToAssumptions(finalFinancials, derivedMetrics);
        const validationWarnings = validateAssumptions(assumptions, finalFinancials);

        allWarnings = [...allWarnings, ...validationWarnings];

        if (cancelled) return;

        setExtractedData(finalFinancials, finalConfidence, allWarnings);
        setDerivedMetrics(derivedMetrics);

        updateStep('map', 'complete');
        currentStep++;
        setProgress(100);

        // Create metadata (handle both SEC and PDF sources)
        const metadata: ExtractionMetadata = {
          fileName: secFilingData
            ? `${secFilingData.metadata.ticker} ${secFilingData.metadata.filingType}`
            : (file?.name || 'Unknown'),
          fileSize: secFilingData
            ? secFilingData.originalLength
            : (file?.size || 0),
          filingType: finalFinancials.filingType,
          companyName: finalFinancials.companyName,
          fiscalPeriod: finalFinancials.fiscalPeriod,
          extractedAt: new Date(),
          confidence: finalConfidence.overall,
          pageCount: 0, // Not available for SEC filings
          processingTimeMs: Date.now() - startTime,
          sourceUrl: secFilingData?.metadata?.url, // SEC EDGAR URL for verification
          extractionSource, // Where data came from (xbrl, ai, hybrid)
          xbrlFieldCount,
          aiFieldCount,
          xbrlFieldsUsed,
          aiFieldsUsed,
        };

        setMetadata(metadata);
        setStatus('complete', 'Done!');

        // Save to cache for SEC filings
        if (secFilingData && isSupabaseConfigured()) {
          console.log('[Processing] Saving extraction to cache...');
          const filingType = secFilingData.metadata.filingType === '10-K' || secFilingData.metadata.filingType === '10-Q'
            ? secFilingData.metadata.filingType
            : '10-K';

          // Capture pending data in closure for async storage
          const chunksToSave = pendingChunks;
          const textToSave = pendingFilingText;
          const verificationToSave = pendingVerification;
          const accessionNum = secFilingData.metadata.accessionNumber;

          cacheExtraction({
            ticker: secFilingData.metadata.ticker,
            filing_type: filingType,
            accession_number: accessionNum,
            filing_date: secFilingData.metadata.filingDate,
            company_name: finalFinancials.companyName,
            financials: finalFinancials,
            confidence: finalConfidence,
            warnings: allWarnings,
            extraction_source: extractionSource,
            xbrl_field_count: xbrlFieldCount,
            ai_field_count: aiFieldCount,
            source_url: secFilingData.metadata.url || null,
          }).then(async (success) => {
            if (success) {
              console.log('[Processing] Extraction cached successfully');

              // Store RAG data (chunks, filing text, verification)
              if (chunksToSave.length > 0 || verificationToSave) {
                try {
                  const cached = await getCachedExtraction(accessionNum);
                  if (cached?.id) {
                    console.log(`[Processing] Storing RAG data for extraction ${cached.id}`);

                    if (textToSave) {
                      await storeFilingText(cached.id, textToSave);
                    }

                    if (chunksToSave.length > 0) {
                      await storeFilingChunks(cached.id, chunksToSave);
                      console.log(`[Processing] Stored ${chunksToSave.length} chunks for RAG`);
                    }

                    if (verificationToSave) {
                      await storeVerificationResults(cached.id, verificationToSave);
                      console.log('[Processing] Stored AI verification results');
                    }
                  }
                } catch (ragStoreError) {
                  console.warn('[Processing] Failed to store RAG data:', ragStoreError);
                }
              }
            } else {
              console.warn('[Processing] Failed to cache extraction');
            }
          });
        }

        // Small delay before transitioning
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!cancelled) {
          onComplete();
        }
      } catch (err) {
        if (cancelled) return;

        const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[Processing] Error:', errMsg);
        setError(errMsg);
        setErrorMessage(errMsg);

        // Mark current step as error
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' ? { ...step, status: 'error' } : step
          )
        );
      }
    };

    // Small delay to ensure UI renders before starting heavy extraction
    const timeoutId = setTimeout(() => {
      runExtraction();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]); // Only re-run when file changes - Zustand setters are stable

  const getStepIcon = (step: ProcessingStep) => {
    const { status, icon } = step;

    const iconColor: Record<ProcessingStep['icon'], string> = {
      flash: 'text-cyan-400',
      pro: 'text-blue-400',
      claude: 'text-orange-400',
      review: 'text-purple-400',
      parse: 'text-zinc-400',
      map: 'text-emerald-400',
      xbrl: 'text-green-400',
    };

    if (status === 'complete') {
      return <Check className="w-5 h-5 text-emerald-400" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    if (status === 'skipped') {
      return <Check className="w-5 h-5 text-zinc-500" />;
    }
    if (status === 'active') {
      return <Loader2 className={`w-5 h-5 animate-spin ${iconColor[icon]}`} />;
    }

    // Pending state - show the icon for the step
    const IconComponent: Record<ProcessingStep['icon'], typeof Zap> = {
      flash: Zap,
      pro: Sparkles,
      claude: Brain,
      review: Shield,
      parse: FileText,
      map: Check,
      xbrl: Database,
    };

    const Icon = IconComponent[icon];
    return <Icon className="w-5 h-5 text-zinc-600" />;
  };

  const getModelBadge = (icon: ProcessingStep['icon']) => {
    switch (icon) {
      case 'xbrl':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">
            <Database className="w-3 h-3" />
            iXBRL
          </span>
        );
      case 'flash':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
            <Zap className="w-3 h-3" />
            Gemini Flash
          </span>
        );
      case 'pro':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
            <Sparkles className="w-3 h-3" />
            Gemini Pro
          </span>
        );
      case 'claude':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs">
            <Brain className="w-3 h-3" />
            Claude Opus
          </span>
        );
      case 'review':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">
            <Shield className="w-3 h-3" />
            Final Review
          </span>
        );
      default:
        return null;
    }
  };

  const completedSteps = steps.filter((s) => s.status === 'complete').length;
  const progressPercent = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Terminal Zero</h1>
            <p className="text-sm text-zinc-500">Multi-Model Validated Extraction</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>4-Layer Validation</span>
            </div>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* File Info */}
          <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {file?.name}
              </p>
              <p className="text-xs text-zinc-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              {isStarting ? (
                <div className="h-full w-full bg-gradient-to-r from-cyan-500 via-blue-500 via-orange-500 to-purple-500 animate-pulse" />
              ) : (
                <div
                  className={`h-full transition-all duration-500 ease-out ${errorMessage ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 via-blue-500 via-orange-500 to-purple-500'
                    }`}
                  style={{ width: `${Math.max(progressPercent, 2)}%` }}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
                {errorMessage ? 'Error occurred' : currentStepMessage}
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400 mb-1">Processing Failed</p>
                  <p className="text-xs text-red-300/80 mb-3">{errorMessage}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={onCancel}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg transition-colors
                  ${step.status === 'active'
                    ? 'bg-zinc-900 border border-zinc-700'
                    : 'bg-zinc-900/50'
                  }
                  ${step.status === 'error' ? 'border border-red-500/30' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <p
                    className={`
                      text-sm font-medium
                      ${step.status === 'complete' ? 'text-zinc-400' : ''}
                      ${step.status === 'active' ? 'text-zinc-100' : ''}
                      ${step.status === 'pending' ? 'text-zinc-500' : ''}
                      ${step.status === 'error' ? 'text-red-400' : ''}
                    `}
                  >
                    {step.label}
                  </p>
                  {getModelBadge(step.icon)}
                </div>
                <div className="text-xs text-zinc-500">
                  {index + 1}/{steps.length}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline explanation */}
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span className="text-purple-400 font-medium">4-Layer Validation:</span> Your document is analyzed by three independent AI models (Gemini Flash, Gemini Pro, Claude Opus), then cross-validated against the source for maximum accuracy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center text-xs text-zinc-600">
          Powered by Gemini 2.0 Flash, 1.5 Pro + Claude Opus
        </div>
      </footer>
    </div>
  );
}
