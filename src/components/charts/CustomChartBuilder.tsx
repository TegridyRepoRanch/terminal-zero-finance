// Custom Chart Builder - Drag-and-drop metrics visualization
import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useFinanceStore } from '../../store/useFinanceStore';
import { GripVertical, Plus, X, BarChart2, TrendingUp, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

// Available metrics to chart
interface MetricConfig {
  id: string;
  label: string;
  category: 'income' | 'balance' | 'cashflow' | 'valuation';
  color: string;
  getValue: (data: any, index: number) => number;
  format: (v: number) => string;
}

const AVAILABLE_METRICS: MetricConfig[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    category: 'income',
    color: '#34d399',
    getValue: (d) => d.incomeStatement?.revenue || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'grossProfit',
    label: 'Gross Profit',
    category: 'income',
    color: '#22d3ee',
    getValue: (d) => d.incomeStatement?.grossProfit || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'ebit',
    label: 'EBIT',
    category: 'income',
    color: '#818cf8',
    getValue: (d) => d.incomeStatement?.ebit || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'netIncome',
    label: 'Net Income',
    category: 'income',
    color: '#f472b6',
    getValue: (d) => d.incomeStatement?.netIncome || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'totalAssets',
    label: 'Total Assets',
    category: 'balance',
    color: '#fbbf24',
    getValue: (d) => d.balanceSheet?.totalAssets || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'totalEquity',
    label: 'Total Equity',
    category: 'balance',
    color: '#a78bfa',
    getValue: (d) => d.balanceSheet?.totalEquity || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'ufcf',
    label: 'Unlevered FCF',
    category: 'cashflow',
    color: '#4ade80',
    getValue: (d) => d.cashFlow?.unleveredFCF || 0,
    format: (v) => `$${(v / 1e6).toFixed(0)}M`,
  },
  {
    id: 'grossMargin',
    label: 'Gross Margin %',
    category: 'income',
    color: '#fb923c',
    getValue: (d) => d.incomeStatement?.revenue ? (d.incomeStatement.grossProfit / d.incomeStatement.revenue) * 100 : 0,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    id: 'netMargin',
    label: 'Net Margin %',
    category: 'income',
    color: '#f87171',
    getValue: (d) => d.incomeStatement?.revenue ? (d.incomeStatement.netIncome / d.incomeStatement.revenue) * 100 : 0,
    format: (v) => `${v.toFixed(1)}%`,
  },
];

type ChartType = 'line' | 'bar' | 'area';

interface SelectedMetric {
  id: string;
  metric: MetricConfig;
}

