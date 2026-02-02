// Cross-Company Theme Detection System
// The "connect the dots faster than anyone" feature
// Analyzes patterns across companies to identify emerging themes, risks, and opportunities

import Anthropic from '@anthropic-ai/sdk';
import type { EarningsAnalysis, RedFlag, TopicAnalysis } from './earnings-analyzer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MarketTheme {
  id: string;
  name: string;
  description: string;
  category: 'macro' | 'sector' | 'supply_chain' | 'regulatory' | 'technology' | 'consumer' | 'competitive';

  // Evidence
  companies: string[];                     // Tickers discussing this theme
  evidenceSnippets: Array<{
    ticker: string;
    quote: string;
    source: 'earnings' | 'filing' | 'news';
    date: string;
    sentiment: number;
  }>;

  // Analysis
  sentiment: number;                       // -1 to +1 aggregate sentiment
  confidence: number;                      // 0 to 1 how confident we are
  momentum: 'emerging' | 'accelerating' | 'peaking' | 'fading';
  timeHorizon: 'near-term' | 'medium-term' | 'long-term';

  // Impact
  affectedSectors: string[];
  affectedCompanies: string[];             // Companies likely affected even if not mentioned
  potentialMagnitude: 'minor' | 'moderate' | 'significant' | 'major';

  // Actionable
  tradingImplications: string[];
  longsToConsider: string[];
  shortsToConsider: string[];
  watchlist: string[];
  risksToThesis: string[];

  // Metadata
  detectedAt: Date;
  lastUpdated: Date;
  relatedThemes: string[];
}

export interface ThemeCluster {
  primaryTheme: MarketTheme;
  relatedThemes: MarketTheme[];
  interconnections: string[];              // How themes relate
  amplificationRisk: string;               // Could themes compound each other?
}

export interface SectorSignal {
  sector: string;
  overallSentiment: number;
  dominantThemes: string[];
  companiesAnalyzed: number;
  bullishCompanies: string[];
  bearishCompanies: string[];
  keyRisks: string[];
  keyOpportunities: string[];
}

export interface ThemeDetectionResult {
  themes: MarketTheme[];
  clusters: ThemeCluster[];
  sectorSignals: SectorSignal[];
  topInsights: string[];
  emergingRisks: string[];
  emergingOpportunities: string[];
  suggestedTrades: Array<{
    type: 'long' | 'short' | 'pair';
    tickers: string[];
    thesis: string;
    relatedTheme: string;
    confidence: number;
  }>;
  analyzedCompanies: number;
  dataPoints: number;
  processingTimeMs: number;
}

// ============================================================================
// THEME PATTERNS
// ============================================================================

// Known theme patterns to look for
const THEME_PATTERNS = {
  // Supply Chain
  supply_chain_disruption: {
    keywords: ['supply chain', 'lead times', 'inventory', 'backlog', 'shortage', 'logistics', 'shipping'],
    category: 'supply_chain' as const,
  },
  input_cost_inflation: {
    keywords: ['input costs', 'raw materials', 'commodity', 'freight costs', 'labor costs', 'wage inflation'],
    category: 'supply_chain' as const,
  },

  // Macro
  demand_weakness: {
    keywords: ['demand softening', 'consumer pullback', 'volume decline', 'traffic down', 'discretionary spending'],
    category: 'macro' as const,
  },
  pricing_power: {
    keywords: ['pricing', 'price increases', 'elasticity', 'pass through', 'price realization'],
    category: 'macro' as const,
  },
  credit_tightening: {
    keywords: ['credit', 'lending', 'financing', 'interest expense', 'debt', 'refinancing'],
    category: 'macro' as const,
  },

  // Technology
  ai_investment: {
    keywords: ['AI', 'artificial intelligence', 'machine learning', 'generative AI', 'LLM', 'automation'],
    category: 'technology' as const,
  },
  cloud_migration: {
    keywords: ['cloud', 'digital transformation', 'SaaS', 'infrastructure', 'data center'],
    category: 'technology' as const,
  },

  // Regulatory
  regulatory_pressure: {
    keywords: ['regulation', 'compliance', 'regulatory', 'government', 'legislation', 'antitrust'],
    category: 'regulatory' as const,
  },
  esg_focus: {
    keywords: ['ESG', 'sustainability', 'carbon', 'emissions', 'climate', 'renewable'],
    category: 'regulatory' as const,
  },

  // Competitive
  market_share_shift: {
    keywords: ['market share', 'competitive', 'competitor', 'share gains', 'share loss', 'pricing pressure'],
    category: 'competitive' as const,
  },
  consolidation: {
    keywords: ['M&A', 'acquisition', 'merger', 'consolidation', 'strategic alternatives'],
    category: 'competitive' as const,
  },

  // Consumer
  consumer_behavior_shift: {
    keywords: ['consumer behavior', 'channel shift', 'e-commerce', 'digital', 'omnichannel'],
    category: 'consumer' as const,
  },
  brand_health: {
    keywords: ['brand', 'customer satisfaction', 'NPS', 'loyalty', 'retention', 'churn'],
    category: 'consumer' as const,
  },
};

