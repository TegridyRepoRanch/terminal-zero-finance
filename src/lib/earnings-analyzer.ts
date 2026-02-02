// AI-Powered Earnings Call Analyzer
// Extracts insights, sentiment, red flags, and themes from earnings transcripts
// This is a key differentiator for institutional-grade analysis

import Anthropic from '@anthropic-ai/sdk';
import { getAllEarningsTranscripts, type FMPEarningsTranscript } from './fmp-api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TopicAnalysis {
  topic: string;
  sentiment: number;        // -1 to +1
  mentions: number;
  importance: 'high' | 'medium' | 'low';
  keyQuotes: string[];
  context: string;
}

export interface ManagementTone {
  overall: number;          // -1 (very negative) to +1 (very positive)
  confidence: number;       // 0 to 1 - how confident management sounds
  defensiveness: number;    // 0 to 1 - are they being evasive?
  forwardLooking: number;   // -1 to +1 - optimism about future
  transparency: number;     // 0 to 1 - how forthcoming are they?
  comparedToPrior: 'more_positive' | 'similar' | 'more_negative' | 'unknown';
}

export interface RedFlag {
  category: 'accounting' | 'operational' | 'competitive' | 'regulatory' | 'management' | 'financial';
  flag: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  quote: string;
  context: string;
  suggestedFollowUp: string;
}

export interface GuidanceChange {
  metric: string;
  direction: 'raised' | 'lowered' | 'maintained' | 'withdrawn' | 'introduced';
  newValue?: string;
  previousValue?: string;
  managementComment?: string;
  analystReaction?: string;
}

export interface CompetitorMention {
  competitor: string;
  context: string;
  sentiment: number;        // -1 to +1
  competitivePosition: 'gaining' | 'losing' | 'stable' | 'unclear';
}

export interface KeyMetricDiscussion {
  metric: string;
  value?: string;
  yoyChange?: string;
  managementCommentary: string;
  analystConcerns?: string;
}

export interface AnalystQuestion {
  analyst: string;
  firm?: string;
  question: string;
  topic: string;
  managementResponse: string;
  wasEvasive: boolean;
  sentiment: number;
}

export interface EarningsAnalysis {
  // Metadata
  ticker: string;
  quarter: number;
  year: number;
  callDate: string;
  analyzedAt: Date;

  // Executive Summary
  summary: string;                    // 2-3 paragraph summary
  bullishPoints: string[];            // Key positive takeaways
  bearishPoints: string[];            // Key concerns
  keyTakeaway: string;                // One-sentence bottom line

  // Detailed Analysis
  topics: TopicAnalysis[];
  managementTone: ManagementTone;
  redFlags: RedFlag[];
  guidanceChanges: GuidanceChange[];
  competitorMentions: CompetitorMention[];
  keyMetrics: KeyMetricDiscussion[];
  notableQuotes: Array<{
    speaker: string;
    quote: string;
    significance: string;
  }>;

  // Q&A Analysis
  analystQuestions: AnalystQuestion[];
  mostPressedTopics: string[];        // What analysts asked about most
  unansweredQuestions: string[];      // Questions management dodged

  // Cross-Quarter Comparison
  toneShiftFromPrior: string;         // Description of how tone changed
  newThemesIntroduced: string[];      // Topics not discussed before
  droppedThemes: string[];            // Topics no longer mentioned

  // Actionable Insights
  tradingImplications: string;        // What this means for the stock
  watchItems: string[];               // Things to monitor going forward
  relatedCompanies: string[];         // Other companies affected by themes

  // Raw data
  transcriptLength: number;
  processingTimeMs: number;
}

// ============================================================================
// ANALYSIS PROMPTS
// ============================================================================

