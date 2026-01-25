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
} from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { ExtractionWarnings } from './ExtractionWarnings';
import { formatCurrency, formatPercent } from '../../lib/financial-logic';
import type { Assumptions } from '../../lib/financial-logic';
import { mapToAssumptions } from '../../lib/extraction-mapper';

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
}

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
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

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
        <div className="flex-1">
          <span className="text-sm text-zinc-400">{label}</span>
          {confidence !== undefined && (
            <span
              className={`ml-2 text-xs ${confidenceColor}`}
              title={`Confidence: ${confidence}%`}
            >
              ({getConfidenceLabel(confidence)})
            </span>
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

export function ReviewScreen({ onProceed, onBack }: ReviewScreenProps) {
  const { extractedData, confidence, warnings, derivedMetrics, metadata } =
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
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Source</p>
                <p className="text-sm text-zinc-300 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {metadata.fileName}
                </p>
              </div>
            </div>
          </div>

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