// ============================================================================
// THEME DETECTOR CLASS
// ============================================================================

export class ThemeDetector {
  private anthropic: Anthropic | null = null;
  private detectedThemes: Map<string, MarketTheme> = new Map();

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
   * Detect themes from multiple earnings analyses
   */
  async detectThemes(
    analyses: EarningsAnalysis[],
    options: {
      minCompanies?: number;      // Minimum companies for a theme to be significant
      minConfidence?: number;     // Minimum confidence score
      focusSectors?: string[];    // Only look at these sectors
    } = {}
  ): Promise<ThemeDetectionResult> {
    const { minCompanies = 2, minConfidence = 0.5 } = options;
    const startTime = Date.now();

    console.log(`[ThemeDetector] Analyzing ${analyses.length} earnings calls for themes`);

    // Step 1: Extract and aggregate topics
    const topicAggregation = this.aggregateTopics(analyses);

    // Step 2: Match against known patterns
    const patternMatches = this.matchPatterns(analyses);

    // Step 3: Use AI to identify novel themes
    const aiThemes = await this.identifyNovelThemes(analyses);

    // Step 4: Combine and deduplicate themes
    const allThemes = this.combineThemes(topicAggregation, patternMatches, aiThemes, minCompanies);

    // Step 5: Cluster related themes
    const clusters = this.clusterThemes(allThemes);

    // Step 6: Generate sector signals
    const sectorSignals = this.generateSectorSignals(analyses, allThemes);

    // Step 7: Generate trading ideas
    const suggestedTrades = this.generateTradingIdeas(allThemes, analyses);

    // Step 8: Extract top insights
    const topInsights = this.extractTopInsights(allThemes, clusters, sectorSignals);

    const processingTimeMs = Date.now() - startTime;

    return {
      themes: allThemes.filter(t => t.confidence >= minConfidence),
      clusters,
      sectorSignals,
      topInsights,
      emergingRisks: allThemes
        .filter(t => t.sentiment < -0.3 && t.momentum === 'emerging')
        .map(t => t.name),
      emergingOpportunities: allThemes
        .filter(t => t.sentiment > 0.3 && t.momentum === 'emerging')
        .map(t => t.name),
      suggestedTrades,
      analyzedCompanies: analyses.length,
      dataPoints: analyses.reduce((sum, a) => sum + a.topics.length + a.redFlags.length, 0),
      processingTimeMs,
    };
  }

