// Terminal Zero - Global Finance Store
// Zustand state management with reactive calculations and localStorage persistence

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    defaultAssumptions,
    calculateAllSchedules,
} from '../lib/financial-logic';
import type {
    Assumptions,
    IncomeStatementRow,
    BalanceSheetRow,
    CashFlowRow,
    DepreciationRow,
    DebtRow,
    ValuationResult,
} from '../lib/financial-logic';
import type { ExtractionMetadata } from '../lib/extraction-types';
import { fetchStockPriceCached } from '../lib/stock-api';

// Data source tracking
export type DataSource = 'manual' | 'extraction';

// Company/Stock Info
export interface CompanyInfo {
    ticker: string;
    name: string;
    sector: string;
    marketPrice: number; // Current market price per share
    marketCap: number;
    lastUpdated: Date;
}

// Sample companies for demo (in real app, this would come from an API)
export const sampleCompanies: CompanyInfo[] = [
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketPrice: 178.50, marketCap: 2.8e12, lastUpdated: new Date() },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', marketPrice: 378.25, marketCap: 2.6e12, lastUpdated: new Date() },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketPrice: 141.80, marketCap: 1.7e12, lastUpdated: new Date() },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', marketPrice: 178.50, marketCap: 1.6e12, lastUpdated: new Date() },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', marketPrice: 495.22, marketCap: 1.2e12, lastUpdated: new Date() },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', marketPrice: 505.75, marketCap: 1.25e12, lastUpdated: new Date() },
    { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', marketPrice: 248.50, marketCap: 788e9, lastUpdated: new Date() },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', marketPrice: 195.40, marketCap: 565e9, lastUpdated: new Date() },
    { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', marketPrice: 279.80, marketCap: 575e9, lastUpdated: new Date() },
    { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketPrice: 156.20, marketCap: 376e9, lastUpdated: new Date() },
];

interface FinanceState {
    // Company being analyzed
    company: CompanyInfo | null;
    searchQuery: string;

    // Assumptions (inputs)
    assumptions: Assumptions;

    // Calculated schedules (derived)
    revenues: number[];
    incomeStatement: IncomeStatementRow[];
    balanceSheet: BalanceSheetRow[];
    cashFlow: CashFlowRow[];
    depreciationSchedule: DepreciationRow[];
    debtSchedule: DebtRow[];
    valuation: ValuationResult;

    // Current view
    activeTab: 'income' | 'balance' | 'cashflow' | 'depreciation' | 'debt' | 'valuation';

    // Data source tracking
    dataSource: DataSource;
    extractionMetadata: ExtractionMetadata | null;

    // Actions
    setCompany: (company: CompanyInfo | null) => void;
    setSearchQuery: (query: string) => void;
    updateAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void;
    setActiveTab: (tab: FinanceState['activeTab']) => void;
    resetToDefaults: () => void;
    setAssumptionsFromExtraction: (assumptions: Assumptions, metadata: ExtractionMetadata) => void;
    refreshStockPrice: (ticker?: string) => Promise<void>;
}

function recalculate(assumptions: Assumptions) {
    return calculateAllSchedules(assumptions);
}

const initialCalcs = recalculate(defaultAssumptions);

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set) => ({
            company: null,
            searchQuery: '',
            assumptions: defaultAssumptions,
            ...initialCalcs,
            activeTab: 'valuation',
            dataSource: 'manual',
            extractionMetadata: null,

            setCompany: (company) => {
                set({ company, searchQuery: '' });
            },

            setSearchQuery: (query) => {
                set({ searchQuery: query });
            },

            updateAssumption: (key, value) => {
                set((state) => {
                    const newAssumptions = { ...state.assumptions, [key]: value };
                    const calcs = recalculate(newAssumptions);
                    return {
                        assumptions: newAssumptions,
                        ...calcs,
                    };
                });
            },

            setActiveTab: (tab) => {
                set({ activeTab: tab });
            },

            resetToDefaults: () => {
                const calcs = recalculate(defaultAssumptions);
                set({
                    assumptions: defaultAssumptions,
                    ...calcs,
                    dataSource: 'manual',
                    extractionMetadata: null,
                });
            },

            setAssumptionsFromExtraction: (assumptions, metadata) => {
                const calcs = recalculate(assumptions);
                // Try to find matching company in sampleCompanies to get market price
                const ticker = metadata.companyName.split(' ')[0].toUpperCase().slice(0, 4);
                const matchingCompany = sampleCompanies.find(
                    (c) => c.ticker === ticker ||
                        metadata.companyName.toLowerCase().includes(c.name.toLowerCase()) ||
                        c.name.toLowerCase().includes(metadata.companyName.toLowerCase().split(' ')[0])
                );
                set({
                    assumptions,
                    ...calcs,
                    dataSource: 'extraction',
                    extractionMetadata: metadata,
                    // Create a company entry from extraction metadata, using market data if available
                    company: matchingCompany || {
                        ticker: ticker,
                        name: metadata.companyName,
                        sector: 'Unknown',
                        marketPrice: 0,
                        marketCap: 0,
                        lastUpdated: metadata.extractedAt,
                    },
                });
            },

            refreshStockPrice: async (ticker?: string) => {
                const state = useFinanceStore.getState();
                const targetTicker = ticker || state.company?.ticker;

                if (!targetTicker) {
                    console.warn('[Store] No ticker available to refresh');
                    return;
                }

                try {
                    console.log(`[Store] Fetching stock price for ${targetTicker}...`);
                    const quote = await fetchStockPriceCached(targetTicker);

                    set((state) => ({
                        company: state.company ? {
                            ...state.company,
                            marketPrice: quote.price,
                            marketCap: quote.marketCap || state.company.marketCap,
                            lastUpdated: quote.timestamp,
                        } : null,
                    }));

                    console.log(`[Store] Updated ${targetTicker} price: $${quote.price.toFixed(2)}`);
                } catch (error) {
                    console.error(`[Store] Failed to fetch stock price for ${targetTicker}:`, error);
                }
            },
        }),
        {
            name: 'terminal-zero-finance-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist user inputs and company info
                company: state.company,
                assumptions: state.assumptions,
                activeTab: state.activeTab,
                dataSource: state.dataSource,
                extractionMetadata: state.extractionMetadata,
                // Don't persist calculated values - they'll be recalculated on load
            }),
            onRehydrateStorage: () => (state) => {
                // Recalculate all values after loading from storage
                if (state?.assumptions) {
                    const calcs = recalculate(state.assumptions);
                    Object.assign(state, calcs);
                }
            },
        }
    )
);
