// Stock Price API Service
// Fetches real-time stock prices from Yahoo Finance (free, no API key required)

const YAHOO_QUOTE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// CORS proxy for browser requests (Yahoo blocks direct browser requests)
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
];

export interface StockQuote {
    ticker: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    marketCap?: number;
    volume?: number;
    high?: number;
    low?: number;
    open?: number;
    timestamp: Date;
}

/**
 * Fetch stock price from Yahoo Finance
 */
export async function fetchStockPrice(ticker: string): Promise<StockQuote> {
    const url = `${YAHOO_QUOTE_API}/${ticker}?interval=1d&range=1d`;

    // Try without proxy first (works in Node/server environments)
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (response.ok) {
            return parseYahooResponse(await response.json(), ticker);
        }
    } catch {
        // Fall through to proxy
    }

    // Try with CORS proxies
    for (const proxy of CORS_PROXIES) {
        try {
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);

            if (response.ok) {
                return parseYahooResponse(await response.json(), ticker);
            }
        } catch (e) {
            console.warn(`[StockAPI] Proxy ${proxy} failed:`, e);
        }
    }

    throw new Error(`Failed to fetch stock price for ${ticker}`);
}

/**
 * Parse Yahoo Finance API response
 */
function parseYahooResponse(data: unknown, ticker: string): StockQuote {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart = (data as any)?.chart?.result?.[0];

    if (!chart) {
        throw new Error(`No data returned for ${ticker}`);
    }

    const meta = chart.meta;
    const quote = chart.indicators?.quote?.[0] || {};

    const price = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
        ticker: meta.symbol || ticker,
        price,
        previousClose,
        change,
        changePercent,
        marketCap: meta.marketCap,
        volume: quote.volume?.[quote.volume.length - 1],
        high: quote.high?.[quote.high.length - 1] || meta.regularMarketDayHigh,
        low: quote.low?.[quote.low.length - 1] || meta.regularMarketDayLow,
        open: quote.open?.[quote.open.length - 1] || meta.regularMarketOpen,
        timestamp: new Date(),
    };
}

/**
 * Fetch multiple stock prices in parallel
 */
export async function fetchMultipleStockPrices(
    tickers: string[]
): Promise<Map<string, StockQuote>> {
    const results = new Map<string, StockQuote>();

    const promises = tickers.map(async (ticker) => {
        try {
            const quote = await fetchStockPrice(ticker);
            results.set(ticker, quote);
        } catch (error) {
            console.error(`[StockAPI] Failed to fetch ${ticker}:`, error);
        }
    });

    await Promise.all(promises);
    return results;
}

// Cache for stock prices (5 minute TTL)
const priceCache = new Map<string, { quote: StockQuote; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch stock price with caching
 */
export async function fetchStockPriceCached(ticker: string): Promise<StockQuote> {
    const cached = priceCache.get(ticker);

    if (cached && cached.expires > Date.now()) {
        return cached.quote;
    }

    const quote = await fetchStockPrice(ticker);
    priceCache.set(ticker, {
        quote,
        expires: Date.now() + CACHE_TTL_MS,
    });

    return quote;
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
    priceCache.clear();
}
