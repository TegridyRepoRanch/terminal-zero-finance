// Source Verification View
// Shows extracted values alongside their source text for verification

import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CheckCircle, AlertTriangle, Search, FileText, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '../lib/financial-logic';
import type { SourceCitation } from '../lib/extraction-types';
import { cn } from '../lib/utils';

// Field categories for organization
const FIELD_CATEGORIES = {
    'Income Statement': [
        { key: 'revenue', label: 'Revenue' },
        { key: 'costOfRevenue', label: 'Cost of Revenue' },
        { key: 'grossProfit', label: 'Gross Profit' },
        { key: 'operatingExpenses', label: 'Operating Expenses' },
        { key: 'sgaExpense', label: 'SG&A Expense' },
        { key: 'rdExpense', label: 'R&D Expense' },
        { key: 'depreciationAmortization', label: 'D&A' },
        { key: 'operatingIncome', label: 'Operating Income' },
        { key: 'interestExpense', label: 'Interest Expense' },
        { key: 'incomeTaxExpense', label: 'Tax Expense' },
        { key: 'netIncome', label: 'Net Income' },
    ],
    'Balance Sheet': [
        { key: 'cashAndEquivalents', label: 'Cash & Equivalents' },
        { key: 'accountsReceivable', label: 'Accounts Receivable' },
        { key: 'inventory', label: 'Inventory' },
        { key: 'totalCurrentAssets', label: 'Total Current Assets' },
        { key: 'propertyPlantEquipment', label: 'PP&E' },
        { key: 'totalAssets', label: 'Total Assets' },
        { key: 'accountsPayable', label: 'Accounts Payable' },
        { key: 'shortTermDebt', label: 'Short-Term Debt' },
        { key: 'longTermDebt', label: 'Long-Term Debt' },
        { key: 'totalDebt', label: 'Total Debt' },
        { key: 'totalLiabilities', label: 'Total Liabilities' },
        { key: 'totalEquity', label: 'Total Equity' },
    ],
    'Shares & Other': [
        { key: 'sharesOutstandingBasic', label: 'Shares Outstanding (Basic)' },
        { key: 'sharesOutstandingDiluted', label: 'Shares Outstanding (Diluted)' },
        { key: 'priorYearRevenue', label: 'Prior Year Revenue' },
    ],
};

interface VerificationRowProps {
    label: string;
    fieldKey: string;
    extractedValue: number | string | null;
    citation?: SourceCitation;
    onHighlight?: (text: string) => void;
}

