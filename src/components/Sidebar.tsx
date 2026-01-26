// Sidebar - Assumptions Input Panel
import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { showToast } from '../lib/toast';
import { RefreshCw, TrendingUp, Building2, DollarSign, Calculator, Percent, AlertTriangle, Download, X } from 'lucide-react';

interface InputFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    prefix?: string;
    step?: number;
    min?: number;
    max?: number;
    decimals?: number;
}

function InputField({ label, value, onChange, suffix, prefix, step = 1, min, max, decimals = 2 }: InputFieldProps) {
    // Format value for display - avoids 6.42551178%
    const displayValue = Number(value).toFixed(decimals);
    const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 group hover:bg-zinc-900/30 px-2 -mx-2 rounded">
            <label
                htmlFor={inputId}
                className="text-zinc-400 text-xs uppercase tracking-wider cursor-pointer"
            >
                {label}
            </label>
            <div className="flex items-center gap-1">
                {prefix && <span className="text-zinc-500 text-sm" aria-hidden="true">{prefix}</span>}
                <input
                    id={inputId}
                    type="number"
                    // Use key to force re-render if value changes externally (precision fix)
                    key={`${value}-${decimals}`}
                    defaultValue={displayValue}
                    onBlur={(e) => onChange(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onChange(parseFloat(e.currentTarget.value) || 0);
                            e.currentTarget.blur();
                        }
                    }}
                    step={step}
                    min={min}
                    max={max}
                    aria-label={`${label}${prefix ? ` in ${prefix}` : ''}${suffix ? ` (${suffix})` : ''}`}
                    className="w-24 bg-transparent text-right text-emerald-400 font-mono text-sm
                     border-b border-transparent focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50
                     group-hover:border-zinc-700 transition-colors"
                />
                {suffix && <span className="text-zinc-500 text-sm" aria-hidden="true">{suffix}</span>}
            </div>
        </div>
    );
}

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                <span className="text-cyan-400">{icon}</span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{title}</h3>
            </div>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );
}

