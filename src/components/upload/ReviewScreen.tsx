// Enhanced Review Screen Component
// Review and edit extracted data with advanced filtering and bulk edit
import { useState } from 'react';
import {
  FileText,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Building,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Edit3,
  X,
  ExternalLink,
  AlertTriangle,
  Database,
  Sparkles,
  Zap,
  RefreshCw,
  Quote,
  MapPin,
  Scale,
} from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { ExtractionWarnings } from './ExtractionWarnings';
import { formatCurrency, formatPercent } from '../../lib/financial-logic';
import type { Assumptions } from '../../lib/financial-logic';
import { mapToAssumptions } from '../../lib/extraction-mapper';
import type { SourceCitation } from '../../lib/extraction-types';

// Confidence level thresholds
const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 60,
  low: 0,
} as const;

type ConfidenceFilter = 'all' | 'high' | 'medium' | 'low';

interface ReviewScreenProps {
  onProceed: (assumptions: Assumptions) => void;
  onBack: () => void;
  onForceReextract?: () => void;
}

type FieldSource = 'xbrl' | 'ai' | undefined;

interface EditableFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format?: 'currency' | 'percent' | 'number' | 'days';
  suffix?: string;
  confidence?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  fieldSource?: FieldSource;
  citation?: SourceCitation;
}

function getConfidenceColor(confidence?: number): string {
  if (!confidence) return 'text-zinc-500';
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'text-emerald-500';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'text-amber-500';
  return 'text-red-500';
}

function getConfidenceLabel(confidence?: number): string {
  if (!confidence) return 'Unknown';
  if (confidence >= CONFIDENCE_THRESHOLDS.high) return 'High';
  if (confidence >= CONFIDENCE_THRESHOLDS.medium) return 'Medium';
  return 'Low';
}

// Source Citation Tooltip/Popover
interface SourceCitationTooltipProps {
  citation: SourceCitation;
  isVisible: boolean;
}

