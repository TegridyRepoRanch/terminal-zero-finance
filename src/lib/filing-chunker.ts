// SEC Filing Chunker - Split filings into sections for RAG
// Parses 10-K and 10-Q filings by Item sections

export interface FilingChunk {
  chunkIndex: number;
  sectionName: string;      // "Item 1", "Item 1A", "Item 7", etc.
  sectionTitle: string;     // Full section title
  content: string;
  startPosition: number;
  endPosition: number;
}

export interface ChunkedFiling {
  chunks: FilingChunk[];
  totalLength: number;
  sectionCount: number;
}

// SEC 10-K standard sections
const SECTION_PATTERNS_10K = [
  { pattern: /ITEM\s*1[.\s\-:]+BUSINESS/gi, name: 'Item 1', title: 'Business' },
  { pattern: /ITEM\s*1A[.\s\-:]+RISK\s*FACTORS/gi, name: 'Item 1A', title: 'Risk Factors' },
  { pattern: /ITEM\s*1B[.\s\-:]+UNRESOLVED\s*STAFF\s*COMMENTS/gi, name: 'Item 1B', title: 'Unresolved Staff Comments' },
  { pattern: /ITEM\s*1C[.\s\-:]+CYBERSECURITY/gi, name: 'Item 1C', title: 'Cybersecurity' },
  { pattern: /ITEM\s*2[.\s\-:]+PROPERTIES/gi, name: 'Item 2', title: 'Properties' },
  { pattern: /ITEM\s*3[.\s\-:]+LEGAL\s*PROCEEDINGS/gi, name: 'Item 3', title: 'Legal Proceedings' },
  { pattern: /ITEM\s*4[.\s\-:]+MINE\s*SAFETY/gi, name: 'Item 4', title: 'Mine Safety Disclosures' },
  { pattern: /ITEM\s*5[.\s\-:]+MARKET\s*FOR/gi, name: 'Item 5', title: 'Market for Registrant\'s Common Equity' },
  { pattern: /ITEM\s*6[.\s\-:]+(?:RESERVED|\[RESERVED\]|SELECTED)/gi, name: 'Item 6', title: 'Reserved/Selected Financial Data' },
  { pattern: /ITEM\s*7[.\s\-:]+MANAGEMENT['']?S?\s*DISCUSSION/gi, name: 'Item 7', title: 'Management\'s Discussion and Analysis' },
  { pattern: /ITEM\s*7A[.\s\-:]+QUANTITATIVE\s*AND\s*QUALITATIVE/gi, name: 'Item 7A', title: 'Quantitative and Qualitative Disclosures About Market Risk' },
  { pattern: /ITEM\s*8[.\s\-:]+FINANCIAL\s*STATEMENTS/gi, name: 'Item 8', title: 'Financial Statements and Supplementary Data' },
  { pattern: /ITEM\s*9[.\s\-:]+CHANGES\s*IN\s*AND\s*DISAGREEMENTS/gi, name: 'Item 9', title: 'Changes in and Disagreements with Accountants' },
  { pattern: /ITEM\s*9A[.\s\-:]+CONTROLS\s*AND\s*PROCEDURES/gi, name: 'Item 9A', title: 'Controls and Procedures' },
  { pattern: /ITEM\s*9B[.\s\-:]+OTHER\s*INFORMATION/gi, name: 'Item 9B', title: 'Other Information' },
  { pattern: /ITEM\s*10[.\s\-:]+DIRECTORS/gi, name: 'Item 10', title: 'Directors, Executive Officers and Corporate Governance' },
  { pattern: /ITEM\s*11[.\s\-:]+EXECUTIVE\s*COMPENSATION/gi, name: 'Item 11', title: 'Executive Compensation' },
  { pattern: /ITEM\s*12[.\s\-:]+SECURITY\s*OWNERSHIP/gi, name: 'Item 12', title: 'Security Ownership of Certain Beneficial Owners' },
  { pattern: /ITEM\s*13[.\s\-:]+CERTAIN\s*RELATIONSHIPS/gi, name: 'Item 13', title: 'Certain Relationships and Related Transactions' },
  { pattern: /ITEM\s*14[.\s\-:]+PRINCIPAL\s*ACCOUNT/gi, name: 'Item 14', title: 'Principal Accountant Fees and Services' },
  { pattern: /ITEM\s*15[.\s\-:]+EXHIBITS/gi, name: 'Item 15', title: 'Exhibits and Financial Statement Schedules' },
  { pattern: /ITEM\s*16[.\s\-:]+FORM\s*10-K\s*SUMMARY/gi, name: 'Item 16', title: 'Form 10-K Summary' },
];

