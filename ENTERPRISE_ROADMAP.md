# Terminal Zero Finance - Enterprise Roadmap

## Vision
**World-class AI-powered financial analysis that connects dots faster than any human analyst.**

Target: $20k/mo institutional subscriptions (Hedge Funds, PE/VC, Investment Banks)

## Core Differentiator
> "Finding themes no one else sees at this speed"

This means:
1. **Cross-company pattern recognition** - Spot supply chain disruptions, sector rotations, management behavior changes across 1000s of companies simultaneously
2. **Real-time synthesis** - Connect earnings calls, filings, news, alternative data into actionable insights
3. **Institutional-grade depth** - Not just summaries, but the kind of analysis a senior analyst would produce

---

## Phase 1: Data Foundation (Week 1)
*"You can't find patterns without data"*

### Data Sources to Add

| Source | Cost | Value | Priority |
|--------|------|-------|----------|
| **Financial Modeling Prep** | $29-299/mo | Best historical financials, DCF data, 30+ years | ⭐⭐⭐ |
| **Polygon.io** | $29-199/mo | Real-time prices, options data, news | ⭐⭐⭐ |
| **SEC EDGAR RSS** | Free | Real-time filing alerts | ⭐⭐⭐ |
| **Earnings Call Transcripts** | Free via SEC/FMP | Management commentary, tone analysis | ⭐⭐⭐ |
| **Finnhub** | Free-$50/mo | Already integrated | ✅ |
| **Alpha Vantage** | Free-$50/mo | Already integrated | ✅ |
| **Quandl/Nasdaq** | $100+/mo | Alternative data, commodities | ⭐⭐ |
| **Unusual Whales** | $100/mo | Options flow, dark pool data | ⭐⭐ |
| **SimilarWeb** | Enterprise | Web traffic data | ⭐ |

### Database Enhancements

```sql
-- Earnings transcripts
earnings_transcripts (
  company_id, quarter, year, transcript_text,
  ai_summary, key_topics[], sentiment_score,
  management_tone_score, forward_guidance_sentiment
)

-- Cross-company themes
market_themes (
  id, theme_name, description,
  detected_at, confidence_score,
  related_companies[], evidence_snippets[],
  potential_impact, suggested_trades[]
)

-- Real-time alerts
alerts (
  id, alert_type, company_id, severity,
  headline, details, detected_at,
  related_theme_id, user_id
)

-- Watchlists with smart monitoring
watchlists (
  id, user_id, name, companies[],
  alert_preferences, last_insight_at
)
```

---

## Phase 2: AI Insights Engine (Week 2)
*"The brain that connects the dots"*

### 2.1 Earnings Call Analyzer

**Input:** Earnings call transcript
**Output:**
- Key topics discussed (with frequency analysis)
- Management sentiment score (-1 to +1)
- Forward guidance sentiment
- Comparison to prior quarter tone
- Red flags detected
- Competitor mentions
- Key quotes with context

```typescript
interface EarningsAnalysis {
  summary: string;
  keyTopics: Array<{
    topic: string;
    sentiment: number;
    mentions: number;
    quotes: string[];
  }>;
  managementTone: {
    overall: number;          // -1 to +1
    confidence: number;       // vs previous quarter
    defensiveness: number;    // 0 to 1
    forwardLooking: number;   // optimism about future
  };
  redFlags: Array<{
    flag: string;
    severity: 'low' | 'medium' | 'high';
    quote: string;
    context: string;
  }>;
  guidanceChanges: Array<{
    metric: string;
    direction: 'raised' | 'lowered' | 'maintained' | 'withdrawn';
    newValue?: string;
    previousValue?: string;
  }>;
  competitorMentions: Array<{
    competitor: string;
    context: string;
    sentiment: number;
  }>;
}
```

### 2.2 Cross-Company Theme Detection

**The killer feature.** Analyze 100s of earnings calls and filings to find:

1. **Supply chain themes**
   - "We're seeing extended lead times from Asian suppliers"
   - Detected in: AAPL, NVDA, AMD, QCOM, TSM
   - Implication: Semiconductor shortage worsening

2. **Demand signals**
   - "Consumer spending has softened in the back half"
   - Detected in: WMT, TGT, COST, HD, LOW
   - Implication: Retail sector weakness

3. **Input cost pressures**
   - "Labor costs continue to be a headwind"
   - Detected in: MCD, SBUX, CMG, DRI
   - Implication: Restaurant margin compression

4. **Regulatory concerns**
   - "Increased scrutiny from regulators"
   - Detected in: META, GOOGL, AMZN
   - Implication: Big tech regulatory risk

### 2.3 Red Flag Detection System

Automatically scan filings for:

| Category | Signals |
|----------|---------|
| **Accounting** | Revenue recognition changes, unusual accruals, related party transactions |
| **Governance** | Executive departures, auditor changes, board resignations |
| **Operations** | Customer concentration, supplier dependency, backlog changes |
| **Financial** | Debt covenant concerns, liquidity warnings, going concern language |
| **Legal** | New litigation, SEC investigations, whistleblower mentions |

