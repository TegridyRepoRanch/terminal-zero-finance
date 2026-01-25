// Processing Screen Component
// Shows progress during PDF extraction

import { useEffect, useState } from 'react';
import { FileText, Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { extractTextFromPDF, truncateForLLM } from '../../lib/pdf-parser';
import { extractFinancialsWithLLM } from '../../lib/llm-client';
import { calculateDerivedMetrics, mapToAssumptions, validateAssumptions } from '../../lib/extraction-mapper';
import type { ExtractionMetadata } from '../../lib/extraction-types';

interface ProcessingScreenProps {
  onComplete: () => void;
  onError: () => void;
  onCancel: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

export function ProcessingScreen({ onComplete, onError, onCancel }: ProcessingScreenProps) {
  const {
    file,
    apiKey,
    setStatus,
    setProgress,
    setExtractedData,
    setDerivedMetrics,
    setMetadata,
    setError,
  } = useUploadStore();

  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'parse', label: 'Parsing PDF document', status: 'pending' },
    { id: 'extract', label: 'Extracting financial data (AI)', status: 'pending' },
    { id: 'validate', label: 'Validating and mapping data', status: 'pending' },
    { id: 'complete', label: 'Finalizing results', status: 'pending' },
  ]);

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
    if (!file || !apiKey) {
      setError('Missing file or API key');
      onError();
      return;
    }

    let cancelled = false;

    const runExtraction = async () => {
      try {
        // Step 1: Parse PDF
        updateStep('parse', 'active');
        setStatus('parsing', 'Reading PDF...');
        setCurrentStepMessage('Reading PDF document...');

        const parseResult = await extractTextFromPDF(file, (progress) => {
          setProgress(progress.percent * 0.25); // 0-25%
          setCurrentStepMessage(`Reading page ${progress.currentPage} of ${progress.totalPages}...`);
        });

        if (cancelled) return;

        updateStep('parse', 'complete');
        setProgress(25);

        // Truncate text for LLM if needed
        const truncatedText = truncateForLLM(parseResult.text, 100000);

        // Step 2: Extract with LLM
        updateStep('extract', 'active');
        setStatus('extracting', 'Analyzing with AI...');
        setCurrentStepMessage('Sending to GPT-4 for analysis...');
        setProgress(30);

        const llmResult = await extractFinancialsWithLLM(
          truncatedText,
          apiKey,
          (message) => {
            setCurrentStepMessage(message);
          }
        );

        if (cancelled) return;

        updateStep('extract', 'complete');
        setProgress(70);

        // Step 3: Validate and map
        updateStep('validate', 'active');
        setStatus('mapping', 'Processing results...');
        setCurrentStepMessage('Calculating derived metrics...');

        const derivedMetrics = calculateDerivedMetrics(llmResult.financials);
        const assumptions = mapToAssumptions(llmResult.financials, derivedMetrics);
        const validationWarnings = validateAssumptions(assumptions, llmResult.financials);

        // Combine LLM warnings with validation warnings
        const allWarnings = [...llmResult.warnings, ...validationWarnings];

        if (cancelled) return;

        setExtractedData(llmResult.financials, llmResult.confidence, allWarnings);
        setDerivedMetrics(derivedMetrics);

        updateStep('validate', 'complete');
        setProgress(90);

        // Step 4: Finalize
        updateStep('complete', 'active');
        setCurrentStepMessage('Finalizing...');

        const metadata: ExtractionMetadata = {
          fileName: file.name,
          fileSize: file.size,
          filingType: llmResult.financials.filingType,
          companyName: llmResult.financials.companyName,
          fiscalPeriod: llmResult.financials.fiscalPeriod,
          extractedAt: new Date(),
          confidence: llmResult.confidence.overall,
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
  }, [file, apiKey]);

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-5 h-5 text-emerald-400" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />;
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
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* File Info */}
          <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <FileText className="w-6 h-6 text-emerald-400" />
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
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400 text-center">
              {currentStepMessage || 'Preparing...'}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg transition-colors
                  ${step.status === 'active' ? 'bg-zinc-900 border border-emerald-500/30' : 'bg-zinc-900/50'}
                  ${step.status === 'error' ? 'border border-red-500/30' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
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
          Processing is done entirely in your browser
        </div>
      </footer>
    </div>
  );
}
