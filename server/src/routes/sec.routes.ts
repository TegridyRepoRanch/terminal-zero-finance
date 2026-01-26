// SEC EDGAR Proxy Routes
// Proxies SEC requests with proper User-Agent headers required by SEC

import express from 'express';
import type { Request, Response as ExpressResponse, NextFunction } from 'express';

const router = express.Router();

// SEC requires a User-Agent with company name and email
const SEC_USER_AGENT = 'Terminal Zero Finance contact@terminalzero.finance';

// SEC API endpoints
const SEC_ENDPOINTS = {
  TICKERS: 'https://www.sec.gov/files/company_tickers.json',
  SUBMISSIONS: 'https://data.sec.gov/submissions',
  ARCHIVES: 'https://www.sec.gov/Archives/edgar/data',
};

// Type for SEC company tickers data
interface SECTickerData {
  [key: string]: {
    cik_str: number;
    ticker: string;
    title: string;
  };
}

// Type for SEC submissions data
interface SECSubmissionsData {
  name?: string;
  tickers?: string[];
  filings?: {
    recent?: {
      form?: string[];
      accessionNumber?: string[];
      filingDate?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
      items?: string[];
    };
  };
}

/**
 * Fetch from SEC with proper headers
 */
async function fetchFromSEC(url: string): Promise<globalThis.Response> {
  console.log(`[SEC] Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'application/json, text/html, */*',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });

  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * GET /api/sec/tickers
 * Returns SEC company tickers mapping
 */
router.get('/tickers', async (_req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const response = await fetchFromSEC(SEC_ENDPOINTS.TICKERS);
    const data = await response.json();

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    console.error('[SEC] Tickers fetch error:', error);
    next(error);
  }
});

/**
 * GET /api/sec/submissions/:cik
 * Returns filings for a company by CIK
 */
router.get('/submissions/:cik', async (req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const cik = req.params.cik as string;
    const paddedCik = cik.padStart(10, '0');

    const response = await fetchFromSEC(`${SEC_ENDPOINTS.SUBMISSIONS}/CIK${paddedCik}.json`);
    const data = await response.json();

    res.json({
      status: 'success',
      data,
    });
  } catch (error) {
    console.error('[SEC] Submissions fetch error:', error);
    next(error);
  }
});

/**
 * GET /api/sec/filing/:cik/:accessionNumber/:document
 * Returns a specific filing document
 */
router.get('/filing/:cik/:accessionNumber/:document', async (req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const cik = req.params.cik as string;
    const accessionNumber = req.params.accessionNumber as string;
    const document = req.params.document as string;
    const cleanAccession = accessionNumber.replace(/-/g, '');

    const url = `${SEC_ENDPOINTS.ARCHIVES}/${cik}/${cleanAccession}/${document}`;
    const response = await fetchFromSEC(url);

    const contentType = response.headers.get('content-type') || 'text/html';
    const text = await response.text();

    res.json({
      status: 'success',
      data: {
        content: text,
        contentType,
        url,
      },
    });
  } catch (error) {
    console.error('[SEC] Filing fetch error:', error);
    next(error);
  }
});

/**
 * POST /api/sec/lookup
 * Lookup CIK by ticker symbol
 */
router.post('/lookup', async (req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const { ticker } = req.body;

    if (!ticker || typeof ticker !== 'string') {
      res.status(400).json({
        status: 'error',
        error: 'Ticker symbol is required',
      });
      return;
    }

    const normalizedTicker = ticker.toUpperCase().trim();

    const response = await fetchFromSEC(SEC_ENDPOINTS.TICKERS);
    const data = await response.json() as SECTickerData;

    // Find the company
    for (const key of Object.keys(data)) {
      const company = data[key];
      if (company.ticker === normalizedTicker) {
        res.json({
          status: 'success',
          data: {
            cik: String(company.cik_str).padStart(10, '0'),
            ticker: company.ticker,
            name: company.title,
          },
        });
        return;
      }
    }

    res.status(404).json({
      status: 'error',
      error: `Ticker ${normalizedTicker} not found in SEC database`,
    });
  } catch (error) {
    console.error('[SEC] Lookup error:', error);
    next(error);
  }
});

/**
 * POST /api/sec/latest-filing
 * Get the latest 10-K or 10-Q filing for a ticker
 */
router.post('/latest-filing', async (req: Request, res: ExpressResponse, next: NextFunction) => {
  try {
    const { ticker, formType = '10-K' } = req.body;

    if (!ticker || typeof ticker !== 'string') {
      res.status(400).json({
        status: 'error',
        error: 'Ticker symbol is required',
      });
      return;
    }

    if (!['10-K', '10-Q'].includes(formType)) {
      res.status(400).json({
        status: 'error',
        error: 'formType must be "10-K" or "10-Q"',
      });
      return;
    }

    const normalizedTicker = ticker.toUpperCase().trim();

    // Step 1: Look up CIK
    console.log(`[SEC] Looking up CIK for ${normalizedTicker}...`);
    const tickersResponse = await fetchFromSEC(SEC_ENDPOINTS.TICKERS);
    const tickersData = await tickersResponse.json() as SECTickerData;

    let companyInfo: { cik: string; ticker: string; name: string } | null = null;
    for (const key of Object.keys(tickersData)) {
      const company = tickersData[key];
      if (company.ticker === normalizedTicker) {
        companyInfo = {
          cik: String(company.cik_str).padStart(10, '0'),
          ticker: company.ticker,
          name: company.title,
        };
        break;
      }
    }

    if (!companyInfo) {
      res.status(404).json({
        status: 'error',
        error: `Ticker ${normalizedTicker} not found in SEC database`,
      });
      return;
    }

    console.log(`[SEC] Found CIK ${companyInfo.cik} for ${normalizedTicker}: ${companyInfo.name}`);

    // Step 2: Get filings
    const submissionsResponse = await fetchFromSEC(
      `${SEC_ENDPOINTS.SUBMISSIONS}/CIK${companyInfo.cik}.json`
    );
    const submissionsData = await submissionsResponse.json() as SECSubmissionsData;

    // Find the latest filing of the requested type
    const recent = submissionsData.filings?.recent || {};
    const forms = recent.form || [];
    const accessionNumbers = recent.accessionNumber || [];
    const filingDates = recent.filingDate || [];
    const primaryDocuments = recent.primaryDocument || [];

    let filing = null;
    for (let i = 0; i < forms.length; i++) {
      if (forms[i] === formType) {
        filing = {
          accessionNumber: accessionNumbers[i],
          filingDate: filingDates[i],
          form: forms[i],
          primaryDocument: primaryDocuments[i],
          cik: companyInfo.cik.replace(/^0+/, ''),
          ticker: companyInfo.ticker,
          companyName: companyInfo.name,
        };
        break;
      }
    }

    if (!filing) {
      res.status(404).json({
        status: 'error',
        error: `No ${formType} filings found for ${normalizedTicker}`,
      });
      return;
    }

    console.log(`[SEC] Found ${formType} from ${filing.filingDate}`);

    // Step 3: Fetch the document
    const cleanAccession = filing.accessionNumber.replace(/-/g, '');
    const documentUrl = `${SEC_ENDPOINTS.ARCHIVES}/${filing.cik}/${cleanAccession}/${filing.primaryDocument}`;

    console.log(`[SEC] Fetching document: ${documentUrl}`);
    const documentResponse = await fetchFromSEC(documentUrl);
    const documentText = await documentResponse.text();

    console.log(`[SEC] Document fetched, length: ${documentText.length} chars`);

    res.json({
      status: 'success',
      data: {
        filing,
        content: documentText,
        url: documentUrl,
      },
    });
  } catch (error) {
    console.error('[SEC] Latest filing error:', error);
    next(error);
  }
});

export default router;
