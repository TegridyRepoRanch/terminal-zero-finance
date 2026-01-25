// Stock Ticker Search Component
import { useState, useRef, useEffect } from 'react';
import { useFinanceStore, sampleCompanies } from '../store/useFinanceStore';
import type { CompanyInfo } from '../store/useFinanceStore';
import { Search, X, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function TickerSearch() {
    const { company, searchQuery, setSearchQuery, setCompany } = useFinanceStore();
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter companies based on search
    const filteredCompanies = sampleCompanies.filter(
        (c) =>
            c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (c: CompanyInfo) => {
        setCompany(c);
        setIsOpen(false);
    };

    const handleClear = () => {
        setCompany(null);
        setSearchQuery('');
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search ticker or company..."
                        value={company ? company.ticker : searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCompany(null);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="w-64 bg-zinc-900 border border-zinc-700 rounded-lg py-2 pl-10 pr-10
                       text-sm text-zinc-200 placeholder-zinc-500
                       focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                       transition-all"
                    />
                    {(company || searchQuery) && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && !company && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
                >
                    {filteredCompanies.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            No companies found
                        </div>
                    ) : (
                        <div className="py-1">
                            {filteredCompanies.map((c) => (
                                <button
                                    key={c.ticker}
                                    onClick={() => handleSelect(c)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 font-bold text-sm">
                                        {c.ticker.slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-zinc-200">{c.ticker}</span>
                                            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                {c.sector}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400 truncate">{c.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-sm text-zinc-200">${c.marketPrice.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Company Header - Shows selected company info and valuation comparison
export function CompanyHeader() {
    const { company, valuation } = useFinanceStore();

    if (!company) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
                <Building2 className="mx-auto mb-3 text-zinc-600" size={32} />
                <h2 className="text-lg font-semibold text-zinc-400 mb-1">No Company Selected</h2>
                <p className="text-sm text-zinc-500">
                    Search for a ticker above to start your DCF analysis
                </p>
            </div>
        );
    }

    const impliedPrice = valuation.impliedSharePrice;
    const marketPrice = company.marketPrice;
    const upside = ((impliedPrice - marketPrice) / marketPrice) * 100;
    const isUndervalued = upside > 0;

    return (
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
                {/* Company Info */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-xl font-bold text-emerald-400">{company.ticker.slice(0, 2)}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-zinc-100">{company.ticker}</h2>
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                                {company.sector}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-400">{company.name}</p>
                    </div>
                </div>

                {/* Price Comparison */}
                <div className="flex items-center gap-8">
                    {/* Market Price */}
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Market Price</p>
                        <p className="text-xl font-bold font-mono text-zinc-300">${marketPrice.toFixed(2)}</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-zinc-600">→</div>

                    {/* Implied Price */}
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Your Valuation</p>
                        <p className={cn(
                            "text-xl font-bold font-mono",
                            isUndervalued ? "text-emerald-400" : "text-rose-400"
                        )}>
                            ${impliedPrice.toFixed(2)}
                        </p>
                    </div>

                    {/* Upside/Downside Badge */}
                    <div className={cn(
                        "px-4 py-2 rounded-lg flex items-center gap-2",
                        isUndervalued
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-rose-500/10 border border-rose-500/30"
                    )}>
                        {isUndervalued ? (
                            <TrendingUp className="text-emerald-400" size={20} />
                        ) : (
                            <TrendingDown className="text-rose-400" size={20} />
                        )}
                        <div>
                            <p className="text-xs text-zinc-500">
                                {isUndervalued ? 'Upside' : 'Downside'}
                            </p>
                            <p className={cn(
                                "text-lg font-bold font-mono",
                                isUndervalued ? "text-emerald-400" : "text-rose-400"
                            )}>
                                {isUndervalued ? '+' : ''}{upside.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
