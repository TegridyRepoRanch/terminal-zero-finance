// Chart Color Editor Component - Custom color scheme for charts
import { useState } from 'react';
import { Palette, RotateCcw, Check } from 'lucide-react';
import { useChartColors, type ChartColorScheme } from '../../contexts/ChartColorContext';
import { cn } from '../../lib/utils';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-zinc-700 bg-transparent"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-emerald-500"
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
}

interface ChartColorEditorProps {
  className?: string;
}

export function ChartColorEditor({ className }: ChartColorEditorProps) {
  const { colors, setColor, applyPreset, resetToDefault, presets } = useChartColors();
  const [isOpen, setIsOpen] = useState(false);

  const colorLabels: Record<keyof ChartColorScheme, string> = {
    primary: 'Primary',
    secondary: 'Secondary',
    accent: 'Accent',
    positive: 'Positive',
    negative: 'Negative',
    neutral: 'Neutral',
    gradient1: 'Gradient Start',
    gradient2: 'Gradient End',
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'bg-zinc-900 border border-zinc-700 hover:border-zinc-600',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500',
          isOpen && 'border-emerald-500'
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Palette className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">Chart Colors</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Editor Panel */}
          <div
            className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50"
            role="dialog"
            aria-label="Chart color editor"
          >
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">Chart Colors</h3>
                <button
                  onClick={resetToDefault}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Reset to defaults"
                  aria-label="Reset colors to default"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="p-4 border-b border-zinc-800">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(presets).map((presetName) => (
                  <button
                    key={presetName}
                    onClick={() => applyPreset(presetName)}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md transition-colors capitalize',
                      'border hover:border-emerald-500',
                      JSON.stringify(colors) === JSON.stringify(presets[presetName])
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {presetName}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Inputs */}
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {(Object.keys(colorLabels) as Array<keyof ChartColorScheme>).map((key) => (
                <ColorInput
                  key={key}
                  label={colorLabels[key]}
                  value={colors[key]}
                  onChange={(value) => setColor(key, value)}
                />
              ))}
            </div>

            {/* Preview */}
            <div className="p-4 border-t border-zinc-800">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Preview
              </label>
              <div className="flex gap-1 h-8">
                {Object.values(colors).map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="p-3 border-t border-zinc-800">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
