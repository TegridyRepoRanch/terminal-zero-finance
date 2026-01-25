// DataGrid - Reusable financial data table component
import { cn } from '../lib/utils';
import { formatCurrency, formatPercent, formatNumber } from '../lib/financial-logic';

export type CellFormat = 'currency' | 'percent' | 'number' | 'year' | 'raw';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    format?: CellFormat;
    getValue?: (row: T) => number | string;
    highlight?: 'profit' | 'loss' | 'neutral' | ((value: number) => 'profit' | 'loss' | 'neutral');
}

interface DataGridProps<T> {
    title: string;
    subtitle?: string;
    data: T[];
    columns: Column<T>[];
    showTotal?: boolean;
    totalLabel?: string;
}

function formatValue(value: number | string, format: CellFormat = 'raw'): string {
    if (typeof value === 'string') return value;

    switch (format) {
        case 'currency':
            return formatCurrency(value);
        case 'percent':
            return formatPercent(value);
        case 'number':
            return formatNumber(value);
        case 'year':
            return `Y${value}`;
        default:
            return String(value);
    }
}

function getHighlightClass(
    value: number,
    highlight?: 'profit' | 'loss' | 'neutral' | ((value: number) => 'profit' | 'loss' | 'neutral')
): string {
    if (!highlight) return 'text-zinc-300';

    const type = typeof highlight === 'function' ? highlight(value) : highlight;

    switch (type) {
        case 'profit':
            return 'text-emerald-400';
        case 'loss':
            return 'text-rose-500';
        default:
            return 'text-zinc-300';
    }
}

export function DataGrid<T>({ title, subtitle, data, columns, showTotal, totalLabel = 'Total' }: DataGridProps<T>) {
    // Calculate totals if needed
    const totals = showTotal
        ? columns.reduce((acc, col) => {
            if (col.format === 'currency' || col.format === 'number') {
                const values = data.map((row) => {
                    if (col.getValue) return col.getValue(row);
                    return row[col.key as keyof T] as number;
                });
                acc[col.key as string] = values.reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
            }
            return acc;
        }, {} as Record<string, number>)
        : null;

    return (
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                    <thead>
                        <tr className="border-b border-zinc-800">
                            {columns.map((col) => (
                                <th
                                    key={String(col.key)}
                                    className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                            >
                                {columns.map((col) => {
                                    const rawValue = col.getValue
                                        ? col.getValue(row)
                                        : row[col.key as keyof T];
                                    const value = typeof rawValue === 'number' ? rawValue : String(rawValue);
                                    const formattedValue = formatValue(value, col.format);
                                    const colorClass = typeof value === 'number'
                                        ? getHighlightClass(value, col.highlight)
                                        : 'text-zinc-300';

                                    return (
                                        <td
                                            key={String(col.key)}
                                            className={cn(
                                                "px-4 py-2.5 whitespace-nowrap",
                                                colorClass
                                            )}
                                        >
                                            {formattedValue}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Totals row */}
                        {showTotal && totals && (
                            <tr className="bg-zinc-800/50 font-semibold">
                                {columns.map((col, i) => {
                                    if (i === 0) {
                                        return (
                                            <td key={String(col.key)} className="px-4 py-3 text-zinc-300">
                                                {totalLabel}
                                            </td>
                                        );
                                    }

                                    const totalValue = totals[col.key as string];
                                    if (totalValue !== undefined) {
                                        const colorClass = getHighlightClass(totalValue, col.highlight);
                                        return (
                                            <td key={String(col.key)} className={cn("px-4 py-3", colorClass)}>
                                                {formatValue(totalValue, col.format)}
                                            </td>
                                        );
                                    }

                                    return <td key={String(col.key)} className="px-4 py-3">—</td>;
                                })}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