  /**
   * Aggregate topics from all analyses
   */
  private aggregateTopics(analyses: EarningsAnalysis[]): Map<string, {
    topic: string;
    companies: string[];
    totalMentions: number;
    avgSentiment: number;
    quotes: Array<{ ticker: string; quote: string }>;
  }> {
    const aggregation = new Map<string, {
      topic: string;
      companies: string[];
      totalMentions: number;
      sentimentSum: number;
      quotes: Array<{ ticker: string; quote: string }>;
    }>();

    for (const analysis of analyses) {
      for (const topic of analysis.topics) {
        const key = topic.topic.toLowerCase();
        const existing = aggregation.get(key) || {
          topic: topic.topic,
          companies: [],
          totalMentions: 0,
          sentimentSum: 0,
          quotes: [],
        };

        if (!existing.companies.includes(analysis.ticker)) {
          existing.companies.push(analysis.ticker);
        }
        existing.totalMentions += topic.mentions;
        existing.sentimentSum += topic.sentiment;
        existing.quotes.push(...topic.keyQuotes.map(q => ({
          ticker: analysis.ticker,
          quote: q,
        })));

        aggregation.set(key, existing);
      }
    }

    // Convert to final format
    const result = new Map<string, {
      topic: string;
      companies: string[];
      totalMentions: number;
      avgSentiment: number;
      quotes: Array<{ ticker: string; quote: string }>;
    }>();

    for (const [key, value] of aggregation) {
      result.set(key, {
        ...value,
        avgSentiment: value.sentimentSum / value.companies.length,
      });
    }

    return result;
  }

  /**
   * Match content against known theme patterns
   */
  private matchPatterns(analyses: EarningsAnalysis[]): MarketTheme[] {
    const themes: MarketTheme[] = [];

    for (const [patternName, pattern] of Object.entries(THEME_PATTERNS)) {
      const matchingCompanies: string[] = [];
      const evidence: MarketTheme['evidenceSnippets'] = [];
      let sentimentSum = 0;

      for (const analysis of analyses) {
        // Check topics
        for (const topic of analysis.topics) {
          const topicLower = topic.topic.toLowerCase();
          const hasMatch = pattern.keywords.some(kw =>
            topicLower.includes(kw.toLowerCase())
          );

          if (hasMatch) {
            if (!matchingCompanies.includes(analysis.ticker)) {
              matchingCompanies.push(analysis.ticker);
              sentimentSum += topic.sentiment;
            }

            for (const quote of topic.keyQuotes.slice(0, 2)) {
              evidence.push({
                ticker: analysis.ticker,
                quote,
                source: 'earnings',
                date: analysis.callDate,
                sentiment: topic.sentiment,
              });
            }
          }
        }

        // Check red flags
        for (const flag of analysis.redFlags) {
          const flagLower = flag.flag.toLowerCase() + ' ' + flag.context.toLowerCase();
          const hasMatch = pattern.keywords.some(kw =>
            flagLower.includes(kw.toLowerCase())
          );

          if (hasMatch && !matchingCompanies.includes(analysis.ticker)) {
            matchingCompanies.push(analysis.ticker);
            sentimentSum -= 0.5; // Red flags are negative
            evidence.push({
              ticker: analysis.ticker,
              quote: flag.quote,
              source: 'earnings',
              date: analysis.callDate,
              sentiment: -0.5,
            });
          }
        }
      }

      if (matchingCompanies.length >= 2) {
        themes.push({
          id: `pattern-${patternName}`,
          name: patternName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          description: `Detected ${patternName.replace(/_/g, ' ')} across ${matchingCompanies.length} companies`,
          category: pattern.category,
          companies: matchingCompanies,
          evidenceSnippets: evidence.slice(0, 10),
          sentiment: sentimentSum / matchingCompanies.length,
          confidence: Math.min(0.9, 0.5 + matchingCompanies.length * 0.1),
          momentum: 'emerging',
          timeHorizon: 'medium-term',
          affectedSectors: [],
          affectedCompanies: matchingCompanies,
          potentialMagnitude: matchingCompanies.length >= 5 ? 'significant' : 'moderate',
          tradingImplications: [],
          longsToConsider: [],
          shortsToConsider: [],
          watchlist: matchingCompanies,
          risksToThesis: [],
          detectedAt: new Date(),
          lastUpdated: new Date(),
          relatedThemes: [],
        });
      }
    }

    return themes;
  }

