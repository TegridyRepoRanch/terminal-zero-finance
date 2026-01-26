// Chart Color Context - Custom color scheme editor for charts
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ChartColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
  neutral: string;
  gradient1: string;
  gradient2: string;
}

const defaultColors: ChartColorScheme = {
  primary: '#34d399',    // emerald-400
  secondary: '#22d3ee',  // cyan-400
  accent: '#818cf8',     // indigo-400
  positive: '#34d399',   // emerald-400
  negative: '#f43f5e',   // rose-500
  neutral: '#71717a',    // zinc-500
  gradient1: '#34d399',  // emerald-400
  gradient2: '#22d3ee',  // cyan-400
};

const presetSchemes: Record<string, ChartColorScheme> = {
  default: defaultColors,
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#8b5cf6',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#64748b',
    gradient1: '#0ea5e9',
    gradient2: '#06b6d4',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#eab308',
    accent: '#ec4899',
    positive: '#22c55e',
    negative: '#dc2626',
    neutral: '#78716c',
    gradient1: '#f97316',
    gradient2: '#eab308',
  },
  forest: {
    primary: '#22c55e',
    secondary: '#84cc16',
    accent: '#14b8a6',
    positive: '#22c55e',
    negative: '#dc2626',
    neutral: '#6b7280',
    gradient1: '#22c55e',
    gradient2: '#84cc16',
  },
  monochrome: {
    primary: '#e4e4e7',
    secondary: '#a1a1aa',
    accent: '#71717a',
    positive: '#a1a1aa',
    negative: '#52525b',
    neutral: '#3f3f46',
    gradient1: '#e4e4e7',
    gradient2: '#a1a1aa',
  },
};

interface ChartColorContextType {
  colors: ChartColorScheme;
  setColor: (key: keyof ChartColorScheme, value: string) => void;
  setScheme: (scheme: ChartColorScheme) => void;
  applyPreset: (presetName: string) => void;
  resetToDefault: () => void;
  presets: Record<string, ChartColorScheme>;
}

const ChartColorContext = createContext<ChartColorContextType | undefined>(undefined);

const COLORS_STORAGE_KEY = 'terminal-zero-chart-colors';

export function ChartColorProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ChartColorScheme>(() => {
    const stored = localStorage.getItem(COLORS_STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultColors, ...JSON.parse(stored) };
      } catch {
        return defaultColors;
      }
    }
    return defaultColors;
  });

  const setColor = useCallback((key: keyof ChartColorScheme, value: string) => {
    setColors((prev) => {
      const newColors = { ...prev, [key]: value };
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(newColors));
      return newColors;
    });
  }, []);

  const setScheme = useCallback((scheme: ChartColorScheme) => {
    setColors(scheme);
    localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(scheme));
  }, []);

  const applyPreset = useCallback((presetName: string) => {
    const preset = presetSchemes[presetName];
    if (preset) {
      setScheme(preset);
    }
  }, [setScheme]);

  const resetToDefault = useCallback(() => {
    setScheme(defaultColors);
  }, [setScheme]);

  return (
    <ChartColorContext.Provider
      value={{ colors, setColor, setScheme, applyPreset, resetToDefault, presets: presetSchemes }}
    >
      {children}
    </ChartColorContext.Provider>
  );
}

export function useChartColors() {
  const context = useContext(ChartColorContext);
  if (!context) {
    throw new Error('useChartColors must be used within a ChartColorProvider');
  }
  return context;
}