// Reset Confirmation Modal
function ResetConfirmModal({
    isOpen,
    onClose,
    onConfirm
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            aria-describedby="reset-modal-description"
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                    aria-label="Close dialog"
                >
                    <X size={18} />
                </button>
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg" aria-hidden="true">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 id="reset-modal-title" className="text-lg font-semibold text-zinc-100 mb-2">Reset to Defaults?</h3>
                        <p id="reset-modal-description" className="text-sm text-zinc-400 mb-4">
                            This will reset all assumptions to their default values. Any extracted or customized data will be lost.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                    showToast.success('Assumptions reset to defaults');
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function Sidebar() {
    const {
        assumptions,
        updateAssumption,
        resetToDefaults,
        valuation,
        company,
        setCompany,
        incomeStatement,
        balanceSheet,
        cashFlow,
        extractionMetadata,
    } = useFinanceStore();

    const [showResetModal, setShowResetModal] = useState(false);

    if (!assumptions) return null;

    // Export model data as JSON
    const handleExport = () => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            company: company || { name: 'Manual Entry', ticker: null },
            assumptions,
            valuation: {
                impliedSharePrice: valuation.impliedSharePrice,
                enterpriseValue: valuation.enterpriseValue,
                equityValue: valuation.equityValue,
                terminalValue: valuation.terminalValue,
            },
            projections: {
                incomeStatement: incomeStatement.map(row => ({
                    year: row.year,
                    revenue: row.revenue,
                    grossProfit: row.grossProfit,
                    ebit: row.ebit,
                    netIncome: row.netIncome,
                })),
                balanceSheet: balanceSheet.map(row => ({
                    year: row.year,
                    totalAssets: row.totalAssets,
                    totalLiabilities: row.totalLiabilities,
                    totalEquity: row.totalEquity,
                })),
                freeCashFlow: cashFlow.map(row => ({
                    year: row.year,
                    unleveredFCF: row.unleveredFCF,
                })),
            },
            extractionMetadata: extractionMetadata || null,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-zero-${company?.ticker || 'model'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast.success('Model exported successfully');
    };

    // Update market price manually
    const handlePriceChange = (price: number) => {
        if (company) {
            setCompany({ ...company, marketPrice: price });
        } else {
            setCompany({
                ticker: 'UNKNOWN',
                name: 'Manual Entry',
                sector: 'General',
                marketPrice: price,
                marketCap: 0,
                lastUpdated: new Date()
            });
        }
    };

    // Validate assumptions
    const validationErrors: string[] = [];

    if (assumptions.wacc <= assumptions.terminalGrowthRate) {
        validationErrors.push('WACC must be greater than Terminal Growth Rate');
    }

    if (assumptions.wacc <= 0 || assumptions.wacc > 50) {
        validationErrors.push('WACC should be between 0% and 50%');
    }

    if (assumptions.terminalGrowthRate < 0 || assumptions.terminalGrowthRate > 10) {
        validationErrors.push('Terminal Growth Rate should be between 0% and 10%');
    }

    if (assumptions.sharesOutstanding <= 0) {
        validationErrors.push('Shares Outstanding must be greater than 0');
    }

    if (assumptions.revenueGrowthRate < -50 || assumptions.revenueGrowthRate > 100) {
        validationErrors.push('Revenue Growth Rate should be between -50% and 100%');
    }

    return (
        <aside
            className="w-64 sm:w-72 md:w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen overflow-hidden"
            role="complementary"
            aria-label="Model assumptions panel"
        >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold text-zinc-100 tracking-tight">TERMINAL ZERO</h1>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleExport}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            title="Export model as JSON"
                            aria-label="Export model as JSON file"
                        >
                            <Download size={14} aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                            title="Reset to defaults"
                            aria-label="Reset all assumptions to defaults"
                        >
                            <RefreshCw size={14} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">DCF Valuation Workstation</p>
            </div>

            {/* Validation Warnings */}
            {validationErrors.length > 0 && (
                <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-400 mb-1">Validation Issues</p>
                            <ul className="text-xs text-amber-300/80 space-y-1">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4">
                <Section title="Market Data" icon={<TrendingUp size={14} />}>
                    <InputField
                        label="Share Price"
                        value={company?.marketPrice || 0}
                        onChange={handlePriceChange}
                        prefix="$"
                        step={0.01}
                        decimals={2}
                    />
                    <InputField
                        label="Shares Out"
                        value={assumptions.sharesOutstanding}
                        onChange={(v) => updateAssumption('sharesOutstanding', v)}
                        suffix="sh"
                        step={1000000}
                        decimals={0}
                    />
                </Section>

                <Section title="Revenue Drivers" icon={<TrendingUp size={14} />}>
                    <InputField
                        label="Base Revenue"
                        value={assumptions.baseRevenue}
                        onChange={(v) => updateAssumption('baseRevenue', v)}
                        prefix="$"
                        step={1000000}
                        decimals={0}
                    />
                    <InputField
                        label="Revenue Growth"
                        value={assumptions.revenueGrowthRate}
                        onChange={(v) => updateAssumption('revenueGrowthRate', v)}
                        suffix="%"
                        step={0.1}
                        min={-50}
                        max={100}
                        decimals={1}
                    />
                    <InputField
                        label="Projection Years"
                        value={assumptions.projectionYears}
                        onChange={(v) => updateAssumption('projectionYears', v)}
                        suffix="yrs"
                        step={1}
                        min={1}
                        max={20}
                        decimals={0}
                    />
                </Section>

                <Section title="Income Statement" icon={<DollarSign size={14} />}>
                    <InputField
                        label="COGS"
                        value={assumptions.cogsPercent}
                        onChange={(v) => updateAssumption('cogsPercent', v)}
                        suffix="%"
                        step={0.1}
                        min={0}
                        max={100}
                        decimals={1}
                    />
                    <InputField
                        label="SG&A"
                        value={assumptions.sgaPercent}
                        onChange={(v) => updateAssumption('sgaPercent', v)}
                        suffix="%"
                        step={0.1}
                        min={0}
                        max={100}
                        decimals={1}
                    />
                    <InputField
                        label="Tax Rate"
                        value={assumptions.taxRate}
                        onChange={(v) => updateAssumption('taxRate', v)}
                        suffix="%"
                        step={0.1}
                        min={0}
                        max={50}
                        decimals={1}
                    />
                </Section>

                <Section title="Working Capital" icon={<Building2 size={14} />}>
                    <InputField
                        label="Days Receivables"
                        value={assumptions.daysReceivables}
                        onChange={(v) => updateAssumption('daysReceivables', v)}
                        suffix="days"
                        decimals={0}
                    />
                    <InputField
                        label="Days Inventory"
                        value={assumptions.daysInventory}
                        onChange={(v) => updateAssumption('daysInventory', v)}
                        suffix="days"
                        decimals={0}
                    />
                    <InputField
                        label="Days Payables"
                        value={assumptions.daysPayables}
                        onChange={(v) => updateAssumption('daysPayables', v)}
                        suffix="days"
                        decimals={0}
                    />
                </Section>

                <Section title="CapEx & D&A" icon={<Calculator size={14} />}>
                    <InputField
                        label="CapEx % Revenue"
                        value={assumptions.capexPercent}
                        onChange={(v) => updateAssumption('capexPercent', v)}
                        suffix="%"
                        step={0.1}
                        decimals={1}
                    />
                    <InputField
                        label="Depreciation Life"
                        value={assumptions.depreciationYears}
                        onChange={(v) => updateAssumption('depreciationYears', v)}
                        suffix="yrs"
                        step={1}
                        decimals={0}
                    />
                </Section>

                <Section title="Debt Schedule" icon={<Percent size={14} />}>
                    <InputField
                        label="Debt Balance"
                        value={assumptions.debtBalance}
                        onChange={(v) => updateAssumption('debtBalance', v)}
                        prefix="$"
                        step={1000000}
                        decimals={0}
                    />
                    <InputField
                        label="Interest Rate"
                        value={assumptions.interestRate}
                        onChange={(v) => updateAssumption('interestRate', v)}
                        suffix="%"
                        step={0.1}
                        decimals={1}
                    />
                    <InputField
                        label="Yearly Repayment"
                        value={assumptions.yearlyRepayment}
                        onChange={(v) => updateAssumption('yearlyRepayment', v)}
                        prefix="$"
                        step={1000000}
                        decimals={0}
                    />
                </Section>

                <Section title="Valuation" icon={<Calculator size={14} />}>
                    <InputField
                        label="WACC"
                        value={assumptions.wacc}
                        onChange={(v) => updateAssumption('wacc', v)}
                        suffix="%"
                        step={0.1}
                        decimals={1}
                    />
                    <InputField
                        label="Terminal Growth"
                        value={assumptions.terminalGrowthRate}
                        onChange={(v) => updateAssumption('terminalGrowthRate', v)}
                        suffix="%"
                        step={0.1}
                        decimals={1}
                    />
                    <InputField
                        label="Net Debt (for EV)"
                        value={assumptions.netDebt}
                        onChange={(v) => updateAssumption('netDebt', v)}
                        prefix="$"
                        step={1000000}
                        decimals={0}
                    />
                </Section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                    <span>v1.0.0</span>
                    {company?.lastUpdated && (
                        <span>Updated: {new Date(company.lastUpdated).toLocaleDateString()}</span>
                    )}
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            <ResetConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={resetToDefaults}
            />
        </aside>
    );
}
