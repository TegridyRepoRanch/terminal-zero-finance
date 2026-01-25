// Income Statement View
import { useFinanceStore } from '../store/useFinanceStore';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid';
import type { IncomeStatementRow } from '../lib/financial-logic';

const columns: Column<IncomeStatementRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'revenue', header: 'Revenue', format: 'currency', highlight: 'profit' },
    { key: 'cogs', header: 'COGS', format: 'currency', highlight: 'loss' },
    { key: 'grossProfit', header: 'Gross Profit', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
    { key: 'sga', header: 'SG&A', format: 'currency', highlight: 'loss' },
    { key: 'depreciation', header: 'D&A', format: 'currency', highlight: 'neutral' },
    { key: 'ebit', header: 'EBIT', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
    { key: 'interestExpense', header: 'Interest', format: 'currency', highlight: 'loss' },
    { key: 'taxes', header: 'Taxes', format: 'currency', highlight: 'loss' },
    { key: 'netIncome', header: 'Net Income', format: 'currency', highlight: (v) => v >= 0 ? 'profit' : 'loss' },
];

export function IncomeStatement() {
    const { incomeStatement, assumptions } = useFinanceStore();

    const marginData = incomeStatement.map((row) => ({
        year: row.year,
        grossMargin: ((row.grossProfit / row.revenue) * 100).toFixed(1) + '%',
        ebitMargin: ((row.ebit / row.revenue) * 100).toFixed(1) + '%',
        netMargin: ((row.netIncome / row.revenue) * 100).toFixed(1) + '%',
    }));

    return (
        <div className="space-y-6">
            <DataGrid
                title="Income Statement"
                subtitle={`${assumptions.projectionYears}-Year Projection • Revenue Growth: ${assumptions.revenueGrowthRate}%`}
                data={incomeStatement}
                columns={columns}
            />

            {/* Margin Analysis */}
            <DataGrid
                title="Margin Analysis"
                subtitle="Key profitability metrics"
                data={marginData}
                columns={[
                    { key: 'year', header: 'Year', format: 'year' },
                    { key: 'grossMargin', header: 'Gross Margin', highlight: 'profit' },
                    { key: 'ebitMargin', header: 'EBIT Margin', highlight: 'profit' },
                    { key: 'netMargin', header: 'Net Margin', highlight: 'profit' },
                ]}
            />
        </div>
    );
}
