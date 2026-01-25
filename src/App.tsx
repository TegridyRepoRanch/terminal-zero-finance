// Main App Component
import { useState } from 'react';
import { useFinanceStore } from './store/useFinanceStore';
import { useUploadStore } from './store/useUploadStore';
import { Sidebar } from './components/Sidebar';
import { TabNav } from './components/TabNav';
import { TickerSearch, CompanyHeader } from './components/TickerSearch';
import { IncomeStatement } from './components/IncomeStatement';
import { BalanceSheet } from './components/BalanceSheet';
import { CashFlowStatement } from './components/CashFlowStatement';
import { DepreciationSchedule } from './components/DepreciationSchedule';
import { DebtSchedule } from './components/DebtSchedule';
import { ValuationEngine } from './components/ValuationEngine';
import { UploadScreen, ProcessingScreen, ReviewScreen } from './components/upload';
import { AlertTriangle, X } from 'lucide-react';
import type { Assumptions } from './lib/financial-logic';

// App view states
type AppView = 'upload' | 'processing' | 'review' | 'model';

// Security Warning Banner - shows in development mode
function SecurityBanner({ onDismiss }: { onDismiss: () => void }) {
  const isDev = import.meta.env.DEV;

  if (!isDev) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Development Mode:</span> API keys are exposed in the browser.
            For production, use a backend proxy to secure your keys.
            <a
              href="https://github.com/TegridyRepoRanch/terminal-zero-finance#security"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline hover:text-amber-200"
            >
              Learn more
            </a>
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-amber-400 hover:text-amber-200 transition-colors"
          aria-label="Dismiss warning"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function MainContent() {
  const { activeTab } = useFinanceStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'income':
        return <IncomeStatement />;
      case 'balance':
        return <BalanceSheet />;
      case 'cashflow':
        return <CashFlowStatement />;
      case 'depreciation':
        return <DepreciationSchedule />;
      case 'debt':
        return <DebtSchedule />;
      case 'valuation':
        return <ValuationEngine />;
      default:
        return <ValuationEngine />;
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Ticker Search */}
      <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Financial Model</h1>
              <p className="text-xs text-zinc-500">Real-time DCF Valuation</p>
            </div>
            <TickerSearch />
          </div>
          <TabNav />
        </div>
      </header>

      {/* Company Header */}
      <div className="px-6 pt-4">
        <CompanyHeader />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
        {renderContent()}
      </div>

      {/* Footer */}
      <footer className="px-6 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>Terminal Zero v1.0</span>
          <span>DCF Valuation Workstation</span>
          <span className="text-emerald-500">● Live</span>
        </div>
      </footer>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>('upload');
  const [showSecurityBanner, setShowSecurityBanner] = useState(true);
  const { setAssumptionsFromExtraction } = useFinanceStore();
  const { metadata, reset: resetUpload } = useUploadStore();

  const handleFileSelected = () => {
    setView('processing');
  };

  const handleSkipToManual = () => {
    setView('model');
  };

  const handleProcessingComplete = () => {
    setView('review');
  };

  const handleProcessingError = () => {
    // Stay on processing screen - error will be displayed
    // User can cancel and go back to upload
  };

  const handleProcessingCancel = () => {
    resetUpload();
    setView('upload');
  };

  const handleReviewProceed = (assumptions: Assumptions) => {
    if (metadata) {
      setAssumptionsFromExtraction(assumptions, metadata);
    }
    setView('model');
  };

  const handleReviewBack = () => {
    resetUpload();
    setView('upload');
  };

  // Render content based on current view
  const renderView = () => {
    switch (view) {
      case 'upload':
        return (
          <UploadScreen
            onFileSelected={handleFileSelected}
            onSkip={handleSkipToManual}
          />
        );

      case 'processing':
        return (
          <ProcessingScreen
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
            onCancel={handleProcessingCancel}
          />
        );

      case 'review':
        return (
          <ReviewScreen
            onProceed={handleReviewProceed}
            onBack={handleReviewBack}
          />
        );

      case 'model':
      default:
        return (
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <MainContent />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300">
      {showSecurityBanner && (
        <SecurityBanner onDismiss={() => setShowSecurityBanner(false)} />
      )}
      {renderView()}
    </div>
  );
}
