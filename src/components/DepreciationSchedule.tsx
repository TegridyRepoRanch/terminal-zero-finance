// Depreciation Schedule View
import { useFinanceStore } from '../store/useFinanceStore';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid';
import type { DepreciationRow } from '../lib/financial-logic';

const columns: Column<DepreciationRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'beginningPPE', header: 'Beginning PP&E', format: 'currency', highlight: 'neutral' },
    { key: 'capex', header: '+ CapEx', format: 'currency', highlight: 'profit' },
    { key: 'depreciation', header: '- Depreciation', format: 'currency', highlight: 'loss' },
    { key: 'endingPPE', header: 'Ending PP&E', format: 'currency', highlight: 'neutral' },
];

export function DepreciationSchedule() {
    const { depreciationSchedule, assumptions, incomeStatement } = useFinanceStore();

    // Calculate D&A as % of revenue
    const daAnalysis = depreciationSchedule.map((row, i) => ({
        year: row.year,
        revenue: incomeStatement[i].revenue,
        depreciation: row.depreciation,
        daPercent: ((row.depreciation / incomeStatement[i].revenue) * 100).toFixed(2) + '%',
        capexPercent: ((row.capex / incomeStatement[i].revenue) * 100).toFixed(2) + '%',
    }));

    return (
        <div className="space-y-6">
            <DataGrid
                title="Depreciation Schedule"
                subtitle={`Straight-line over ${assumptions.depreciationYears} years • CapEx at ${assumptions.capexPercent}% of revenue`}
                data={depreciationSchedule}
                columns={columns}
            />

            <DataGrid
                title="D&A Analysis"
                subtitle="Depreciation and CapEx as percentage of revenue"
                data={daAnalysis}
                columns={[
                    { key: 'year', header: 'Year', format: 'year' },
                    { key: 'revenue', header: 'Revenue', format: 'currency', highlight: 'profit' },
                    { key: 'depreciation', header: 'D&A', format: 'currency', highlight: 'neutral' },
                    { key: 'daPercent', header: 'D&A %', highlight: 'neutral' },
                    { key: 'capexPercent', header: 'CapEx %', highlight: 'neutral' },
                ]}
            />
        </div>
    );
}