const EARNINGS_ANALYSIS_PROMPT = `You are a senior equity research analyst at a top hedge fund. Analyze this earnings call transcript with extreme attention to detail, looking for signals that most analysts miss.

Your analysis should be institutional-grade - the kind of insights that would justify a $20k/month subscription.

TRANSCRIPT:
{transcript}

Provide your analysis in the following JSON format. Be thorough but precise:

{
  "summary": "2-3 paragraph executive summary covering the key points, management tone, and investment implications",

  "bullishPoints": ["point 1", "point 2", ...],  // 3-5 key positive takeaways
  "bearishPoints": ["point 1", "point 2", ...],  // 3-5 key concerns
  "keyTakeaway": "One sentence bottom line for investors",

  "topics": [
    {
      "topic": "Topic name (e.g., 'Supply Chain', 'Pricing Power', 'AI Investment')",
      "sentiment": 0.7,  // -1 to +1
      "mentions": 5,     // how many times discussed
      "importance": "high",  // high/medium/low
      "keyQuotes": ["direct quote 1", "direct quote 2"],
      "context": "Brief explanation of why this matters"
    }
  ],

  "managementTone": {
    "overall": 0.3,       // -1 to +1
    "confidence": 0.8,    // 0 to 1
    "defensiveness": 0.2, // 0 to 1
    "forwardLooking": 0.5, // -1 to +1
    "transparency": 0.7,  // 0 to 1
    "comparedToPrior": "similar"  // more_positive/similar/more_negative/unknown
  },

  "redFlags": [
    {
      "category": "accounting",  // accounting/operational/competitive/regulatory/management/financial
      "flag": "Description of the red flag",
      "severity": "medium",  // low/medium/high/critical
      "quote": "Relevant quote from transcript",
      "context": "Why this is concerning",
      "suggestedFollowUp": "What to investigate further"
    }
  ],

  "guidanceChanges": [
    {
      "metric": "Revenue",
      "direction": "raised",  // raised/lowered/maintained/withdrawn/introduced
      "newValue": "$10-10.5B",
      "previousValue": "$9.5-10B",
      "managementComment": "What they said about it"
    }
  ],

  "competitorMentions": [
    {
      "competitor": "Company Name",
      "context": "What was said",
      "sentiment": -0.3,
      "competitivePosition": "stable"  // gaining/losing/stable/unclear
    }
  ],

  "keyMetrics": [
    {
      "metric": "Gross Margin",
      "value": "42.5%",
      "yoyChange": "+150bps",
      "managementCommentary": "What they attributed it to",
      "analystConcerns": "Any pushback from analysts"
    }
  ],

  "notableQuotes": [
    {
      "speaker": "CEO Name",
      "quote": "Exact quote",
      "significance": "Why this matters"
    }
  ],

  "analystQuestions": [
    {
      "analyst": "Analyst Name",
      "firm": "Firm Name",
      "question": "The question asked",
      "topic": "Category (e.g., margins, guidance, competition)",
      "managementResponse": "Summary of response",
      "wasEvasive": false,
      "sentiment": 0.2
    }
  ],

  "mostPressedTopics": ["Topic analysts asked about repeatedly"],
  "unansweredQuestions": ["Questions management dodged or gave non-answers to"],

  "toneShiftFromPrior": "Description of how management's tone changed from last quarter",
  "newThemesIntroduced": ["New topics discussed this quarter"],
  "droppedThemes": ["Topics from prior calls no longer mentioned"],

  "tradingImplications": "What this means for the stock in the near term",
  "watchItems": ["Things to monitor going forward"],
  "relatedCompanies": ["Other tickers that might be affected by themes discussed"]
}

Focus on:
1. Reading between the lines - what is management NOT saying?
2. Changes in language/tone from typical corporate speak
3. Analyst questions that made management uncomfortable
4. Forward-looking statements vs. backward-looking excuses
5. Competitive dynamics and market share signals
6. Capital allocation priorities
7. Any accounting or disclosure changes

Be specific with quotes and provide actionable insights.`;

// Theme extraction prompt for cross-company analysis (used by ThemeDetector)
export const THEME_EXTRACTION_PROMPT_TEMPLATE = `You are analyzing multiple earnings call excerpts to identify cross-company themes and patterns.

Here are excerpts from recent earnings calls mentioning similar topics:

{excerpts}

Identify the common themes, patterns, and implications. Format as JSON:

{
  "theme": "Name of the theme (e.g., 'Labor Cost Inflation', 'AI Capex Acceleration')",
  "description": "2-3 sentence description of the theme",
  "companies": ["List of companies discussing this"],
  "sentiment": 0.5,  // -1 to +1, overall sentiment across companies
  "confidence": 0.8,  // 0 to 1, how confident are we this is a real trend
  "evidence": [
    {
      "company": "Ticker",
      "quote": "Supporting quote",
      "context": "Brief context"
    }
  ],
  "implications": {
    "sector": "What this means for the sector",
    "tradingIdeas": ["Potential trade ideas based on this theme"],
    "risksToWatch": ["What could invalidate this theme"]
  },
  "relatedThemes": ["Other themes this connects to"],
  "timeHorizon": "near-term/medium-term/long-term"
}`;

