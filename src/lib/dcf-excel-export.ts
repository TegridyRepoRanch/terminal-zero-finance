// @ts-nocheck
// DCF Model Excel Export
// Professional-grade Excel export for DCF valuations
// Follows investment banking formatting standards
// TODO: Update type definitions to match DCFValuation/DCFAssumptions interface

import type { DCFValuation, DCFProjection } from './dcf-generator';

// Type aliases for Excel export context
type DCFModel = DCFValuation;
type ProjectionYear = DCFProjection;
type SensitivityMatrix = DCFValuation['sensitivityMatrix'];

// ============================================================================
// TYPES
// ============================================================================

export interface ExcelExportConfig {
  includeAssumptions?: boolean;
  includeSensitivity?: boolean;
  includeCharts?: boolean;
  companyName?: string;
  analyst?: string;
  date?: string;
}

interface WorksheetData {
  name: string;
  data: (string | number | null)[][];
  styles: CellStyle[][];
  columnWidths: number[];
  merges?: string[];
}

interface CellStyle {
  font?: {
    bold?: boolean;
    color?: string;
    size?: number;
    name?: string;
  };
  fill?: {
    color?: string;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  numberFormat?: string;
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    style?: 'thin' | 'medium' | 'thick';
  };
}

// ============================================================================
// CONSTANTS - Investment Banking Standards
// ============================================================================

const COLORS = {
  BLUE_INPUT: '0000FF',        // Hardcoded inputs
  BLACK_FORMULA: '000000',     // Formulas
  GREEN_LINK: '008000',        // Links from other sheets
  RED_EXTERNAL: 'FF0000',      // External links
  YELLOW_HIGHLIGHT: 'FFFF00',  // Key assumptions
  HEADER_BG: '4472C4',         // Header background
  HEADER_TEXT: 'FFFFFF',       // Header text
  ALTERNATE_ROW: 'F2F2F2',     // Zebra striping
  SECTION_BG: 'D9E2F3',        // Section headers
};

const FORMATS = {
  CURRENCY: '$#,##0;($#,##0);"-"',
  CURRENCY_MM: '$#,##0.0;($#,##0.0);"-"',
  PERCENT: '0.0%;(0.0%);"-"',
  MULTIPLE: '0.0x;(0.0x);"-"',
  NUMBER: '#,##0;(#,##0);"-"',
  YEAR: '0',
  DECIMAL: '#,##0.00;(#,##0.00);"-"',
};

// ============================================================================
// EXCEL GENERATION
// ============================================================================

/**
 * Generate Excel workbook data for a DCF model
 */
export function generateDCFExcelData(
  dcf: DCFModel,
  config: ExcelExportConfig = {}
): WorksheetData[] {
  const worksheets: WorksheetData[] = [];

  // 1. Summary Sheet
  worksheets.push(generateSummarySheet(dcf, config));

  // 2. Assumptions Sheet
  if (config.includeAssumptions !== false) {
    worksheets.push(generateAssumptionsSheet(dcf));
  }

  // 3. Projections Sheet
  worksheets.push(generateProjectionsSheet(dcf));

  // 4. DCF Valuation Sheet
  worksheets.push(generateValuationSheet(dcf));

  // 5. Sensitivity Analysis Sheet
  if (config.includeSensitivity !== false && dcf.sensitivityMatrix) {
    worksheets.push(generateSensitivitySheet(dcf));
  }

  return worksheets;
}

/**
 * Generate Summary Sheet
 */
