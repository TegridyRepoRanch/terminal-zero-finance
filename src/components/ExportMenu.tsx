// Export Menu Component - PDF and Excel Export
import { useState, useRef, useEffect } from 'react';
import { FileDown, FileSpreadsheet, FileText, ChevronDown, Loader2, Check } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { generateValuationPDF } from '../lib/export-pdf';
import { generateValuationExcel } from '../lib/export-excel';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    assumptions,
    incomeStatement,
    balanceSheet,
    cashFlow,
    depreciationSchedule,
    debtSchedule,
    valuation,
    company,
  } = useFinanceStore();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateValuationPDF({
        assumptions,
        incomeStatement,
        balanceSheet,
        cashFlow,
        valuation,
        company: company
          ? {
              name: company.name,
              ticker: company.ticker,
              sector: company.sector,
              marketPrice: company.marketPrice,
            }
          : undefined,
      });

      showToast.success('PDF report exported successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('PDF export error:', error);
      showToast.error('Failed to export PDF report');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateValuationExcel({
        assumptions,
        incomeStatement,
        balanceSheet,
        cashFlow,
        depreciationSchedule,
        debtSchedule,
        valuation,
        company: company
          ? {
              name: company.name,
              ticker: company.ticker,
              sector: company.sector,
              marketPrice: company.marketPrice,
            }
          : undefined,
      });

      showToast.success('Excel model exported successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('Excel export error:', error);
      showToast.error('Failed to export Excel model');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
          'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white',
          'hover:from-emerald-500 hover:to-cyan-500',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
          isOpen && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900'
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <FileDown size={16} />
        Export
        <ChevronDown
          size={14}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-64',
            'bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl',
            'z-50 overflow-hidden',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-zinc-200">Export Valuation</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {company ? `${company.name} (${company.ticker})` : 'Custom Model'}
            </p>
          </div>

          {/* Export Options */}
          <div className="p-2">
            {/* PDF Export */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting !== null}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                'transition-colors group',
                isExporting === 'pdf'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
              )}
              role="menuitem"
            >
              <div
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isExporting === 'pdf'
                    ? 'bg-emerald-600/30'
                    : 'bg-red-600/20 group-hover:bg-red-600/30'
                )}
              >
                {isExporting === 'pdf' ? (
                  <Loader2 size={18} className="text-emerald-400 animate-spin" />
                ) : (
                  <FileText size={18} className="text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">PDF Report</p>
                <p className="text-xs text-zinc-500">
                  Professional valuation summary
                </p>
              </div>
              {isExporting === 'pdf' && (
                <Check size={16} className="text-emerald-400" />
              )}
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting !== null}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left mt-1',
                'transition-colors group',
                isExporting === 'excel'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100'
              )}
              role="menuitem"
            >
              <div
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isExporting === 'excel'
                    ? 'bg-emerald-600/30'
                    : 'bg-emerald-600/20 group-hover:bg-emerald-600/30'
                )}
              >
                {isExporting === 'excel' ? (
                  <Loader2 size={18} className="text-emerald-400 animate-spin" />
                ) : (
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Excel Model</p>
                <p className="text-xs text-zinc-500">
                  Full DCF with all schedules
                </p>
              </div>
              {isExporting === 'excel' && (
                <Check size={16} className="text-emerald-400" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-[10px] text-zinc-600 text-center">
              Exports include all projection years and valuation data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact export buttons for inline use
 */
export function ExportButtons() {
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);

  const {
    assumptions,
    incomeStatement,
    balanceSheet,
    cashFlow,
    depreciationSchedule,
    debtSchedule,
    valuation,
    company,
  } = useFinanceStore();

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateValuationPDF({
        assumptions,
        incomeStatement,
        balanceSheet,
        cashFlow,
        valuation,
        company: company
          ? {
              name: company.name,
              ticker: company.ticker,
              sector: company.sector,
              marketPrice: company.marketPrice,
            }
          : undefined,
      });

      showToast.success('PDF exported');
    } catch {
      showToast.error('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting('excel');
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      generateValuationExcel({
        assumptions,
        incomeStatement,
        balanceSheet,
        cashFlow,
        depreciationSchedule,
        debtSchedule,
        valuation,
        company: company
          ? {
              name: company.name,
              ticker: company.ticker,
              sector: company.sector,
              marketPrice: company.marketPrice,
            }
          : undefined,
      });

      showToast.success('Excel exported');
    } catch {
      showToast.error('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportPDF}
        disabled={isExporting !== null}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
          'bg-zinc-800 border border-zinc-700 text-zinc-300',
          'hover:bg-zinc-700 hover:text-zinc-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Export PDF Report"
      >
        {isExporting === 'pdf' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FileText size={12} className="text-red-400" />
        )}
        PDF
      </button>

      <button
        onClick={handleExportExcel}
        disabled={isExporting !== null}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
          'bg-zinc-800 border border-zinc-700 text-zinc-300',
          'hover:bg-zinc-700 hover:text-zinc-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Export Excel Model"
      >
        {isExporting === 'excel' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={12} className="text-emerald-400" />
        )}
        Excel
      </button>
    </div>
  );
}
