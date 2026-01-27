// Investment Thesis Template
// Structured template for documenting investment analysis and decision-making

import { useState, useCallback } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import {
    calculateMarginOfSafety,
} from '../../lib/financial-logic';
import {
    FileText,
    Save,
    Download,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Target,
    Clock,
    DollarSign,
    Shield,
    Lightbulb,
    Scale,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Thesis data structure
interface InvestmentThesisData {
    // Core Thesis
    ticker: string;
    companyName: string;
    createdAt: Date;
    updatedAt: Date;

    // Investment Type
    investmentType: 'long' | 'short' | 'undecided';
    timeHorizon: 'short-term' | 'medium-term' | 'long-term';

    // Thesis Summary
    thesisSummary: string;

    // Bull Case
    bullCase: string[];
    bullCaseProbability: number; // 0-100
    bullCaseTarget: number | null;

    // Bear Case
    bearCase: string[];
    bearCaseProbability: number;
    bearCaseTarget: number | null;

    // Base Case
    baseCase: string;
    baseCaseProbability: number;
    baseCaseTarget: number | null;

    // Key Risks
    keyRisks: string[];

    // Catalysts
    catalysts: string[];

    // Position Sizing
    positionSize: 'small' | 'medium' | 'large' | 'conviction';
    maxLossPercent: number;

    // Exit Criteria
    exitCriteriaUp: string;
    exitCriteriaDown: string;

    // Notes
    additionalNotes: string;
}

// Default empty thesis
function createEmptyThesis(ticker: string, companyName: string): InvestmentThesisData {
    return {
        ticker,
        companyName,
        createdAt: new Date(),
        updatedAt: new Date(),
        investmentType: 'undecided',
        timeHorizon: 'medium-term',
        thesisSummary: '',
        bullCase: [''],
        bullCaseProbability: 30,
        bullCaseTarget: null,
        bearCase: [''],
        bearCaseProbability: 30,
        bearCaseTarget: null,
        baseCase: '',
        baseCaseProbability: 40,
        baseCaseTarget: null,
        keyRisks: [''],
        catalysts: [''],
        positionSize: 'small',
        maxLossPercent: 10,
        exitCriteriaUp: '',
        exitCriteriaDown: '',
        additionalNotes: '',
    };
}

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: TextAreaFieldProps) {
    return (
        <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {label}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
        </div>
    );
}

interface ListFieldProps {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
    icon?: React.ReactNode;
}

function ListField({ label, items, onChange, placeholder, icon }: ListFieldProps) {
    const addItem = () => {
        onChange([...items, '']);
    };

    const updateItem = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        onChange(newItems);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            onChange(items.filter((_, i) => i !== index));
        }
    };

    return (
        <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                {icon}
                {label}
            </label>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => updateItem(index, e.target.value)}
                            placeholder={placeholder}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <button
                            onClick={() => removeItem(index)}
                            className="px-2 text-zinc-500 hover:text-red-400 transition-colors"
                            disabled={items.length === 1}
                        >
                            <XCircle size={16} />
                        </button>
                    </div>
                ))}
                <button
                    onClick={addItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    + Add item
                </button>
            </div>
        </div>
    );
}