// Draggable Metric Chip
function DraggableMetric({ metric, onRemove }: { metric: SelectedMetric; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metric.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
        'bg-zinc-800 border-zinc-700',
        isDragging && 'opacity-50'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical size={14} className="text-zinc-500" />
      </button>
      <div className="w-3 h-3 rounded" style={{ backgroundColor: metric.metric.color }} />
      <span className="text-zinc-200">{metric.metric.label}</span>
      <button
        onClick={onRemove}
        className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
        aria-label={`Remove ${metric.metric.label}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Metric Picker
function MetricPicker({
  availableMetrics,
  onAdd,
}: {
  availableMetrics: MetricConfig[];
  onAdd: (metric: MetricConfig) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const categories = ['income', 'balance', 'cashflow'] as const;
  const categoryLabels = {
    income: 'Income Statement',
    balance: 'Balance Sheet',
    cashflow: 'Cash Flow',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors',
          'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
          isOpen && 'border-emerald-500'
        )}
      >
        <Plus size={14} />
        Add Metric
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            {categories.map((category) => {
              const metrics = availableMetrics.filter((m) => m.category === category);
              if (metrics.length === 0) return null;

              return (
                <div key={category} className="p-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    {categoryLabels[category]}
                  </p>
                  <div className="space-y-1">
                    {metrics.map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => {
                          onAdd(metric);
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: metric.color }} />
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface CustomChartBuilderProps {
  className?: string;
}

export function CustomChartBuilder({ className }: CustomChartBuilderProps) {
  const { incomeStatement, balanceSheet, cashFlow } = useFinanceStore();

  const [selectedMetrics, setSelectedMetrics] = useState<SelectedMetric[]>([
    { id: 'revenue-1', metric: AVAILABLE_METRICS[0] },
    { id: 'netIncome-1', metric: AVAILABLE_METRICS[3] },
  ]);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build chart data
  const chartData = useMemo(() => {
    return incomeStatement.map((inc, i) => {
      const dataPoint: Record<string, any> = {
        year: `Y${inc.year}`,
        incomeStatement: inc,
        balanceSheet: balanceSheet[i],
        cashFlow: cashFlow[i],
      };

      selectedMetrics.forEach((sm) => {
        dataPoint[sm.id] = sm.metric.getValue(dataPoint, i);
      });

      return dataPoint;
    });
  }, [incomeStatement, balanceSheet, cashFlow, selectedMetrics]);

  // Available metrics (not already selected)
  const availableMetrics = useMemo(() => {
    const selectedIds = new Set(selectedMetrics.map((sm) => sm.metric.id));
    return AVAILABLE_METRICS.filter((m) => !selectedIds.has(m.id));
  }, [selectedMetrics]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = selectedMetrics.findIndex((m) => m.id === active.id);
      const newIndex = selectedMetrics.findIndex((m) => m.id === over.id);
      setSelectedMetrics(arrayMove(selectedMetrics, oldIndex, newIndex));
    }
  };

  const handleAddMetric = (metric: MetricConfig) => {
    const newId = `${metric.id}-${Date.now()}`;
    setSelectedMetrics([...selectedMetrics, { id: newId, metric }]);
  };

  const handleRemoveMetric = (id: string) => {
    setSelectedMetrics(selectedMetrics.filter((m) => m.id !== id));
  };

  const activeMetric = activeId ? selectedMetrics.find((m) => m.id === activeId) : null;

  const ChartTypeIcon = {
    line: TrendingUp,
    bar: BarChart2,
    area: Activity,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{label}</p>
        {payload.map((entry: any) => {
          const metric = selectedMetrics.find((m) => m.id === entry.dataKey);
          return (
            <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
              {metric?.metric.label}: {metric?.metric.format(entry.value)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">Custom Chart Builder</h3>

          {/* Chart type toggle */}
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
            {(['line', 'bar', 'area'] as ChartType[]).map((type) => {
              const Icon = ChartTypeIcon[type];
              return (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    'p-2 rounded transition-colors',
                    chartType === type
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  title={`${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
                  aria-label={`${type} chart type`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric selection area */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-zinc-800/50 rounded-lg min-h-[52px]">
            <SortableContext
              items={selectedMetrics.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {selectedMetrics.map((metric) => (
                <DraggableMetric
                  key={metric.id}
                  metric={metric}
                  onRemove={() => handleRemoveMetric(metric.id)}
                />
              ))}
            </SortableContext>

            {availableMetrics.length > 0 && (
              <MetricPicker availableMetrics={availableMetrics} onAdd={handleAddMetric} />
            )}

            {selectedMetrics.length === 0 && (
              <p className="text-sm text-zinc-500">Drag metrics here or click "Add Metric" to build your chart</p>
            )}
          </div>

          <DragOverlay>
            {activeMetric && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-zinc-800 border-emerald-500 text-sm shadow-lg">
                <GripVertical size={14} className="text-zinc-500" />
                <div className="w-3 h-3 rounded" style={{ backgroundColor: activeMetric.metric.color }} />
                <span className="text-zinc-200">{activeMetric.metric.label}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Chart */}
        {selectedMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedMetrics.map((sm) => (
                  <Line
                    key={sm.id}
                    type="monotone"
                    dataKey={sm.id}
                    name={sm.metric.label}
                    stroke={sm.metric.color}
                    strokeWidth={2}
                    dot={{ fill: sm.metric.color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedMetrics.map((sm) => (
                  <Bar
                    key={sm.id}
                    dataKey={sm.id}
                    name={sm.metric.label}
                    fill={sm.metric.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="year" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedMetrics.map((sm) => (
                  <Area
                    key={sm.id}
                    type="monotone"
                    dataKey={sm.id}
                    name={sm.metric.label}
                    stroke={sm.metric.color}
                    fill={sm.metric.color}
                    fillOpacity={0.2}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center bg-zinc-800/30 rounded-lg border border-dashed border-zinc-700">
            <div className="text-center">
              <BarChart2 size={48} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-400">Add metrics to build your chart</p>
              <p className="text-xs text-zinc-500 mt-1">Drag and drop to reorder</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400">
          <strong className="text-zinc-300">Tips:</strong>{' '}
          Drag metrics to reorder them. Use the chart type buttons to switch between line, bar, and area charts.
          Click the X to remove a metric.
        </div>
      </div>
    </div>
  );
}
