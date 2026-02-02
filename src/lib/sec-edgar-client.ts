// SEC EDGAR Client - Fetch SEC filings by ticker symbol
// Uses backend proxy for proper User-Agent headers (SEC requirement)
// Falls back to CORS proxies if backend unavailable

import { getConfigMode } from './api-config';

// Backend URL - use env var or auto-detect production
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
        ? 'https://server-self-eight.vercel.app'
        : 'http://localhost:3001');


// Check if backend mode is configured
function shouldUseBackend(): boolean {
    const mode = getConfigMode();
    console.log('[SEC] Config mode:', mode, 'Backend URL:', BACKEND_URL);
    // Always try backend first in production
    return mode === 'backend' || window.location.hostname.includes('vercel.app');
}

// CORS proxies - fallback for when backend is unavailable
const CORS_PROXIES = [
    {
        name: 'allorigins',
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        parseResponse: async (response: Response) => {
            const data = await response.json();
            if (!data.contents) throw new Error('Empty response');
            return new Response(data.contents, { status: 200, headers: { 'Content-Type': 'application/json' } });
        },
    },
    {
        name: 'thingproxy',
        url: (target: string) => `https://thingproxy.freeboard.io/fetch/${target}`,
        parseResponse: async (response: Response) => response, // Direct passthrough
    },
    {
        name: 'corsproxy.io',
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        parseResponse: async (response: Response) => response, // Direct passthrough
    },
];

/**
 * Fetch with CORS proxy - tries multiple proxies as fallback
 */
async function fetchWithCorsProxy(
    url: string,
    timeoutMs: number = 120000
): Promise<Response> {
    console.log(`[SEC] Fetching: ${url}`);

    let lastError: Error | null = null;

    // Try each proxy in order
    for (const proxy of CORS_PROXIES) {
        const proxiedUrl = proxy.url(url);
        console.log(`[SEC] Trying ${proxy.name}...`);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(proxiedUrl, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const parsedResponse = await proxy.parseResponse(response);
            console.log(`[SEC] Success with ${proxy.name}`);
            return parsedResponse;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                lastError = new Error(`Request timed out after ${timeoutMs / 1000}s`);
                console.warn(`[SEC] ${proxy.name} timed out`);
                continue;
            }

            lastError = error instanceof Error ? error : new Error('Unknown error');
            console.warn(`[SEC] ${proxy.name} failed:`, lastError.message);
        }
    }

    throw lastError || new Error('All CORS proxies failed');
}

// SEC EDGAR API endpoints
const SEC_ENDPOINTS = {
    // Company search/CIK lookup
    COMPANY_SEARCH: 'https://www.sec.gov/cgi-bin/browse-edgar',
    // Company submissions (filings list)
    SUBMISSIONS: 'https://data.sec.gov/submissions',
    // Filing archives
    ARCHIVES: 'https://www.sec.gov/Archives/edgar/data',
    // Company tickers mapping
    TICKERS: 'https://www.sec.gov/files/company_tickers.json',
};

export interface SECFiling {
    accessionNumber: string;
    filingDate: string;
    form: string;
    primaryDocument: string;
    primaryDocDescription: string;
    items: string;
    cik: string;
    ticker: string;
    companyName: string;
}

export interface CompanyInfo {
    cik: string;
    ticker: string;
    name: string;
}

// Cache for CIK lookups
const cikCache = new Map<string, CompanyInfo>();

/**
 * Lookup CIK number from ticker symbol
 */
