# Incremental Data System

This document describes the new multi-source financial data system with incremental updates.

## Overview

The system fetches financial data from multiple sources with intelligent prioritization:

```
Priority Order:
1. SEC XBRL (100) - Structured regulatory data, most reliable
2. Alpha Vantage (80) - 20+ years of audited historical financials
3. Finnhub (70) - Real-time prices, ratios, fundamentals
4. SEC AI Extraction (50) - AI-extracted from filing text
5. Yahoo Finance (30) - Basic price data, less reliable
```

## Key Features

### 1. Incremental Updates
- Only fetches data that's missing or stale
- Tracks what data exists per company
- Records processing history for debugging

### 2. Multi-Source Merging
- Higher priority sources take precedence
- Confidence scores track data reliability
- Sources are recorded per-metric

### 3. Smart Extraction
- Chunks SEC filings by section
- Only sends relevant sections to AI (Item 7, Item 8, Item 1A)
- Reduces AI costs by ~70-80%

## Database Schema

### Core Tables

```sql
-- Master company record
companies (
  ticker, cik, name, sector, industry,
  data_completeness_score,
  last_10k_date, finnhub_last_sync, alpha_vantage_last_sync
)

-- Individual metrics with source tracking
financial_metrics (
  company_id, metric_name, metric_value,
  period_type, period_end_date, fiscal_year,
  source, confidence_score, source_filing_accession
)

-- Processing audit trail
processing_history (
  company_id, source_type, processing_status,
  metrics_extracted, metrics_updated, processing_time_ms
)
```

### Running Migrations

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run `supabase/schema.sql` first (if not already done)
4. Run `supabase/migrations/001_add_rag_support.sql`
5. Run `supabase/migrations/002_incremental_data_system.sql`

## API Services

### Finnhub API (`src/lib/finnhub-api.ts`)

Provides:
- Real-time stock quotes
- Company profile
- Key financial ratios (P/E, P/B, margins, etc.)
- Historical metrics series

```typescript
import { fetchAllFinnhubData } from './lib/finnhub-api';

const data = await fetchAllFinnhubData('AAPL');
// Returns: currentPrice, peRatio, grossMargin, roe, etc.
```

Rate Limits: 60 calls/minute (free tier)

### Alpha Vantage API (`src/lib/alpha-vantage-api.ts`)

Provides:
- 20+ years of income statements
- Balance sheets and cash flow statements
- Company overview
- Earnings history

```typescript
import { fetchAllAlphaVantageData } from './lib/alpha-vantage-api';

const data = await fetchAllAlphaVantageData('AAPL');
// Returns: annualPeriods[], quarterlyPeriods[] with full financials
```

Rate Limits: 25 calls/day, 5 calls/minute (free tier)

### Unified Data Service (`src/lib/unified-data-service.ts`)

Orchestrates all sources:

```typescript
import { fetchCompanyData, getCompanyDataStatus } from './lib/unified-data-service';

// Check what data we have
const status = await getCompanyDataStatus('AAPL');
console.log(`Data completeness: ${status.dataCompleteness}%`);
console.log(`Missing: ${status.missingMetrics.join(', ')}`);

// Fetch from all sources
const result = await fetchCompanyData('AAPL', {
  useAPIs: true,
  useXBRL: true,
  useAIExtraction: false, // Disable AI for now
}, (msg) => console.log(msg));
```

## React Integration

### useCompanyData Hook

```tsx
import { useCompanyData } from '../hooks/useCompanyData';

function CompanyAnalysis({ ticker }: { ticker: string }) {
  const {
    status,
    isLoading,
    isFetching,
    error,
    fetchData,
    services,
  } = useCompanyData(ticker, {
    autoFetch: true,
    skipIfComplete: true,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{status?.companyName}</h2>
      <p>Data completeness: {status?.dataCompleteness}%</p>

      {status?.missingMetrics.length > 0 && (
        <div>
          <p>Missing: {status.missingMetrics.join(', ')}</p>
          <button onClick={() => fetchData()} disabled={isFetching}>
            {isFetching ? 'Fetching...' : 'Fetch Missing Data'}
          </button>
        </div>
      )}

      <p>Services: {services.finnhub ? '✓ Finnhub' : '✗ Finnhub'}</p>
    </div>
  );
}
```

## Environment Variables

Add to `.env.local`:

```env
# Financial Data APIs
VITE_FINNHUB_API_KEY=your_finnhub_key
VITE_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Supabase (required for data persistence)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Smart Extraction Pipeline

For SEC filings, the system:

1. **Parses XBRL first** (free, accurate)
   - Extracts structured financial data
   - ~80-90% of numeric fields

2. **Chunks the filing** by section
   - Item 1: Business
   - Item 1A: Risk Factors
   - Item 7: MD&A
   - Item 8: Financial Statements

3. **Selective AI extraction**
   - Only sends Item 7 and Item 8 to AI
   - Reduces token usage by ~70-80%

4. **Stores with source tracking**
   - Each metric records its source
   - Confidence scores (95 for XBRL, 75 for AI)

```typescript
import { smartExtractFromFiling } from './lib/unified-data-service';

const { relevantChunks, estimatedTokens } = await smartExtractFromFiling(
  rawHtml,
  '10-K',
  ['freeCashFlow', 'operatingCashFlow'], // only missing fields
  { maxAIChunks: 10 }
);

console.log(`Will process ${relevantChunks.length} chunks (~${estimatedTokens} tokens)`);
```

## Metrics Tracked

### Income Statement
- revenue, costOfRevenue, grossProfit
- operatingExpenses, sgaExpense, rdExpense
- depreciationAmortization, operatingIncome
- interestExpense, incomeBeforeTax, incomeTaxExpense
- netIncome, ebit, ebitda

### Balance Sheet
- totalAssets, totalCurrentAssets
- cashAndEquivalents, accountsReceivable, inventory
- propertyPlantEquipment, goodwill, intangibleAssets
- totalLiabilities, totalCurrentLiabilities
- accountsPayable, shortTermDebt, longTermDebt, totalDebt
- totalEquity, retainedEarnings, sharesOutstanding

### Cash Flow
- operatingCashFlow, capitalExpenditures
- freeCashFlow, dividendsPaid

### Ratios & Market Data
- peRatio, pbRatio, psRatio
- epsAnnual, epsTTM
- grossMargin, operatingMargin, netProfitMargin
- roe, roa, currentRatio, quickRatio, debtToEquity
- currentPrice, marketCap, beta, dividendYield
- week52High, week52Low

## Required Metrics for DCF

The system tracks completeness against these required fields:

```typescript
const REQUIRED_DCF_METRICS = [
  'revenue',
  'grossProfit',
  'operatingIncome',
  'netIncome',
  'totalAssets',
  'totalLiabilities',
  'totalEquity',
  'operatingCashFlow',
  'capitalExpenditures',
  'freeCashFlow',
  'sharesOutstanding',
];
```

## Debugging

### Check Processing History

```sql
SELECT * FROM processing_summary
WHERE ticker = 'AAPL'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Data Completeness

```sql
SELECT * FROM company_financial_summary
WHERE ticker = 'AAPL';
```

### Check Available Metrics

```sql
SELECT
  metric_name,
  metric_value,
  period_end_date,
  source,
  confidence_score
FROM financial_metrics fm
JOIN companies c ON c.id = fm.company_id
WHERE c.ticker = 'AAPL'
  AND fm.period_type = 'annual'
ORDER BY fm.period_end_date DESC, fm.metric_name;
```
