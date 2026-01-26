// PDF Export for Valuation Reports
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Assumptions, IncomeStatementRow, BalanceSheetRow, CashFlowRow, ValuationResult } from './financial-logic';
import { formatCurrency, formatPercent } from './financial-logic';

interface ExportData {
  assumptions: Assumptions;
  incomeStatement: IncomeStatementRow[];
  balanceSheet: BalanceSheetRow[];
  cashFlow: CashFlowRow[];
  valuation: ValuationResult;
  company?: {
    name: string;
    ticker: string;
    sector?: string;
    marketPrice?: number;
  };
}

/**
 * Generate a PDF valuation report
 */
export function generateValuationPDF(data: ExportData): void {
  const { assumptions, incomeStatement, balanceSheet, cashFlow, valuation, company } = data;
  const doc = new jsPDF();

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald
  const headerBg: [number, number, number] = [24, 24, 27]; // Zinc-900
  const textColor: [number, number, number] = [63, 63, 70]; // Zinc-700

  let yPos = 20;

  // =========================================================================
  // HEADER
  // =========================================================================
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DCF Valuation Report', 14, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (company) {
    doc.text(`${company.name} (${company.ticker})`, 14, 28);
    if (company.sector) {
      doc.text(`Sector: ${company.sector}`, 14, 35);
    }
  } else {
    doc.text('Terminal Zero Financial Analysis', 14, 28);
  }

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 18);

  yPos = 50;

  // =========================================================================
  // EXECUTIVE SUMMARY
  // =========================================================================
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPos);
  yPos += 8;

  // Valuation Box
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, yPos, 85, 45, 3, 3);
  doc.roundedRect(105, yPos, 85, 45, 3, 3);

  // Left Box - Implied Value
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Implied Share Price', 20, yPos + 10);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`$${valuation.impliedSharePrice.toFixed(2)}`, 20, yPos + 28);

  if (company?.marketPrice) {
    const upside = ((valuation.impliedSharePrice - company.marketPrice) / company.marketPrice) * 100;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(upside >= 0 ? 16 : 239, upside >= 0 ? 185 : 68, upside >= 0 ? 129 : 68);
    doc.text(`${upside >= 0 ? '+' : ''}${upside.toFixed(1)}% vs Market`, 20, yPos + 38);
  }

  // Right Box - Enterprise Value
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Enterprise Value', 111, yPos + 10);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(valuation.enterpriseValue), 111, yPos + 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`Equity: ${formatCurrency(valuation.equityValue)}`, 111, yPos + 38);

  yPos += 55;

  // =========================================================================
  // KEY ASSUMPTIONS
  // =========================================================================
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Assumptions', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Value', 'Parameter', 'Value']],
    body: [
      ['Base Revenue', formatCurrency(assumptions.baseRevenue), 'WACC', formatPercent(assumptions.wacc)],
      ['Revenue Growth', formatPercent(assumptions.revenueGrowthRate), 'Terminal Growth', formatPercent(assumptions.terminalGrowthRate)],
      ['COGS %', formatPercent(assumptions.cogsPercent), 'Tax Rate', formatPercent(assumptions.taxRate)],
      ['SG&A %', formatPercent(assumptions.sgaPercent), 'Projection Years', `${assumptions.projectionYears} years`],
      ['Days Receivable', `${assumptions.daysReceivables} days`, 'Shares Outstanding', formatCurrency(assumptions.sharesOutstanding, false).replace('$', '')],
    ],
    theme: 'grid',
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 40 },
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // =========================================================================
  // VALUATION BREAKDOWN
  // =========================================================================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DCF Valuation Breakdown', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Component', 'Value']],
    body: [
      ['PV of Projected Cash Flows', formatCurrency(valuation.sumPvUFCF)],
      ['Terminal Value (Gordon Growth)', formatCurrency(valuation.terminalValue)],
      ['PV of Terminal Value', formatCurrency(valuation.pvTerminalValue)],
      ['Enterprise Value', formatCurrency(valuation.enterpriseValue)],
      ['Less: Net Debt', formatCurrency(-assumptions.netDebt)],
      ['Equity Value', formatCurrency(valuation.equityValue)],
      ['Shares Outstanding', (assumptions.sharesOutstanding / 1e6).toFixed(1) + 'M'],
      ['Implied Share Price', `$${valuation.impliedSharePrice.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // =========================================================================
  // INCOME STATEMENT PROJECTIONS
  // =========================================================================

  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projected Income Statement', 14, yPos);
  yPos += 5;

  const incomeTableData = incomeStatement.map((row) => [
    `Year ${row.year}`,
    formatCurrency(row.revenue),
    formatCurrency(row.grossProfit),
    formatCurrency(row.ebit),
    formatCurrency(row.netIncome),
    formatPercent((row.netIncome / row.revenue) * 100),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Year', 'Revenue', 'Gross Profit', 'EBIT', 'Net Income', 'Net Margin']],
    body: incomeTableData,
    theme: 'striped',
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // =========================================================================
  // CASH FLOW PROJECTIONS
  // =========================================================================

  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projected Cash Flows', 14, yPos);
  yPos += 5;

  const cashFlowTableData = cashFlow.map((row, i) => [
    `Year ${row.year}`,
    formatCurrency(row.netIncome),
    formatCurrency(row.depreciation),
    formatCurrency(-row.changeInNWC),
    formatCurrency(-row.capex),
    formatCurrency(row.unleveredFCF),
    formatCurrency(valuation.pvUFCF[i]),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Year', 'Net Income', 'D&A', 'ΔNWC', 'CapEx', 'UFCF', 'PV UFCF']],
    body: cashFlowTableData,
    theme: 'striped',
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // =========================================================================
  // BALANCE SHEET PROJECTIONS
  // =========================================================================

  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projected Balance Sheet', 14, yPos);
  yPos += 5;

  const balanceTableData = balanceSheet.map((row) => [
    `Year ${row.year}`,
    formatCurrency(row.totalAssets),
    formatCurrency(row.totalLiabilities),
    formatCurrency(row.totalEquity),
    formatCurrency(row.debtBalance),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Year', 'Total Assets', 'Total Liabilities', 'Total Equity', 'Debt Balance']],
    body: balanceTableData,
    theme: 'striped',
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  // =========================================================================
  // FOOTER
  // =========================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by Terminal Zero DCF Workstation | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = company
    ? `${company.ticker}_DCF_Valuation_${new Date().toISOString().split('T')[0]}.pdf`
    : `DCF_Valuation_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(filename);
}
