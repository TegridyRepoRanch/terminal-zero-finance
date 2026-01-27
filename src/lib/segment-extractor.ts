// Segment/Geographic Data Extractor
// Extracts business segment and geographic revenue breakdowns from SEC filings

import type {
  BusinessSegment,
  GeographicBreakdown,
  SegmentAnalysis,
  SegmentExtractionResponse,
} from './extraction-types';
import { SEGMENT_EXTRACTION_PROMPT } from './prompts';
import { getGeminiApiKey, hasGeminiKey } from './api-config';

/**
 * Extract segment data from filing text using Gemini
 */
export async function extractSegmentsWithGemini(
  filingText: string,
  onProgress?: (message: string) => void
): Promise<SegmentAnalysis | null> {
  if (!hasGeminiKey()) {
    console.warn('[Segment Extractor] No Gemini API key available');
    return null;
  }

  onProgress?.('Analyzing business segments...');

  try {
    const apiKey = getGeminiApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Truncate text if too long (segment data is usually in specific sections)
    const maxLength = 100000;
    const truncatedText = filingText.length > maxLength
      ? filingText.substring(0, maxLength) + '\n[Text truncated...]'
      : filingText;

    const prompt = SEGMENT_EXTRACTION_PROMPT + truncatedText;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let parsed: SegmentExtractionResponse;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[Segment Extractor] Failed to parse JSON response:', text.substring(0, 500));
      return null;
    }

    onProgress?.(`Found ${parsed.segments?.length || 0} business segments`);

    // Convert to SegmentAnalysis format
    return processSegmentResponse(parsed);
  } catch (error) {
    console.error('[Segment Extractor] Extraction failed:', error);
    return null;
  }
}

/**
 * Process the raw segment extraction response into analysis format
 */
function processSegmentResponse(response: SegmentExtractionResponse): SegmentAnalysis {
  const segments = response.segments || [];
  const totalRevenue = response.totalRevenue || segments.reduce((sum, s) => sum + s.revenue, 0);

  // Calculate revenue percentages if not provided
  const processedSegments: BusinessSegment[] = segments.map(seg => ({
    ...seg,
    revenuePercent: seg.revenuePercent || (totalRevenue > 0 ? (seg.revenue / totalRevenue) * 100 : 0),
  }));

  // Sort by revenue (largest first)
  processedSegments.sort((a, b) => b.revenue - a.revenue);

  // Convert geographic data
  const geographicBreakdown: GeographicBreakdown[] = [];
  if (response.revenueByGeography) {
    const geoTotal = Object.values(response.revenueByGeography).reduce((a, b) => a + b, 0);
    for (const [region, revenue] of Object.entries(response.revenueByGeography)) {
      geographicBreakdown.push({
        region,
        revenue,
        revenuePercent: geoTotal > 0 ? (revenue / geoTotal) * 100 : 0,
      });
    }
    // Sort by revenue
    geographicBreakdown.sort((a, b) => b.revenue - a.revenue);
  }

  // Calculate concentration metrics
  const topSegmentPercent = processedSegments.length > 0 ? processedSegments[0].revenuePercent : 0;

  // Herfindahl-Hirschman Index (sum of squared market shares)
  const herfindahlIndex = processedSegments.reduce((sum, seg) => {
    const share = seg.revenuePercent / 100; // Convert to decimal
    return sum + (share * share);
  }, 0);

  const isConcentrated = topSegmentPercent > 50;

  // Check if we have operating income data
  const hasOperatingData = processedSegments.some(s => s.operatingIncome !== null);

  return {
    segments: processedSegments,
    totalRevenue,
    geographicBreakdown,
    segmentCount: processedSegments.length,
    hasOperatingData,
    concentration: {
      topSegmentPercent,
      herfindahlIndex,
      isConcentrated,
    },
    notes: response.notes || [],
  };
}

/**
 * Extract segments from XBRL data if available
 * Many companies report segment data via XBRL tags
 */
export function extractSegmentsFromXBRL(rawHtml: string): BusinessSegment[] | null {
  // Look for segment-related XBRL tags
  const segmentPatterns = [
    // US-GAAP segment concepts
    /<ix:[^>]*name="us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"[^>]*contextRef="([^"]*Segment[^"]*)"[^>]*>([^<]+)</gi,
    /<ix:[^>]*name="us-gaap:SegmentReportingDisclosureTextBlock"[^>]*>[\s\S]*?<\/ix:[^>]*>/gi,
    // Revenue by segment dimension
    /srt:ConsolidatedEntitiesAxis/gi,
    /us-gaap:StatementBusinessSegmentsAxis/gi,
  ];

  // For now, just detect if segment data exists
  // Full XBRL segment parsing would require more complex dimensional analysis
  const hasSegmentData = segmentPatterns.some(pattern => pattern.test(rawHtml));

  if (!hasSegmentData) {
    return null;
  }

  // Return null to indicate XBRL segment data exists but needs AI parsing
  // Future enhancement: parse XBRL dimensions for segment data
  console.log('[Segment Extractor] XBRL segment data detected, using AI for extraction');
  return null;
}

/**
 * Generate segment analysis summary
 */
export function generateSegmentSummary(analysis: SegmentAnalysis): string {
  const lines: string[] = [];

  // Overview
  lines.push(`Business consists of ${analysis.segmentCount} reportable segment${analysis.segmentCount !== 1 ? 's' : ''}.`);

  // Concentration analysis
  if (analysis.concentration.isConcentrated) {
    const topSeg = analysis.segments[0];
    lines.push(`Highly concentrated: "${topSeg.name}" accounts for ${topSeg.revenuePercent.toFixed(1)}% of revenue.`);
  } else if (analysis.segmentCount > 1) {
    lines.push(`Revenue is diversified across segments (HHI: ${(analysis.concentration.herfindahlIndex * 100).toFixed(0)}%).`);
  }

  // Geographic diversity
  if (analysis.geographicBreakdown.length > 1) {
    const domestic = analysis.geographicBreakdown.find(g =>
      g.region.toLowerCase().includes('domestic') ||
      g.region.toLowerCase().includes('americas') ||
      g.region.toLowerCase().includes('us') ||
      g.region.toLowerCase().includes('united states')
    );
    if (domestic) {
      lines.push(`Geographic mix: ${domestic.revenuePercent.toFixed(1)}% domestic, ${(100 - domestic.revenuePercent).toFixed(1)}% international.`);
    }
  }

  // Growth highlights
  const fastGrowing = analysis.segments.filter(s => s.growthRate && s.growthRate > 10);
  const declining = analysis.segments.filter(s => s.growthRate && s.growthRate < -5);

  if (fastGrowing.length > 0) {
    lines.push(`Fast-growing: ${fastGrowing.map(s => `${s.name} (+${s.growthRate?.toFixed(0)}%)`).join(', ')}.`);
  }
  if (declining.length > 0) {
    lines.push(`Declining: ${declining.map(s => `${s.name} (${s.growthRate?.toFixed(0)}%)`).join(', ')}.`);
  }

  return lines.join(' ');
}
