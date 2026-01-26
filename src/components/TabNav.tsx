// Tab Navigation Component
import { useFinanceStore } from '../store/useFinanceStore';
import { cn } from '../lib/utils';
import {
    FileText,
    Scale,
    ArrowDownUp,
    Building,
    Landmark,
    Target
} from 'lucide-react';

const tabs = [
    { id: 'valuation', label: 'Valuation', shortLabel: 'Val', icon: Target, shortcut: '1' },
    { id: 'income', label: 'Income', shortLabel: 'Inc', icon: FileText, shortcut: '2' },
    { id: 'balance', label: 'Balance', shortLabel: 'Bal', icon: Scale, shortcut: '3' },
    { id: 'cashflow', label: 'Cash Flow', shortLabel: 'CF', icon: ArrowDownUp, shortcut: '4' },
    { id: 'depreciation', label: 'D&A', shortLabel: 'D&A', icon: Building, shortcut: '5' },
    { id: 'debt', label: 'Debt', shortLabel: 'Debt', icon: Landmark, shortcut: '6' },
] as const;

export function TabNav() {
    const { activeTab, setActiveTab } = useFinanceStore();

    return (
        <nav
            className="flex gap-0.5 sm:gap-1 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-x-auto"
            role="tablist"
            aria-label="Financial statement tabs"
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-zinc-900",
                            isActive
                                ? "bg-zinc-800 text-emerald-400 shadow-lg shadow-emerald-500/10"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        )}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`panel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                        title={`${tab.label} (Press ${tab.shortcut})`}
                    >
                        <Icon size={14} className={isActive ? 'text-emerald-400' : ''} aria-hidden="true" />
                        <span className="hidden xs:inline sm:hidden">{tab.shortLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sr-only"> (Press {tab.shortcut} to switch)</span>
                    </button>
                );
            })}
        </nav>
    );
}
