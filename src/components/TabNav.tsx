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
    { id: 'valuation', label: 'Valuation', icon: Target },
    { id: 'income', label: 'Income', icon: FileText },
    { id: 'balance', label: 'Balance', icon: Scale },
    { id: 'cashflow', label: 'Cash Flow', icon: ArrowDownUp },
    { id: 'depreciation', label: 'D&A', icon: Building },
    { id: 'debt', label: 'Debt', icon: Landmark },
] as const;

export function TabNav() {
    const { activeTab, setActiveTab } = useFinanceStore();

    return (
        <nav className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-zinc-800 text-emerald-400 shadow-lg shadow-emerald-500/10"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        )}
                    >
                        <Icon size={14} className={isActive ? 'text-emerald-400' : ''} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
