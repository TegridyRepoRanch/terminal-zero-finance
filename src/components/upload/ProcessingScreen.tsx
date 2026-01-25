// Processing Screen Component - Gemini Only
// Shows progress during PDF extraction with Gemini 2.5 Flash/Pro

import { useEffect, useState, useMemo } from 'react';
import { FileText, Check, Loader2, AlertCircle, ArrowLeft, Zap, Sparkles, Shield } from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { extractTextFromPDF, truncateForLLM } from '../../lib/pdf-parser';
import {
  extractFinancialsWithGemini,
  extractSegmentsWithGemini,
  analyzeMDAWithGemini,
} from '../../lib/gemini-client';
import { calculateDerivedMetrics, mapToAssumptions, validateAssumptions } from '../../lib/extraction-mapper';
import { getGeminiApiKey, hasGeminiKey } from '../../lib/api-config';
import type { ExtractionMetadata, ExtractionWarning } from '../../lib/extraction-types';

interface ProcessingScreenProps {
  onComplete: () => void;
  onError: () => void;
  onCancel: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  model?: 'flash' | 'pro';
}

export function ProcessingScreen({ onComplete, onError, onCancel }: ProcessingScreenProps) {
  const {
    file,
    extractionMode,
    setStatus,
    setProgress,
    setExtractedData,
    setDerivedMetrics,
    setMetadata,
    setError,
  } = useUploadStore();

  // Build steps based on extraction mode
  const initialSteps = useMemo(() => {
    const baseSteps: ProcessingStep[] = [
      { id: 'parse', label: 'Parsing PDF document', status: 'pending' },
      {
        id: 'extract', label: extractionMode === 'fast'
          ? 'Extracting financials (Gemini 2.5 Flash)'
          : 'Extracting financials (Gemini 2.5 Pro)',
        status: 'pending',
        model: extractionMode === 'fast' ? 'flash' : 'pro'
      },
    ];

    if (extractionMode === 'thorough') {
      baseSteps.push(
        { id: 'segments', label: 'Analyzing segments (Gemini Pro)', status: 'pending', model: 'pro' },
        { id: 'mda', label: 'Analyzing MD&A (Gemini Pro)', status: 'pending', model: 'pro' }
      );
    } else if (extractionMode === 'validated') {
      baseSteps.push(
        { id: 'validate', label: 'Deep validation (Gemini Pro)', status: 'pending', model: 'pro' }
      );
    }

    baseSteps.push(
      { id: 'map', label: 'Validating and mapping data', status: 'pending' },
      { id: 'complete', label: 'Finalizing results', status: 'pending' }
    );

    return baseSteps;
  }, [extractionMode]);

  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [startTime] = useState(Date.now());

  const updateStep = (stepId: string, status: ProcessingStep['status']) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  useEffect(() => {
    if (!file) {
      setError('No file selected');
      onError();
      return;
    }

    // Only need Gemini API key now
    if (!hasGeminiKey()) {
      setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.');
      onError();
      return;
    }

    const geminiApiKey = getGeminiApiKey();
    let cancelled = false;

    const runExtraction = async () => {
      try {
        const totalSteps = steps.length;
        let currentStep = 0;

        const progressForStep = (stepProgress: number) => {
          const baseProgress = (currentStep / totalSteps) * 100;
          const stepSize = 100 / totalSteps;
          return baseProgress + (stepProgress * stepSize / 100);
        };

        // Step 1: Parse PDF
        updateStep('parse', 'active');
        setStatus('parsing', 'Reading PDF...');
        setCurrentStepMessage('Reading PDF document...');

        const parseResult = await extractTextFromPDF(file, (progress) => {
          setProgress(progressForStep(progress.percent));
          setCurrentStepMessage(`Reading page ${progress.currentPage} of ${progress.totalPages}...`);
        });

        if (cancelled) return;

        updateStep('parse', 'complete');
        currentStep++;
        setProgress(progressForStep(0));

        // Truncate text for LLM if needed
        const truncatedText = truncateForLLM(parseResult.text, 100000);

        // Step 2: Extract with Gemini
        updateStep('extract', 'active');
        const modelName = extractionMode === 'fast' ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Pro';
        setStatus('extracting', `Analyzing with ${modelName}...`);
        setCurrentStepMessage(`Sending to ${modelName} for comprehensive analysis...`);

        const extractionResult = await extractFinancialsWithGemini(
          truncatedText,
          geminiApiKey,
          (message) => setCurrentStepMessage(message),
          extractionMode === 'fast' // Use Flash for fast mode, Pro for others
        );

        if (cancelled) return;

        updateStep('extract', 'complete');
        currentStep++;
        setProgress(progressForStep(0));

        let finalFinancials = extractionResult.financials;
        let finalConfidence = extractionResult.confidence;
        let allWarnings: ExtractionWarning[] = [...extractionResult.warnings];

        // Thorough mode: Add segment and MD&A analysis
        if (extractionMode === 'thorough') {
          // Segments
          updateStep('segments', 'active');
          setStatus('extracting', 'Analyzing segments...');
          setCurrentStepMessage('Extracting segment breakdowns with Gemini 2.5 Pro...');

          try {
            const segmentResult = await extractSegmentsWithGemini(
              truncatedText,
              geminiApiKey,
              (message) => setCurrentStepMessage(message)
            );

            // Add segment info to extraction notes
            if (segmentResult.segments.length > 0) {
              finalFinancials.extractionNotes.push(
                `Found ${segmentResult.segments.length} business segments: ${segmentResult.segments.map(s => s.name).join(', ')}`
              );
            }
          } catch (err) {
            allWarnings.push({
              field: 'segments',
              message: `Segment analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
              severity: 'low',
            });
          }

          if (cancelled) return;

          updateStep('segments', 'complete');
          currentStep++;
          setProgress(progressForStep(0));

          // MD&A
          updateStep('mda', 'active');
          setStatus('extracting', 'Analyzing MD&A...');
          setCurrentStepMessage('Performing MD&A qualitative analysis with Gemini 2.5 Pro...');

          try {
            const mdaResult = await analyzeMDAWithGemini(
              truncatedText,
              geminiApiKey,
              (message) => setCurrentStepMessage(message)
            );

            // Add MD&A insights to notes
            finalFinancials.extractionNotes.push(
              `Management tone: ${mdaResult.managementTone}`,
              `Key risks identified: ${mdaResult.risks.length}`,
              `Summary: ${mdaResult.summary}`
            );
          } catch (err) {
            allWarnings.push({
              field: 'mda',
              message: `MD&A analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
              severity: 'low',
            });
          }

          if (cancelled) return;

          updateStep('mda', 'complete');
          currentStep++;
          setProgress(progressForStep(0));
        }

        // Validated mode: Run second extraction pass for validation
        if (extractionMode === 'validated') {
          updateStep('validate', 'active');
          setStatus('extracting', 'Deep validation...');
          setCurrentStepMessage('Running validation pass with Gemini 2.5 Pro...');

          try {
            // Run second extraction for comparison
            const validationResult = await extractFinancialsWithGemini(
              truncatedText,
              geminiApiKey,
              (message) => setCurrentStepMessage(message)
            );

            // Compare and report any discrepancies
            const discrepancies: string[] = [];
            const fields = ['revenue', 'netIncome', 'totalAssets', 'totalDebt'] as const;

            for (const field of fields) {
              const original = (finalFinancials as Record<string, number>)[field];
              const validated = (validationResult.financials as Record<string, number>)[field];
              if (original && validated && Math.abs(original - validated) / original > 0.01) {
                discrepancies.push(`${field}: ${original.toLocaleString()} vs ${validated.toLocaleString()}`);
              }
            }

            if (discrepancies.length === 0) {
              finalFinancials.extractionNotes.push('✓ Validation pass confirmed all key figures');
              finalConfidence.overall = Math.min(1, finalConfidence.overall + 0.1);
            } else {
              allWarnings.push({
                field: 'validation',
                message: `Minor discrepancies found: ${discrepancies.join(', ')}`,
                severity: 'medium',
              });
            }
          } catch (err) {
            allWarnings.push({
              field: 'validation',
              message: `Validation pass failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
              severity: 'medium',
            });
          }

          if (cancelled) return;

          updateStep('validate', 'complete');
          currentStep++;
          setProgress(progressForStep(0));
        }

        // Step: Validate and map
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
        setProgress(progressForStep(0));

        // Step: Finalize
        updateStep('complete', 'active');
        setCurrentStepMessage('Finalizing...');

        const metadata: ExtractionMetadata = {
          fileName: file.name,
          fileSize: file.size,
          filingType: finalFinancials.filingType,
          companyName: finalFinancials.companyName,
          fiscalPeriod: finalFinancials.fiscalPeriod,
          extractedAt: new Date(),
          confidence: finalConfidence.overall,
          pageCount: parseResult.pageCount,
          processingTimeMs: Date.now() - startTime,
        };

        setMetadata(metadata);

        if (cancelled) return;

        updateStep('complete', 'complete');
        setProgress(100);
        setStatus('complete', 'Done!');

        // Small delay before transitioning
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!cancelled) {
          onComplete();
        }
      } catch (err) {
        if (cancelled) return;

        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);

        // Mark current step as error
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' ? { ...step, status: 'error' } : step
          )
        );

        onError();
      }
    };

    runExtraction();

    return () => {
      cancelled = true;
    };
  }, [file, extractionMode]);

  const getStepIcon = (step: ProcessingStep) => {
    const { status, model } = step;

    if (status === 'complete') {
      return <Check className="w-5 h-5 text-emerald-400" />;
    }
    if (status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
    if (status === 'active') {
      return <Loader2 className={`w-5 h-5 animate-spin ${model === 'pro' ? 'text-blue-400' : 'text-cyan-400'
        }`} />;
    }
    return <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />;
  };

  const getModelBadge = (model?: 'flash' | 'pro') => {
    if (!model) return null;

    if (model === 'flash') {
      return (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
          <Zap className="w-3 h-3" />
          Flash
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
        <Sparkles className="w-3 h-3" />
        Pro
      </span>
    );
  };

  const getModeIcon = () => {
    switch (extractionMode) {
      case 'fast':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      case 'thorough':
        return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'validated':
        return <Shield className="w-4 h-4 text-purple-400" />;
    }
  };

  const getModeName = () => {
    switch (extractionMode) {
      case 'fast':
        return 'Fast (Gemini Flash)';
      case 'thorough':
        return 'Thorough (Gemini Pro)';
      case 'validated':
        return 'Validated (Gemini Pro)';
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
            <p className="text-sm text-zinc-500">Processing SEC Filing</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              {getModeIcon()}
              <span>{getModeName()}</span>
            </div>
            <button
              onClick={onCancel}
              className="
                flex items-center gap-2 px-3 py-2
                text-sm text-zinc-400 hover:text-zinc-200
                transition-colors
              "
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
              <FileText className="w-6 h-6 text-cyan-400" />
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
              <div
                className={`h-full transition-all duration-500 ease-out ${extractionMode === 'fast'
                    ? 'bg-cyan-500'
                    : extractionMode === 'thorough'
                      ? 'bg-blue-500'
                      : 'bg-purple-500'
                  }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400 text-center">
              {currentStepMessage || 'Preparing...'}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg transition-colors
                  ${step.status === 'active'
                    ? step.model === 'pro'
                      ? 'bg-zinc-900 border border-blue-500/30'
                      : 'bg-zinc-900 border border-cyan-500/30'
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
                  {getModelBadge(step.model)}
                </div>
                <div className="text-xs text-zinc-500">
                  {index + 1}/{steps.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center text-xs text-zinc-600">
          Powered by Gemini 2.5 Flash & Pro • No OpenAI required
        </div>
      </footer>
    </div>
  );
}