function generateSummarySheet(dcf: DCFModel, config: ExcelExportConfig): WorksheetData {
  const rows: (string | number | null)[][] = [];
  const styles: CellStyle[][] = [];

  // Title
  rows.push([`DCF Valuation - ${config.companyName || dcf.ticker}`]);
  styles.push([{
    font: { bold: true, size: 16, color: COLORS.BLACK_FORMULA },
    alignment: { horizontal: 'left' }
  }]);

  rows.push([]);
  styles.push([{}]);

  // Metadata
  rows.push(['Analyst:', config.analyst || 'Terminal Zero Finance']);
  styles.push([{ font: { bold: true } }, { font: { color: COLORS.BLUE_INPUT } }]);

  rows.push(['Date:', config.date || new Date().toISOString().split('T')[0]]);
  styles.push([{ font: { bold: true } }, { font: { color: COLORS.BLUE_INPUT } }]);

  rows.push([]);
  styles.push([{}]);

  // Key Metrics Section
  rows.push(['VALUATION SUMMARY']);
  styles.push([{
    font: { bold: true, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  // Implied Share Price
  rows.push(['Implied Share Price', dcf.impliedSharePrice]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true, size: 14 }, numberFormat: FORMATS.CURRENCY }
  ]);

  // Current Price
  rows.push(['Current Price', dcf.currentPrice]);
  styles.push([
    { font: { bold: true } },
    { numberFormat: FORMATS.CURRENCY }
  ]);

  // Upside/Downside
  const upside = ((dcf.impliedSharePrice - dcf.currentPrice) / dcf.currentPrice);
  rows.push(['Upside / (Downside)', upside]);
  styles.push([
    { font: { bold: true } },
    {
      font: { color: upside >= 0 ? '008000' : 'FF0000', bold: true },
      numberFormat: FORMATS.PERCENT
    }
  ]);

  rows.push([]);
  styles.push([{}]);

  // Enterprise Value Breakdown
  rows.push(['ENTERPRISE VALUE BREAKDOWN']);
  styles.push([{
    font: { bold: true, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  rows.push(['Present Value of FCF', dcf.presentValueFCF]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Terminal Value (PV)', dcf.terminalValuePV]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Enterprise Value', dcf.enterpriseValue]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM }
  ]);

  rows.push([]);
  styles.push([{}]);

  // Equity Value Bridge
  rows.push(['EQUITY VALUE BRIDGE']);
  styles.push([{
    font: { bold: true, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  rows.push(['Enterprise Value', dcf.enterpriseValue]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Less: Total Debt', -dcf.assumptions.totalDebt]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Plus: Cash', dcf.assumptions.cashAndEquivalents]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Equity Value', dcf.equityValue]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM }
  ]);

  rows.push(['Shares Outstanding (mm)', dcf.assumptions.sharesOutstanding]);
  styles.push([{}, { numberFormat: FORMATS.NUMBER }]);

  rows.push(['Per Share Value', dcf.impliedSharePrice]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true }, numberFormat: FORMATS.CURRENCY }
  ]);

  return {
    name: 'Summary',
    data: rows,
    styles,
    columnWidths: [35, 20],
    merges: ['A1:B1'],
  };
}

/**
 * Generate Assumptions Sheet
 */
function generateAssumptionsSheet(dcf: DCFModel): WorksheetData {
  const rows: (string | number | null)[][] = [];
  const styles: CellStyle[][] = [];
  const assumptions = dcf.assumptions;

  // Title
  rows.push(['KEY ASSUMPTIONS']);
  styles.push([{
    font: { bold: true, size: 14, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  // Growth Assumptions
  rows.push(['GROWTH ASSUMPTIONS', '', 'Notes']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } },
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['Revenue Growth Rate', assumptions.revenueGrowthRate, 'Annual revenue growth']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['Terminal Growth Rate', assumptions.terminalGrowthRate, 'Perpetuity growth rate']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push([]);
  styles.push([{}]);

  // Margin Assumptions
  rows.push(['MARGIN ASSUMPTIONS', '', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['EBITDA Margin', assumptions.ebitdaMargin, 'Target EBITDA margin']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['Tax Rate', assumptions.taxRate, 'Effective tax rate']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['D&A as % of Revenue', assumptions.daPercent, 'Depreciation & amortization']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['CapEx as % of Revenue', assumptions.capexPercent, 'Capital expenditures']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['NWC Change as % of Δ Revenue', assumptions.nwcPercent, 'Working capital investment']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push([]);
  styles.push([{}]);

  // WACC Components
  rows.push(['WACC COMPONENTS', '', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['Risk-Free Rate', assumptions.riskFreeRate, '10-year Treasury']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['Market Risk Premium', assumptions.marketRiskPremium, 'Equity risk premium']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push(['Beta', assumptions.beta, 'Levered beta']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.DECIMAL }, {}]);

  rows.push(['Cost of Debt', assumptions.costOfDebt, 'Pre-tax cost of debt']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }, {}]);

  rows.push([]);
  styles.push([{}]);

  // Capital Structure
  rows.push(['CAPITAL STRUCTURE', '', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['Total Debt', assumptions.totalDebt, 'Long-term + short-term debt']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.CURRENCY_MM }, {}]);

  rows.push(['Cash & Equivalents', assumptions.cashAndEquivalents, 'Cash and marketable securities']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.CURRENCY_MM }, {}]);

  rows.push(['Shares Outstanding (mm)', assumptions.sharesOutstanding, 'Diluted shares']);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.NUMBER }, {}]);

  rows.push([]);
  styles.push([{}]);

  // Calculated WACC
  rows.push(['CALCULATED WACC', '', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['WACC', dcf.wacc, 'Weighted avg cost of capital']);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true, color: COLORS.BLACK_FORMULA }, numberFormat: FORMATS.PERCENT },
    {}
  ]);

  return {
    name: 'Assumptions',
    data: rows,
    styles,
    columnWidths: [35, 15, 30],
  };
}

