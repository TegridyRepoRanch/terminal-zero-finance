// PDF Handling - Simple approach, let AI do the heavy lifting
// Gemini can read PDFs directly, no complex parsing needed

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
 * Convert PDF file to base64 for sending to Gemini
 * No parsing - just prep the file for the AI to read directly
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: PDFParseProgress) => void
): Promise<PDFParseResult> {
  console.log('[PDF] Preparing file for AI:', file.name, 'Size:', file.size);

  onProgress?.({ currentPage: 0, totalPages: 1, percent: 10 });

  // Just read the file as base64 - let Gemini parse it
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  onProgress?.({ currentPage: 1, totalPages: 1, percent: 100 });
  console.log('[PDF] File ready, base64 length:', base64Data.length);

  return {
    text: '', // We'll let Gemini extract the text
    pageCount: 0, // Unknown without parsing
    base64Data,
    mimeType: 'application/pdf',
    metadata: {},
  };
}