  /**
   * Use AI to identify novel themes not captured by patterns
   */
  private async identifyNovelThemes(analyses: EarningsAnalysis[]): Promise<MarketTheme[]> {
    if (!this.anthropic || analyses.length < 3) {
      return [];
    }

    // Prepare summary of all analyses for AI
    const summaries = analyses.map(a => ({
      ticker: a.ticker,
      keyTopics: a.topics.slice(0, 5).map(t => t.topic),
      sentiment: a.managementTone.overall,
      redFlags: a.redFlags.slice(0, 3).map(f => f.flag),
      keyTakeaway: a.keyTakeaway,
    }));

    const prompt = `You are analyzing earnings call summaries from ${analyses.length} companies to identify emerging cross-company themes and patterns.

COMPANY SUMMARIES:
${JSON.stringify(summaries, null, 2)}

Identify 3-5 significant themes that appear across multiple companies. These should be themes that:
1. Appear in 2+ companies
2. Have meaningful investment implications
3. Are specific enough to be actionable (not generic like "growth" or "competition")

Format as JSON array:
[
  {
    "name": "Theme Name",
    "description": "2-3 sentence description",
    "category": "macro|sector|supply_chain|regulatory|technology|consumer|competitive",
    "companies": ["TICKER1", "TICKER2"],
    "sentiment": 0.5,  // -1 to +1
    "confidence": 0.8,  // 0 to 1
    "momentum": "emerging|accelerating|peaking|fading",
    "tradingImplications": ["implication 1", "implication 2"],
    "risksToThesis": ["risk 1"]
  }
]

Focus on non-obvious connections that would provide alpha.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as Array<Partial<MarketTheme>>;

      return parsed.map((t, i) => ({
        id: `ai-theme-${i}`,
        name: t.name || 'Unknown Theme',
        description: t.description || '',
        category: t.category || 'sector',
        companies: t.companies || [],
        evidenceSnippets: [],
        sentiment: t.sentiment || 0,
        confidence: t.confidence || 0.6,
        momentum: t.momentum || 'emerging',
        timeHorizon: 'medium-term',
        affectedSectors: [],
        affectedCompanies: t.companies || [],
        potentialMagnitude: 'moderate',
        tradingImplications: t.tradingImplications || [],
        longsToConsider: [],
        shortsToConsider: [],
        watchlist: t.companies || [],
        risksToThesis: t.risksToThesis || [],
        detectedAt: new Date(),
        lastUpdated: new Date(),
        relatedThemes: [],
      })) as MarketTheme[];
    } catch (e) {
      console.error('[ThemeDetector] AI theme detection failed:', e);
      return [];
    }
  }

  /**
   * Combine and deduplicate themes from all sources
   */
  private combineThemes(
    topicAggregation: Map<string, { topic: string; companies: string[]; avgSentiment: number; quotes: Array<{ ticker: string; quote: string }> }>,
    patternThemes: MarketTheme[],
    aiThemes: MarketTheme[],
    minCompanies: number
  ): MarketTheme[] {
    const themeMap = new Map<string, MarketTheme>();

    // Add pattern themes
    for (const theme of patternThemes) {
      themeMap.set(theme.name.toLowerCase(), theme);
    }

    // Add AI themes (merge if similar)
    for (const theme of aiThemes) {
      const key = theme.name.toLowerCase();
      if (themeMap.has(key)) {
        // Merge with existing
        const existing = themeMap.get(key)!;
        existing.confidence = Math.max(existing.confidence, theme.confidence);
        existing.companies = [...new Set([...existing.companies, ...theme.companies])];
        existing.tradingImplications = [...existing.tradingImplications, ...theme.tradingImplications];
      } else {
        themeMap.set(key, theme);
      }
    }

    // Add significant aggregated topics
    for (const [key, data] of topicAggregation) {
      if (data.companies.length >= minCompanies && !themeMap.has(key)) {
        themeMap.set(key, {
          id: `topic-${key}`,
          name: data.topic,
          description: `${data.topic} discussed across ${data.companies.length} companies`,
          category: 'sector',
          companies: data.companies,
          evidenceSnippets: data.quotes.slice(0, 5).map(q => ({
            ticker: q.ticker,
            quote: q.quote,
            source: 'earnings' as const,
            date: new Date().toISOString(),
            sentiment: data.avgSentiment,
          })),
          sentiment: data.avgSentiment,
          confidence: Math.min(0.8, 0.4 + data.companies.length * 0.1),
          momentum: 'emerging',
          timeHorizon: 'medium-term',
          affectedSectors: [],
          affectedCompanies: data.companies,
          potentialMagnitude: 'moderate',
          tradingImplications: [],
          longsToConsider: [],
          shortsToConsider: [],
          watchlist: data.companies,
          risksToThesis: [],
          detectedAt: new Date(),
          lastUpdated: new Date(),
          relatedThemes: [],
        });
      }
    }

    return Array.from(themeMap.values())
      .filter(t => t.companies.length >= minCompanies)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Cluster related themes together
   */
  private clusterThemes(themes: MarketTheme[]): ThemeCluster[] {
    const clusters: ThemeCluster[] = [];

    // Simple clustering by category and company overlap
    const processed = new Set<string>();

    for (const theme of themes) {
      if (processed.has(theme.id)) continue;

      const relatedThemes = themes.filter(t => {
        if (t.id === theme.id || processed.has(t.id)) return false;

        // Same category
        if (t.category === theme.category) return true;

        // Significant company overlap
        const overlap = t.companies.filter(c => theme.companies.includes(c));
        if (overlap.length >= 2) return true;

        return false;
      });

      if (relatedThemes.length > 0) {
        clusters.push({
          primaryTheme: theme,
          relatedThemes: relatedThemes.slice(0, 3),
          interconnections: this.describeInterconnections(theme, relatedThemes),
          amplificationRisk: this.assessAmplificationRisk(theme, relatedThemes),
        });

        processed.add(theme.id);
        relatedThemes.forEach(t => processed.add(t.id));
      }
    }

    return clusters;
  }

  private describeInterconnections(primary: MarketTheme, related: MarketTheme[]): string[] {
    const interconnections: string[] = [];

    for (const theme of related) {
      const sharedCompanies = theme.companies.filter(c => primary.companies.includes(c));
      if (sharedCompanies.length > 0) {
        interconnections.push(
          `${primary.name} and ${theme.name} both affecting ${sharedCompanies.join(', ')}`
        );
      }
    }

    return interconnections;
  }

  private assessAmplificationRisk(primary: MarketTheme, related: MarketTheme[]): string {
    const avgSentiment = [primary, ...related].reduce((sum, t) => sum + t.sentiment, 0) / (related.length + 1);

    if (avgSentiment < -0.3) {
      return 'HIGH - Multiple negative themes could compound into sector-wide decline';
    } else if (avgSentiment > 0.3) {
      return 'POSITIVE - Reinforcing tailwinds could drive outperformance';
    }
    return 'MODERATE - Mixed signals suggest selective opportunities';
  }

  /**
   * Generate sector-level signals
   */
  private generateSectorSignals(analyses: EarningsAnalysis[], themes: MarketTheme[]): SectorSignal[] {
    // Group by sector (we'd need sector data for each company)
    // For now, use a simplified approach based on themes
    const signals: SectorSignal[] = [];

    const categorySentiments = new Map<string, { sum: number; count: number; companies: string[] }>();

    for (const theme of themes) {
      const data = categorySentiments.get(theme.category) || { sum: 0, count: 0, companies: [] };
      data.sum += theme.sentiment * theme.companies.length;
      data.count += theme.companies.length;
      data.companies = [...new Set([...data.companies, ...theme.companies])];
      categorySentiments.set(theme.category, data);
    }

    for (const [category, data] of categorySentiments) {
      const avgSentiment = data.sum / data.count;
      const relevantThemes = themes.filter(t => t.category === category);

      signals.push({
        sector: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        overallSentiment: avgSentiment,
        dominantThemes: relevantThemes.slice(0, 3).map(t => t.name),
        companiesAnalyzed: data.companies.length,
        bullishCompanies: data.companies.filter((_, i) => i < 3), // Simplified
        bearishCompanies: [],
        keyRisks: relevantThemes.filter(t => t.sentiment < 0).map(t => t.name),
        keyOpportunities: relevantThemes.filter(t => t.sentiment > 0).map(t => t.name),
      });
    }

    return signals.sort((a, b) => Math.abs(b.overallSentiment) - Math.abs(a.overallSentiment));
  }

  /**
   * Generate actionable trading ideas
   */
  private generateTradingIdeas(
    themes: MarketTheme[],
    analyses: EarningsAnalysis[]
  ): ThemeDetectionResult['suggestedTrades'] {
    const trades: ThemeDetectionResult['suggestedTrades'] = [];

    // Long ideas from positive themes
    const positiveThemes = themes.filter(t => t.sentiment > 0.3 && t.confidence > 0.6);
    for (const theme of positiveThemes.slice(0, 3)) {
      trades.push({
        type: 'long',
        tickers: theme.companies.slice(0, 3),
        thesis: `${theme.name} tailwind: ${theme.description}`,
        relatedTheme: theme.name,
        confidence: theme.confidence,
      });
    }

    // Short ideas from negative themes
    const negativeThemes = themes.filter(t => t.sentiment < -0.3 && t.confidence > 0.6);
    for (const theme of negativeThemes.slice(0, 3)) {
      trades.push({
        type: 'short',
        tickers: theme.companies.slice(0, 3),
        thesis: `${theme.name} headwind: ${theme.description}`,
        relatedTheme: theme.name,
        confidence: theme.confidence,
      });
    }

    // Pair trades from divergent themes in same category
    const categories = [...new Set(themes.map(t => t.category))];
    for (const category of categories) {
      const categoryThemes = themes.filter(t => t.category === category);
      const positive = categoryThemes.find(t => t.sentiment > 0.3);
      const negative = categoryThemes.find(t => t.sentiment < -0.3);

      if (positive && negative) {
        trades.push({
          type: 'pair',
          tickers: [...positive.companies.slice(0, 2), ...negative.companies.slice(0, 2)],
          thesis: `Long ${positive.companies.slice(0, 2).join('/')} benefiting from ${positive.name}, short ${negative.companies.slice(0, 2).join('/')} hurt by ${negative.name}`,
          relatedTheme: `${positive.name} vs ${negative.name}`,
          confidence: Math.min(positive.confidence, negative.confidence),
        });
      }
    }

    return trades.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract top insights for summary
   */
  private extractTopInsights(
    themes: MarketTheme[],
    clusters: ThemeCluster[],
    sectorSignals: SectorSignal[]
  ): string[] {
    const insights: string[] = [];

    // Top themes
    const topThemes = themes.slice(0, 3);
    for (const theme of topThemes) {
      insights.push(
        `📊 ${theme.name}: ${theme.companies.length} companies affected, sentiment ${theme.sentiment > 0 ? '↑' : '↓'} (${(theme.sentiment * 100).toFixed(0)}%)`
      );
    }

    // Cluster insights
    for (const cluster of clusters.slice(0, 2)) {
      insights.push(
        `🔗 Connected themes: ${cluster.primaryTheme.name} + ${cluster.relatedThemes.map(t => t.name).join(', ')}`
      );
    }

    // Sector insights
    const strongSectors = sectorSignals.filter(s => Math.abs(s.overallSentiment) > 0.3);
    for (const sector of strongSectors.slice(0, 2)) {
      insights.push(
        `${sector.overallSentiment > 0 ? '🟢' : '🔴'} ${sector.sector}: ${sector.overallSentiment > 0 ? 'Bullish' : 'Bearish'} signals from ${sector.companiesAnalyzed} companies`
      );
    }

    return insights;
  }
}

// Singleton instance
export const themeDetector = new ThemeDetector();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick theme detection from earnings analyses
 */
export async function detectMarketThemes(
  analyses: EarningsAnalysis[]
): Promise<ThemeDetectionResult> {
  return themeDetector.detectThemes(analyses);
}

/**
 * Get themes for a specific sector
 */
export async function getSectorThemes(
  analyses: EarningsAnalysis[],
  sector: string
): Promise<MarketTheme[]> {
  const result = await themeDetector.detectThemes(analyses, {
    focusSectors: [sector],
  });
  return result.themes;
}

export default themeDetector;