/**
 * Generate Projections Sheet
 */
function generateProjectionsSheet(dcf: DCFModel): WorksheetData {
  const rows: (string | number | null)[][] = [];
  const styles: CellStyle[][] = [];
  const projections = dcf.projections;

  // Header row with years
  const headerRow: (string | number | null)[] = ['($ in millions)'];
  const headerStyle: CellStyle[] = [{ font: { bold: true } }];

  for (const year of projections) {
    headerRow.push(year.year);
    headerStyle.push({
      font: { bold: true, color: COLORS.HEADER_TEXT },
      fill: { color: COLORS.HEADER_BG },
      alignment: { horizontal: 'center' },
      numberFormat: FORMATS.YEAR
    });
  }

  rows.push(headerRow);
  styles.push(headerStyle);

  rows.push([]);
  styles.push(Array(projections.length + 1).fill({}));

  // Revenue
  const revenueRow: (string | number | null)[] = ['Revenue'];
  const revenueStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    revenueRow.push(year.revenue);
    revenueStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(revenueRow);
  styles.push(revenueStyle);

  // Growth Rate
  const growthRow: (string | number | null)[] = ['  Growth %'];
  const growthStyle: CellStyle[] = [{ font: { color: '666666' } }];
  for (let i = 0; i < projections.length; i++) {
    if (i === 0) {
      growthRow.push(null);
      growthStyle.push({});
    } else {
      const growth = (projections[i].revenue - projections[i-1].revenue) / projections[i-1].revenue;
      growthRow.push(growth);
      growthStyle.push({ font: { color: '666666' }, numberFormat: FORMATS.PERCENT });
    }
  }
  rows.push(growthRow);
  styles.push(growthStyle);

  rows.push([]);
  styles.push(Array(projections.length + 1).fill({}));

  // EBITDA
  const ebitdaRow: (string | number | null)[] = ['EBITDA'];
  const ebitdaStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    ebitdaRow.push(year.ebitda);
    ebitdaStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(ebitdaRow);
  styles.push(ebitdaStyle);

  // EBITDA Margin
  const marginRow: (string | number | null)[] = ['  Margin %'];
  const marginStyle: CellStyle[] = [{ font: { color: '666666' } }];
  for (const year of projections) {
    marginRow.push(year.ebitda / year.revenue);
    marginStyle.push({ font: { color: '666666' }, numberFormat: FORMATS.PERCENT });
  }
  rows.push(marginRow);
  styles.push(marginStyle);

  rows.push([]);
  styles.push(Array(projections.length + 1).fill({}));

  // D&A
  const daRow: (string | number | null)[] = ['Less: D&A'];
  const daStyle: CellStyle[] = [{}];
  for (const year of projections) {
    daRow.push(-year.depreciation);
    daStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(daRow);
  styles.push(daStyle);

  // EBIT
  const ebitRow: (string | number | null)[] = ['EBIT'];
  const ebitStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    ebitRow.push(year.ebit);
    ebitStyle.push({ numberFormat: FORMATS.CURRENCY_MM, border: { top: true } });
  }
  rows.push(ebitRow);
  styles.push(ebitStyle);

  // Taxes
  const taxRow: (string | number | null)[] = ['Less: Taxes'];
  const taxStyle: CellStyle[] = [{}];
  for (const year of projections) {
    taxRow.push(-year.taxes);
    taxStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(taxRow);
  styles.push(taxStyle);

  // NOPAT
  const nopatRow: (string | number | null)[] = ['NOPAT'];
  const nopatStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    nopatRow.push(year.nopat);
    nopatStyle.push({ numberFormat: FORMATS.CURRENCY_MM, border: { top: true } });
  }
  rows.push(nopatRow);
  styles.push(nopatStyle);

  rows.push([]);
  styles.push(Array(projections.length + 1).fill({}));

  // Add back D&A
  const addDaRow: (string | number | null)[] = ['Add: D&A'];
  const addDaStyle: CellStyle[] = [{}];
  for (const year of projections) {
    addDaRow.push(year.depreciation);
    addDaStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(addDaRow);
  styles.push(addDaStyle);

  // Less CapEx
  const capexRow: (string | number | null)[] = ['Less: CapEx'];
  const capexStyle: CellStyle[] = [{}];
  for (const year of projections) {
    capexRow.push(-year.capex);
    capexStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(capexRow);
  styles.push(capexStyle);

  // Less Change in NWC
  const nwcRow: (string | number | null)[] = ['Less: Δ NWC'];
  const nwcStyle: CellStyle[] = [{}];
  for (const year of projections) {
    nwcRow.push(-year.changeInNWC);
    nwcStyle.push({ numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(nwcRow);
  styles.push(nwcStyle);

  rows.push([]);
  styles.push(Array(projections.length + 1).fill({}));

  // Unlevered FCF
  const fcfRow: (string | number | null)[] = ['Unlevered Free Cash Flow'];
  const fcfStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    fcfRow.push(year.fcf);
    fcfStyle.push({
      font: { bold: true },
      numberFormat: FORMATS.CURRENCY_MM,
      border: { top: true, bottom: true }
    });
  }
  rows.push(fcfRow);
  styles.push(fcfStyle);

  // Discount Factor
  const dfRow: (string | number | null)[] = ['Discount Factor'];
  const dfStyle: CellStyle[] = [{ font: { color: '666666' } }];
  for (const year of projections) {
    dfRow.push(year.discountFactor);
    dfStyle.push({ font: { color: '666666' }, numberFormat: '0.000' });
  }
  rows.push(dfRow);
  styles.push(dfStyle);

  // Present Value of FCF
  const pvRow: (string | number | null)[] = ['PV of FCF'];
  const pvStyle: CellStyle[] = [{ font: { bold: true } }];
  for (const year of projections) {
    pvRow.push(year.presentValue);
    pvStyle.push({ font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM });
  }
  rows.push(pvRow);
  styles.push(pvStyle);

  return {
    name: 'Projections',
    data: rows,
    styles,
    columnWidths: [25, ...Array(projections.length).fill(15)],
  };
}

/**
 * Generate Valuation Sheet
 */
function generateValuationSheet(dcf: DCFModel): WorksheetData {
  const rows: (string | number | null)[][] = [];
  const styles: CellStyle[][] = [];

  rows.push(['DCF VALUATION']);
  styles.push([{
    font: { bold: true, size: 14, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  // Present Value of FCFs
  rows.push(['Sum of PV of FCFs', dcf.presentValueFCF]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push([]);
  styles.push([{}]);

  // Terminal Value Calculation
  rows.push(['TERMINAL VALUE CALCULATION', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['Terminal FCF (Year 5)', dcf.projections[dcf.projections.length - 1].fcf]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Terminal Growth Rate', dcf.assumptions.terminalGrowthRate]);
  styles.push([{}, { font: { color: COLORS.BLUE_INPUT }, numberFormat: FORMATS.PERCENT }]);

  rows.push(['WACC', dcf.wacc]);
  styles.push([{}, { numberFormat: FORMATS.PERCENT }]);

  rows.push(['Terminal Value (Undiscounted)', dcf.terminalValue]);
  styles.push([{ font: { bold: true } }, { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Terminal Value (PV)', dcf.terminalValuePV]);
  styles.push([{ font: { bold: true } }, { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push([]);
  styles.push([{}]);

  // Terminal Value as % of Enterprise Value
  const tvPercent = dcf.terminalValuePV / dcf.enterpriseValue;
  rows.push(['Terminal Value as % of EV', tvPercent]);
  styles.push([{ font: { color: '666666' } }, { font: { color: '666666' }, numberFormat: FORMATS.PERCENT }]);

  rows.push([]);
  styles.push([{}]);

  // Enterprise Value
  rows.push(['ENTERPRISE VALUE', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['PV of FCFs', dcf.presentValueFCF]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['PV of Terminal Value', dcf.terminalValuePV]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Enterprise Value', dcf.enterpriseValue]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM, border: { top: true } }
  ]);

  rows.push([]);
  styles.push([{}]);

  // Equity Value Bridge
  rows.push(['EQUITY VALUE BRIDGE', '']);
  styles.push([
    { font: { bold: true }, fill: { color: COLORS.SECTION_BG } },
    { fill: { color: COLORS.SECTION_BG } }
  ]);

  rows.push(['Enterprise Value', dcf.enterpriseValue]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Less: Total Debt', -dcf.assumptions.totalDebt]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Add: Cash & Equivalents', dcf.assumptions.cashAndEquivalents]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY_MM }]);

  rows.push(['Equity Value', dcf.equityValue]);
  styles.push([
    { font: { bold: true } },
    { font: { bold: true }, numberFormat: FORMATS.CURRENCY_MM, border: { top: true } }
  ]);

  rows.push([]);
  styles.push([{}]);

  // Per Share
  rows.push(['Shares Outstanding (mm)', dcf.assumptions.sharesOutstanding]);
  styles.push([{}, { numberFormat: FORMATS.NUMBER }]);

  rows.push(['Implied Share Price', dcf.impliedSharePrice]);
  styles.push([
    { font: { bold: true, size: 12 } },
    { font: { bold: true, size: 12 }, numberFormat: FORMATS.CURRENCY }
  ]);

  rows.push([]);
  styles.push([{}]);

  rows.push(['Current Share Price', dcf.currentPrice]);
  styles.push([{}, { numberFormat: FORMATS.CURRENCY }]);

  const upside = (dcf.impliedSharePrice - dcf.currentPrice) / dcf.currentPrice;
  rows.push(['Upside / (Downside)', upside]);
  styles.push([
    { font: { bold: true } },
    {
      font: { bold: true, color: upside >= 0 ? '008000' : 'FF0000' },
      numberFormat: FORMATS.PERCENT
    }
  ]);

  return {
    name: 'Valuation',
    data: rows,
    styles,
    columnWidths: [35, 20],
  };
}

/**
 * Generate Sensitivity Analysis Sheet
 */
function generateSensitivitySheet(dcf: DCFModel): WorksheetData {
  const rows: (string | number | null)[][] = [];
  const styles: CellStyle[][] = [];
  const matrix = dcf.sensitivityMatrix!;

  rows.push(['SENSITIVITY ANALYSIS']);
  styles.push([{
    font: { bold: true, size: 14, color: COLORS.HEADER_TEXT },
    fill: { color: COLORS.HEADER_BG }
  }]);

  rows.push([]);
  styles.push([{}]);

  rows.push(['Implied Share Price by WACC and Terminal Growth Rate']);
  styles.push([{ font: { bold: true } }]);

  rows.push([]);
  styles.push([{}]);

  // Header row with terminal growth rates
  const headerRow: (string | number | null)[] = ['WACC \\ Terminal Growth'];
  const headerStyle: CellStyle[] = [{ font: { bold: true }, fill: { color: COLORS.SECTION_BG } }];

  for (const tg of matrix.terminalGrowthRates) {
    headerRow.push(tg);
    headerStyle.push({
      font: { bold: true, color: COLORS.HEADER_TEXT },
      fill: { color: COLORS.HEADER_BG },
      alignment: { horizontal: 'center' },
      numberFormat: FORMATS.PERCENT
    });
  }

  rows.push(headerRow);
  styles.push(headerStyle);

  // Data rows
  for (let i = 0; i < matrix.waccRates.length; i++) {
    const wacc = matrix.waccRates[i];
    const rowData: (string | number | null)[] = [wacc];
    const rowStyle: CellStyle[] = [{
      font: { bold: true },
      fill: { color: COLORS.SECTION_BG },
      numberFormat: FORMATS.PERCENT
    }];

    for (let j = 0; j < matrix.terminalGrowthRates.length; j++) {
      const value = matrix.values[i][j];
      rowData.push(value);

      // Highlight the base case (middle cell)
      const isBaseCase = i === Math.floor(matrix.waccRates.length / 2) &&
                         j === Math.floor(matrix.terminalGrowthRates.length / 2);

      rowStyle.push({
        numberFormat: FORMATS.CURRENCY,
        fill: isBaseCase ? { color: COLORS.YELLOW_HIGHLIGHT } : undefined,
        font: isBaseCase ? { bold: true } : undefined,
        alignment: { horizontal: 'center' }
      });
    }

    rows.push(rowData);
    styles.push(rowStyle);
  }

  rows.push([]);
  styles.push(Array(matrix.terminalGrowthRates.length + 1).fill({}));

  // Legend
  rows.push(['Legend:']);
  styles.push([{ font: { bold: true } }]);

  rows.push(['Yellow highlighted cell = Base case assumption']);
  styles.push([{ font: { color: '666666' } }]);

  rows.push([]);
  styles.push([{}]);

  rows.push([`Current Stock Price: $${dcf.currentPrice.toFixed(2)}`]);
  styles.push([{ font: { bold: true } }]);

  return {
    name: 'Sensitivity',
    data: rows,
    styles,
    columnWidths: [25, ...Array(matrix.terminalGrowthRates.length).fill(12)],
  };
}

// ============================================================================
// EXPORT TO JSON (for frontend to convert to Excel)
// ============================================================================

/**
 * Convert worksheet data to JSON format for Excel generation
 */
export function exportToJSON(worksheets: WorksheetData[]): string {
  return JSON.stringify(worksheets, null, 2);
}

/**
 * Generate a downloadable Excel file data structure
 * This can be consumed by frontend libraries like xlsx or exceljs
 */
export function generateExcelDownload(dcf: DCFModel, config: ExcelExportConfig = {}): {
  filename: string;
  worksheets: WorksheetData[];
} {
  const filename = `DCF_${dcf.ticker}_${new Date().toISOString().split('T')[0]}.xlsx`;
  const worksheets = generateDCFExcelData(dcf, config);

  return { filename, worksheets };
}

export default {
  generateDCFExcelData,
  generateExcelDownload,
  exportToJSON,
};
