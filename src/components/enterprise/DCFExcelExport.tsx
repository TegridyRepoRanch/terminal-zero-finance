// DCF Excel Export Component
// Download professional DCF models in Excel format

import React, { useState, useCallback } from 'react';
import { generateExcelDownload, type ExcelExportConfig } from '../../lib/dcf-excel-export';
import type { DCFModel } from '../../lib/dcf-generator';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPES
// ============================================================================

interface DCFExcelExportProps {
  dcf: DCFModel;
  companyName?: string;
  analyst?: string;
  className?: string;
}

// ============================================================================
// EXCEL GENERATION UTILITIES
// ============================================================================

/**
 * Convert our worksheet data format to xlsx library format
 */
function convertToXLSXWorkbook(worksheetData: ReturnType<typeof generateExcelDownload>['worksheets']): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  for (const sheet of worksheetData) {
    // Convert our data format to 2D array for xlsx
    const wsData: (string | number | null)[][] = sheet.data;

    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply column widths
    ws['!cols'] = sheet.columnWidths.map(width => ({ wch: width }));

    // Apply merges if specified
    if (sheet.merges) {
      ws['!merges'] = sheet.merges.map(merge => {
        const [start, end] = merge.split(':');
        return {
          s: XLSX.utils.decode_cell(start),
          e: XLSX.utils.decode_cell(end || start),
        };
      });
    }

    // Apply cell styles
    // Note: xlsx library has limited style support without xlsx-style-js
    // For full styling, we'd need xlsx-js-style or similar
    for (let r = 0; r < sheet.styles.length; r++) {
      for (let c = 0; c < sheet.styles[r].length; c++) {
        const cellStyle = sheet.styles[r][c];
        if (!cellStyle) continue;

        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];

        if (cell && cellStyle.numberFormat) {
          // Apply number format
          cell.z = cellStyle.numberFormat;
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
  }

  return workbook;
}

/**
 * Trigger file download
 */
function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  // Generate binary Excel file
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Create blob and download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DCFExcelExport: React.FC<DCFExcelExportProps> = ({
  dcf,
  companyName,
  analyst,
  className,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ExcelExportConfig>({
    includeAssumptions: true,
    includeSensitivity: true,
    includeCharts: false,
    companyName: companyName || dcf.ticker,
    analyst: analyst || 'Terminal Zero Finance',
    date: new Date().toISOString().split('T')[0],
  });

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      // Generate worksheet data
      const { filename, worksheets } = generateExcelDownload(dcf, options);

      // Convert to xlsx workbook
      const workbook = convertToXLSXWorkbook(worksheets);

      // Download the file
      downloadExcel(workbook, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [dcf, options]);

  const handleQuickExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const { filename, worksheets } = generateExcelDownload(dcf, {
        ...options,
        includeAssumptions: true,
        includeSensitivity: true,
      });

      const workbook = convertToXLSXWorkbook(worksheets);
      downloadExcel(workbook, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [dcf, options]);

  return (
    <div className={className} style={{ display: 'inline-block' }}>
      {/* Main Export Button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleQuickExport}
          disabled={isExporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: isExporting ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.15s',
          }}
        >
          {isExporting ? (
            <>
              <LoadingSpinner />
              Exporting...
            </>
          ) : (
            <>
              <ExcelIcon />
              Download Excel
            </>
          )}
        </button>

        <button
          onClick={() => setShowOptions(!showOptions)}
          style={{
            padding: '10px 12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Export Options Panel */}
      {showOptions && (
        <div style={{
          position: 'absolute',
          marginTop: '8px',
          padding: '16px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 100,
          minWidth: '280px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Export Options
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.includeAssumptions}
                onChange={(e) => setOptions({ ...options, includeAssumptions: e.target.checked })}
              />
              <span style={{ fontSize: '13px' }}>Include Assumptions Sheet</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.includeSensitivity}
                onChange={(e) => setOptions({ ...options, includeSensitivity: e.target.checked })}
              />
              <span style={{ fontSize: '13px' }}>Include Sensitivity Analysis</span>
            </label>

            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                Company Name
              </label>
              <input
                type="text"
                value={options.companyName || ''}
                onChange={(e) => setOptions({ ...options, companyName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                Analyst Name
              </label>
              <input
                type="text"
                value={options.analyst || ''}
                onChange={(e) => setOptions({ ...options, analyst: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                marginTop: '8px',
                padding: '10px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Export with Options
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const ExcelIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 11-6.219-8.56" />
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </svg>
);

// ============================================================================
// QUICK EXPORT BUTTON (Simpler Version)
// ============================================================================

export const QuickExcelExport: React.FC<{
  dcf: DCFModel;
  companyName?: string;
}> = ({ dcf, companyName }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const { filename, worksheets } = generateExcelDownload(dcf, {
        companyName: companyName || dcf.ticker,
        includeAssumptions: true,
        includeSensitivity: true,
      });

      const workbook = convertToXLSXWorkbook(worksheets);
      downloadExcel(workbook, filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
      }}
    >
      {isExporting ? 'Exporting...' : '📊 Export Excel'}
    </button>
  );
};

export default DCFExcelExport;
