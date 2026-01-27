// XBRL Parser - Extract structured financial data from inline XBRL (iXBRL) SEC filings
// iXBRL embeds XBRL data directly in HTML using ix:* namespace tags

export interface XBRLDataPoint {
  concept: string;           // e.g., "us-gaap:Revenues"
  value: number;
  scale: number;             // Multiplier (e.g., 6 = millions)
  sign: 'positive' | 'negative';
  decimals: number;
  contextRef: string;        // Reference to context element
  unitRef: string;           // Currency unit
  sourceText: string;        // Original text content
}

export interface XBRLContext {
  id: string;
  startDate: string | null;  // For duration contexts (income statement)
  endDate: string | null;
  instant: string | null;    // For instant contexts (balance sheet)
  entity: string;            // CIK or identifier
  segment: string | null;    // Dimensional info (null = consolidated)
}

export interface XBRLParseResult {
  hasXBRL: boolean;
  dataPoints: XBRLDataPoint[];
  contexts: Map<string, XBRLContext>;
  companyName: string | null;
  ticker: string | null;
  parseErrors: string[];
}

/**
 * Detect if HTML contains inline XBRL (iXBRL) data
 */
export function detectIXBRL(html: string): boolean {
  // Check for iXBRL namespace declaration
  const hasNamespace = /xmlns:ix\s*=\s*["']http:\/\/www\.xbrl\.org\/2013\/inlineXBRL["']/i.test(html);

  // Check for actual ix: tags (more reliable)
  const hasIxTags = /<ix:(nonFraction|nonNumeric|continuation|footnote)/i.test(html);

  // Check for xbrli context elements
  const hasContexts = /<xbrli:context/i.test(html);

  return hasNamespace || hasIxTags || hasContexts;
}

/**
 * Parse all XBRL context elements from the document
 * Contexts define the time periods and entities for data points
 */
export function parseXBRLContexts(html: string): Map<string, XBRLContext> {
  const contexts = new Map<string, XBRLContext>();

  // Match context elements - they can span multiple lines
  // Pattern: <xbrli:context id="...">...</xbrli:context>
  const contextRegex = /<xbrli:context[^>]*id\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/xbrli:context>/gi;

  let match;
  while ((match = contextRegex.exec(html)) !== null) {
    const id = match[1];
    const content = match[2];

    // Parse entity identifier (CIK)
    const entityMatch = content.match(/<xbrli:identifier[^>]*>([^<]+)<\/xbrli:identifier>/i);
    const entity = entityMatch ? entityMatch[1].trim() : '';

    // Parse period - either instant or start/end dates
    const instantMatch = content.match(/<xbrli:instant>([^<]+)<\/xbrli:instant>/i);
    const startMatch = content.match(/<xbrli:startDate>([^<]+)<\/xbrli:startDate>/i);
    const endMatch = content.match(/<xbrli:endDate>([^<]+)<\/xbrli:endDate>/i);

    // Check for segment/dimensional data (indicates non-consolidated data)
    const hasSegment = /<xbrli:segment/i.test(content) || /<xbrldi:/i.test(content);

    contexts.set(id, {
      id,
      startDate: startMatch ? startMatch[1].trim() : null,
      endDate: endMatch ? endMatch[1].trim() : null,
      instant: instantMatch ? instantMatch[1].trim() : null,
      entity,
      segment: hasSegment ? 'dimensional' : null,
    });
  }

  return contexts;
}

/**
 * Parse numeric value from ix:nonFraction text content
 * Handles commas, parentheses (negative), and various formats
 */
function parseNumericValue(text: string): number {
  // Remove whitespace and commas
  let cleaned = text.trim().replace(/,/g, '').replace(/\s+/g, '');

  // Handle parentheses for negative numbers: (1,234) -> -1234
  const isParenthetical = /^\(.*\)$/.test(cleaned);
  if (isParenthetical) {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  // Handle explicit negative sign
  const isNegative = isParenthetical || cleaned.startsWith('-');
  cleaned = cleaned.replace(/^-/, '');

  // Parse the number
  const value = parseFloat(cleaned);

  if (isNaN(value)) {
    return 0;
  }

  return isNegative ? -value : value;
}

/**
 * Apply scale factor to value
 * scale="6" means multiply by 10^6 (millions)
 */
function applyScale(value: number, scale: number): number {
  return value * Math.pow(10, scale);
}

/**
 * Parse all ix:nonFraction elements (numeric facts)
 */
export function parseXBRLDataPoints(html: string): XBRLDataPoint[] {
  const dataPoints: XBRLDataPoint[] = [];

  // Match ix:nonFraction elements
  // Attributes: name, contextRef, unitRef, decimals, scale, sign
  const nonFractionRegex = /<ix:nonFraction([^>]*)>([^<]*)<\/ix:nonFraction>/gi;

  let match;
  while ((match = nonFractionRegex.exec(html)) !== null) {
    const attributes = match[1];
    const textContent = match[2];

    // Parse attributes
    const nameMatch = attributes.match(/name\s*=\s*["']([^"']+)["']/i);
    const contextRefMatch = attributes.match(/contextRef\s*=\s*["']([^"']+)["']/i);
    const unitRefMatch = attributes.match(/unitRef\s*=\s*["']([^"']+)["']/i);
    const decimalsMatch = attributes.match(/decimals\s*=\s*["']([^"']+)["']/i);
    const scaleMatch = attributes.match(/scale\s*=\s*["']([^"']+)["']/i);
    const signMatch = attributes.match(/sign\s*=\s*["']([^"']+)["']/i);

    if (!nameMatch || !contextRefMatch) {
      continue; // Skip invalid elements
    }

    const concept = nameMatch[1];
    const contextRef = contextRefMatch[1];
    const unitRef = unitRefMatch ? unitRefMatch[1] : 'USD';
    const decimals = decimalsMatch ? parseInt(decimalsMatch[1], 10) : 0;
    const scale = scaleMatch ? parseInt(scaleMatch[1], 10) : 0;
    const signAttr = signMatch ? signMatch[1].toLowerCase() : '';

    // Parse the numeric value
    let value = parseNumericValue(textContent);

    // Apply scale
    value = applyScale(value, scale);

    // Apply sign attribute (overrides any sign in text)
    const sign: 'positive' | 'negative' = signAttr === '-' ? 'negative' : 'positive';
    if (sign === 'negative' && value > 0) {
      value = -value;
    }

    dataPoints.push({
      concept,
      value,
      scale,
      sign,
      decimals,
      contextRef,
      unitRef,
      sourceText: textContent.trim(),
    });
  }

  return dataPoints;
}

/**
 * Extract company name from iXBRL document
 */
export function extractCompanyName(html: string): string | null {
  // Try ix:nonNumeric with dei:EntityRegistrantName
  const registrantMatch = html.match(
    /<ix:nonNumeric[^>]*name\s*=\s*["']dei:EntityRegistrantName["'][^>]*>([^<]+)<\/ix:nonNumeric>/i
  );
  if (registrantMatch) {
    return registrantMatch[1].trim();
  }

  // Fallback: try to find in title or header
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    // Extract company name from title (often "COMPANY NAME - 10-K")
    const title = titleMatch[1];
    const dashIndex = title.indexOf(' - ');
    if (dashIndex > 0) {
      return title.substring(0, dashIndex).trim();
    }
  }

  return null;
}

/**
 * Extract ticker symbol from iXBRL document
 */
export function extractTicker(html: string): string | null {
  // Try ix:nonNumeric with dei:TradingSymbol
  const tickerMatch = html.match(
    /<ix:nonNumeric[^>]*name\s*=\s*["']dei:TradingSymbol["'][^>]*>([^<]+)<\/ix:nonNumeric>/i
  );
  if (tickerMatch) {
    return tickerMatch[1].trim().toUpperCase();
  }

  return null;
}

/**
 * Main parsing function - extracts all XBRL data from HTML
 */
export function parseXBRL(html: string): XBRLParseResult {
  const hasXBRL = detectIXBRL(html);

  if (!hasXBRL) {
    return {
      hasXBRL: false,
      dataPoints: [],
      contexts: new Map(),
      companyName: null,
      ticker: null,
      parseErrors: [],
    };
  }

  const parseErrors: string[] = [];

  // Parse contexts
  let contexts: Map<string, XBRLContext>;
  try {
    contexts = parseXBRLContexts(html);
  } catch (error) {
    parseErrors.push(`Context parsing error: ${error instanceof Error ? error.message : 'Unknown'}`);
    contexts = new Map();
  }

  // Parse data points
  let dataPoints: XBRLDataPoint[];
  try {
    dataPoints = parseXBRLDataPoints(html);
  } catch (error) {
    parseErrors.push(`Data point parsing error: ${error instanceof Error ? error.message : 'Unknown'}`);
    dataPoints = [];
  }

  // Extract metadata
  const companyName = extractCompanyName(html);
  const ticker = extractTicker(html);

  console.log(`[XBRL] Parsed ${contexts.size} contexts, ${dataPoints.length} data points`);

  return {
    hasXBRL: true,
    dataPoints,
    contexts,
    companyName,
    ticker,
    parseErrors,
  };
}

/**
 * Get data points for a specific context
 */
export function getDataPointsForContext(
  dataPoints: XBRLDataPoint[],
  contextId: string
): XBRLDataPoint[] {
  return dataPoints.filter(dp => dp.contextRef === contextId);
}

/**
 * Find the most recent fiscal year duration context (for income statement)
 * Duration contexts have startDate and endDate (not instant)
 */
export function findCurrentPeriodContext(
  contexts: Map<string, XBRLContext>,
  filingType: '10-K' | '10-Q'
): XBRLContext | null {
  const durationContexts = Array.from(contexts.values())
    .filter(ctx => ctx.startDate && ctx.endDate && !ctx.segment);

  if (durationContexts.length === 0) {
    return null;
  }

  // Calculate duration in days for each context
  const withDuration = durationContexts.map(ctx => {
    const start = new Date(ctx.startDate!);
    const end = new Date(ctx.endDate!);
    const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { ctx, durationDays, endDate: end };
  });

  // For 10-K: look for ~365 day duration (full year)
  // For 10-Q: look for ~90 day duration (quarter)
  const targetDuration = filingType === '10-K' ? 365 : 90;
  const tolerance = filingType === '10-K' ? 30 : 15;

  // Filter to appropriate duration
  const matchingDuration = withDuration.filter(
    item => Math.abs(item.durationDays - targetDuration) <= tolerance
  );

  if (matchingDuration.length === 0) {
    // Fallback: just use the longest duration
    withDuration.sort((a, b) => b.durationDays - a.durationDays);
    return withDuration[0]?.ctx || null;
  }

  // Sort by end date (most recent first)
  matchingDuration.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  return matchingDuration[0].ctx;
}

/**
 * Find the most recent instant context (for balance sheet)
 * Instant contexts have instant date (not startDate/endDate)
 */
export function findBalanceSheetContext(
  contexts: Map<string, XBRLContext>
): XBRLContext | null {
  const instantContexts = Array.from(contexts.values())
    .filter(ctx => ctx.instant && !ctx.segment);

  if (instantContexts.length === 0) {
    return null;
  }

  // Sort by instant date (most recent first)
  instantContexts.sort((a, b) => {
    const dateA = new Date(a.instant!);
    const dateB = new Date(b.instant!);
    return dateB.getTime() - dateA.getTime();
  });

  return instantContexts[0];
}

/**
 * Find prior period context (for year-over-year comparisons)
 */
export function findPriorPeriodContext(
  contexts: Map<string, XBRLContext>,
  currentContext: XBRLContext
): XBRLContext | null {
  if (!currentContext.startDate || !currentContext.endDate) {
    return null;
  }

  const currentStart = new Date(currentContext.startDate);
  const currentEnd = new Date(currentContext.endDate);
  const currentDuration = currentEnd.getTime() - currentStart.getTime();

  // Look for context ending ~1 year before current
  const targetEndDate = new Date(currentEnd);
  targetEndDate.setFullYear(targetEndDate.getFullYear() - 1);

  const durationContexts = Array.from(contexts.values())
    .filter(ctx => ctx.startDate && ctx.endDate && !ctx.segment && ctx.id !== currentContext.id);

  // Find context with similar duration ending ~1 year ago
  for (const ctx of durationContexts) {
    const ctxEnd = new Date(ctx.endDate!);
    const ctxStart = new Date(ctx.startDate!);
    const ctxDuration = ctxEnd.getTime() - ctxStart.getTime();

    // Check duration is similar (within 10%)
    const durationDiff = Math.abs(ctxDuration - currentDuration) / currentDuration;
    if (durationDiff > 0.1) continue;

    // Check end date is ~1 year ago (within 30 days)
    const endDateDiff = Math.abs(ctxEnd.getTime() - targetEndDate.getTime());
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (endDateDiff <= thirtyDays) {
      return ctx;
    }
  }

  return null;
}