export function InvestmentThesis() {
    const { company, assumptions, valuation } = useFinanceStore();
    const [thesis, setThesis] = useState<InvestmentThesisData>(() =>
        createEmptyThesis(
            company?.ticker || 'N/A',
            company?.name || 'Unknown Company'
        )
    );
    const [isSaved, setIsSaved] = useState(false);

    const marketPrice = company?.marketPrice || 0;
    const marginOfSafety = marketPrice > 0 ? calculateMarginOfSafety(assumptions, marketPrice) : null;

    const updateThesis = useCallback(<K extends keyof InvestmentThesisData>(
        field: K,
        value: InvestmentThesisData[K]
    ) => {
        setThesis(prev => ({
            ...prev,
            [field]: value,
            updatedAt: new Date(),
        }));
        setIsSaved(false);
    }, []);

    const handleSave = () => {
        // Save to localStorage
        const key = `thesis_${thesis.ticker}_${thesis.createdAt.getTime()}`;
        localStorage.setItem(key, JSON.stringify(thesis));
        setIsSaved(true);
    };

    const handleExport = () => {
        // Generate markdown export
        const markdown = generateThesisMarkdown(thesis, valuation, marginOfSafety);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${thesis.ticker}_investment_thesis.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText size={20} className="text-emerald-500" />
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                            Investment Thesis
                        </h3>
                        <p className="text-xs text-zinc-500">
                            {thesis.ticker} - {thesis.companyName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            isSaved
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        )}
                    >
                        {isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Current Valuation Context */}
            {marginOfSafety && (
                <div className="bg-zinc-800/50 rounded-lg p-4 grid grid-cols-4 gap-4 text-center text-xs">
                    <div>
                        <p className="text-zinc-500 mb-1">Market Price</p>
                        <p className="text-lg font-mono text-zinc-300">${marketPrice.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500 mb-1">DCF Value</p>
                        <p className="text-lg font-mono text-emerald-400">${marginOfSafety.dcfValue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-zinc-500 mb-1">Margin of Safety</p>
                        <p className={cn(
                            'text-lg font-mono',
                            marginOfSafety.marginOfSafety >= 0 ? 'text-green-400' : 'text-red-400'
                        )}>
                            {marginOfSafety.marginOfSafety >= 0 ? '+' : ''}{marginOfSafety.marginOfSafety.toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-zinc-500 mb-1">Verdict</p>
                        <p className="text-lg font-mono text-yellow-400">{marginOfSafety.verdict.replace('-', ' ')}</p>
                    </div>
                </div>
            )}

            {/* Investment Type & Time Horizon */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Investment Type
                    </label>
                    <div className="flex gap-2">
                        {(['long', 'short', 'undecided'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => updateThesis('investmentType', type)}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                    thesis.investmentType === type
                                        ? type === 'long'
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : type === 'short'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                                )}
                            >
                                {type === 'long' && <TrendingUp size={14} />}
                                {type === 'short' && <TrendingDown size={14} />}
                                {type === 'undecided' && <Scale size={14} />}
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Time Horizon
                    </label>
                    <div className="flex gap-2">
                        {(['short-term', 'medium-term', 'long-term'] as const).map((horizon) => (
                            <button
                                key={horizon}
                                onClick={() => updateThesis('timeHorizon', horizon)}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                    thesis.timeHorizon === horizon
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                                )}
                            >
                                <Clock size={14} />
                                {horizon.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Thesis Summary */}
            <TextAreaField
                label="Investment Thesis Summary"
                value={thesis.thesisSummary}
                onChange={(v) => updateThesis('thesisSummary', v)}
                placeholder="Summarize your investment thesis in 2-3 sentences. What is the core reason for this investment?"
                rows={4}
            />

            {/* Bull / Base / Bear Cases */}
            <div className="grid grid-cols-3 gap-4">
                {/* Bull Case */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-green-400">
                        <TrendingUp size={16} />
                        <span className="text-sm font-semibold">Bull Case</span>
                    </div>
                    <ListField
                        label="Key Points"
                        items={thesis.bullCase}
                        onChange={(v) => updateThesis('bullCase', v)}
                        placeholder="What goes right?"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Probability</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={thesis.bullCaseProbability}
                                onChange={(e) => updateThesis('bullCaseProbability', Number(e.target.value))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Target Price</label>
                            <input
                                type="number"
                                value={thesis.bullCaseTarget || ''}
                                onChange={(e) => updateThesis('bullCaseTarget', e.target.value ? Number(e.target.value) : null)}
                                placeholder="$"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Base Case */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-yellow-400">
                        <Target size={16} />
                        <span className="text-sm font-semibold">Base Case</span>
                    </div>
                    <TextAreaField
                        label="Expected Scenario"
                        value={thesis.baseCase}
                        onChange={(v) => updateThesis('baseCase', v)}
                        placeholder="What is the most likely outcome?"
                        rows={4}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Probability</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={thesis.baseCaseProbability}
                                onChange={(e) => updateThesis('baseCaseProbability', Number(e.target.value))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Target Price</label>
                            <input
                                type="number"
                                value={thesis.baseCaseTarget || ''}
                                onChange={(e) => updateThesis('baseCaseTarget', e.target.value ? Number(e.target.value) : null)}
                                placeholder="$"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Bear Case */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 text-red-400">
                        <TrendingDown size={16} />
                        <span className="text-sm font-semibold">Bear Case</span>
                    </div>
                    <ListField
                        label="Key Points"
                        items={thesis.bearCase}
                        onChange={(v) => updateThesis('bearCase', v)}
                        placeholder="What goes wrong?"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Probability</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={thesis.bearCaseProbability}
                                onChange={(e) => updateThesis('bearCaseProbability', Number(e.target.value))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Target Price</label>
                            <input
                                type="number"
                                value={thesis.bearCaseTarget || ''}
                                onChange={(e) => updateThesis('bearCaseTarget', e.target.value ? Number(e.target.value) : null)}
                                placeholder="$"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Probability Check */}
            {(thesis.bullCaseProbability + thesis.baseCaseProbability + thesis.bearCaseProbability) !== 100 && (
                <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} />
                    Probabilities should sum to 100% (currently: {thesis.bullCaseProbability + thesis.baseCaseProbability + thesis.bearCaseProbability}%)
                </div>
            )}

            {/* Key Risks & Catalysts */}
            <div className="grid grid-cols-2 gap-4">
                <ListField
                    label="Key Risks"
                    items={thesis.keyRisks}
                    onChange={(v) => updateThesis('keyRisks', v)}
                    placeholder="What could go wrong?"
                    icon={<AlertTriangle size={12} className="text-red-400" />}
                />
                <ListField
                    label="Catalysts"
                    items={thesis.catalysts}
                    onChange={(v) => updateThesis('catalysts', v)}
                    placeholder="What will unlock value?"
                    icon={<Lightbulb size={12} className="text-yellow-400" />}
                />
            </div>

            {/* Position Sizing */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        <DollarSign size={12} />
                        Position Size
                    </label>
                    <div className="flex gap-2">
                        {(['small', 'medium', 'large', 'conviction'] as const).map((size) => (
                            <button
                                key={size}
                                onClick={() => updateThesis('positionSize', size)}
                                className={cn(
                                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                    thesis.positionSize === size
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                                )}
                            >
                                {size.charAt(0).toUpperCase() + size.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        <Shield size={12} />
                        Max Loss Tolerance (%)
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={thesis.maxLossPercent}
                        onChange={(e) => updateThesis('maxLossPercent', Number(e.target.value))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    />
                </div>
            </div>

            {/* Exit Criteria */}
            <div className="grid grid-cols-2 gap-4">
                <TextAreaField
                    label="Exit Criteria (Upside)"
                    value={thesis.exitCriteriaUp}
                    onChange={(v) => updateThesis('exitCriteriaUp', v)}
                    placeholder="When will you take profits? Price target, time, or thesis change?"
                    rows={2}
                />
                <TextAreaField
                    label="Exit Criteria (Downside)"
                    value={thesis.exitCriteriaDown}
                    onChange={(v) => updateThesis('exitCriteriaDown', v)}
                    placeholder="When will you cut losses? Stop loss, thesis broken?"
                    rows={2}
                />
            </div>

            {/* Additional Notes */}
            <TextAreaField
                label="Additional Notes"
                value={thesis.additionalNotes}
                onChange={(v) => updateThesis('additionalNotes', v)}
                placeholder="Any other considerations, research notes, or reminders..."
                rows={4}
            />
        </div>
    );
}

// Generate markdown export
function generateThesisMarkdown(
    thesis: InvestmentThesisData,
    _valuation: { impliedSharePrice: number; enterpriseValue: number },
    marginOfSafety: { dcfValue: number; marketPrice: number; marginOfSafety: number; verdict: string } | null
): string {
    const lines: string[] = [];

    lines.push(`# Investment Thesis: ${thesis.ticker}`);
    lines.push(`**${thesis.companyName}**`);
    lines.push('');
    lines.push(`*Created: ${thesis.createdAt.toLocaleDateString()}*`);
    lines.push(`*Updated: ${thesis.updatedAt.toLocaleDateString()}*`);
    lines.push('');

    lines.push('## Overview');
    lines.push(`- **Investment Type:** ${thesis.investmentType.toUpperCase()}`);
    lines.push(`- **Time Horizon:** ${thesis.timeHorizon}`);
    lines.push(`- **Position Size:** ${thesis.positionSize}`);
    lines.push('');

    if (marginOfSafety) {
        lines.push('## Valuation');
        lines.push(`- **Current Price:** $${marginOfSafety.marketPrice.toFixed(2)}`);
        lines.push(`- **DCF Value:** $${marginOfSafety.dcfValue.toFixed(2)}`);
        lines.push(`- **Margin of Safety:** ${marginOfSafety.marginOfSafety.toFixed(1)}%`);
        lines.push(`- **Verdict:** ${marginOfSafety.verdict}`);
        lines.push('');
    }

    lines.push('## Thesis Summary');
    lines.push(thesis.thesisSummary || '*Not provided*');
    lines.push('');

    lines.push('## Scenario Analysis');
    lines.push('');
    lines.push('### Bull Case');
    lines.push(`- **Probability:** ${thesis.bullCaseProbability}%`);
    if (thesis.bullCaseTarget) lines.push(`- **Target Price:** $${thesis.bullCaseTarget}`);
    thesis.bullCase.filter(Boolean).forEach(point => lines.push(`- ${point}`));
    lines.push('');

    lines.push('### Base Case');
    lines.push(`- **Probability:** ${thesis.baseCaseProbability}%`);
    if (thesis.baseCaseTarget) lines.push(`- **Target Price:** $${thesis.baseCaseTarget}`);
    lines.push(thesis.baseCase || '*Not provided*');
    lines.push('');

    lines.push('### Bear Case');
    lines.push(`- **Probability:** ${thesis.bearCaseProbability}%`);
    if (thesis.bearCaseTarget) lines.push(`- **Target Price:** $${thesis.bearCaseTarget}`);
    thesis.bearCase.filter(Boolean).forEach(point => lines.push(`- ${point}`));
    lines.push('');

    lines.push('## Key Risks');
    thesis.keyRisks.filter(Boolean).forEach(risk => lines.push(`- ${risk}`));
    lines.push('');

    lines.push('## Catalysts');
    thesis.catalysts.filter(Boolean).forEach(catalyst => lines.push(`- ${catalyst}`));
    lines.push('');

    lines.push('## Exit Criteria');
    lines.push('### Upside');
    lines.push(thesis.exitCriteriaUp || '*Not defined*');
    lines.push('### Downside');
    lines.push(thesis.exitCriteriaDown || '*Not defined*');
    lines.push('');

    lines.push('## Risk Management');
    lines.push(`- **Position Size:** ${thesis.positionSize}`);
    lines.push(`- **Max Loss Tolerance:** ${thesis.maxLossPercent}%`);
    lines.push('');

    if (thesis.additionalNotes) {
        lines.push('## Additional Notes');
        lines.push(thesis.additionalNotes);
        lines.push('');
    }

    lines.push('---');
    lines.push('*Generated by Terminal Zero Finance*');

    return lines.join('\n');
}
