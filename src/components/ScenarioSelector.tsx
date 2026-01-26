// Scenario Selector Component
// Allows switching between Base, Bull, Bear, and custom scenarios

import { useState } from 'react';
import { useFinanceStore, type Scenario } from '../store/useFinanceStore';
import { TrendingUp, TrendingDown, Target, Plus, Copy, Trash2, Check, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/financial-logic';

interface ScenarioCardProps {
    scenario: Scenario;
    isActive: boolean;
    impliedPrice: number;
    onSelect: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
}

function ScenarioCard({
    scenario,
    isActive,
    impliedPrice,
    onSelect,
    onDuplicate,
    onDelete,
    onRename,
}: ScenarioCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(scenario.name);

    const handleSaveName = () => {
        if (editName.trim()) {
            onRename(editName.trim());
        }
        setIsEditing(false);
    };

    const getIcon = () => {
        switch (scenario.type) {
            case 'bull':
                return <TrendingUp size={16} className="text-emerald-400" />;
            case 'bear':
                return <TrendingDown size={16} className="text-red-400" />;
            case 'base':
                return <Target size={16} className="text-blue-400" />;
            default:
                return <Target size={16} className="text-purple-400" />;
        }
    };

    const isCore = ['base', 'bull', 'bear'].includes(scenario.id);

    return (
        <div
            className={cn(
                'relative rounded-lg border p-3 cursor-pointer transition-all',
                isActive
                    ? 'border-2 bg-zinc-800/50'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/30'
            )}
            style={{
                borderColor: isActive ? scenario.color : undefined,
            }}
            onClick={onSelect}
        >
            {/* Active indicator */}
            {isActive && (
                <div
                    className="absolute top-0 right-0 w-2 h-2 rounded-full -mt-1 -mr-1"
                    style={{ backgroundColor: scenario.color }}
                />
            )}

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {getIcon()}
                    {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="px-1 py-0.5 text-sm bg-zinc-700 border border-zinc-600 rounded w-24"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName();
                                    if (e.key === 'Escape') setIsEditing(false);
                                }}
                            />
                            <button
                                onClick={handleSaveName}
                                className="p-0.5 hover:bg-zinc-600 rounded"
                            >
                                <Check size={12} className="text-emerald-400" />
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-0.5 hover:bg-zinc-600 rounded"
                            >
                                <X size={12} className="text-zinc-400" />
                            </button>
                        </div>
                    ) : (
                        <span className="text-sm font-medium text-zinc-200">{scenario.name}</span>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!isCore && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 hover:bg-zinc-700 rounded opacity-50 hover:opacity-100"
                                title="Rename"
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                        <button
                            onClick={onDuplicate}
                            className="p-1 hover:bg-zinc-700 rounded opacity-50 hover:opacity-100"
                            title="Duplicate"
                        >
                            <Copy size={12} />
                        </button>
                        {!isCore && (
                            <button
                                onClick={onDelete}
                                className="p-1 hover:bg-zinc-700 rounded opacity-50 hover:opacity-100 hover:text-red-400"
                                title="Delete"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="text-lg font-bold font-mono" style={{ color: scenario.color }}>
                {formatCurrency(impliedPrice)}
            </div>
            <div className="text-xs text-zinc-500">
                Implied Share Price
            </div>
        </div>
    );
}

export function ScenarioSelector() {
    const {
        activeScenarioId,
        switchScenario,
        createScenario,
        duplicateScenario,
        deleteScenario,
        renameScenario,
        getAllScenarioValuations,
    } = useFinanceStore();

    const [showNewScenario, setShowNewScenario] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState('');

    const scenarioValuations = getAllScenarioValuations();

    const handleCreateScenario = () => {
        if (newScenarioName.trim()) {
            const id = createScenario(newScenarioName.trim());
            switchScenario(id);
            setNewScenarioName('');
            setShowNewScenario(false);
        }
    };

    // Sort scenarios: base, bull, bear first, then custom by creation date
    const sortedScenarios = [...scenarioValuations].sort((a, b) => {
        const order = { base: 0, bull: 1, bear: 2, custom: 3 };
        const aOrder = order[a.scenario.type] ?? 3;
        const bOrder = order[b.scenario.type] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(a.scenario.createdAt).getTime() - new Date(b.scenario.createdAt).getTime();
    });

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Scenarios
                </h3>
                <button
                    onClick={() => setShowNewScenario(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                >
                    <Plus size={12} />
                    New
                </button>
            </div>

            {showNewScenario && (
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <input
                        type="text"
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                        placeholder="Scenario name..."
                        className="w-full px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded mb-2"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateScenario();
                            if (e.key === 'Escape') setShowNewScenario(false);
                        }}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateScenario}
                            className="flex-1 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 rounded"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowNewScenario(false)}
                            className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sortedScenarios.map(({ scenario, valuation }) => (
                    <ScenarioCard
                        key={scenario.id}
                        scenario={scenario}
                        isActive={scenario.id === activeScenarioId}
                        impliedPrice={valuation.impliedSharePrice}
                        onSelect={() => switchScenario(scenario.id)}
                        onDuplicate={() => {
                            const id = duplicateScenario(scenario.id);
                            if (id) switchScenario(id);
                        }}
                        onDelete={() => deleteScenario(scenario.id)}
                        onRename={(name) => renameScenario(scenario.id, name)}
                    />
                ))}
            </div>

            {/* Scenario Comparison Summary */}
            {sortedScenarios.length > 1 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Price Range:</span>
                        <span className="font-mono">
                            {formatCurrency(Math.min(...sortedScenarios.map((s) => s.valuation.impliedSharePrice)))}
                            {' - '}
                            {formatCurrency(Math.max(...sortedScenarios.map((s) => s.valuation.impliedSharePrice)))}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact version for sidebar
export function ScenarioSelectorCompact() {
    const { scenarios, activeScenarioId, switchScenario, getAllScenarioValuations } = useFinanceStore();

    const scenarioValuations = getAllScenarioValuations();
    const activeScenario = scenarios[activeScenarioId];

    return (
        <div className="space-y-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Active Scenario</div>
            <select
                value={activeScenarioId}
                onChange={(e) => switchScenario(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
                style={{ borderColor: activeScenario?.color }}
            >
                {scenarioValuations.map(({ scenario, valuation }) => (
                    <option key={scenario.id} value={scenario.id}>
                        {scenario.name} - {formatCurrency(valuation.impliedSharePrice)}
                    </option>
                ))}
            </select>
        </div>
    );
}
