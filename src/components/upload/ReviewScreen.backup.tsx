// Review Screen Component
// Review and edit extracted data before proceeding to model

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
} from 'lucide-react';
import { useUploadStore } from '../../store/useUploadStore';
import { ExtractionWarnings } from './ExtractionWarnings';
import { formatCurrency, formatPercent } from '../../lib/financial-logic';
import type { Assumptions } from '../../lib/financial-logic';
import { mapToAssumptions } from '../../lib/extraction-mapper';

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
}

function EditableField({
  label,
  value,
  onChange,
  format = 'number',
  suffix,
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

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
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

export function ReviewScreen({ onProceed, onBack }: ReviewScreenProps) {
  const { extractedData, confidence, warnings, derivedMetrics, metadata } =
    useUploadStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize assumptions from extracted data
  const [assumptions, setAssumptions] = useState<Assumptions>(() => {
    if (extractedData && derivedMetrics) {
      return mapToAssumptions(extractedData, derivedMetrics);
    }
    // Fallback defaults
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

  if (!extractedData || !metadata) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">No extraction data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Review Extraction</h1>
            <p className="text-sm text-zinc-500">
              Verify data before loading into model
            </p>
          </div>
          <ExtractionWarnings warnings={warnings} confidence={confidence} compact />
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
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                Income Statement
              </h3>
              <div className="space-y-1">
                <EditableField
                  label="Base Revenue"
                  value={assumptions.baseRevenue}
                  onChange={(v) => updateAssumption('baseRevenue', v)}
                  format="currency"
                />
                <EditableField
                  label="Revenue Growth"
                  value={assumptions.revenueGrowthRate}
                  onChange={(v) => updateAssumption('revenueGrowthRate', v)}
                  format="percent"
                />
                <EditableField
                  label="COGS %"
                  value={assumptions.cogsPercent}
                  onChange={(v) => updateAssumption('cogsPercent', v)}
                  format="percent"
                />
                <EditableField
                  label="SG&A %"
                  value={assumptions.sgaPercent}
                  onChange={(v) => updateAssumption('sgaPercent', v)}
                  format="percent"
                />
                <EditableField
                  label="Tax Rate"
                  value={assumptions.taxRate}
                  onChange={(v) => updateAssumption('taxRate', v)}
                  format="percent"
                />
              </div>
            </div>

            {/* Working Capital */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                Working Capital
              </h3>
              <div className="space-y-1">
                <EditableField
                  label="Days Receivables (DSO)"
                  value={assumptions.daysReceivables}
                  onChange={(v) => updateAssumption('daysReceivables', v)}
                  format="days"
                />
                <EditableField
                  label="Days Inventory (DIO)"
                  value={assumptions.daysInventory}
                  onChange={(v) => updateAssumption('daysInventory', v)}
                  format="days"
                />
                <EditableField
                  label="Days Payables (DPO)"
                  value={assumptions.daysPayables}
                  onChange={(v) => updateAssumption('daysPayables', v)}
                  format="days"
                />
              </div>
            </div>

            {/* CapEx & Depreciation */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                CapEx & Depreciation
              </h3>
              <div className="space-y-1">
                <EditableField
                  label="CapEx % of Revenue"
                  value={assumptions.capexPercent}
                  onChange={(v) => updateAssumption('capexPercent', v)}
                  format="percent"
                />
                <EditableField
                  label="Depreciation Years"
                  value={assumptions.depreciationYears}
                  onChange={(v) => updateAssumption('depreciationYears', v)}
                  suffix="years"
                />
              </div>
            </div>

            {/* Debt */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                Debt & Interest
              </h3>
              <div className="space-y-1">
                <EditableField
                  label="Total Debt"
                  value={assumptions.debtBalance}
                  onChange={(v) => updateAssumption('debtBalance', v)}
                  format="currency"
                />
                <EditableField
                  label="Interest Rate"
                  value={assumptions.interestRate}
                  onChange={(v) => updateAssumption('interestRate', v)}
                  format="percent"
                />
                <EditableField
                  label="Yearly Repayment"
                  value={assumptions.yearlyRepayment}
                  onChange={(v) => updateAssumption('yearlyRepayment', v)}
                  format="currency"
                />
              </div>
            </div>
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
                <EditableField
                  label="WACC"
                  value={assumptions.wacc}
                  onChange={(v) => updateAssumption('wacc', v)}
                  format="percent"
                />
                <EditableField
                  label="Terminal Growth Rate"
                  value={assumptions.terminalGrowthRate}
                  onChange={(v) => updateAssumption('terminalGrowthRate', v)}
                  format="percent"
                />
                <EditableField
                  label="Shares Outstanding"
                  value={assumptions.sharesOutstanding}
                  onChange={(v) => updateAssumption('sharesOutstanding', v)}
                  format="number"
                />
                <EditableField
                  label="Net Debt"
                  value={assumptions.netDebt}
                  onChange={(v) => updateAssumption('netDebt', v)}
                  format="currency"
                />
                <EditableField
                  label="Projection Years"
                  value={assumptions.projectionYears}
                  onChange={(v) => updateAssumption('projectionYears', v)}
                  suffix="years"
                />
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
    </div>
  );
}