export async function lookupCIK(ticker: string): Promise<CompanyInfo> {
    const normalizedTicker = ticker.toUpperCase().trim();

    // Check cache first
    if (cikCache.has(normalizedTicker)) {
        return cikCache.get(normalizedTicker)!;
    }

    console.log(`[SEC] Looking up CIK for ${normalizedTicker}...`);

    try {
        // Use SEC's company tickers JSON file
        const response = await fetchWithCorsProxy(SEC_ENDPOINTS.TICKERS);

        if (!response.ok) {
            throw new Error(`SEC API error: ${response.status}`);
        }

        const data = await response.json();

        // Data format: { "0": { "cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc." }, ... }
        for (const key of Object.keys(data)) {
            const company = data[key];
            if (company.ticker === normalizedTicker) {
                const info: CompanyInfo = {
                    cik: String(company.cik_str).padStart(10, '0'),
                    ticker: company.ticker,
                    name: company.title,
                };
                cikCache.set(normalizedTicker, info);
                console.log(`[SEC] Found CIK ${info.cik} for ${normalizedTicker}: ${info.name}`);
                return info;
            }
        }

        throw new Error(`Ticker ${normalizedTicker} not found in SEC database`);
    } catch (error) {
        console.error('[SEC] CIK lookup error:', error);
        throw new Error(`Failed to lookup ticker ${normalizedTicker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get recent filings for a company
 */
export async function getRecentFilings(
    cikOrTicker: string,
    formType: '10-K' | '10-Q' | 'all' = 'all',
    limit: number = 5
): Promise<SECFiling[]> {
    // If it looks like a ticker, lookup the CIK first
    let companyInfo: CompanyInfo;
    if (cikOrTicker.length <= 5 && /^[A-Za-z]+$/.test(cikOrTicker)) {
        companyInfo = await lookupCIK(cikOrTicker);
    } else {
        companyInfo = {
            cik: cikOrTicker.padStart(10, '0'),
            ticker: '',
            name: '',
        };
    }

    console.log(`[SEC] Fetching filings for CIK ${companyInfo.cik}...`);

    try {
        const response = await fetchWithCorsProxy(
            `${SEC_ENDPOINTS.SUBMISSIONS}/CIK${companyInfo.cik}.json`
        );

        if (!response.ok) {
            throw new Error(`SEC API error: ${response.status}`);
        }

        const data = await response.json();

        // Update company info from response
        companyInfo.name = data.name || companyInfo.name;
        companyInfo.ticker = data.tickers?.[0] || companyInfo.ticker;

        // Parse filings from the "filings.recent" object
        const recent = data.filings?.recent || {};
        const filings: SECFiling[] = [];

        const forms = recent.form || [];
        const accessionNumbers = recent.accessionNumber || [];
        const filingDates = recent.filingDate || [];
        const primaryDocuments = recent.primaryDocument || [];
        const primaryDocDescriptions = recent.primaryDocDescription || [];
        const items = recent.items || [];

        for (let i = 0; i < forms.length && filings.length < limit; i++) {
            const form = forms[i];

            // Filter by form type if specified
            if (formType !== 'all' && form !== formType) {
                continue;
            }

            // Only include 10-K and 10-Q for now
            if (form !== '10-K' && form !== '10-Q') {
                continue;
            }

            filings.push({
                accessionNumber: accessionNumbers[i],
                filingDate: filingDates[i],
                form,
                primaryDocument: primaryDocuments[i],
                primaryDocDescription: primaryDocDescriptions[i] || '',
                items: items[i] || '',
                cik: companyInfo.cik.replace(/^0+/, ''), // Remove leading zeros for URL
                ticker: companyInfo.ticker,
                companyName: companyInfo.name,
            });
        }

        console.log(`[SEC] Found ${filings.length} ${formType !== 'all' ? formType : '10-K/10-Q'} filings`);
        return filings;
    } catch (error) {
        console.error('[SEC] Filings fetch error:', error);
        throw new Error(`Failed to fetch filings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Fetch and extract text from a filing document
 * Returns both raw HTML (for XBRL parsing) and extracted text (for AI)
 */
export async function fetchFilingDocument(
    filing: SECFiling,
    onProgress?: (message: string) => void
): Promise<{ text: string; rawHtml: string; url: string; metadata: SECFiling }> {
    const accessionNumberClean = filing.accessionNumber.replace(/-/g, '');
    const url = `${SEC_ENDPOINTS.ARCHIVES}/${filing.cik}/${accessionNumberClean}/${filing.primaryDocument}`;

    console.log(`[SEC] Fetching document: ${url}`);
    onProgress?.(`Downloading ${filing.form} filing from SEC...`);

    try {
        const response = await fetchWithCorsProxy(url);

        if (!response.ok) {
            throw new Error(`SEC API error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let text: string;
        let rawHtml: string = '';

        if (contentType.includes('text/html') || filing.primaryDocument.endsWith('.htm')) {
            // Parse HTML and extract text, keep raw for XBRL parsing
            rawHtml = await response.text();
            text = extractTextFromHTML(rawHtml);
            onProgress?.('Parsed HTML filing document...');
        } else if (contentType.includes('text/plain') || filing.primaryDocument.endsWith('.txt')) {
            // Plain text file
            text = await response.text();
            rawHtml = text;
            onProgress?.('Loaded text filing document...');
        } else {
            // Try to get as text anyway
            rawHtml = await response.text();
            text = rawHtml;
            onProgress?.('Loaded filing document...');
        }

        console.log(`[SEC] Document loaded, text: ${text.length} chars, rawHtml: ${rawHtml.length} chars`);
        return { text, rawHtml, url, metadata: filing };
    } catch (error) {
        console.error('[SEC] Document fetch error:', error);
        throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Extract readable text from HTML filing
 */
function extractTextFromHTML(html: string): string {
    // Remove scripts and styles
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    // Convert common HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&#\d+;/g, ' ');

    // Convert table cells to preserve structure
    text = text
        .replace(/<\/td>/gi, '\t')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/th>/gi, '\t')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Clean up whitespace
    text = text
        .replace(/\t+/g, '\t')
        .replace(/[ ]+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

    return text;
}

/**
 * Fetch latest filing using backend proxy (preferred method)
 * Returns both raw HTML (for XBRL parsing) and extracted text (for AI)
 */
async function fetchLatestFilingViaBackend(
    ticker: string,
    formType: '10-K' | '10-Q',
    onProgress?: (message: string) => void
): Promise<{ text: string; rawHtml: string; url: string; metadata: SECFiling }> {
    onProgress?.(`Looking up ${ticker.toUpperCase()} via backend...`);

    const backendUrl = `${BACKEND_URL}/api/sec/latest-filing`;
    console.log(`[SEC] Fetching via backend: ${backendUrl}`);

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ticker, formType }),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SEC] Backend error:', response.status, errorText);
            throw new Error(`Backend HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.error || 'Backend request failed');
        }

        const { filing, content, url } = result.data;

        onProgress?.(`Found ${filing.companyName} ${formType} from ${filing.filingDate}`);

        // Keep raw HTML for XBRL parsing, extract text for AI
        const rawHtml = content;
        let text = content;
        if (filing.primaryDocument?.endsWith('.htm')) {
            text = extractTextFromHTML(content);
            onProgress?.('Parsed HTML filing document...');
        }

        console.log(`[SEC] Backend fetch complete, text: ${text.length} chars, rawHtml: ${rawHtml.length} chars`);

        return {
            text,
            rawHtml,
            url,
            metadata: filing,
        };
    } catch (error) {
        console.error('[SEC] Backend fetch failed:', error);
        throw error;
    }
}

/**
 * Convenience function: Fetch latest 10-K for a ticker
 * Returns both raw HTML (for XBRL parsing) and extracted text (for AI)
 */
export async function fetchLatest10K(
    ticker: string,
    onProgress?: (message: string) => void
): Promise<{ text: string; rawHtml: string; url: string; metadata: SECFiling }> {
    const backendEnabled = shouldUseBackend();
    console.log('[SEC] fetchLatest10K - useBackend:', shouldUseBackend);

    // Use backend if available (has proper User-Agent headers)
    if (backendEnabled) {
        try {
            console.log('[SEC] Attempting backend fetch...');
            const result = await fetchLatestFilingViaBackend(ticker, '10-K', onProgress);
            console.log('[SEC] Backend fetch succeeded');
            return result;
        } catch (backendError) {
            console.error('[SEC] Backend fetch FAILED:', backendError);
            const errorMsg = backendError instanceof Error ? backendError.message : String(backendError);

            // Show error to user instead of silently falling back
            throw new Error(`Backend SEC fetch failed: ${errorMsg}. Check backend logs for details.`);
        }
    } else {
        console.warn('[SEC] Not using backend - will use CORS proxies (likely to fail)');
    }

    // Fallback to CORS proxy method (likely to fail - SEC blocks CORS)
    onProgress?.(`Looking up ${ticker.toUpperCase()}...`);
    console.warn('[SEC] Using CORS proxy fallback - SEC.gov may block this request');
    const filings = await getRecentFilings(ticker, '10-K', 1);

    if (filings.length === 0) {
        throw new Error(`No 10-K filings found for ${ticker.toUpperCase()}`);
    }

    const filing = filings[0];
    onProgress?.(`Found ${filing.companyName} 10-K from ${filing.filingDate}`);

    return fetchFilingDocument(filing, onProgress);
}

/**
 * Fetch multiple years of 10-K filings for historical analysis
 * Returns array of filing documents sorted by date (newest first)
 */
export async function fetchHistorical10Ks(
    ticker: string,
    years: number = 5,
    onProgress?: (message: string, current: number, total: number) => void
): Promise<Array<{ text: string; rawHtml: string; url: string; metadata: SECFiling }>> {
    console.log(`[SEC] Fetching ${years} years of 10-K filings for ${ticker}...`);
    onProgress?.(`Looking up ${ticker.toUpperCase()} filings...`, 0, years);

    // First get the list of recent filings
    const filings = await getRecentFilings(ticker, '10-K', years);

    if (filings.length === 0) {
        throw new Error(`No 10-K filings found for ${ticker.toUpperCase()}`);
    }

    console.log(`[SEC] Found ${filings.length} 10-K filings, fetching documents...`);

    const results: Array<{ text: string; rawHtml: string; url: string; metadata: SECFiling }> = [];

    // Fetch each filing document
    for (let i = 0; i < filings.length; i++) {
        const filing = filings[i];
        onProgress?.(
            `Downloading ${filing.companyName} 10-K from ${filing.filingDate}...`,
            i + 1,
            filings.length
        );

        try {
            const doc = await fetchFilingDocument(filing);
            results.push(doc);
            console.log(`[SEC] Fetched 10-K ${i + 1}/${filings.length}: ${filing.filingDate}`);
        } catch (error) {
            console.error(`[SEC] Failed to fetch 10-K from ${filing.filingDate}:`, error);
            // Continue with other filings even if one fails
        }
    }

    if (results.length === 0) {
        throw new Error(`Failed to fetch any 10-K documents for ${ticker.toUpperCase()}`);
    }

    console.log(`[SEC] Successfully fetched ${results.length} 10-K filings`);
    return results;
}

/**
 * Fetch multiple years of 10-K filings via backend (preferred for production)
 */
export async function fetchHistorical10KsViaBackend(
    ticker: string,
    years: number = 5,
    onProgress?: (message: string, current: number, total: number) => void
): Promise<Array<{ text: string; rawHtml: string; url: string; metadata: SECFiling }>> {
    onProgress?.(`Looking up ${ticker.toUpperCase()} historical filings via backend...`, 0, years);

    const backendUrl = `${BACKEND_URL}/api/sec/historical-filings`;
    console.log(`[SEC] Fetching historical filings via backend: ${backendUrl}`);

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ticker, formType: '10-K', years }),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SEC] Backend historical fetch error:', response.status, errorText);
            throw new Error(`Backend HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.error || 'Backend request failed');
        }

        const filings = result.data.filings as Array<{
            filing: SECFiling;
            content: string;
            url: string;
        }>;

        onProgress?.(`Found ${filings.length} historical filings`, filings.length, years);

        // Process each filing
        const results = filings.map((f, i) => {
            const rawHtml = f.content;
            let text = f.content;
            if (f.filing.primaryDocument?.endsWith('.htm')) {
                text = extractTextFromHTML(rawHtml);
            }
            onProgress?.(`Processed ${f.filing.filingDate} 10-K`, i + 1, filings.length);
            return {
                text,
                rawHtml,
                url: f.url,
                metadata: f.filing,
            };
        });

        console.log(`[SEC] Backend historical fetch complete: ${results.length} filings`);
        return results;
    } catch (error) {
        console.error('[SEC] Backend historical fetch failed:', error);
        throw error;
    }
}


/**
 * Fetch historical 10-K filings with automatic backend/fallback selection
 */
export async function fetchHistorical10KsAuto(
    ticker: string,
    years: number = 5,
    onProgress?: (message: string, current: number, total: number) => void
): Promise<Array<{ text: string; rawHtml: string; url: string; metadata: SECFiling }>> {
    const backendEnabled = shouldUseBackend();
    console.log('[SEC] fetchHistorical10KsAuto - useBackend:', shouldUseBackend);

    if (backendEnabled) {
        try {
            console.log('[SEC] Attempting backend historical fetch...');
            return await fetchHistorical10KsViaBackend(ticker, years, onProgress);
        } catch (backendError) {
            console.error('[SEC] Backend historical fetch FAILED:', backendError);
            // Fall back to CORS proxy method
            console.log('[SEC] Falling back to CORS proxy method...');
        }
    }

    // Fallback to direct fetch via CORS proxies
    return fetchHistorical10Ks(ticker, years, onProgress);
}

/**
 * Convenience function: Fetch latest 10-Q for a ticker
 * Returns both raw HTML (for XBRL parsing) and extracted text (for AI)
 */
export async function fetchLatest10Q(
    ticker: string,
    onProgress?: (message: string) => void
): Promise<{ text: string; rawHtml: string; url: string; metadata: SECFiling }> {
    const backendEnabled = shouldUseBackend();
    console.log('[SEC] fetchLatest10Q - useBackend:', shouldUseBackend);

    // Use backend if available (has proper User-Agent headers)
    if (backendEnabled) {
        try {
            console.log('[SEC] Attempting backend fetch...');
            const result = await fetchLatestFilingViaBackend(ticker, '10-Q', onProgress);
            console.log('[SEC] Backend fetch succeeded');
            return result;
        } catch (backendError) {
            console.error('[SEC] Backend fetch FAILED:', backendError);
            const errorMsg = backendError instanceof Error ? backendError.message : String(backendError);

            // Show error to user instead of silently falling back
            throw new Error(`Backend SEC fetch failed: ${errorMsg}. Check backend logs for details.`);
        }
    } else {
        console.warn('[SEC] Not using backend - will use CORS proxies (likely to fail)');
    }

    // Fallback to CORS proxy method (likely to fail - SEC blocks CORS)
    onProgress?.(`Looking up ${ticker.toUpperCase()}...`);
    console.warn('[SEC] Using CORS proxy fallback - SEC.gov may block this request');
    const filings = await getRecentFilings(ticker, '10-Q', 1);

    if (filings.length === 0) {
        throw new Error(`No 10-Q filings found for ${ticker.toUpperCase()}`);
    }

    const filing = filings[0];
    onProgress?.(`Found ${filing.companyName} 10-Q from ${filing.filingDate}`);

    return fetchFilingDocument(filing, onProgress);
}
