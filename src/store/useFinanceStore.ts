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
import type { ExtractionMetadata, HistoricalFinancials, HistoricalStats, SegmentAnalysis } from '../lib/extraction-types';
import { fetchStockPriceCached } from '../lib/stock-api';

// Data source tracking
export type DataSource = 'manual' | 'extraction';

// Scenario types
export type ScenarioType = 'base' | 'bull' | 'bear' | 'custom';

export interface Scenario {
    id: string;
    name: string;
    type: ScenarioType;
    color: string;
    assumptions: Assumptions;
    createdAt: Date;
    updatedAt: Date;
}

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

// Default scenarios with Base, Bull, Bear cases
function createDefaultScenarios(): Record<string, Scenario> {
    const now = new Date();

    // Bull case: Higher growth, better margins
    const bullAssumptions: Assumptions = {
        ...defaultAssumptions,
        revenueGrowthRate: defaultAssumptions.revenueGrowthRate * 1.5,
        cogsPercent: defaultAssumptions.cogsPercent * 0.95,
        sgaPercent: defaultAssumptions.sgaPercent * 0.95,
        wacc: defaultAssumptions.wacc - 1,
        terminalGrowthRate: defaultAssumptions.terminalGrowthRate + 0.5,
    };

    // Bear case: Lower growth, compressed margins
    const bearAssumptions: Assumptions = {
        ...defaultAssumptions,
        revenueGrowthRate: defaultAssumptions.revenueGrowthRate * 0.5,
        cogsPercent: defaultAssumptions.cogsPercent * 1.05,
        sgaPercent: defaultAssumptions.sgaPercent * 1.05,
        wacc: defaultAssumptions.wacc + 2,
        terminalGrowthRate: defaultAssumptions.terminalGrowthRate - 0.5,
    };

    return {
        base: {
            id: 'base',
            name: 'Base Case',
            type: 'base',
            color: '#3b82f6', // blue
            assumptions: { ...defaultAssumptions },
            createdAt: now,
            updatedAt: now,
        },
        bull: {
            id: 'bull',
            name: 'Bull Case',
            type: 'bull',
            color: '#22c55e', // green
            assumptions: bullAssumptions,
            createdAt: now,
            updatedAt: now,
        },
        bear: {
            id: 'bear',
            name: 'Bear Case',
            type: 'bear',
            color: '#ef4444', // red
            assumptions: bearAssumptions,
            createdAt: now,
            updatedAt: now,
        },
    };
}

interface FinanceState {
    // Company being analyzed
    company: CompanyInfo | null;
    searchQuery: string;

    // Scenarios
    scenarios: Record<string, Scenario>;
    activeScenarioId: string;

    // Active scenario's assumptions (computed for convenience)
    assumptions: Assumptions;

    // Calculated schedules (derived from active scenario)
    revenues: number[];
    incomeStatement: IncomeStatementRow[];
    balanceSheet: BalanceSheetRow[];
    cashFlow: CashFlowRow[];
    depreciationSchedule: DepreciationRow[];
    debtSchedule: DebtRow[];
    valuation: ValuationResult;

    // Current view
    activeTab: 'income' | 'balance' | 'cashflow' | 'depreciation' | 'debt' | 'valuation' | 'dd' | 'dashboard' | 'watchlist' | 'company' | 'settings';

    // Data source tracking
    dataSource: DataSource;
    extractionMetadata: ExtractionMetadata | null;

    // Historical data for multi-year analysis
    historicalData: HistoricalFinancials | null;
    historicalStats: HistoricalStats | null;
    isLoadingHistorical: boolean;

    // Segment/geographic data
    segmentAnalysis: SegmentAnalysis | null;
    isLoadingSegments: boolean;

    // Company actions
    setCompany: (company: CompanyInfo | null) => void;
    setSearchQuery: (query: string) => void;
    refreshStockPrice: (ticker?: string) => Promise<void>;

    // Scenario actions
    switchScenario: (scenarioId: string) => void;
    createScenario: (name: string, baseScenarioId?: string) => string;
    duplicateScenario: (scenarioId: string, newName?: string) => string;
    deleteScenario: (scenarioId: string) => void;
    renameScenario: (scenarioId: string, newName: string) => void;
    updateScenarioColor: (scenarioId: string, color: string) => void;

