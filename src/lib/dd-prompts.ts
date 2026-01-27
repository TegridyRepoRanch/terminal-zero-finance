// DD Analysis Prompt Templates
// Pre-built due diligence analysis prompts for one-click execution

export interface DDPromptTemplate {
  id: string;
  name: string;
  shortName: string;
  icon: string; // emoji
  category: 'earnings' | 'risk' | 'competitive' | 'management' | 'valuation' | 'catalyst';
  description: string;
  prompt: string;
  checklist: string[];
}

export const DD_PROMPT_TEMPLATES: DDPromptTemplate[] = [
  {
    id: 'quality-of-earnings',
    name: 'Quality of Earnings Analysis',
    shortName: 'Earnings Quality',
    icon: '📊',
    category: 'earnings',
    description: 'Analyze earnings quality and cash conversion',
    prompt: `Analyze the quality of earnings for this company:

1. Compare net income to operating cash flow - is cash conversion healthy?
2. Look for aggressive revenue recognition (DSO trends vs peers)
3. Identify any one-time gains/losses inflating or deflating earnings
4. Check for deferred revenue growth vs revenue growth
5. Flag any accounting policy changes mentioned in notes

Use the financial data provided to calculate specific ratios and identify any concerning patterns. Be specific with numbers.`,
    checklist: [
      'Net income vs operating cash flow comparison',
      'DSO trend analysis',
      'One-time items identification',
      'Deferred revenue analysis',
      'Accounting policy review',
    ],
  },
  {
    id: 'red-flag-detection',
    name: 'Red Flag Detection',
    shortName: 'Red Flags',
    icon: '🚩',
    category: 'risk',
    description: 'Scan for warning signs and risks',
    prompt: `Scan for red flags in this company's financials and disclosures:

1. Related party transactions - any unusual dealings with insiders?
2. Auditor changes or going concern warnings
3. Management turnover - key departures?
4. Unusual inventory or receivables build-up relative to revenue
5. Declining cash from operations while net income grows (earnings quality issue)
6. Excessive stock-based compensation diluting shareholders
7. Off-balance sheet obligations (operating leases, guarantees, contingencies)

Flag any items that warrant further investigation. Rate each area as Green/Yellow/Red.`,
    checklist: [
      'Related party transactions',
      'Auditor/going concern',
      'Management turnover',
      'Inventory/receivables build-up',
      'Cash vs income divergence',
      'Stock-based compensation',
      'Off-balance sheet items',
    ],
  },
  {
    id: 'competitive-position',
    name: 'Competitive Position Assessment',
    shortName: 'Moat Analysis',
    icon: '🏰',
    category: 'competitive',
    description: 'Assess competitive moat and market position',
    prompt: `Assess this company's competitive moat and market position:

1. What are the barriers to entry in their market? (capital requirements, regulations, network effects, IP)
2. Customer concentration risk - estimate top customers as % of revenue if disclosed
3. Supplier concentration risk - dependency on key suppliers
4. Pricing power evidence - analyze gross margin trends over time
5. Market share trends vs competitors (if data available)
6. Switching costs for customers - how sticky is the business?

Rate the overall moat strength: None / Narrow / Wide. Explain your reasoning.`,
    checklist: [
      'Barriers to entry',
      'Customer concentration',
      'Supplier concentration',
      'Pricing power (margins)',
      'Market share trends',
      'Switching costs',
    ],
  },
  {
    id: 'management-quality',
    name: 'Management Quality Review',
    shortName: 'Management',
    icon: '👔',
    category: 'management',
    description: 'Evaluate leadership track record',
    prompt: `Evaluate management quality for this company:

1. Track record of guidance accuracy - have they historically hit their estimates?
2. Capital allocation history - M&A track record, buyback timing (buying low or high?)
3. Insider buying vs selling patterns - are executives buying their own stock?
4. Executive compensation vs company performance - aligned with shareholders?
5. Communication quality - transparency, consistency, credibility

Based on available information, rate management: Poor / Average / Good / Excellent. What gives you confidence or concern?`,
    checklist: [
      'Guidance accuracy',
      'Capital allocation',
      'Insider transactions',
      'Compensation alignment',
      'Communication quality',
    ],
  },
  {
    id: 'bear-case',
    name: 'Bear Case Construction',
    shortName: 'Bear Case',
    icon: '🐻',
    category: 'risk',
    description: 'Build the case for what could go wrong',
    prompt: `Build a comprehensive bear case for this company:

1. What could cause revenue to decline? (market saturation, competition, disruption)
2. What margin compression risks exist? (input costs, pricing pressure, mix shift)
3. What disruptive threats are emerging? (technology, new entrants, regulation)
4. What happens if their largest customer leaves or reduces spending?
5. What's the downside valuation if growth slows to 0%?
6. What debt covenants could be breached? (if leveraged)

Be thorough and specific. Every investment needs a clear understanding of downside scenarios. Estimate the bear case fair value.`,
    checklist: [
      'Revenue decline scenarios',
      'Margin compression risks',
      'Disruptive threats',
      'Customer loss impact',
      'Zero growth valuation',
      'Covenant/liquidity risks',
    ],
  },
  {
    id: 'catalyst-identification',
    name: 'Catalyst Identification',
    shortName: 'Catalysts',
    icon: '⚡',
    category: 'catalyst',
    description: 'Identify upcoming events that could move the stock',
    prompt: `Identify upcoming catalysts for this company:

1. Earnings dates and expectations - when is the next report? What are expectations?
2. Product launches or announcements - any new products/services coming?
3. Regulatory decisions pending - FDA approvals, antitrust, licensing
4. Contract renewals or expirations - major customer contracts at risk?
5. Debt maturities - any refinancing needs?
6. Industry events or trade shows - opportunities for announcements
7. Competitor results - who reports before/after that could impact sentiment?

Create a timeline of potential catalysts over the next 6-12 months. Flag which are positive vs negative.`,
    checklist: [
      'Earnings dates',
      'Product launches',
      'Regulatory decisions',
      'Contract renewals',
      'Debt maturities',
      'Industry events',
      'Competitor timing',
    ],
  },
  {
    id: 'valuation-sanity-check',
    name: 'Valuation Sanity Check',
    shortName: 'Val Check',
    icon: '🧮',
    category: 'valuation',
    description: 'Validate the DCF and compare to alternatives',
    prompt: `Sanity check the valuation for this company:

1. Is the terminal growth rate reasonable? (should be at or below long-term GDP growth ~2-3%)
2. Is the assumed margin improvement realistic vs historical performance?
3. How does the implied EV/Revenue compare to sector peers?
4. What growth rate does the current stock price imply? (reverse DCF)
5. What would the stock be worth at peer median multiples?

Using the financial data provided, calculate these checks. If any assumptions seem aggressive, flag them. Provide a valuation range: Bear / Base / Bull.`,
    checklist: [
      'Terminal growth reasonableness',
      'Margin assumptions vs history',
      'EV/Revenue vs peers',
      'Implied growth rate',
      'Peer multiple valuation',
    ],
  },
];

// Get templates by category
export function getTemplatesByCategory(category: DDPromptTemplate['category']): DDPromptTemplate[] {
  return DD_PROMPT_TEMPLATES.filter(t => t.category === category);
}

// Get template by ID
export function getTemplateById(id: string): DDPromptTemplate | undefined {
  return DD_PROMPT_TEMPLATES.find(t => t.id === id);
}

// Category display info
export const DD_CATEGORIES = [
  { id: 'earnings', name: 'Earnings', icon: '📊' },
  { id: 'risk', name: 'Risk', icon: '🚩' },
  { id: 'competitive', name: 'Competitive', icon: '🏰' },
  { id: 'management', name: 'Management', icon: '👔' },
  { id: 'valuation', name: 'Valuation', icon: '🧮' },
  { id: 'catalyst', name: 'Catalysts', icon: '⚡' },
] as const;
