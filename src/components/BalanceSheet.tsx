// Balance Sheet View
import { useFinanceStore } from '../store/useFinanceStore';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid';
import type { BalanceSheetRow } from '../lib/financial-logic';

const assetsColumns: Column<BalanceSheetRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'cashPlug', header: 'Cash', format: 'currency', highlight: 'profit' },
    { key: 'accountsReceivable', header: 'A/R', format: 'currency', highlight: 'neutral' },
    { key: 'inventory', header: 'Inventory', format: 'currency', highlight: 'neutral' },
    { key: 'totalCurrentAssets', header: 'Current Assets', format: 'currency', highlight: 'profit' },
    { key: 'ppe', header: 'PP&E', format: 'currency', highlight: 'neutral' },
    { key: 'totalAssets', header: 'Total Assets', format: 'currency', highlight: 'profit' },
];

const liabilitiesColumns: Column<BalanceSheetRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'accountsPayable', header: 'A/P', format: 'currency', highlight: 'neutral' },
    { key: 'debtBalance', header: 'Debt', format: 'currency', highlight: 'loss' },
    { key: 'totalLiabilities', header: 'Total Liabilities', format: 'currency', highlight: 'loss' },
    { key: 'retainedEarnings', header: 'Retained Earnings', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
    { key: 'totalEquity', header: 'Total Equity', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
];

export function BalanceSheet() {
    const { balanceSheet, assumptions } = useFinanceStore();

    // Check if balance sheet balances
    const balanceCheck = balanceSheet.map((row) => ({
        year: row.year,
        assets: row.totalAssets,
        liabilitiesEquity: row.totalLiabilities + row.totalEquity + row.cashPlug,
        balanced: Math.abs(row.totalAssets - (row.totalLiabilities + row.totalEquity + row.cashPlug)) < 1 ? '✓' : '✗',
    }));

    return (
        <div className="space-y-6">
            <DataGrid
                title="Assets"
                subtitle={`Working Capital: DSO ${assumptions.daysReceivables}d, DIO ${assumptions.daysInventory}d, DPO ${assumptions.daysPayables}d`}
                data={balanceSheet}
                columns={assetsColumns}
            />

            <DataGrid
                title="Liabilities & Equity"
                subtitle="Debt and equity structure"
                data={balanceSheet}
                columns={liabilitiesColumns}
            />

            {/* Balance Check */}
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Balance Sheet Check (Assets = Liabilities + Equity)
                </h3>
                <div className="flex gap-4 flex-wrap">
                    {balanceCheck.map((check) => (
                        <div key={check.year} className="flex items-center gap-2 bg-zinc-800/50 px-3 py-2 rounded">
                            <span className="text-zinc-400 text-sm">Y{check.year}</span>
                            <span className={check.balanced === '✓' ? 'text-emerald-400' : 'text-rose-500'}>
                                {check.balanced}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
