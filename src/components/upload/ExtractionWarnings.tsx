// Extraction Warnings Component
// Display confidence scores and warnings from extraction

import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import type { ExtractionWarning, ExtractionConfidence } from '../../lib/extraction-types';

interface ExtractionWarningsProps {
  warnings: ExtractionWarning[];
  confidence?: ExtractionConfidence | null;
  compact?: boolean;
}

export function ExtractionWarnings({
  warnings,
  confidence,
  compact = false,
}: ExtractionWarningsProps) {
  if (warnings.length === 0 && !confidence) {
    return null;
  }

  const getSeverityIcon = (severity: ExtractionWarning['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityClass = (severity: ExtractionWarning['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.5) return 'text-amber-400';
    return 'text-red-400';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  if (compact) {
    const highWarnings = warnings.filter((w) => w.severity === 'high');
    const mediumWarnings = warnings.filter((w) => w.severity === 'medium');

    return (
      <div className="flex items-center gap-3 text-sm">
        {confidence && (
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Confidence:</span>
            <span className={getConfidenceColor(confidence.overall)}>
              {(confidence.overall * 100).toFixed(0)}%
            </span>
          </div>
        )}
        {highWarnings.length > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{highWarnings.length} issue{highWarnings.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {mediumWarnings.length > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{mediumWarnings.length} warning{mediumWarnings.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {warnings.length === 0 && confidence && confidence.overall >= 0.8 && (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>Good quality</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Confidence */}
      {confidence && (
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-300">
              Extraction Confidence
            </span>
            <span className={`text-lg font-bold ${getConfidenceColor(confidence.overall)}`}>
              {(confidence.overall * 100).toFixed(0)}% - {getConfidenceLabel(confidence.overall)}
            </span>
          </div>

          {/* Confidence breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {Object.entries(confidence)
              .filter(([key]) => key !== 'overall')
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-zinc-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={getConfidenceColor(value)}>
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Warnings List */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400">
            Extraction Notes ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={`
                  flex items-start gap-2 p-3 rounded-md border
                  ${getSeverityClass(warning.severity)}
                `}
              >
                {getSeverityIcon(warning.severity)}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-200">{warning.message}</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    ({warning.field})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Confidence Bar Component for individual fields
interface ConfidenceBarProps {
  label: string;
  score: number;
}

export function ConfidenceBar({ label, score }: ConfidenceBarProps) {
  const percentage = score * 100;

  const getBarColor = () => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300">{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