// ============================================================================
// ANALYZER CLASS
// ============================================================================

export class EarningsAnalyzer {
  private anthropic: Anthropic | null = null;
  private analysisCache: Map<string, EarningsAnalysis> = new Map();

  constructor() {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  /**
   * Analyze a single earnings call transcript
   */
  async analyzeTranscript(
    transcript: FMPEarningsTranscript,
    options: {
      useCache?: boolean;
      model?: string;
    } = {}
  ): Promise<EarningsAnalysis> {
    const { useCache = true, model = 'claude-sonnet-4-20250514' } = options;
    const cacheKey = `${transcript.symbol}-${transcript.year}-Q${transcript.quarter}`;

    // Check cache
    if (useCache && this.analysisCache.has(cacheKey)) {
      console.log(`[EarningsAnalyzer] Using cached analysis for ${cacheKey}`);
      return this.analysisCache.get(cacheKey)!;
    }

    if (!this.anthropic) {
      throw new Error('Anthropic API not configured. Set VITE_ANTHROPIC_API_KEY');
    }

    console.log(`[EarningsAnalyzer] Analyzing ${transcript.symbol} Q${transcript.quarter} ${transcript.year}`);
    const startTime = Date.now();

    // Truncate very long transcripts to avoid token limits
    const maxLength = 100000;
    const truncatedContent = transcript.content.length > maxLength
      ? transcript.content.slice(0, maxLength) + '\n\n[TRANSCRIPT TRUNCATED DUE TO LENGTH]'
      : transcript.content;

    const prompt = EARNINGS_ANALYSIS_PROMPT.replace('{transcript}', truncatedContent);

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    // Parse JSON response
    let analysisData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                        content.text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text;
      analysisData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[EarningsAnalyzer] Failed to parse response:', content.text);
      throw new Error('Failed to parse AI analysis response');
    }

    const processingTimeMs = Date.now() - startTime;

    const analysis: EarningsAnalysis = {
      ticker: transcript.symbol,
      quarter: transcript.quarter,
      year: transcript.year,
      callDate: transcript.date,
      analyzedAt: new Date(),
      transcriptLength: transcript.content.length,
      processingTimeMs,
      ...analysisData,
    };

    // Cache the result
    if (useCache) {
      this.analysisCache.set(cacheKey, analysis);
    }

    console.log(`[EarningsAnalyzer] Analysis complete in ${processingTimeMs}ms`);
    return analysis;
  }

  /**
   * Analyze multiple transcripts and find common themes
   */
  async analyzeMultipleTranscripts(
    transcripts: FMPEarningsTranscript[],
    options: {
      parallelism?: number;
      onProgress?: (completed: number, total: number, ticker: string) => void;
    } = {}
  ): Promise<{
    analyses: EarningsAnalysis[];
    commonThemes: string[];
    crossCompanyInsights: string[];
  }> {
    const { parallelism = 3, onProgress } = options;
    const analyses: EarningsAnalysis[] = [];

    // Process in batches
    for (let i = 0; i < transcripts.length; i += parallelism) {
      const batch = transcripts.slice(i, i + parallelism);
      const results = await Promise.all(
        batch.map(async (t) => {
          try {
            const analysis = await this.analyzeTranscript(t);
            onProgress?.(analyses.length + 1, transcripts.length, t.symbol);
            return analysis;
          } catch (e) {
            console.error(`[EarningsAnalyzer] Failed to analyze ${t.symbol}:`, e);
            return null;
          }
        })
      );
      analyses.push(...results.filter((r): r is EarningsAnalysis => r !== null));
    }

    // Extract common themes
    const allTopics = analyses.flatMap(a => a.topics.map(t => t.topic.toLowerCase()));
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonThemes = Object.entries(topicCounts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);

    // Generate cross-company insights
    const crossCompanyInsights = this.generateCrossCompanyInsights(analyses);

    return { analyses, commonThemes, crossCompanyInsights };
  }

