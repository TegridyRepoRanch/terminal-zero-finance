// Sidebar - Assumptions Input Panel
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../lib/financial-logic';
import { RefreshCw, TrendingUp, Building2, DollarSign, Calculator, Percent } from 'lucide-react';

interface InputFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix?: string;
    prefix?: string;
    step?: number;
    min?: number;
    max?: number;
}

function InputField({ label, value, onChange, suffix, prefix, step = 1, min, max }: InputFieldProps) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 group hover:bg-zinc-900/30 px-2 -mx-2 rounded">
            <span className="text-zinc-400 text-xs uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-1">
                {prefix && <span className="text-zinc-500 text-sm">{prefix}</span>}
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    step={step}
                    min={min}
                    max={max}
                    className="w-20 bg-transparent text-right text-emerald-400 font-mono text-sm 
                     border-b border-transparent focus:border-emerald-500 focus:outline-none
                     group-hover:border-zinc-700 transition-colors"
                />
                {suffix && <span className="text-zinc-500 text-sm">{suffix}</span>}
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

export function Sidebar() {
    const { assumptions, updateAssumption, resetToDefaults, valuation } = useFinanceStore();

    return (
        <aside className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold text-zinc-100 tracking-tight">TERMINAL ZERO</h1>
                    <button
                        onClick={resetToDefaults}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Reset to defaults"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">DCF Valuation Workstation</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4">
                <Section title="Revenue Drivers" icon={<TrendingUp size={14} />}>
                    <InputField
                        label="Base Revenue"
                        value={assumptions.baseRevenue / 1e6}
                        onChange={(v) => updateAssumption('baseRevenue', v * 1e6)}
                        prefix="$"
                        suffix="M"
                        step={10}
                    />
                    <InputField
                        label="Revenue Growth"
                        value={assumptions.revenueGrowthRate}
                        onChange={(v) => updateAssumption('revenueGrowthRate', v)}
                        suffix="%"
                        step={0.5}
                    />
                    <InputField
                        label="Projection Years"
                        value={assumptions.projectionYears}
                        onChange={(v) => updateAssumption('projectionYears', Math.max(1, Math.min(10, v)))}
                        suffix="yrs"
                        step={1}
                        min={1}
                        max={10}
                    />
                </Section>

                <Section title="Income Statement" icon={<DollarSign size={14} />}>
                    <InputField
                        label="COGS"
                        value={assumptions.cogsPercent}
                        onChange={(v) => updateAssumption('cogsPercent', v)}
                        suffix="%"
                        step={1}
                    />
                    <InputField
                        label="SG&A"
                        value={assumptions.sgaPercent}
                        onChange={(v) => updateAssumption('sgaPercent', v)}
                        suffix="%"
                        step={1}
                    />
                    <InputField
                        label="Tax Rate"
                        value={assumptions.taxRate}
                        onChange={(v) => updateAssumption('taxRate', v)}
                        suffix="%"
                        step={1}
                    />
                </Section>

                <Section title="Working Capital" icon={<Building2 size={14} />}>
                    <InputField
                        label="Days Receivables"
                        value={assumptions.daysReceivables}
                        onChange={(v) => updateAssumption('daysReceivables', v)}
                        suffix="days"
                        step={1}
                    />
                    <InputField
                        label="Days Inventory"
                        value={assumptions.daysInventory}
                        onChange={(v) => updateAssumption('daysInventory', v)}
                        suffix="days"
                        step={1}
                    />
                    <InputField
                        label="Days Payables"
                        value={assumptions.daysPayables}
                        onChange={(v) => updateAssumption('daysPayables', v)}
                        suffix="days"
                        step={1}
                    />
                </Section>

                <Section title="CapEx & D&A" icon={<Building2 size={14} />}>
                    <InputField
                        label="CapEx % Revenue"
                        value={assumptions.capexPercent}
                        onChange={(v) => updateAssumption('capexPercent', v)}
                        suffix="%"
                        step={0.5}
                    />
                    <InputField
                        label="Depreciation Life"
                        value={assumptions.depreciationYears}
                        onChange={(v) => updateAssumption('depreciationYears', Math.max(1, v))}
                        suffix="yrs"
                        step={1}
                    />
                </Section>

                <Section title="Debt Schedule" icon={<Calculator size={14} />}>
                    <InputField
                        label="Debt Balance"
                        value={assumptions.debtBalance / 1e6}
                        onChange={(v) => updateAssumption('debtBalance', v * 1e6)}
                        prefix="$"
                        suffix="M"
                        step={10}
                    />
                    <InputField
                        label="Interest Rate"
                        value={assumptions.interestRate}
                        onChange={(v) => updateAssumption('interestRate', v)}
                        suffix="%"
                        step={0.25}
                    />
                    <InputField
                        label="Yearly Repayment"
                        value={assumptions.yearlyRepayment / 1e6}
                        onChange={(v) => updateAssumption('yearlyRepayment', v * 1e6)}
                        prefix="$"
                        suffix="M"
                        step={5}
                    />
                </Section>

                <Section title="Valuation Inputs" icon={<Percent size={14} />}>
                    <InputField
                        label="WACC"
                        value={assumptions.wacc}
                        onChange={(v) => updateAssumption('wacc', v)}
                        suffix="%"
                        step={0.5}
                    />
                    <InputField
                        label="Terminal Growth"
                        value={assumptions.terminalGrowthRate}
                        onChange={(v) => updateAssumption('terminalGrowthRate', v)}
                        suffix="%"
                        step={0.25}
                    />
                    <InputField
                        label="Net Debt"
                        value={assumptions.netDebt / 1e6}
                        onChange={(v) => updateAssumption('netDebt', v * 1e6)}
                        prefix="$"
                        suffix="M"
                        step={10}
                    />
                    <InputField
                        label="Shares Outstanding"
                        value={assumptions.sharesOutstanding / 1e6}
                        onChange={(v) => updateAssumption('sharesOutstanding', v * 1e6)}
                        suffix="M"
                        step={1}
                    />
                </Section>
            </div>

            {/* Footer with key output */}
            <div className="p-4 border-t border-zinc-800 bg-gradient-to-t from-zinc-900 to-transparent">
                <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Implied Share Price</p>
                    <p className="text-3xl font-bold text-emerald-400 font-mono animate-pulse-glow">
                        ${valuation.impliedSharePrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                        EV: {formatCurrency(valuation.enterpriseValue)}
                    </p>
                </div>
            </div>
        </aside>
    );
}