---

## Phase 3: Professional Analysis Output (Week 3)
*"Institutional-grade deliverables"*

### 3.1 DCF Model Generator

Auto-generate full DCF models:
- Revenue build-up by segment
- Margin assumptions with historical context
- Working capital modeling
- CapEx and D&A forecasting
- WACC calculation
- Terminal value (perpetuity + exit multiple)
- Sensitivity tables
- Football field valuation chart

Output: Interactive web view + Excel download

### 3.2 Comparable Company Analysis

- Auto-select relevant comps based on:
  - Industry classification
  - Revenue size
  - Growth profile
  - Geographic exposure
- Calculate trading multiples:
  - EV/Revenue, EV/EBITDA, EV/EBIT
  - P/E, P/B, P/FCF
  - PEG ratio
- Show percentile rankings
- Highlight outliers with explanations

### 3.3 Investment Memo Generator

One-click generation of:
- Executive summary
- Business overview
- Industry analysis
- Financial analysis
- Valuation summary
- Key risks
- Investment thesis

Format: PDF + DOCX

---

## Phase 4: Real-Time Intelligence (Week 4)
*"Never miss a signal"*

### 4.1 SEC Filing Alerts

Monitor for:
- 10-K/10-Q filings
- 8-K material events
- Form 4 insider transactions
- 13-F institutional holdings
- 13-D/G activist positions
- S-1/424B prospectuses

Instant analysis:
- What changed from last filing?
- Red flag scan
- Key metrics extraction
- AI summary

### 4.2 News & Sentiment Stream

Aggregate and analyze:
- Financial news (Reuters, Bloomberg, WSJ)
- Company press releases
- Social sentiment (Twitter/X, Reddit, StockTwits)
- Analyst reports (when available)

### 4.3 Smart Watchlist Alerts

For each watchlist company:
- Daily briefing email
- Real-time material alerts
- Theme emergence notifications
- Peer comparison updates

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  Dashboard │ Company View │ Theme Explorer │ Alerts │ Models    │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Express/Node)                    │
│     Auth │ Rate Limiting │ Caching │ Job Queue │ WebSockets     │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────┬───────────────┬───────────────┬─────────────────┐
│  Data Layer   │  AI Layer     │  Analysis     │  Export         │
│               │               │  Engine       │  Engine         │
│ • Finnhub     │ • Claude API  │ • DCF Calc    │ • Excel Gen     │
│ • Alpha Vant. │ • Embeddings  │ • Comps       │ • PDF Gen       │
│ • FMP         │ • RAG Search  │ • Theme Det.  │ • Charts        │
│ • SEC EDGAR   │ • Summaries   │ • Red Flags   │ • Reports       │
│ • Polygon     │               │               │                 │
└───────────────┴───────────────┴───────────────┴─────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Database (Supabase/Postgres)                 │
│  Companies │ Metrics │ Transcripts │ Themes │ Alerts │ Users    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pricing Strategy

### Tier 1: Professional ($2k/mo)
- 50 companies deep analysis
- Daily insights email
- Basic alerts
- Excel exports

### Tier 2: Institutional ($10k/mo)
- Unlimited companies
- Real-time alerts
- Theme detection
- API access
- Priority support

### Tier 3: Enterprise ($20k+/mo)
- Everything in Institutional
- Custom integrations
- White-label options
- Dedicated success manager
- Custom model development
- On-premise deployment option

---

## Competitive Moat

| Competitor | Their Strength | Your Edge |
|------------|---------------|-----------|
| Bloomberg Terminal | Breadth of data | AI synthesis, speed |
| FactSet | Historical depth | Real-time themes |
| Sentieo | Document search | Cross-doc pattern detection |
| AlphaSense | NLP search | Actionable insights, not just search |
| Koyfin | Beautiful charts | AI-generated analysis |

**Your unique value:** *"I give you the insights a team of 10 analysts would find, in minutes instead of weeks."*

---

## MVP Checklist (4 weeks)

### Week 1 ✓
- [x] Multi-source data integration (Finnhub, Alpha Vantage)
- [x] Incremental data system
- [x] Database schema for financial metrics
- [ ] Add Financial Modeling Prep
- [ ] Add SEC filing monitor

### Week 2
- [ ] Earnings transcript ingestion
- [ ] AI earnings analyzer
- [ ] Basic theme detection
- [ ] Red flag scanner

### Week 3
- [ ] DCF model generator
- [ ] Comparable company analysis
- [ ] Investment memo generator
- [ ] Excel/PDF export

### Week 4
- [ ] Real-time alert system
- [ ] Watchlist management
- [ ] Email notifications
- [ ] Landing page + auth

---

## Next Steps

1. **Today:** Add Financial Modeling Prep API + SEC filing monitor
2. **This week:** Build earnings call analyzer
3. **Next week:** Theme detection + DCF generator
4. **Week 3-4:** Polish, alerts, and launch prep