// SEC 10-Q standard sections
const SECTION_PATTERNS_10Q = [
  { pattern: /PART\s*I[.\s\-:]+FINANCIAL\s*INFORMATION/gi, name: 'Part I', title: 'Financial Information' },
  { pattern: /ITEM\s*1[.\s\-:]+FINANCIAL\s*STATEMENTS/gi, name: 'Item 1', title: 'Financial Statements' },
  { pattern: /ITEM\s*2[.\s\-:]+MANAGEMENT['']?S?\s*DISCUSSION/gi, name: 'Item 2', title: 'Management\'s Discussion and Analysis' },
  { pattern: /ITEM\s*3[.\s\-:]+QUANTITATIVE\s*AND\s*QUALITATIVE/gi, name: 'Item 3', title: 'Quantitative and Qualitative Disclosures About Market Risk' },
  { pattern: /ITEM\s*4[.\s\-:]+CONTROLS\s*AND\s*PROCEDURES/gi, name: 'Item 4', title: 'Controls and Procedures' },
  { pattern: /PART\s*II[.\s\-:]+OTHER\s*INFORMATION/gi, name: 'Part II', title: 'Other Information' },
  { pattern: /ITEM\s*1[.\s\-:]+LEGAL\s*PROCEEDINGS/gi, name: 'Item 1 (Part II)', title: 'Legal Proceedings' },
  { pattern: /ITEM\s*1A[.\s\-:]+RISK\s*FACTORS/gi, name: 'Item 1A', title: 'Risk Factors' },
  { pattern: /ITEM\s*2[.\s\-:]+UNREGISTERED\s*SALES/gi, name: 'Item 2 (Part II)', title: 'Unregistered Sales of Equity Securities' },
  { pattern: /ITEM\s*6[.\s\-:]+EXHIBITS/gi, name: 'Item 6', title: 'Exhibits' },
];

// Maximum chunk size in characters (~500 tokens)
const MAX_CHUNK_SIZE = 2000;
// Overlap between chunks to maintain context
const CHUNK_OVERLAP = 200;

interface SectionMatch {
  name: string;
  title: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Find all section boundaries in the document
 */
function findSections(text: string, filingType: '10-K' | '10-Q'): SectionMatch[] {
  const patterns = filingType === '10-K' ? SECTION_PATTERNS_10K : SECTION_PATTERNS_10Q;
  const matches: SectionMatch[] = [];

  for (const { pattern, name, title } of patterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        name,
        title,
        startIndex: match.index,
        endIndex: -1, // Will be calculated after sorting
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // Remove duplicates (same section found multiple times)
  const uniqueMatches: SectionMatch[] = [];
  const seenSections = new Set<string>();

  for (const match of matches) {
    if (!seenSections.has(match.name)) {
      seenSections.add(match.name);
      uniqueMatches.push(match);
    }
  }

  // Calculate end positions (each section ends where the next begins)
  for (let i = 0; i < uniqueMatches.length; i++) {
    if (i < uniqueMatches.length - 1) {
      uniqueMatches[i].endIndex = uniqueMatches[i + 1].startIndex;
    } else {
      uniqueMatches[i].endIndex = text.length;
    }
  }

  return uniqueMatches;
}

/**
 * Split a long text into smaller chunks with overlap
 */
function splitIntoChunks(
  text: string,
  sectionName: string,
  sectionTitle: string,
  baseIndex: number,
  globalStartPosition: number
): FilingChunk[] {
  const chunks: FilingChunk[] = [];

  if (text.length <= MAX_CHUNK_SIZE) {
    // Small enough to be a single chunk
    chunks.push({
      chunkIndex: baseIndex,
      sectionName,
      sectionTitle,
      content: text.trim(),
      startPosition: globalStartPosition,
      endPosition: globalStartPosition + text.length,
    });
    return chunks;
  }

  // Split into paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  let chunkStart = globalStartPosition;
  let currentPosition = globalStartPosition;
  let chunkIndex = baseIndex;

  for (const paragraph of paragraphs) {
    const paragraphWithNewlines = paragraph + '\n\n';

    if (currentChunk.length + paragraphWithNewlines.length > MAX_CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          sectionName,
          sectionTitle,
          content: currentChunk.trim(),
          startPosition: chunkStart,
          endPosition: currentPosition,
        });

        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP);
        currentChunk = currentChunk.substring(overlapStart);
        chunkStart = currentPosition - (currentChunk.length);
      }
    }

    currentChunk += paragraphWithNewlines;
    currentPosition += paragraphWithNewlines.length;
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex,
      sectionName,
      sectionTitle,
      content: currentChunk.trim(),
      startPosition: chunkStart,
      endPosition: currentPosition,
    });
  }

  return chunks;
}

