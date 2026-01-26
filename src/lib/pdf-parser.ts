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
 * Truncate text to fit within LLM context limits
 * Keeps beginning and end of document (most important parts)
 */
export function truncateForLLM(text: string, maxLength: number = 100000): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Keep 80% from the beginning, 20% from the end
  const beginningLength = Math.floor(maxLength * 0.8);
  const endLength = maxLength - beginningLength - 50; // 50 chars for separator

  const beginning = text.slice(0, beginningLength);
  const ending = text.slice(-endLength);

  return `${beginning}\n\n[... CONTENT TRUNCATED ...]\n\n${ending}`;
}