  /**
   * Generate insights by comparing multiple company analyses
   */
  private generateCrossCompanyInsights(analyses: EarningsAnalysis[]): string[] {
    const insights: string[] = [];

    // Find companies with similar concerns
    const redFlagCategories = new Map<string, string[]>();
    for (const analysis of analyses) {
      for (const flag of analysis.redFlags) {
        if (flag.severity === 'high' || flag.severity === 'critical') {
          const companies = redFlagCategories.get(flag.category) || [];
          companies.push(analysis.ticker);
          redFlagCategories.set(flag.category, companies);
        }
      }
    }

    for (const [category, companies] of redFlagCategories) {
      if (companies.length >= 2) {
        insights.push(
          `Multiple companies (${companies.join(', ')}) showing ${category} red flags - potential sector-wide issue`
        );
      }
    }

    // Find diverging guidance
    const guidanceUp = analyses.filter(a =>
      a.guidanceChanges.some(g => g.direction === 'raised')
    ).map(a => a.ticker);
    const guidanceDown = analyses.filter(a =>
      a.guidanceChanges.some(g => g.direction === 'lowered')
    ).map(a => a.ticker);

    if (guidanceUp.length > 0 && guidanceDown.length > 0) {
      insights.push(
        `Guidance divergence: ${guidanceUp.join(', ')} raised vs ${guidanceDown.join(', ')} lowered - potential relative value opportunity`
      );
    }

    // Find tone shifts
    const morePositive = analyses.filter(a =>
      a.managementTone.comparedToPrior === 'more_positive'
    ).map(a => a.ticker);
    const moreNegative = analyses.filter(a =>
      a.managementTone.comparedToPrior === 'more_negative'
    ).map(a => a.ticker);

    if (morePositive.length >= 2) {
      insights.push(
        `Positive tone shift across ${morePositive.join(', ')} - sentiment improving in sector`
      );
    }

    if (moreNegative.length >= 2) {
      insights.push(
        `Negative tone shift across ${moreNegative.join(', ')} - sentiment deteriorating in sector`
      );
    }

    return insights;
  }

  /**
   * Fetch and analyze earnings for a company
   */
  async fetchAndAnalyze(
    ticker: string,
    quarters: number = 4
  ): Promise<{
    analyses: EarningsAnalysis[];
    quarterOverQuarterChanges: string[];
  }> {
    console.log(`[EarningsAnalyzer] Fetching ${quarters} quarters of earnings for ${ticker}`);

    const transcripts = await getAllEarningsTranscripts(ticker, quarters);

    if (transcripts.length === 0) {
      throw new Error(`No earnings transcripts found for ${ticker}`);
    }

    const analyses: EarningsAnalysis[] = [];
    for (const transcript of transcripts) {
      try {
        const analysis = await this.analyzeTranscript(transcript);
        analyses.push(analysis);
      } catch (e) {
        console.error(`[EarningsAnalyzer] Failed to analyze ${ticker} Q${transcript.quarter}:`, e);
      }
    }

    // Generate quarter-over-quarter insights
    const quarterOverQuarterChanges = this.generateQoQInsights(analyses);

    return { analyses, quarterOverQuarterChanges };
  }

