# Terminal Zero Finance

A professional-grade DCF (Discounted Cash Flow) valuation workstation with AI-powered extraction from SEC filings. Upload 10-K or 10-Q PDF documents and let Gemini 2.5 AI extract financial data automatically, then build interactive valuation models with real-time calculations.

![Bloomberg Terminal-inspired interface](https://img.shields.io/badge/UI-Terminal%20Style-00D9FF)
![React 19](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![Gemini 2.5](https://img.shields.io/badge/AI-Gemini%202.5-4285F4)

## 🚨 Security Warning

**CRITICAL: This application is currently for development/demo purposes only.**

The current implementation exposes API keys in the frontend code, which is a critical security vulnerability. **DO NOT deploy this publicly without implementing a backend API proxy.** See [SECURITY.md](SECURITY.md) for details and solutions.

## Features

### AI-Powered PDF Extraction
- Upload SEC 10-K or 10-Q filings (PDF)
- Automatic financial data extraction using Google Gemini 2.5
- Three extraction modes:
  - **Fast Mode**: Gemini 2.5 Flash for quick extraction
  - **Thorough Mode**: Gemini 2.5 Pro with segment and MD&A analysis
  - **Validated Mode**: Double-pass validation for maximum accuracy
- Real-time progress tracking
- Confidence scores for extracted data
- Review and edit extracted data before modeling

### DCF Valuation Engine
- Complete financial statement modeling:
  - Income Statement projections
  - Balance Sheet forecasting
  - Cash Flow Statement (indirect method)
  - Depreciation & Amortization schedule
  - Debt repayment schedule
- Discounted Cash Flow valuation with:
  - WACC-based discounting
  - Terminal value (Gordon Growth Model)
  - Implied share price calculation
- Interactive assumptions panel
- Real-time recalculation
- Input validation with warnings

### Professional UI/UX
- Bloomberg Terminal-inspired dark theme
- Monospace fonts for financial data
- Color-coded metrics (profit/loss indicators)
- Tab-based navigation across 6 analysis views
- Responsive data grids
- Keyboard-friendly inputs

## Tech Stack

- **Frontend**: React 19.2 + TypeScript 5.9
- **Build Tool**: Vite 5.4
- **State Management**: Zustand 5.0
- **Styling**: Tailwind CSS 3.4
- **AI**: Google Generative AI (Gemini 2.5 Flash & Pro)
- **PDF Processing**: PDF.js 5.4
- **Charts**: Recharts 3.7
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/terminal-zero-finance.git
cd terminal-zero-finance
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Add your Gemini API key to `.env`:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

⚠️ **Important**: Never commit your `.env` file. It's included in `.gitignore` by default.

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist/` directory.

Preview production build:
```bash
npm run preview
```

## Usage

### 1. Upload & Extract
- Click "Upload SEC Filing" or drag & drop a PDF
- Choose extraction mode (Fast, Thorough, or Validated)
- Wait for AI extraction (progress shown in real-time)
- Review extracted data and make any corrections

### 2. Build Model
- Adjust assumptions in the left sidebar:
  - Revenue drivers (growth rate, base revenue)
  - Income statement items (COGS %, SG&A %, tax rate)
  - Working capital (DSO, DIO, DPO)
  - CapEx and depreciation
  - Debt schedule
  - Valuation inputs (WACC, terminal growth, shares outstanding)
- All financial statements update automatically

### 3. Analyze Results
Navigate through 6 analysis tabs:
- **Valuation Engine**: DCF summary and implied share price
- **Income Statement**: P&L projections
- **Balance Sheet**: Assets, liabilities, and equity
- **Cash Flow**: Free cash flow waterfall
- **Depreciation**: D&A schedule
- **Debt**: Debt repayment and interest analysis

## Project Structure

```
terminal-zero-finance/
├── src/
│   ├── components/          # React UI components
│   │   ├── upload/         # PDF upload workflow
│   │   ├── DataGrid.tsx    # Reusable table component
│   │   ├── Sidebar.tsx     # Assumptions input panel
│   │   ├── ValuationEngine.tsx  # DCF dashboard
│   │   └── ...             # Financial statement views
│   ├── lib/                # Core logic
│   │   ├── gemini-client.ts      # Gemini API integration
│   │   ├── pdf-parser.ts         # PDF text extraction
│   │   ├── financial-logic.ts    # DCF calculations
│   │   ├── extraction-mapper.ts  # AI data mapping
│   │   └── extraction-types.ts   # TypeScript types
│   ├── store/              # Zustand state management
│   │   ├── useFinanceStore.ts    # Financial model state
│   │   └── useUploadStore.ts     # Upload workflow state
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── SECURITY.md            # Security guidelines
└── package.json           # Dependencies
```

## Configuration

### Environment Variables

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key (required)

### Tailwind Configuration

Custom terminal theme colors defined in `tailwind.config.js`:
- Background: zinc-950 (near black)
- Text: zinc-100 - zinc-500 (light grays)
- Accents: cyan-400 (data), emerald-400 (profits), red-400 (losses)

## Known Issues & Limitations

1. **API Key Security**: Frontend API key exposure (see SECURITY.md)
2. **No Persistence**: Data lost on page refresh (localStorage coming soon)
3. **No Authentication**: Anyone with URL can access
4. **Large Bundle Size**: ~2.2 MB uncompressed (PDF.js is heavy)
5. **Sample Companies Only**: No real-time market data integration

## Roadmap

- [ ] Backend API proxy for secure API calls
- [ ] User authentication and authorization
- [ ] LocalStorage persistence for models
- [ ] Save/load functionality
- [ ] Export to PDF/Excel
- [ ] Sensitivity analysis charts
- [ ] Scenario modeling (bull/base/bear)
- [ ] Real market data integration
- [ ] Comparables analysis (trading multiples)
- [ ] Bundle optimization (code splitting)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Gemini AI for powerful financial data extraction
- PDF.js by Mozilla for PDF parsing
- Bloomberg Terminal for UI inspiration
- The open-source community

## Support

For issues, questions, or contributions:
- Open a [GitHub Issue](https://github.com/yourusername/terminal-zero-finance/issues)
- Read the [Security Guidelines](SECURITY.md)
- Check the [Project Wiki](https://github.com/yourusername/terminal-zero-finance/wiki)

---

**Built with ❤️ for financial analysts who love terminal interfaces**
