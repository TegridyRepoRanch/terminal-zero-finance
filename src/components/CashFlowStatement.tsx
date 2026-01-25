// Cash Flow Statement View
import { useFinanceStore } from '../store/useFinanceStore';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid';
import type { CashFlowRow } from '../lib/financial-logic';

const columns: Column<CashFlowRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'netIncome', header: 'Net Income', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
    { key: 'depreciation', header: '+ D&A', format: 'currency', highlight: 'neutral' },
    { key: 'changeInNWC', header: '- Δ NWC', format: 'currency', highlight: (v) => v <= 0 ? 'profit' : 'loss' },
    { key: 'capex', header: '- CapEx', format: 'currency', highlight: 'loss' },
    { key: 'unleveredFCF', header: 'UFCF', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
];

export function CashFlowStatement() {
    const { cashFlow } = useFinanceStore();

    // Calculate FCF conversion rate
    const conversionData = cashFlow.map((row, i) => {
        const incomeStatement = useFinanceStore.getState().incomeStatement[i];
        const conversionRate = incomeStatement.netIncome !== 0
            ? ((row.unleveredFCF / incomeStatement.ebit) * 100)
            : 0;

        return {
            year: row.year,
            ebit: incomeStatement.ebit,
            ufcf: row.unleveredFCF,
            conversionRate: conversionRate.toFixed(1) + '%',
        };
    });

    return (
        <div className="space-y-6">
            <DataGrid
                title="Cash Flow Statement"
                subtitle="Net Income → Unlevered Free Cash Flow Bridge"
                data={cashFlow}
                columns={columns}
                showTotal
                totalLabel="Total"
            />

            {/* FCF Conversion */}
            <DataGrid
                title="FCF Conversion Analysis"
                subtitle="EBIT to Unlevered FCF conversion rate"
                data={conversionData}
                columns={[
                    { key: 'year', header: 'Year', format: 'year' },
                    { key: 'ebit', header: 'EBIT', format: 'currency', highlight: 'profit' },
                    { key: 'ufcf', header: 'UFCF', format: 'currency', highlight: 'profit' },
                    { key: 'conversionRate', header: 'Conversion %', highlight: 'profit' },
                ]}
            />

            {/* Explanation */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                    Formula
                </h3>
                <p className="text-sm text-zinc-400 font-mono">
                    UFCF = EBIT(1-T) + D&A − ΔNWC − CapEx
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                    Unlevered FCF represents cash available to all capital providers (debt + equity) before interest payments.
                </p>
            </div>
        </div>
    );
}