function SourceCitationTooltip({ citation, isVisible }: SourceCitationTooltipProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute z-50 bottom-full left-0 mb-2 w-80 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-3 text-left">
      <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1">
        <Quote className="w-3 h-3" />
        Source Citation
      </div>

      {/* Source Text */}
      <div className="mb-2">
        <p className="text-[10px] text-zinc-500 uppercase mb-1">Extracted From:</p>
        <p className="text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded border-l-2 border-cyan-500 font-mono">
          "{citation.sourceText}"
        </p>
      </div>

      {/* Location */}
      {citation.sourceLocation && (
        <div className="mb-2 flex items-center gap-1 text-xs text-zinc-400">
          <MapPin className="w-3 h-3" />
          <span>{citation.sourceLocation}</span>
        </div>
      )}

      {/* Scale Note */}
      {citation.scaleNote && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <Scale className="w-3 h-3" />
          <span>{citation.scaleNote}</span>
        </div>
      )}

      {/* Arrow pointing down */}
      <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-700" />
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  format = 'number',
  suffix,
  confidence,
  isSelected,
  onToggleSelect,
  showCheckbox,
  fieldSource,
  citation,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [showCitation, setShowCitation] = useState(false);

  const formatDisplay = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return formatPercent(val);
      case 'days':
        return `${Math.round(val)} days`;
      default:
        return val.toLocaleString();
    }
  };

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  const confidenceColor = getConfidenceColor(confidence);

  return (
    <div
      className={`
        flex items-center justify-between py-2 border-b border-zinc-800 last:border-0
        ${isSelected ? 'bg-emerald-500/5' : ''}
      `}
    >
      <div className="flex items-center gap-2 flex-1">
        {showCheckbox && onToggleSelect && (
          <button
            onClick={onToggleSelect}
            className="text-zinc-400 hover:text-emerald-400 transition-colors"
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        )}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-zinc-400">{label}</span>
          {confidence !== undefined && (
            <span
              className={`text-xs ${confidenceColor}`}
              title={`Confidence: ${confidence}%`}
            >
              ({getConfidenceLabel(confidence)})
            </span>
          )}
          {fieldSource === 'xbrl' && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px]"
              title="Extracted from structured iXBRL data"
            >
              <Database className="w-2.5 h-2.5" />
              XBRL
            </span>
          )}
          {fieldSource === 'ai' && (
            <div className="relative inline-flex items-center">
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px]"
                title="Extracted by AI"
              >
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
              {citation && (
                <button
                  onMouseEnter={() => setShowCitation(true)}
                  onMouseLeave={() => setShowCitation(false)}
                  onClick={() => setShowCitation(!showCitation)}
                  className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-[10px] transition-colors"
                  title="View source citation"
                >
                  <Quote className="w-2.5 h-2.5" />
                </button>
              )}
              {citation && <SourceCitationTooltip citation={citation} isVisible={showCitation} />}
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="
              w-32 px-2 py-1 text-right text-sm
              bg-zinc-800 border border-zinc-600 rounded
              text-zinc-100 focus:outline-none focus:border-emerald-500
            "
          />
          {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="
            flex items-center gap-2 text-sm text-zinc-200
            hover:text-emerald-400 transition-colors group
          "
        >
          <span>{formatDisplay(value)}</span>
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

// Bulk Edit Modal
interface BulkEditModalProps {
  fields: Array<{
    label: string;
    key: keyof Assumptions;
    value: number;
    format?: 'currency' | 'percent' | 'number' | 'days';
  }>;
  onApply: (value: number) => void;
  onClose: () => void;
}

function BulkEditModal({ fields, onApply, onClose }: BulkEditModalProps) {
  const [bulkValue, setBulkValue] = useState('');

  const handleApply = () => {
    const parsed = parseFloat(bulkValue);
    if (!isNaN(parsed)) {
      onApply(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Bulk Edit</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-zinc-400 mb-2">
            Editing {fields.length} field{fields.length > 1 ? 's' : ''}:
          </p>
          <ul className="text-xs text-zinc-500 space-y-1 max-h-32 overflow-y-auto">
            {fields.map((field) => (
              <li key={field.key}>• {field.label}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-2">
            New Value
          </label>
          <input
            type="number"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Enter new value"
            autoFocus
            className="
              w-full px-3 py-2 text-sm
              bg-zinc-800 border border-zinc-600 rounded
              text-zinc-100 placeholder-zinc-500
              focus:outline-none focus:border-emerald-500
            "
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-2 text-sm
              bg-zinc-800 text-zinc-300 rounded
              hover:bg-zinc-700 transition-colors
            "
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!bulkValue}
            className="
              flex-1 px-4 py-2 text-sm
              bg-emerald-600 text-white rounded
              hover:bg-emerald-500 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Apply to All
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReviewScreen({ onProceed, onBack, onForceReextract }: ReviewScreenProps) {
  const { extractedData, confidence, warnings, derivedMetrics, metadata, secFilingData } =
    useUploadStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [selectedFields, setSelectedFields] = useState<Set<keyof Assumptions>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);

  // Initialize assumptions from extracted data
  const [assumptions, setAssumptions] = useState<Assumptions>(() => {
    if (extractedData && derivedMetrics) {
      return mapToAssumptions(extractedData, derivedMetrics);
    }
    return {
      baseRevenue: 1000000000,
      projectionYears: 5,
      revenueGrowthRate: 8,
      cogsPercent: 60,
      sgaPercent: 20,
      taxRate: 25,
      daysReceivables: 45,
      daysInventory: 60,
      daysPayables: 30,
      capexPercent: 5,
      depreciationYears: 10,
      debtBalance: 200000000,
      interestRate: 5,
      yearlyRepayment: 20000000,
      wacc: 10,
      terminalGrowthRate: 2.5,
      sharesOutstanding: 100000000,
      netDebt: 200000000,
    };
  });

  const updateAssumption = <K extends keyof Assumptions>(
    key: K,
    value: Assumptions[K]
  ) => {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFieldSelection = (key: keyof Assumptions) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Map assumption keys to extraction field names for source lookup
  const assumptionToExtractionField: Partial<Record<keyof Assumptions, string>> = {
    baseRevenue: 'revenue',
    cogsPercent: 'costOfRevenue',
    sgaPercent: 'sgaExpense',
    taxRate: 'incomeTaxExpense',
    daysReceivables: 'accountsReceivable',
    daysInventory: 'inventory',
    daysPayables: 'accountsPayable',
    debtBalance: 'totalDebt',
    sharesOutstanding: 'sharesOutstandingBasic',
    netDebt: 'totalDebt',
    capexPercent: 'capitalExpenditures',
  };

  // Get field source (xbrl or ai) based on metadata
  const getFieldSource = (assumptionKey: keyof Assumptions): FieldSource => {
    if (!metadata) return undefined;

    const extractionField = assumptionToExtractionField[assumptionKey];
    if (!extractionField) return undefined;

    // Check xbrlFieldsUsed array
    if (metadata.xbrlFieldsUsed?.includes(extractionField)) {
      return 'xbrl';
    }

    // Check aiFieldsUsed array
    if (metadata.aiFieldsUsed?.includes(extractionField)) {
      return 'ai';
    }

    // Fallback: if extraction source is pure xbrl or ai, use that
    if (metadata.extractionSource === 'xbrl') return 'xbrl';
    if (metadata.extractionSource === 'ai') return 'ai';

    return undefined;
  };

  // Get source citation for a field (if available from AI extraction)
  const getFieldCitation = (assumptionKey: keyof Assumptions): SourceCitation | undefined => {
    if (!metadata?.sourceCitations) return undefined;

    const extractionField = assumptionToExtractionField[assumptionKey];
    if (!extractionField) return undefined;

    return metadata.sourceCitations[extractionField];
  };

  const handleBulkEdit = (value: number) => {
    selectedFields.forEach((key) => {
      updateAssumption(key, value as never);
    });
    setSelectedFields(new Set());
    setBulkEditMode(false);
  };

  // Map confidence scores to field keys
  const fieldConfidence: Partial<Record<keyof Assumptions, number>> = confidence
    ? {
        baseRevenue: confidence.revenue,
        cogsPercent: confidence.costOfRevenue,
        sgaPercent: confidence.operatingExpenses,
        taxRate: confidence.incomeTaxExpense,
        daysReceivables: confidence.accountsReceivable,
        daysInventory: confidence.inventory,
        daysPayables: confidence.accountsPayable,
        debtBalance: confidence.totalDebt,
        sharesOutstanding: confidence.sharesOutstanding,
      }
    : {};

  const shouldShowField = (fieldKey: keyof Assumptions): boolean => {
    if (confidenceFilter === 'all') return true;

    const fieldConf = fieldConfidence[fieldKey];
    if (fieldConf === undefined) return true; // Show fields without confidence data

    switch (confidenceFilter) {
      case 'high':
        return fieldConf >= CONFIDENCE_THRESHOLDS.high;
      case 'medium':
        return fieldConf >= CONFIDENCE_THRESHOLDS.medium && fieldConf < CONFIDENCE_THRESHOLDS.high;
      case 'low':
        return fieldConf < CONFIDENCE_THRESHOLDS.medium;
      default:
        return true;
    }
  };

  if (!extractedData || !metadata) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">No extraction data available</p>
      </div>
    );
  }

  const selectedFieldsList = Array.from(selectedFields).map((key) => ({
    label: key.replace(/([A-Z])/g, ' $1').trim(),
    key,
    value: assumptions[key],
    format: key.includes('Percent') || key.includes('Rate') || key.includes('Growth')
      ? 'percent' as const
      : key.includes('Revenue') || key.includes('debt') || key.includes('Debt')
      ? 'currency' as const
      : 'number' as const,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Review Extraction</h1>
              <p className="text-sm text-zinc-500">
                Verify data before loading into model
              </p>
            </div>
            <ExtractionWarnings warnings={warnings} confidence={confidence} compact />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            {/* Confidence Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Filter:</span>
              <div className="flex gap-1">
                {(['all', 'high', 'medium', 'low'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setConfidenceFilter(filter)}
                    className={`
                      px-3 py-1 text-xs rounded
                      transition-colors
                      ${
                        confidenceFilter === filter
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Edit Toggle */}
            <div className="flex items-center gap-2">
              {bulkEditMode && selectedFields.size > 0 && (
                <button
                  onClick={() => setShowBulkEdit(true)}
                  className="
                    flex items-center gap-2 px-3 py-1 text-xs
                    bg-emerald-600 text-white rounded
                    hover:bg-emerald-500 transition-colors
                  "
                >
                  <Edit3 className="w-3 h-3" />
                  Edit {selectedFields.size} Field{selectedFields.size > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => {
                  setBulkEditMode(!bulkEditMode);
                  if (bulkEditMode) setSelectedFields(new Set());
                }}
                className={`
                  flex items-center gap-2 px-3 py-1 text-xs rounded
                  transition-colors
                  ${
                    bulkEditMode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }
                `}
              >
                <CheckSquare className="w-3 h-3" />
                Bulk Edit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Company Info Card */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Building className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-zinc-100">
                  {extractedData.companyName}
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                  {extractedData.ticker && (
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">
                      {extractedData.ticker}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {extractedData.fiscalPeriod}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    {extractedData.filingType}
                  </span>
                  {/* Extraction Source Badge */}
                  {metadata.extractionSource === 'xbrl' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded" title={`${metadata.xbrlFieldCount || 0} fields from iXBRL`}>
                      <Database className="w-3 h-3" />
                      iXBRL
                    </span>
                  )}
                  {metadata.extractionSource === 'hybrid' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded" title={`${metadata.xbrlFieldCount || 0} iXBRL + ${metadata.aiFieldCount || 0} AI fields`}>
                      <Zap className="w-3 h-3" />
                      Hybrid
                    </span>
                  )}
                  {metadata.extractionSource === 'ai' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded" title="AI extraction only">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Source</p>
                {(secFilingData?.metadata?.url || metadata.sourceUrl) ? (
                  <a
                    href={secFilingData?.metadata?.url || metadata.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 justify-end transition-colors"
                    title="View original SEC filing"
                  >
                    <FileText className="w-4 h-4" />
                    Verify on SEC EDGAR
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-sm text-zinc-300 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {metadata.fileName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Low Confidence Warning - only show for AI-based extraction with low confidence */}
          {confidence?.overall !== undefined && confidence.overall < 30 && metadata.extractionSource !== 'xbrl' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400 mb-1">
                    Low Confidence Extraction ({Math.round(confidence.overall)}%)
                  </p>
                  <p className="text-xs text-amber-300/80 mb-2">
                    The AI had difficulty extracting reliable data from this filing. This often happens with:
                  </p>
                  <ul className="text-xs text-amber-300/70 list-disc list-inside mb-3 space-y-1">
                    <li>Inline XBRL format (financial data in XML tags)</li>
                    <li>Scanned or image-based PDFs</li>
                    <li>Complex or non-standard filing structures</li>
                  </ul>
                  <p className="text-xs text-amber-300/80">
                    {(secFilingData?.metadata?.url || metadata?.sourceUrl) ? (
                      <>
                        Please <a href={secFilingData?.metadata?.url || metadata?.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline hover:text-amber-200">verify the source filing</a> and manually check the values below before proceeding.
                      </>
                    ) : (
                      <>Please manually verify the extracted values before proceeding.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* XBRL Success Message - show when XBRL extraction worked well */}
          {metadata.extractionSource === 'xbrl' && metadata.xbrlFieldCount && metadata.xbrlFieldCount > 15 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400 mb-1">
                    High-Accuracy iXBRL Extraction
                  </p>
                  <p className="text-xs text-green-300/80">
                    {metadata.xbrlFieldCount} fields extracted directly from structured iXBRL data.
                    This data comes directly from the SEC filing&apos;s machine-readable format with no AI interpretation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Assumptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Statement */}
            {(shouldShowField('baseRevenue') ||
              shouldShowField('revenueGrowthRate') ||
              shouldShowField('cogsPercent') ||
              shouldShowField('sgaPercent') ||
              shouldShowField('taxRate')) && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                  Income Statement
                </h3>
                <div className="space-y-1">
                  {shouldShowField('baseRevenue') && (
                    <EditableField
                      label="Base Revenue"
                      value={assumptions.baseRevenue}
                      onChange={(v) => updateAssumption('baseRevenue', v)}
                      format="currency"
                      confidence={fieldConfidence.baseRevenue}
                      isSelected={selectedFields.has('baseRevenue')}
                      onToggleSelect={() => toggleFieldSelection('baseRevenue')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('baseRevenue')}
                      citation={getFieldCitation('baseRevenue')}
                    />
                  )}
                  {shouldShowField('revenueGrowthRate') && (
                    <EditableField
                      label="Revenue Growth"
                      value={assumptions.revenueGrowthRate}
                      onChange={(v) => updateAssumption('revenueGrowthRate', v)}
                      format="percent"
                      isSelected={selectedFields.has('revenueGrowthRate')}
                      onToggleSelect={() => toggleFieldSelection('revenueGrowthRate')}
                      showCheckbox={bulkEditMode}
                    />
                  )}
                  {shouldShowField('cogsPercent') && (
                    <EditableField
                      label="COGS %"
                      value={assumptions.cogsPercent}
                      onChange={(v) => updateAssumption('cogsPercent', v)}
                      format="percent"
                      confidence={fieldConfidence.cogsPercent}
                      isSelected={selectedFields.has('cogsPercent')}
                      onToggleSelect={() => toggleFieldSelection('cogsPercent')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('cogsPercent')}
                      citation={getFieldCitation('cogsPercent')}
                    />
                  )}
                  {shouldShowField('sgaPercent') && (
                    <EditableField
                      label="SG&A %"
                      value={assumptions.sgaPercent}
                      onChange={(v) => updateAssumption('sgaPercent', v)}
                      format="percent"
                      confidence={fieldConfidence.sgaPercent}
                      isSelected={selectedFields.has('sgaPercent')}
                      onToggleSelect={() => toggleFieldSelection('sgaPercent')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('sgaPercent')}
                      citation={getFieldCitation('sgaPercent')}
                    />
                  )}
                  {shouldShowField('taxRate') && (
                    <EditableField
                      label="Tax Rate"
                      value={assumptions.taxRate}
                      onChange={(v) => updateAssumption('taxRate', v)}
                      format="percent"
                      confidence={fieldConfidence.taxRate}
                      isSelected={selectedFields.has('taxRate')}
                      onToggleSelect={() => toggleFieldSelection('taxRate')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('taxRate')}
                      citation={getFieldCitation('taxRate')}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Working Capital */}
            {(shouldShowField('daysReceivables') ||
              shouldShowField('daysInventory') ||
              shouldShowField('daysPayables')) && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                  Working Capital
                </h3>
                <div className="space-y-1">
                  {shouldShowField('daysReceivables') && (
                    <EditableField
                      label="Days Receivables (DSO)"
                      value={assumptions.daysReceivables}
                      onChange={(v) => updateAssumption('daysReceivables', v)}
                      format="days"
                      confidence={fieldConfidence.daysReceivables}
                      isSelected={selectedFields.has('daysReceivables')}
                      onToggleSelect={() => toggleFieldSelection('daysReceivables')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('daysReceivables')}
                      citation={getFieldCitation('daysReceivables')}
                    />
                  )}
                  {shouldShowField('daysInventory') && (
                    <EditableField
                      label="Days Inventory (DIO)"
                      value={assumptions.daysInventory}
                      onChange={(v) => updateAssumption('daysInventory', v)}
                      format="days"
                      confidence={fieldConfidence.daysInventory}
                      isSelected={selectedFields.has('daysInventory')}
                      onToggleSelect={() => toggleFieldSelection('daysInventory')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('daysInventory')}
                      citation={getFieldCitation('daysInventory')}
                    />
                  )}
                  {shouldShowField('daysPayables') && (
                    <EditableField
                      label="Days Payables (DPO)"
                      value={assumptions.daysPayables}
                      onChange={(v) => updateAssumption('daysPayables', v)}
                      format="days"
                      confidence={fieldConfidence.daysPayables}
                      isSelected={selectedFields.has('daysPayables')}
                      onToggleSelect={() => toggleFieldSelection('daysPayables')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('daysPayables')}
                      citation={getFieldCitation('daysPayables')}
                    />
                  )}
                </div>
              </div>
            )}

            {/* CapEx & Depreciation */}
            {(shouldShowField('capexPercent') || shouldShowField('depreciationYears')) && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                  CapEx & Depreciation
                </h3>
                <div className="space-y-1">
                  {shouldShowField('capexPercent') && (
                    <EditableField
                      label="CapEx % of Revenue"
                      value={assumptions.capexPercent}
                      onChange={(v) => updateAssumption('capexPercent', v)}
                      format="percent"
                      isSelected={selectedFields.has('capexPercent')}
                      onToggleSelect={() => toggleFieldSelection('capexPercent')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('capexPercent')}
                      citation={getFieldCitation('capexPercent')}
                    />
                  )}
                  {shouldShowField('depreciationYears') && (
                    <EditableField
                      label="Depreciation Years"
                      value={assumptions.depreciationYears}
                      onChange={(v) => updateAssumption('depreciationYears', v)}
                      suffix="years"
                      isSelected={selectedFields.has('depreciationYears')}
                      onToggleSelect={() => toggleFieldSelection('depreciationYears')}
                      showCheckbox={bulkEditMode}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Debt */}
            {(shouldShowField('debtBalance') ||
              shouldShowField('interestRate') ||
              shouldShowField('yearlyRepayment')) && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                  Debt & Interest
                </h3>
                <div className="space-y-1">
                  {shouldShowField('debtBalance') && (
                    <EditableField
                      label="Total Debt"
                      value={assumptions.debtBalance}
                      onChange={(v) => updateAssumption('debtBalance', v)}
                      format="currency"
                      confidence={fieldConfidence.debtBalance}
                      isSelected={selectedFields.has('debtBalance')}
                      onToggleSelect={() => toggleFieldSelection('debtBalance')}
                      showCheckbox={bulkEditMode}
                      fieldSource={getFieldSource('debtBalance')}
                      citation={getFieldCitation('debtBalance')}
                    />
                  )}
                  {shouldShowField('interestRate') && (
                    <EditableField
                      label="Interest Rate"
                      value={assumptions.interestRate}
                      onChange={(v) => updateAssumption('interestRate', v)}
                      format="percent"
                      isSelected={selectedFields.has('interestRate')}
                      onToggleSelect={() => toggleFieldSelection('interestRate')}
                      showCheckbox={bulkEditMode}
                    />
                  )}
                  {shouldShowField('yearlyRepayment') && (
                    <EditableField
                      label="Yearly Repayment"
                      value={assumptions.yearlyRepayment}
                      onChange={(v) => updateAssumption('yearlyRepayment', v)}
                      format="currency"
                      isSelected={selectedFields.has('yearlyRepayment')}
                      onToggleSelect={() => toggleFieldSelection('yearlyRepayment')}
                      showCheckbox={bulkEditMode}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advanced / Valuation Settings */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="
                w-full flex items-center justify-between p-6
                text-left hover:bg-zinc-800/50 transition-colors
              "
            >
              <h3 className="text-lg font-semibold text-zinc-100">
                Valuation Settings
              </h3>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-1 border-t border-zinc-800 pt-4">
                {shouldShowField('wacc') && (
                  <EditableField
                    label="WACC"
                    value={assumptions.wacc}
                    onChange={(v) => updateAssumption('wacc', v)}
                    format="percent"
                    isSelected={selectedFields.has('wacc')}
                    onToggleSelect={() => toggleFieldSelection('wacc')}
                    showCheckbox={bulkEditMode}
                  />
                )}
                {shouldShowField('terminalGrowthRate') && (
                  <EditableField
                    label="Terminal Growth Rate"
                    value={assumptions.terminalGrowthRate}
                    onChange={(v) => updateAssumption('terminalGrowthRate', v)}
                    format="percent"
                    isSelected={selectedFields.has('terminalGrowthRate')}
                    onToggleSelect={() => toggleFieldSelection('terminalGrowthRate')}
                    showCheckbox={bulkEditMode}
                  />
                )}
                {shouldShowField('sharesOutstanding') && (
                  <EditableField
                    label="Shares Outstanding"
                    value={assumptions.sharesOutstanding}
                    onChange={(v) => updateAssumption('sharesOutstanding', v)}
                    format="number"
                    confidence={fieldConfidence.sharesOutstanding}
                    isSelected={selectedFields.has('sharesOutstanding')}
                    onToggleSelect={() => toggleFieldSelection('sharesOutstanding')}
                    showCheckbox={bulkEditMode}
                    fieldSource={getFieldSource('sharesOutstanding')}
                    citation={getFieldCitation('sharesOutstanding')}
                  />
                )}
                {shouldShowField('netDebt') && (
                  <EditableField
                    label="Net Debt"
                    value={assumptions.netDebt}
                    onChange={(v) => updateAssumption('netDebt', v)}
                    format="currency"
                    isSelected={selectedFields.has('netDebt')}
                    onToggleSelect={() => toggleFieldSelection('netDebt')}
                    showCheckbox={bulkEditMode}
                    fieldSource={getFieldSource('netDebt')}
                    citation={getFieldCitation('netDebt')}
                  />
                )}
                {shouldShowField('projectionYears') && (
                  <EditableField
                    label="Projection Years"
                    value={assumptions.projectionYears}
                    onChange={(v) => updateAssumption('projectionYears', v)}
                    suffix="years"
                    isSelected={selectedFields.has('projectionYears')}
                    onToggleSelect={() => toggleFieldSelection('projectionYears')}
                    showCheckbox={bulkEditMode}
                  />
                )}
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <ExtractionWarnings warnings={warnings} confidence={confidence} />
          )}
        </div>
      </main>

      {/* Footer Actions */}
      <footer className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="
                flex items-center gap-2 px-4 py-2
                text-zinc-400 hover:text-zinc-200
                transition-colors
              "
            >
              <ArrowLeft className="w-4 h-4" />
              Upload New File
            </button>

            {/* Force Re-extract Button - only show for SEC filings */}
            {secFilingData && onForceReextract && (
              <button
                onClick={onForceReextract}
                className="
                  flex items-center gap-2 px-3 py-2
                  text-amber-400 hover:text-amber-300
                  bg-amber-500/10 hover:bg-amber-500/20
                  border border-amber-500/30
                  rounded-lg transition-colors
                  text-sm
                "
                title="Clear cache and re-run extraction from scratch"
              >
                <RefreshCw className="w-4 h-4" />
                Force Re-extract
              </button>
            )}
          </div>

          <button
            onClick={() => onProceed(assumptions)}
            className="
              flex items-center gap-2 px-6 py-3
              bg-emerald-600 text-white rounded-lg
              hover:bg-emerald-500 transition-colors
              font-medium
            "
          >
            <Check className="w-5 h-5" />
            Load into Model
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <BulkEditModal
          fields={selectedFieldsList}
          onApply={handleBulkEdit}
          onClose={() => setShowBulkEdit(false)}
        />
      )}
    </div>
  );
}
