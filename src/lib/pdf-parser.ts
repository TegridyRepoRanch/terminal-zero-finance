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
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    )
  ]);
}

/**
 * Lazily load PDF.js module
 */
async function getPDFJS(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) {
    console.log('[PDF] Using cached PDF.js module');
    return pdfjsModule;
  }

  console.log('[PDF] Loading PDF.js module...');

  // Dynamic import - this creates a separate chunk
  pdfjsModule = await withTimeout(
    import('pdfjs-dist'),
    30000,
    'PDF.js module load'
  );

  // Use CDN-hosted worker for reliability
  const workerUrl = 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';
  console.log('[PDF] Using CDN worker:', workerUrl);
  pdfjsModule.GlobalWorkerOptions.workerSrc = workerUrl;

  console.log('[PDF] PDF.js module loaded successfully');
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
  console.log('[PDF] Starting extraction for:', file.name, 'Size:', file.size);

  console.log('[PDF] Getting PDF.js library...');
  const pdfjsLib = await getPDFJS();

  // Convert File to ArrayBuffer
  console.log('[PDF] Converting file to ArrayBuffer...');
  const arrayBuffer = await withTimeout(
    file.arrayBuffer(),
    30000,
    'File to ArrayBuffer conversion'
  );
  console.log('[PDF] ArrayBuffer size:', arrayBuffer.byteLength);

  // Load the PDF document
  console.log('[PDF] Loading PDF document...');
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableAutoFetch: true,
    disableStream: true,
  });

  // Add progress logging
  loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
    if (progress.total > 0) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      console.log(`[PDF] Loading: ${percent}% (${progress.loaded}/${progress.total})`);
    }
  };

  let pdf: PDFDocumentProxy;
  try {
    pdf = await withTimeout(
      loadingTask.promise,
      60000,
      'PDF document loading'
    );
  } catch (loadError) {
    console.error('[PDF] Failed to load with worker, trying without...', loadError);
    // Retry without worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    const retryTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    pdf = await withTimeout(retryTask.promise, 60000, 'PDF document loading (no worker)');
  }

  const pageCount = pdf.numPages;
  console.log('[PDF] Document loaded, pages:', pageCount);

  // Extract metadata
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, string> | undefined;

  // Extract text from each page (process in parallel batches for speed)
  console.log('[PDF] Extracting text from', pageCount, 'pages...');
  const textParts: string[] = new Array(pageCount).fill('');
  const BATCH_SIZE = 10; // Process 10 pages at a time

  for (let batchStart = 1; batchStart <= pageCount; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, pageCount);
    console.log(`[PDF] Processing batch: pages ${batchStart}-${batchEnd}`);

    // Process batch in parallel
    const batchPromises = [];
    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      const pagePromise = (async () => {
        try {
          const page = await withTimeout(
            pdf.getPage(pageNum),
            30000, // Increased timeout for large PDFs
            `Getting page ${pageNum}`
          );
          const textContent = await withTimeout(
            page.getTextContent(),
            30000, // Increased timeout for large PDFs
            `Extracting text from page ${pageNum}`
          );

          // Combine text items into a string
          const pageText = textContent.items
            .map((item) => {
              if ('str' in item) {
                return (item as TextItem).str;
              }
              return '';
            })
            .join(' ');

          textParts[pageNum - 1] = pageText;

          // Report progress for this page
          if (onProgress) {
            onProgress({
              currentPage: pageNum,
              totalPages: pageCount,
              percent: Math.round((pageNum / pageCount) * 100),
            });
          }
        } catch (pageError) {
          console.error(`[PDF] Error on page ${pageNum}:`, pageError);
          // Continue with other pages even if one fails
          textParts[pageNum - 1] = '';
        }
      })();
      batchPromises.push(pagePromise);
    }

    // Wait for all pages in this batch to complete
    await Promise.all(batchPromises);
    console.log(`[PDF] Batch complete: ${batchEnd}/${pageCount} pages processed`);
  }

  console.log('[PDF] All pages extracted');

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