  /**
   * Compare consecutive quarters to identify changes
   */
  private generateQoQInsights(analyses: EarningsAnalysis[]): string[] {
    const insights: string[] = [];

    // Sort by date (newest first)
    const sorted = [...analyses].sort((a, b) => {
      const dateA = a.year * 10 + a.quarter;
      const dateB = b.year * 10 + b.quarter;
      return dateB - dateA;
    });

    if (sorted.length < 2) return insights;

    const current = sorted[0];
    const prior = sorted[1];

    // Tone change
    const toneChange = current.managementTone.overall - prior.managementTone.overall;
    if (Math.abs(toneChange) > 0.3) {
      insights.push(
        `Management tone ${toneChange > 0 ? 'improved' : 'deteriorated'} significantly from Q${prior.quarter} to Q${current.quarter}`
      );
    }

    // New red flags
    const newFlags = current.redFlags.filter(f =>
      !prior.redFlags.some(pf => pf.flag.toLowerCase().includes(f.flag.toLowerCase().slice(0, 20)))
    );
    if (newFlags.length > 0) {
      insights.push(
        `New concerns this quarter: ${newFlags.map(f => f.flag).join('; ')}`
      );
    }

    // Topic changes
    const currentTopics = new Set(current.topics.map(t => t.topic.toLowerCase()));
    const priorTopics = new Set(prior.topics.map(t => t.topic.toLowerCase()));

    const newTopics = [...currentTopics].filter(t => !priorTopics.has(t));
    const droppedTopics = [...priorTopics].filter(t => !currentTopics.has(t));

    if (newTopics.length > 0) {
      insights.push(`New topics this quarter: ${newTopics.join(', ')}`);
    }
    if (droppedTopics.length > 0) {
      insights.push(`Topics no longer discussed: ${droppedTopics.join(', ')}`);
    }

    return insights;
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}

// Singleton instance
export const earningsAnalyzer = new EarningsAnalyzer();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick analysis for a single company
 */
export async function analyzeEarnings(ticker: string, quarters: number = 2): Promise<{
  analyses: EarningsAnalysis[];
  summary: string;
  redFlags: RedFlag[];
  tradingImplications: string[];
}> {
  const { analyses, quarterOverQuarterChanges } = await earningsAnalyzer.fetchAndAnalyze(ticker, quarters);

  // Aggregate results
  const allRedFlags = analyses.flatMap(a => a.redFlags).filter(f => f.severity !== 'low');
  const tradingImplications = [
    ...analyses.map(a => a.tradingImplications),
    ...quarterOverQuarterChanges,
  ];

  const summary = analyses.length > 0
    ? `${ticker}: ${analyses[0].keyTakeaway} Management tone: ${analyses[0].managementTone.overall > 0 ? 'positive' : 'cautious'}.`
    : `No analysis available for ${ticker}`;

  return {
    analyses,
    summary,
    redFlags: allRedFlags,
    tradingImplications,
  };
}

/**
 * Compare earnings across multiple companies
 */
export async function compareCompanyEarnings(
  tickers: string[],
  onProgress?: (ticker: string, status: string) => void
): Promise<{
  analyses: Map<string, EarningsAnalysis[]>;
  commonThemes: string[];
  divergences: string[];
  tradingIdeas: string[];
}> {
  const analyses = new Map<string, EarningsAnalysis[]>();
  const allLatestAnalyses: EarningsAnalysis[] = [];

  for (const ticker of tickers) {
    try {
      onProgress?.(ticker, 'Fetching transcripts...');
      const { analyses: tickerAnalyses } = await earningsAnalyzer.fetchAndAnalyze(ticker, 2);
      analyses.set(ticker, tickerAnalyses);
      if (tickerAnalyses.length > 0) {
        allLatestAnalyses.push(tickerAnalyses[0]);
      }
      onProgress?.(ticker, 'Complete');
    } catch (e) {
      console.error(`Failed to analyze ${ticker}:`, e);
      onProgress?.(ticker, 'Failed');
    }
  }

  // Find common themes and divergences
  const { commonThemes, crossCompanyInsights } = await earningsAnalyzer.analyzeMultipleTranscripts(
    [], // We already have analyses
    {}
  );

  // Generate trading ideas
  const tradingIdeas: string[] = [];

  // Look for relative value opportunities
  const bullishCompanies = allLatestAnalyses.filter(a => a.managementTone.overall > 0.3);
  const bearishCompanies = allLatestAnalyses.filter(a => a.managementTone.overall < -0.3);

  if (bullishCompanies.length > 0 && bearishCompanies.length > 0) {
    tradingIdeas.push(
      `Pair trade: Long ${bullishCompanies.map(a => a.ticker).join('/')} vs Short ${bearishCompanies.map(a => a.ticker).join('/')}`
    );
  }

  return {
    analyses,
    commonThemes,
    divergences: crossCompanyInsights,
    tradingIdeas,
  };
}

export default earningsAnalyzer;