function VerificationRow({ label, extractedValue, citation, onHighlight }: VerificationRowProps) {
    const [expanded, setExpanded] = useState(false);

    const confidence = citation?.confidence ?? 0;
    const hasSource = citation && citation.sourceText;

    const getConfidenceColor = () => {
        if (confidence >= 0.8) return 'text-emerald-400';
        if (confidence >= 0.5) return 'text-amber-400';
        return 'text-red-400';
    };

    const getConfidenceIcon = () => {
        if (confidence >= 0.8) return <CheckCircle size={14} className="text-emerald-400" />;
        if (confidence >= 0.5) return <AlertTriangle size={14} className="text-amber-400" />;
        return <AlertTriangle size={14} className="text-red-400" />;
    };

    const formatValue = (val: number | string | null) => {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'number') {
            if (Math.abs(val) >= 1e6) return formatCurrency(val);
            return val.toLocaleString();
        }
        return val;
    };

    return (
        <div className={cn(
            'border-b border-zinc-800/50 transition-colors',
            expanded && 'bg-zinc-800/20'
        )}>
            <div
                className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-zinc-800/30"
                onClick={() => hasSource && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {hasSource ? (
                        expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />
                    ) : (
                        <div className="w-3.5" />
                    )}
                    <span className="text-sm text-zinc-400">{label}</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-zinc-200">
                        {formatValue(extractedValue)}
                    </span>
                    {hasSource && (
                        <div className="flex items-center gap-1">
                            {getConfidenceIcon()}
                            <span className={cn('text-xs font-mono', getConfidenceColor())}>
                                {Math.round(confidence * 100)}%
                            </span>
                        </div>
                    )}
                    {!hasSource && (
                        <span className="text-xs text-zinc-600">No source</span>
                    )}
                </div>
            </div>

            {/* Expanded source text */}
            {expanded && hasSource && (
                <div className="px-3 pb-3">
                    <div className="ml-5 p-3 bg-zinc-900 rounded border border-zinc-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                Source Text
                            </span>
                            {citation.sourceLocation && (
                                <span className="text-xs text-zinc-600">
                                    {citation.sourceLocation}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                            {citation.sourceText}
                        </p>
                        {onHighlight && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onHighlight(citation.sourceText);
                                }}
                                className="mt-2 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                            >
                                <Search size={12} />
                                Find in document
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface CategorySectionProps {
    title: string;
    fields: Array<{ key: string; label: string }>;
    extractedData: Record<string, unknown>;
    citations?: Record<string, SourceCitation>;
}

function CategorySection({ title, fields, extractedData, citations }: CategorySectionProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="mb-4">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-t hover:bg-zinc-800/70"
            >
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    {title}
                </span>
                {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {!collapsed && (
                <div className="border border-t-0 border-zinc-800 rounded-b">
                    {fields.map(({ key, label }) => (
                        <VerificationRow
                            key={key}
                            fieldKey={key}
                            label={label}
                            extractedValue={extractedData[key] as number | string | null}
                            citation={citations?.[key]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function SourceVerificationView() {
    const { extractionMetadata, dataSource } = useFinanceStore();
    const [showRawSource, setShowRawSource] = useState(false);

    // If no extraction data, show placeholder
    if (dataSource !== 'extraction' || !extractionMetadata) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                    No Extraction Data
                </h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                    Source verification is available after extracting financial data from a SEC filing.
                    Upload a 10-K or 10-Q to see extracted values alongside their source text.
                </p>
            </div>
        );
    }

    // Get extracted financials from store (we need to reconstruct from assumptions)
    // In a full implementation, we'd store the raw extracted data
    const citations = extractionMetadata.sourceCitations || {};
    const rawSource = extractionMetadata.rawSourceText || '';

    // Create a mock extracted data object for display
    // In production, this would come from stored extraction results
    const extractedData: Record<string, unknown> = {
        companyName: extractionMetadata.companyName,
        filingType: extractionMetadata.filingType,
        fiscalPeriod: extractionMetadata.fiscalPeriod,
        // These would be populated from actual extraction results
    };

    // Calculate overall confidence
    const citationValues = Object.values(citations);
    const avgConfidence = citationValues.length > 0
        ? citationValues.reduce((sum, c) => sum + c.confidence, 0) / citationValues.length
        : 0;

    const getOverallStatus = () => {
        if (avgConfidence >= 0.8) return { label: 'High Confidence', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        if (avgConfidence >= 0.5) return { label: 'Medium Confidence', color: 'text-amber-400', bg: 'bg-amber-500/10' };
        return { label: 'Low Confidence - Review Recommended', color: 'text-red-400', bg: 'bg-red-500/10' };
    };

    const status = getOverallStatus();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-100">Source Verification</h3>
                        <p className="text-sm text-zinc-500">
                            Compare extracted values with source document text
                        </p>
                    </div>
                    <div className={cn('px-3 py-1 rounded-full text-xs font-medium', status.bg, status.color)}>
                        {status.label}
                    </div>
                </div>

                {/* Extraction Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-zinc-500">Company</p>
                        <p className="text-sm font-medium text-zinc-200">{extractionMetadata.companyName}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Filing Type</p>
                        <p className="text-sm font-medium text-zinc-200">{extractionMetadata.filingType}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Fiscal Period</p>
                        <p className="text-sm font-medium text-zinc-200">{extractionMetadata.fiscalPeriod}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Fields Cited</p>
                        <p className="text-sm font-medium text-zinc-200">{citationValues.length} fields</p>
                    </div>
                </div>
            </div>

            {/* Raw Source Toggle */}
            {rawSource && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowRawSource(!showRawSource)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30"
                    >
                        <div className="flex items-center gap-2">
                            {showRawSource ? <EyeOff size={16} /> : <Eye size={16} />}
                            <span className="text-sm font-medium">Raw Source Text</span>
                        </div>
                        <span className="text-xs text-zinc-500">
                            {rawSource.length.toLocaleString()} characters
                        </span>
                    </button>

                    {showRawSource && (
                        <div className="p-4 pt-0 max-h-96 overflow-y-auto">
                            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                                {rawSource.slice(0, 10000)}
                                {rawSource.length > 10000 && (
                                    <span className="text-zinc-600">
                                        {'\n\n'}... [{(rawSource.length - 10000).toLocaleString()} more characters]
                                    </span>
                                )}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Field Categories */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-zinc-300 mb-4">Extracted Fields</h4>

                {Object.entries(FIELD_CATEGORIES).map(([category, fields]) => (
                    <CategorySection
                        key={category}
                        title={category}
                        fields={fields}
                        extractedData={extractedData}
                        citations={citations}
                    />
                ))}
            </div>

            {/* No Citations Warning */}
            {citationValues.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-400">No Source Citations Available</p>
                            <p className="text-xs text-amber-300/80 mt-1">
                                Source citations help verify AI extraction accuracy. This extraction was performed
                                without citation tracking. Future extractions will include source text references.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
