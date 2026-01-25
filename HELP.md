# Terminal Zero Finance - Help Documentation

Complete guide to using Terminal Zero Finance for DCF valuation and financial modeling.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Upload & Extract](#upload--extract)
3. [Review & Edit](#review--edit)
4. [Financial Modeling](#financial-modeling)
5. [Valuation Engine](#valuation-engine)
6. [Advanced Features](#advanced-features)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)
9. [Video Tutorials](#video-tutorials)

---

## Quick Start

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd terminal-zero-finance
   npm run setup
   ```

2. **Configure Backend** (Recommended)
   ```bash
   cp .env.example .env
   # Edit .env and set VITE_BACKEND_URL=http://localhost:3001
   ```

3. **Add API Keys** (Server-side)
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY and ANTHROPIC_API_KEY
   ```

4. **Start Application**
   ```bash
   npm run dev:all
   ```

5. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### First DCF Model

1. Upload a 10-K or 10-Q PDF filing
2. Wait for AI extraction (30-60 seconds)
3. Review and edit extracted assumptions
4. Click "Load into Model"
5. Adjust assumptions in real-time
6. View DCF valuation and intrinsic value

---

## Upload & Extract

### Supported File Types

- **10-K Annual Reports** - Best results
- **10-Q Quarterly Reports** - Good results
- **PDF Format** - Up to 50MB

### Upload Process

1. **Drag & Drop or Click**
   - Drop PDF file onto upload zone
   - Or click to browse and select file

2. **Automatic Extraction**
   - PDF parsing (10-20 seconds)
   - Financial data extraction with AI (20-40 seconds)
   - Data validation and confidence scoring

3. **Extraction Steps**
   - Parsing PDF text
   - Extracting financial statements
   - Analyzing business segments
   - Validating data consistency
   - Calculating derived metrics

### Skip to Manual Entry

Click "Skip - Enter Manually" to bypass upload and enter assumptions directly.

---

## Review & Edit

### Review Screen Overview

After extraction, review extracted data before loading into the model:

**Company Information Card**
- Company name, ticker, fiscal period
- Filing type (10-K, 10-Q)
- Source document name

**Editable Fields**
- Click any value to edit inline
- Press Enter to save, Escape to cancel
- Values automatically formatted (currency, percent, days)

### Advanced Filtering

Filter fields by confidence level:

- **All** - Show all fields
- **High** (>80%) - Show high-confidence extractions
- **Medium** (60-80%) - Show medium-confidence extractions
- **Low** (<60%) - Show low-confidence extractions

**Confidence Indicators:**
- 🟢 Green = High confidence
- 🟡 Amber = Medium confidence
- 🔴 Red = Low confidence

### Bulk Edit Mode

Edit multiple similar fields at once:

1. Click "Bulk Edit" button in toolbar
2. Check boxes appear next to all fields
3. Select multiple fields to edit
4. Click "Edit N Fields" button
5. Enter new value in modal
6. Click "Apply to All"

**Best For:**
- Setting multiple growth rates
- Adjusting multiple percentages
- Updating days across working capital

---

## Financial Modeling

### Model Tabs

**Income Statement**
- Revenue projections
- Cost of Goods Sold (COGS)
- Operating expenses
- EBIT, EBITDA, Net Income

**Balance Sheet**
- Assets (current and long-term)
- Liabilities and debt
- Shareholders' equity
- Working capital components

**Cash Flow Statement**
- Operating cash flow
- Investing activities (CapEx)
- Financing activities
- Free Cash Flow (FCF)

**Depreciation Schedule**
- Annual CapEx tracking
- Depreciation calculation
- Net PP&E balance

**Debt Schedule**
- Debt balance over time
- Interest expense
- Principal repayments

**Valuation**
- DCF calculation
- Terminal value
- Enterprise and equity value
- Intrinsic share price

### Key Assumptions

**Revenue & Growth**
- Base Revenue: Starting point for projections
- Revenue Growth Rate: Annual growth percentage
- Projection Years: Forecast period (default: 5 years)

**Operating Margins**
- COGS %: Cost of revenue as % of sales
- SG&A %: Selling, general, administrative as % of sales
- Tax Rate: Effective tax rate

**Working Capital**
- Days Receivables (DSO): Collection period
- Days Inventory (DIO): Inventory turnover
- Days Payables (DPO): Payment period

**Capital Expenditures**
- CapEx % of Revenue: Capital investments
- Depreciation Years: Useful life of assets

**Debt & Financing**
- Total Debt: Outstanding debt balance
- Interest Rate: Average cost of debt
- Yearly Repayment: Annual principal reduction

**Valuation Parameters**
- WACC: Weighted average cost of capital
- Terminal Growth Rate: Perpetual growth rate
- Shares Outstanding: Diluted share count
- Net Debt: Total debt minus cash

### Real-Time Updates

All changes update instantly:
- Edit any assumption
- Watch projections recalculate
- See valuation update in real-time

---

## Valuation Engine

### DCF Methodology

**Free Cash Flow (FCF) Calculation:**
```
FCF = EBIT × (1 - Tax Rate)
    + Depreciation
    - CapEx
    - Change in Net Working Capital
```

**Terminal Value:**
```
Terminal Value = Final Year FCF × (1 + Terminal Growth)
               / (WACC - Terminal Growth)
```

**Enterprise Value:**
```
Enterprise Value = PV of FCF (Years 1-5)
                 + PV of Terminal Value
```

**Equity Value:**
```
Equity Value = Enterprise Value - Net Debt
```

**Intrinsic Share Price:**
```
Share Price = Equity Value / Shares Outstanding
```

### Sensitivity Analysis

View how valuation changes with different assumptions:
- WACC sensitivity
- Growth rate sensitivity
- Margin sensitivity

### Valuation Output

**Key Metrics Displayed:**
- Enterprise Value
- Equity Value
- Intrinsic Share Price
- Implied Valuation Multiple
- DCF vs Market Price (if ticker provided)

---

## Advanced Features

### Ticker Search

Search for company tickers to pre-populate data:
1. Click ticker search box
2. Type company name or ticker
3. Select from results
4. Data auto-populates where available

### Sidebar Navigation

- **Model Settings**: Adjust global parameters
- **Assumptions**: Quick access to key inputs
- **Outputs**: Valuation summary
- **Scenarios**: Save different assumption sets (coming soon)

### Data Quality Indicators

**Warnings:**
- Missing data fields
- Inconsistent calculations
- Low confidence extractions
- Out-of-range values

**Validation:**
- Automatic sanity checks
- Range validation
- Consistency verification

---

## Keyboard Shortcuts

### Navigation

- `Ctrl/Cmd + 1-6` - Switch between tabs
- `Ctrl/Cmd + /` - Show keyboard shortcuts help
- `Esc` - Close modals and cancel edits

### Editing

- `Enter` - Save field edit
- `Escape` - Cancel field edit
- `Tab` - Next field
- `Shift + Tab` - Previous field

### Bulk Operations

- `Ctrl/Cmd + A` - Select all visible fields (in bulk edit mode)
- `Ctrl/Cmd + D` - Deselect all

---

## Troubleshooting

### Upload Issues

**Problem: PDF upload fails**
- ✅ Check file size (max 50MB)
- ✅ Ensure PDF is text-based, not scanned image
- ✅ Try a different browser
- ✅ Check backend is running (`npm run dev:server`)

**Problem: Extraction takes too long**
- ✅ Large PDFs can take 60-90 seconds
- ✅ Check backend API logs for errors
- ✅ Verify API keys are configured correctly
- ✅ Check rate limits haven't been exceeded

### Extraction Errors

**Problem: Low confidence scores**
- ✅ Filing may have unusual formatting
- ✅ Data might be in non-standard sections
- ✅ Manually review and correct flagged fields
- ✅ Consider using "Skip - Enter Manually"

**Problem: Missing data fields**
- ✅ Some filings omit certain disclosures
- ✅ Manually enter missing values
- ✅ Use industry averages as proxy

### Configuration Issues

**Problem: Backend not starting**
- ✅ Check port 3001 is available
- ✅ Verify environment variables set
- ✅ Run `cd server && npm install`
- ✅ Check API keys are valid

**Problem: CORS errors**
- ✅ Ensure backend URL matches frontend config
- ✅ Check ALLOWED_ORIGINS in server/.env
- ✅ Clear browser cache and reload

### Performance Issues

**Problem: Slow UI**
- ✅ Close unused browser tabs
- ✅ Clear browser cache
- ✅ Disable browser extensions
- ✅ Use latest Chrome/Firefox

**Problem: Calculations lag**
- ✅ Reduce projection years
- ✅ Simplify model complexity
- ✅ Check for circular references

---

## Video Tutorials

### Getting Started (5 min)

**Topic:** Initial setup and first DCF model

**What You'll Learn:**
- Installing dependencies
- Configuring backend
- Uploading a 10-K
- Reviewing extracted data
- Basic valuation walkthrough

**Video Link:** [Coming Soon]

---

### Advanced Extraction (8 min)

**Topic:** Using confidence filters and bulk edit

**What You'll Learn:**
- Understanding confidence scores
- Filtering by confidence level
- Using bulk edit for efficiency
- Correcting low-confidence fields
- Best practices for data review

**Video Link:** [Coming Soon]

---

### Building DCF Models (12 min)

**Topic:** Deep dive into financial modeling

**What You'll Learn:**
- Understanding each statement
- Key assumption drivers
- Working capital mechanics
- CapEx and depreciation
- Debt schedule management

**Video Link:** [Coming Soon]

---

### Valuation Methodology (10 min)

**Topic:** DCF theory and Terminal Zero approach

**What You'll Learn:**
- Free cash flow calculation
- Terminal value methods
- WACC selection
- Sensitivity analysis
- Interpreting results

**Video Link:** [Coming Soon]

---

### Backend API Setup (6 min)

**Topic:** Secure backend configuration

**What You'll Learn:**
- Why use backend mode
- Setting up environment variables
- Configuring API keys
- Testing API endpoints
- Troubleshooting common issues

**Video Link:** [Coming Soon]

---

### Keyboard Efficiency (4 min)

**Topic:** Power user shortcuts

**What You'll Learn:**
- Essential keyboard shortcuts
- Fast navigation techniques
- Quick editing tips
- Bulk operations workflow

**Video Link:** [Coming Soon]

---

## Additional Resources

### Documentation

- [README.md](README.md) - Project overview
- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Backend configuration guide
- [SECURITY.md](SECURITY.md) - Security best practices
- [PERFORMANCE.md](PERFORMANCE.md) - Performance optimization
- [API.md](API.md) - API documentation

### Community

- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Q&A and community support
- Contributing Guide - How to contribute code

### Support

- Check existing GitHub issues
- Review troubleshooting section above
- Create new issue with detailed description
- Include error messages and screenshots

---

## Glossary

**10-K** - Annual financial report filed with SEC
**10-Q** - Quarterly financial report filed with SEC
**DCF** - Discounted Cash Flow valuation method
**FCF** - Free Cash Flow
**WACC** - Weighted Average Cost of Capital
**DSO** - Days Sales Outstanding (receivables days)
**DIO** - Days Inventory Outstanding
**DPO** - Days Payables Outstanding
**CapEx** - Capital Expenditures
**EBIT** - Earnings Before Interest and Taxes
**EBITDA** - Earnings Before Interest, Taxes, Depreciation, and Amortization
**EV** - Enterprise Value
**PP&E** - Property, Plant, and Equipment
**NWC** - Net Working Capital

---

**Last Updated:** 2026-01-26

For the latest updates, see our [GitHub repository](https://github.com/your-username/terminal-zero-finance).