/**
 * Chunk an SEC filing into sections and sub-chunks for RAG
 */
export function chunkSecFiling(
  text: string,
  filingType: '10-K' | '10-Q'
): ChunkedFiling {
  console.log(`[Chunker] Processing ${filingType} filing, length: ${text.length} chars`);

  // Find section boundaries
  const sections = findSections(text, filingType);
  console.log(`[Chunker] Found ${sections.length} sections`);

  const allChunks: FilingChunk[] = [];
  let chunkIndex = 0;

  // If no sections found, chunk the entire document
  if (sections.length === 0) {
    console.log('[Chunker] No sections found, chunking entire document');
    const chunks = splitIntoChunks(text, 'Full Document', 'Full Document', 0, 0);
    return {
      chunks,
      totalLength: text.length,
      sectionCount: 1,
    };
  }

  // Add intro section (before first section)
  if (sections[0].startIndex > 100) {
    const introText = text.substring(0, sections[0].startIndex);
    const introChunks = splitIntoChunks(introText, 'Introduction', 'Introduction/Cover', chunkIndex, 0);
    allChunks.push(...introChunks);
    chunkIndex += introChunks.length;
  }

  // Process each section
  for (const section of sections) {
    const sectionText = text.substring(section.startIndex, section.endIndex);
    const sectionChunks = splitIntoChunks(
      sectionText,
      section.name,
      section.title,
      chunkIndex,
      section.startIndex
    );
    allChunks.push(...sectionChunks);
    chunkIndex += sectionChunks.length;
  }

  console.log(`[Chunker] Created ${allChunks.length} chunks from ${sections.length} sections`);

  return {
    chunks: allChunks,
    totalLength: text.length,
    sectionCount: sections.length,
  };
}

/**
 * Get a summary of sections found in a chunked filing
 */
export function getChunkSummary(chunkedFiling: ChunkedFiling): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const chunk of chunkedFiling.chunks) {
    summary[chunk.sectionName] = (summary[chunk.sectionName] || 0) + 1;
  }

  return summary;
}

/**
 * Find chunks by section name
 */
export function getChunksBySection(
  chunkedFiling: ChunkedFiling,
  sectionName: string
): FilingChunk[] {
  return chunkedFiling.chunks.filter(
    chunk => chunk.sectionName.toLowerCase().includes(sectionName.toLowerCase())
  );
}

/**
 * Get key sections for financial analysis
 */
export function getKeyFinancialSections(chunkedFiling: ChunkedFiling): FilingChunk[] {
  const keySections = ['Item 7', 'Item 8', 'Item 1A', 'Risk Factors', 'MD&A'];
  return chunkedFiling.chunks.filter(chunk =>
    keySections.some(key =>
      chunk.sectionName.toLowerCase().includes(key.toLowerCase()) ||
      chunk.sectionTitle.toLowerCase().includes(key.toLowerCase())
    )
  );
}
