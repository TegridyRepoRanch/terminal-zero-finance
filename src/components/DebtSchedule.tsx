// Debt Schedule View
import { useFinanceStore } from '../store/useFinanceStore';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid';
import type { DebtRow } from '../lib/financial-logic';

const columns: Column<DebtRow>[] = [
    { key: 'year', header: 'Year', format: 'year' },
    { key: 'beginningBalance', header: 'Beginning Balance', format: 'currency', highlight: 'loss' },
    { key: 'interestExpense', header: 'Interest Expense', format: 'currency', highlight: 'loss' },
    { key: 'repayment', header: 'Principal Repayment', format: 'currency', highlight: 'neutral' },
    { key: 'endingBalance', header: 'Ending Balance', format: 'currency', highlight: 'loss' },
];

export function DebtSchedule() {
    const { debtSchedule, assumptions } = useFinanceStore();

    // Calculate cumulative interest paid
    let cumulativeInterest = 0;
    const interestAnalysis = debtSchedule.map((row) => {
        cumulativeInterest += row.interestExpense;
        return {
            year: row.year,
            interest: row.interestExpense,
            cumulative: cumulativeInterest,
            debtRatio: row.beginningBalance > 0
                ? ((row.interestExpense / row.beginningBalance) * 100).toFixed(2) + '%'
                : '0.00%',
        };
    });

    return (
        <div className="space-y-6">
            <DataGrid
                title="Debt Schedule"
                subtitle={`Interest Rate: ${assumptions.interestRate}% • Yearly Repayment: $${(assumptions.yearlyRepayment / 1e6).toFixed(0)}M`}
                data={debtSchedule}
                columns={columns}
            />

            <DataGrid
                title="Interest Analysis"
                subtitle="Cumulative interest expense and effective rate"
                data={interestAnalysis}
                columns={[
                    { key: 'year', header: 'Year', format: 'year' },
                    { key: 'interest', header: 'Interest', format: 'currency', highlight: 'loss' },
                    { key: 'cumulative', header: 'Cumulative', format: 'currency', highlight: 'loss' },
                    { key: 'debtRatio', header: 'Effective Rate', highlight: 'neutral' },
                ]}
                showTotal
                totalLabel="Total"
            />
        </div>
    );
}