    // Assumption actions (updates active scenario)
    updateAssumption: <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => void;
    setActiveTab: (tab: FinanceState['activeTab']) => void;
    resetToDefaults: () => void;
    setAssumptionsFromExtraction: (assumptions: Assumptions, metadata: ExtractionMetadata) => void;

    // Utility
    getScenarioValuation: (scenarioId: string) => ValuationResult | null;
    getAllScenarioValuations: () => Array<{ scenario: Scenario; valuation: ValuationResult }>;

    // Historical data actions
    setHistoricalData: (data: HistoricalFinancials, stats: HistoricalStats) => void;
    setLoadingHistorical: (loading: boolean) => void;
    clearHistoricalData: () => void;

    // Segment data actions
    setSegmentAnalysis: (analysis: SegmentAnalysis) => void;
    setLoadingSegments: (loading: boolean) => void;
    clearSegmentAnalysis: () => void;
}

function recalculate(assumptions: Assumptions) {
    return calculateAllSchedules(assumptions);
}

function generateId(): string {
    return `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

const defaultScenarios = createDefaultScenarios();
const initialCalcs = recalculate(defaultScenarios.base.assumptions);

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set, get) => ({
            company: null,
            searchQuery: '',
            scenarios: defaultScenarios,
            activeScenarioId: 'base',
            assumptions: defaultScenarios.base.assumptions,
            ...initialCalcs,
            activeTab: 'valuation',
            dataSource: 'manual',
            extractionMetadata: null,
            historicalData: null,
            historicalStats: null,
            isLoadingHistorical: false,
            segmentAnalysis: null,
            isLoadingSegments: false,

            setCompany: (company) => {
                set({ company, searchQuery: '' });
            },

            setSearchQuery: (query) => {
                set({ searchQuery: query });
            },

            switchScenario: (scenarioId) => {
                const state = get();
                const scenario = state.scenarios[scenarioId];
                if (!scenario) {
                    console.warn(`[Store] Scenario ${scenarioId} not found`);
                    return;
                }
                const calcs = recalculate(scenario.assumptions);
                set({
                    activeScenarioId: scenarioId,
                    assumptions: scenario.assumptions,
                    ...calcs,
                });
            },

            createScenario: (name, baseScenarioId) => {
                const state = get();
                const baseScenario = baseScenarioId
                    ? state.scenarios[baseScenarioId]
                    : state.scenarios[state.activeScenarioId];

                const id = generateId();
                const now = new Date();
                const newScenario: Scenario = {
                    id,
                    name,
                    type: 'custom',
                    color: '#8b5cf6', // purple for custom
                    assumptions: { ...baseScenario.assumptions },
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    scenarios: {
                        ...state.scenarios,
                        [id]: newScenario,
                    },
                }));

                return id;
            },

            duplicateScenario: (scenarioId, newName) => {
                const state = get();
                const scenario = state.scenarios[scenarioId];
                if (!scenario) {
                    console.warn(`[Store] Scenario ${scenarioId} not found`);
                    return '';
                }

                const id = generateId();
                const now = new Date();
                const newScenario: Scenario = {
                    id,
                    name: newName || `${scenario.name} (Copy)`,
                    type: 'custom',
                    color: '#8b5cf6',
                    assumptions: { ...scenario.assumptions },
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    scenarios: {
                        ...state.scenarios,
                        [id]: newScenario,
                    },
                }));

                return id;
            },

            deleteScenario: (scenarioId) => {
                const state = get();
                // Don't allow deleting the last scenario or core scenarios
                if (['base', 'bull', 'bear'].includes(scenarioId)) {
                    console.warn('[Store] Cannot delete core scenarios');
                    return;
                }
                if (Object.keys(state.scenarios).length <= 1) {
                    console.warn('[Store] Cannot delete the last scenario');
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [scenarioId]: _deleted, ...remaining } = state.scenarios;

                // If deleting active scenario, switch to base
                const newActiveId = state.activeScenarioId === scenarioId ? 'base' : state.activeScenarioId;
                const newActiveScenario = remaining[newActiveId];
                const calcs = recalculate(newActiveScenario.assumptions);

                set({
                    scenarios: remaining,
                    activeScenarioId: newActiveId,
                    assumptions: newActiveScenario.assumptions,
                    ...calcs,
                });
            },

            renameScenario: (scenarioId, newName) => {
                set((state) => {
                    const scenario = state.scenarios[scenarioId];
                    if (!scenario) return state;

                    return {
                        scenarios: {
                            ...state.scenarios,
                            [scenarioId]: {
                                ...scenario,
                                name: newName,
                                updatedAt: new Date(),
                            },
                        },
                    };
                });
            },

            updateScenarioColor: (scenarioId, color) => {
                set((state) => {
                    const scenario = state.scenarios[scenarioId];
                    if (!scenario) return state;

                    return {
                        scenarios: {
                            ...state.scenarios,
                            [scenarioId]: {
                                ...scenario,
                                color,
                                updatedAt: new Date(),
                            },
                        },
                    };
                });
            },

            updateAssumption: (key, value) => {
                set((state) => {
                    const newAssumptions = { ...state.assumptions, [key]: value };
                    const calcs = recalculate(newAssumptions);

                    // Update the scenario
                    const updatedScenario = {
                        ...state.scenarios[state.activeScenarioId],
                        assumptions: newAssumptions,
                        updatedAt: new Date(),
                    };

                    return {
                        assumptions: newAssumptions,
                        scenarios: {
                            ...state.scenarios,
                            [state.activeScenarioId]: updatedScenario,
                        },
                        ...calcs,
                    };
                });
            },

            setActiveTab: (tab) => {
                set({ activeTab: tab });
            },

            resetToDefaults: () => {
                const freshScenarios = createDefaultScenarios();
                const calcs = recalculate(freshScenarios.base.assumptions);
                set({
                    scenarios: freshScenarios,
                    activeScenarioId: 'base',
                    assumptions: freshScenarios.base.assumptions,
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

                // Update the base scenario with extracted data
                const now = new Date();
                const updatedBaseScenario: Scenario = {
                    id: 'base',
                    name: 'Base Case',
                    type: 'base',
                    color: '#3b82f6',
                    assumptions,
                    createdAt: now,
                    updatedAt: now,
                };

                // Create bull/bear variants based on extracted data
                const bullAssumptions: Assumptions = {
                    ...assumptions,
                    revenueGrowthRate: assumptions.revenueGrowthRate * 1.5,
                    cogsPercent: assumptions.cogsPercent * 0.95,
                    sgaPercent: assumptions.sgaPercent * 0.95,
                    wacc: Math.max(5, assumptions.wacc - 1),
                    terminalGrowthRate: Math.min(assumptions.terminalGrowthRate + 0.5, assumptions.wacc - 1),
                };

                const bearAssumptions: Assumptions = {
                    ...assumptions,
                    revenueGrowthRate: assumptions.revenueGrowthRate * 0.5,
                    cogsPercent: Math.min(95, assumptions.cogsPercent * 1.05),
                    sgaPercent: Math.min(50, assumptions.sgaPercent * 1.05),
                    wacc: assumptions.wacc + 2,
                    terminalGrowthRate: Math.max(0, assumptions.terminalGrowthRate - 0.5),
                };

                set({
                    assumptions,
                    scenarios: {
                        base: updatedBaseScenario,
                        bull: {
                            id: 'bull',
                            name: 'Bull Case',
                            type: 'bull',
                            color: '#22c55e',
                            assumptions: bullAssumptions,
                            createdAt: now,
                            updatedAt: now,
                        },
                        bear: {
                            id: 'bear',
                            name: 'Bear Case',
                            type: 'bear',
                            color: '#ef4444',
                            assumptions: bearAssumptions,
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                    activeScenarioId: 'base',
                    ...calcs,
                    dataSource: 'extraction',
                    extractionMetadata: metadata,
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
                const state = get();
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

            getScenarioValuation: (scenarioId) => {
                const state = get();
                const scenario = state.scenarios[scenarioId];
                if (!scenario) return null;
                const calcs = recalculate(scenario.assumptions);
                return calcs.valuation;
            },

            getAllScenarioValuations: () => {
                const state = get();
                return Object.values(state.scenarios).map((scenario) => ({
                    scenario,
                    valuation: recalculate(scenario.assumptions).valuation,
                }));
            },

            setHistoricalData: (data, stats) => {
                set({
                    historicalData: data,
                    historicalStats: stats,
                    isLoadingHistorical: false,
                });
            },

            setLoadingHistorical: (loading) => {
                set({ isLoadingHistorical: loading });
            },

            clearHistoricalData: () => {
                set({
                    historicalData: null,
                    historicalStats: null,
                    isLoadingHistorical: false,
                });
            },

            setSegmentAnalysis: (analysis) => {
                set({
                    segmentAnalysis: analysis,
                    isLoadingSegments: false,
                });
            },

            setLoadingSegments: (loading) => {
                set({ isLoadingSegments: loading });
            },

            clearSegmentAnalysis: () => {
                set({
                    segmentAnalysis: null,
                    isLoadingSegments: false,
                });
            },
        }),
        {
            name: 'terminal-zero-finance-storage',
            version: 3, // Bumped for scenario support
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist user inputs and company info
                company: state.company,
                scenarios: state.scenarios,
                activeScenarioId: state.activeScenarioId,
                activeTab: state.activeTab,
                dataSource: state.dataSource,
                extractionMetadata: state.extractionMetadata,
                historicalData: state.historicalData,
                historicalStats: state.historicalStats,
                segmentAnalysis: state.segmentAnalysis,
                // Don't persist: assumptions (derived), calculated values, loading states
            }),
            migrate: (persistedState, version) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const state = persistedState as any;

                if (version < 2) {
                    console.log('[Store] Migrating from v1 to v2...');
                    if (state.assumptions && !('projectionYears' in state.assumptions)) {
                        state.assumptions = {
                            ...defaultAssumptions,
                            ...state.assumptions,
                            projectionYears: 5,
                        };
                    }
                }

                if (version < 3) {
                    // v2 -> v3: Added scenarios
                    console.log('[Store] Migrating from v2 to v3 (adding scenarios)...');

                    // Convert old single-assumption model to scenarios
                    const oldAssumptions = state.assumptions || defaultAssumptions;
                    const now = new Date();

                    state.scenarios = {
                        base: {
                            id: 'base',
                            name: 'Base Case',
                            type: 'base',
                            color: '#3b82f6',
                            assumptions: oldAssumptions,
                            createdAt: now,
                            updatedAt: now,
                        },
                        bull: {
                            id: 'bull',
                            name: 'Bull Case',
                            type: 'bull',
                            color: '#22c55e',
                            assumptions: {
                                ...oldAssumptions,
                                revenueGrowthRate: oldAssumptions.revenueGrowthRate * 1.5,
                                cogsPercent: oldAssumptions.cogsPercent * 0.95,
                                wacc: Math.max(5, oldAssumptions.wacc - 1),
                            },
                            createdAt: now,
                            updatedAt: now,
                        },
                        bear: {
                            id: 'bear',
                            name: 'Bear Case',
                            type: 'bear',
                            color: '#ef4444',
                            assumptions: {
                                ...oldAssumptions,
                                revenueGrowthRate: oldAssumptions.revenueGrowthRate * 0.5,
                                cogsPercent: Math.min(95, oldAssumptions.cogsPercent * 1.05),
                                wacc: oldAssumptions.wacc + 2,
                            },
                            createdAt: now,
                            updatedAt: now,
                        },
                    };
                    state.activeScenarioId = 'base';

                    // Remove old assumptions field (will be derived from active scenario)
                    delete state.assumptions;
                }

                return state;
            },
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('[Store] Failed to rehydrate state:', error);
                    return;
                }
                // Recalculate all values after loading from storage
                if (state?.scenarios && state?.activeScenarioId) {
                    const activeScenario = state.scenarios[state.activeScenarioId];
                    if (activeScenario) {
                        state.assumptions = activeScenario.assumptions;
                        const calcs = recalculate(activeScenario.assumptions);
                        Object.assign(state, calcs);
                    }
                }
            },
        }
    )
);
