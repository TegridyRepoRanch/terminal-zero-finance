// 10-K Upload and Extraction Component
import { useState, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import {
    extractFinancialsFromPDF,
    financialsToAssumptions,
    isGeminiConfigured,
} from '../lib/gemini-service';
import type { ExtractedFinancials } from '../lib/gemini-service';
import { Upload, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

type ExtractionStatus = 'idle' | 'uploading' | 'extracting' | 'success' | 'error';

export function TenKUpload() {
    const { updateAssumption } = useFinanceStore();
    const [status, setStatus] = useState<ExtractionStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedFinancials | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!isGeminiConfigured()) {
            setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
            setStatus('error');
            return;
        }

        try {
            setStatus('uploading');
            setError(null);

            // Small delay to show upload state
            await new Promise(resolve => setTimeout(resolve, 500));

            setStatus('extracting');

            // Extract financials using Gemini
            const financials = await extractFinancialsFromPDF(file);
            setExtractedData(financials);

            // Auto-populate assumptions
            const assumptions = financialsToAssumptions(financials);

            // Update store with extracted values
            if (assumptions.baseRevenue) updateAssumption('baseRevenue', assumptions.baseRevenue);
            if (assumptions.revenueGrowthRate) updateAssumption('revenueGrowthRate', assumptions.revenueGrowthRate);
            if (assumptions.cogsPercent) updateAssumption('cogsPercent', assumptions.cogsPercent);
            if (assumptions.sgaPercent) updateAssumption('sgaPercent', assumptions.sgaPercent);
            if (assumptions.taxRate) updateAssumption('taxRate', assumptions.taxRate);
            if (assumptions.sharesOutstanding) updateAssumption('sharesOutstanding', assumptions.sharesOutstanding);
            if (assumptions.netDebt) updateAssumption('netDebt', assumptions.netDebt);
            if (assumptions.debtBalance) updateAssumption('debtBalance', assumptions.debtBalance);

            setStatus('success');
        } catch (err) {
            console.error('Extraction error:', err);
            setError(err instanceof Error ? err.message : 'Failed to extract financial data');
            setStatus('error');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const geminiConfigured = isGeminiConfigured();

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="text-cyan-400" size={16} />
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    AI-Powered 10-K Analysis
                </h3>
            </div>

            {!geminiConfigured && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <AlertCircle size={14} />
                        <span>Add VITE_GEMINI_API_KEY to .env</span>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
            />

            <button
                onClick={handleClick}
                disabled={status === 'uploading' || status === 'extracting' || !geminiConfigured}
                className={cn(
                    "w-full py-3 px-4 rounded-lg border-2 border-dashed transition-all",
                    "flex items-center justify-center gap-3",
                    status === 'idle' && geminiConfigured && "border-zinc-700 hover:border-cyan-500 hover:bg-cyan-500/5 text-zinc-400 hover:text-cyan-400",
                    status === 'uploading' && "border-cyan-500 bg-cyan-500/5 text-cyan-400",
                    status === 'extracting' && "border-cyan-500 bg-cyan-500/5 text-cyan-400",
                    status === 'success' && "border-emerald-500 bg-emerald-500/5 text-emerald-400",
                    status === 'error' && "border-rose-500 bg-rose-500/5 text-rose-400",
                    !geminiConfigured && "border-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
            >
                {status === 'idle' && (
                    <>
                        <Upload size={18} />
                        <span className="text-sm">Upload 10-K PDF</span>
                    </>
                )}
                {status === 'uploading' && (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Uploading...</span>
                    </>
                )}
                {status === 'extracting' && (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Gemini 2.5 Flash extracting data...</span>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle size={18} />
                        <span className="text-sm">Data extracted! Click to upload another</span>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <AlertCircle size={18} />
                        <span className="text-sm">Error - Click to retry</span>
                    </>
                )}
            </button>

            {error && (
                <p className="mt-2 text-xs text-rose-400">{error}</p>
            )}

            {extractedData && status === 'success' && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Extracted Data</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-800/50 rounded p-2">
                            <span className="text-zinc-500">Revenue</span>
                            <p className="text-emerald-400 font-mono">
                                ${(extractedData.revenue / 1e9).toFixed(2)}B
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                            <span className="text-zinc-500">Net Income</span>
                            <p className="text-emerald-400 font-mono">
                                ${(extractedData.netIncome / 1e9).toFixed(2)}B
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                            <span className="text-zinc-500">Shares Out</span>
                            <p className="text-emerald-400 font-mono">
                                {(extractedData.sharesOutstanding / 1e9).toFixed(2)}B
                            </p>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-2">
                            <span className="text-zinc-500">Gross Margin</span>
                            <p className="text-emerald-400 font-mono">
                                {((extractedData.grossMargin || 0) * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-3 text-xs text-zinc-600 text-center">
                Powered by Gemini 2.5 Flash • Supports PDF 10-Ks
            </p>
        </div>
    );
}
