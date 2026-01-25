// PDF Text Extraction using PDF.js
// Lazy-loaded to reduce initial bundle size

import type { PDFDocumentProxy } from 'pdfjs-dist';

interface TextItem {
  str: string;
}

export interface PDFParseResult {
  text: string;
  pageCount: number;
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

// Lazy-loaded PDF.js module
let pdfjsModule: typeof import('pdfjs-dist') | null = null;

/**
 * Lazily load PDF.js module
 */
async function getPDFJS(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) {
    return pdfjsModule;
  }

  // Dynamic import - this creates a separate chunk
  pdfjsModule = await import('pdfjs-dist');

  // Configure worker after module is loaded
  pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  return pdfjsModule;
}

/**
 * Extract text content from a PDF file
 * @param file - The PDF file to parse
 * @param onProgress - Optional callback for progress updates
 * @returns Parsed text content and metadata
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  const pdfjsLib = await getPDFJS();

  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf: PDFDocumentProxy = await loadingTask.promise;
  const pageCount = pdf.numPages;

  // Extract metadata
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, string> | undefined;

  // Extract text from each page
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Combine text items into a string
    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return (item as TextItem).str;
        }
        return '';
      })
      .join(' ');

    textParts.push(pageText);

    // Report progress
    if (onProgress) {
      onProgress({
        currentPage: pageNum,
        totalPages: pageCount,
        percent: Math.round((pageNum / pageCount) * 100),
      });
    }
  }

  // Clean up
  await pdf.destroy();

  // Combine all pages and clean up whitespace
  const fullText = textParts
    .join('\n\n')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();

  return {
    text: fullText,
    pageCount,
    metadata: {
      title: info?.Title,
      author: info?.Author,
      subject: info?.Subject,
      creator: info?.Creator,
    },
  };
}

/**
 * Extract text from specific page ranges (useful for large filings)
 * @param file - The PDF file to parse
 * @param startPage - First page to extract (1-indexed)
 * @param endPage - Last page to extract (1-indexed)
 */
export async function extractTextFromPages(
  file: File,
  startPage: number,
  endPage: number
): Promise<string> {
  const pdfjsLib = await getPDFJS();
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf: PDFDocumentProxy = await loadingTask.promise;
  const actualEndPage = Math.min(endPage, pdf.numPages);

  const textParts: string[] = [];

  for (let pageNum = startPage; pageNum <= actualEndPage; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as TextItem).str : ''))
      .join(' ');

    textParts.push(pageText);
  }

  await pdf.destroy();

  return textParts.join('\n\n').replace(/\s+/g, ' ').trim();
}

/**
 * Get the number of pages in a PDF without extracting text
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const pdfjsLib = await getPDFJS();
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf: PDFDocumentProxy = await loadingTask.promise;
  const pageCount = pdf.numPages;

  await pdf.destroy();

  return pageCount;
}

/**
 * Truncate text to fit within token limits while keeping important sections
 * SEC filings typically have key financial data in specific sections
 */
export function truncateForLLM(text: string, maxChars: number = 100000): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Try to find and prioritize financial statement sections
  const sections = [
    'consolidated statements of operations',
    'consolidated balance sheets',
    'consolidated statements of cash flows',
    'selected financial data',
    'financial highlights',
    'item 6',
    'item 7',
    'item 8',
  ];

  // Search for important sections
  const lowerText = text.toLowerCase();
  const sectionMatches: Array<{ start: number; section: string }> = [];

  for (const section of sections) {
    const index = lowerText.indexOf(section);
    if (index !== -1) {
      sectionMatches.push({ start: index, section });
    }
  }

  if (sectionMatches.length > 0) {
    // Sort by position and extract content around these sections
    sectionMatches.sort((a, b) => a.start - b.start);

    const extractedParts: string[] = [];
    const charsPerSection = Math.floor(maxChars / (sectionMatches.length + 1));

    // Add beginning of document (company info, etc.)
    extractedParts.push(text.slice(0, charsPerSection));

    // Add content around each important section
    for (const match of sectionMatches) {
      const sectionStart = Math.max(0, match.start - 500);
      const sectionEnd = Math.min(text.length, match.start + charsPerSection);
      extractedParts.push(text.slice(sectionStart, sectionEnd));
    }

    return extractedParts.join('\n\n[...]\n\n').slice(0, maxChars);
  }

  // Fallback: just truncate from the beginning
  return text.slice(0, maxChars) + '\n\n[... truncated ...]';
}
