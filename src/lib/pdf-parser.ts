// PDF Handling - Extract text from PDF using PDF.js
// Text extraction is faster than sending raw PDF to AI

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PDFParseResult {
  text: string;
  pageCount: number;
  base64Data?: string;
  mimeType: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface PDFParseProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
}

/**
 * Extract text from PDF using PDF.js
 * Returns both extracted text and base64 for fallback
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  console.log('[PDF] Extracting text from:', file.name, 'Size:', file.size);

  onProgress?.({ currentPage: 0, totalPages: 1, percent: 5 });

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Also create base64 for fallback
  const base64Data = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  onProgress?.({ currentPage: 0, totalPages: 1, percent: 10 });

  try {
    // Load PDF document
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    console.log('[PDF] Document loaded, pages:', numPages);

    // Extract text from each page
    const textParts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Join text items with proper spacing
      const pageText = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str || '';
        })
        .join(' ');

      textParts.push(pageText);

      const percent = 10 + ((i / numPages) * 85);
      onProgress?.({ currentPage: i, totalPages: numPages, percent });

      // Log progress every 10 pages
      if (i % 10 === 0) {
        console.log(`[PDF] Processed page ${i}/${numPages}`);
      }
    }

    const fullText = textParts.join('\n\n');
    console.log('[PDF] Text extracted, length:', fullText.length);

    onProgress?.({ currentPage: numPages, totalPages: numPages, percent: 100 });

    return {
      text: fullText,
      pageCount: numPages,
      base64Data,
      mimeType: 'application/pdf',
      metadata: {},
    };
  } catch (parseError) {
    console.error('[PDF] Text extraction failed, using base64 fallback:', parseError);

    // Return base64 for fallback to raw PDF mode
    return {
      text: '',
      pageCount: 0,
      base64Data,
      mimeType: 'application/pdf',
      metadata: {},
    };
  }
}

/**
 * Intelligently truncate text for LLM while preserving financial content.
 * For 10-K/10-Q filings, prioritizes Item 8 (Financial Statements) content.
 */
export function truncateForLLM(text: string, maxLength: number = 60000): string {
  if (text.length <= maxLength) {
    return text;
  }

  console.log(`[PDF] Text length ${text.length} exceeds ${maxLength}, applying smart truncation`);

  // Try to find financial statement sections (Item 8 in 10-K, Item 1 in 10-Q)
  const financialSectionPatterns = [
    // Item 8 - Financial Statements and Supplementary Data
    /ITEM\s*8[.\s\-:]*FINANCIAL\s*STATEMENTS/i,
    /PART\s*II[.\s\-\n]*ITEM\s*8/i,
    /CONSOLIDATED\s+STATEMENTS?\s+OF\s+(OPERATIONS?|INCOME|COMPREHENSIVE\s+INCOME)/i,
    /CONSOLIDATED\s+BALANCE\s+SHEETS?/i,
    /CONSOLIDATED\s+STATEMENTS?\s+OF\s+CASH\s+FLOWS?/i,
    // Key financial headers
    /NET\s+SALES|TOTAL\s+NET\s+SALES|NET\s+REVENUES?/i,
    /COST\s+OF\s+(GOODS\s+)?SALES|COST\s+OF\s+PRODUCTS?\s+SOLD/i,
    /GROSS\s+(PROFIT|MARGIN)/i,
    /OPERATING\s+(INCOME|EXPENSES?)/i,
    /TOTAL\s+ASSETS/i,
    /TOTAL\s+LIABILITIES/i,
    /STOCKHOLDERS.?\s+EQUITY/i,
  ];

  // Find the best starting position for financial content
  let financialStart = -1;
  for (const pattern of financialSectionPatterns) {
    const match = text.search(pattern);
    if (match > 0 && (financialStart === -1 || match < financialStart)) {
      financialStart = match;
      console.log(`[PDF] Found financial content at position ${match} using pattern: ${pattern.toString().slice(0, 50)}`);
      break;
    }
  }

  // If we found financial content, build context around it
  if (financialStart > 0) {
    // Include some context before the financial section
    const contextBefore = Math.min(financialStart, 10000);
    const startPos = Math.max(0, financialStart - contextBefore);

    // Calculate how much we can include
    const availableLength = maxLength - 2000; // Reserve space for intro

    // Build: intro + financial sections
    const intro = text.slice(0, 2000); // First 2000 chars for company name, metadata
    const financialContent = text.slice(startPos, startPos + availableLength);

    const result = `${intro}\n\n[... DOCUMENT CONTENT SKIPPED TO FINANCIAL SECTIONS ...]\n\n${financialContent}`;
    console.log(`[PDF] Smart truncation: intro(2000) + financial content(${financialContent.length})`);
    return result;
  }

  // Fallback: If no financial section found, use a more balanced approach
  // Take beginning (for company info) + middle (where financials often are) + end
  console.log('[PDF] No financial section markers found, using balanced truncation');

  const introLength = 5000; // Company info
  const middleStart = Math.floor(text.length * 0.3); // Start of middle section
  const middleLength = maxLength - introLength - 2000; // Most content from middle
  const endLength = 2000;

  const intro = text.slice(0, introLength);
  const middle = text.slice(middleStart, middleStart + middleLength);
  const end = text.slice(-endLength);

  return `${intro}\n\n[... CONTENT TRUNCATED - SKIPPING TO MIDDLE SECTIONS ...]\n\n${middle}\n\n[... DOCUMENT END ...]\n\n${end}`;
}

/**
 * Extract specific financial sections from text
 * Returns extracted sections or empty string if not found
 */
export function extractFinancialSections(text: string): string {
  const sections: string[] = [];

  // Patterns to find financial tables
  const tablePatterns = [
    // Income statement patterns
    {
      start: /CONSOLIDATED\s+STATEMENTS?\s+OF\s+(OPERATIONS?|INCOME)/i,
      end: /CONSOLIDATED\s+(BALANCE\s+SHEETS?|STATEMENTS?\s+OF\s+COMPREHENSIVE)/i,
    },
    // Balance sheet patterns  
    {
      start: /CONSOLIDATED\s+BALANCE\s+SHEETS?/i,
      end: /CONSOLIDATED\s+STATEMENTS?\s+OF\s+(CASH\s+FLOWS?|STOCKHOLDERS)/i,
    },
    // Cash flow patterns
    {
      start: /CONSOLIDATED\s+STATEMENTS?\s+OF\s+CASH\s+FLOWS?/i,
      end: /NOTES\s+TO\s+(CONSOLIDATED\s+)?FINANCIAL\s+STATEMENTS|ITEM\s*9/i,
    },
  ];

  for (const pattern of tablePatterns) {
    const startMatch = text.search(pattern.start);
    if (startMatch > 0) {
      const searchText = text.slice(startMatch);
      const endMatch = searchText.search(pattern.end);
      const sectionEnd = endMatch > 0 ? endMatch : Math.min(searchText.length, 30000);
      sections.push(searchText.slice(0, sectionEnd));
    }
  }

  return sections.join('\n\n=== SECTION BREAK ===\n\n');
}

