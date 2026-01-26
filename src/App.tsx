// Main App Component
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { useFinanceStore } from './store/useFinanceStore';
import { useUploadStore } from './store/useUploadStore';
import { Sidebar } from './components/Sidebar';
import { TabNav } from './components/TabNav';
import { TickerSearch, CompanyHeader } from './components/TickerSearch';
import { KeyboardShortcutsHelp, ThemeToggle, PageErrorBoundary, SectionErrorBoundary } from './components/ui';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AlertTriangle, X, Info } from 'lucide-react';
import type { Assumptions } from './lib/financial-logic';
import { validateConfig, getConfigMode } from './lib/api-config';
import { fetchCsrfToken } from './lib/backend-client';

// Lazy load heavy components
const IncomeStatement = lazy(() => import('./components/IncomeStatement').then(m => ({ default: m.IncomeStatement })));
const BalanceSheet = lazy(() => import('./components/BalanceSheet').then(m => ({ default: m.BalanceSheet })));
const CashFlowStatement = lazy(() => import('./components/CashFlowStatement').then(m => ({ default: m.CashFlowStatement })));
const DepreciationSchedule = lazy(() => import('./components/DepreciationSchedule').then(m => ({ default: m.DepreciationSchedule })));
const DebtSchedule = lazy(() => import('./components/DebtSchedule').then(m => ({ default: m.DebtSchedule })));
const ValuationEngine = lazy(() => import('./components/ValuationEngine').then(m => ({ default: m.ValuationEngine })));

// Lazy load upload flow (includes PDF.js)
const UploadScreen = lazy(() => import('./components/upload').then(m => ({ default: m.UploadScreen })));
const ProcessingScreen = lazy(() => import('./components/upload').then(m => ({ default: m.ProcessingScreen })));
const ReviewScreen = lazy(() => import('./components/upload').then(m => ({ default: m.ReviewScreen })));

// Loading fallback component
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}

// App view states
type AppView = 'upload' | 'processing' | 'review' | 'model';

// Configuration Status Banner - shows validation warnings and mode info
function ConfigStatusBanner({ onDismiss }: { onDismiss: () => void }) {
  const isDev = import.meta.env.DEV;
  const validation = validateConfig();
  const mode = getConfigMode();

  // Don't show anything in production backend mode (all good)
  if (!isDev && mode === 'backend') return null;

  // Don't show anything if we're in backend mode in dev (user is doing it right)
  if (isDev && mode === 'backend' && validation.warnings.length === 0) {
    return null;
  }

  // Determine banner style based on mode and validation
  let bgColor = 'bg-zinc-800/50 border-zinc-700';
  let textColor = 'text-zinc-400';
  let iconColor = 'text-zinc-400';
  let Icon = Info;
  let title = 'Info';

  if (mode === 'legacy') {
    bgColor = 'bg-amber-500/10 border-amber-500/30';
    textColor = 'text-amber-300';
    iconColor = 'text-amber-400';
    Icon = AlertTriangle;
    title = 'Security Warning';
  } else if (validation.warnings.length > 0) {
    bgColor = 'bg-blue-500/10 border-blue-500/30';
    textColor = 'text-blue-300';
    iconColor = 'text-blue-400';
    Icon = Info;
    title = 'Configuration Notice';
  }

  // Build message based on mode
  let message = '';
  if (mode === 'legacy') {
    message = 'Running in LEGACY mode - API keys exposed in browser. Switch to backend mode for production.';
  } else if (mode === 'backend' && validation.warnings.length > 0) {
    message = validation.warnings[0]; // Show first warning
  }

  if (!message) return null;

  return (
    <div className={`border-b ${bgColor} px-4 py-2`}>
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
          <p className={`text-xs ${textColor}`}>
            <span className="font-semibold">{title}:</span> {message}
            {mode === 'legacy' && (
              <a
                href="/BACKEND_SETUP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline hover:opacity-80"
              >
                Setup Backend
              </a>
            )}
            {validation.warnings.length > 1 && (
              <span className="ml-2 opacity-75">
                (+{validation.warnings.length - 1} more)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className={`p-1 ${iconColor} hover:opacity-80 transition-opacity`}
          aria-label="Dismiss notice"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Configuration Error Screen - shows when config is invalid
function ConfigErrorScreen({ validation }: { validation: ReturnType<typeof validateConfig> }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-300 p-8">
      <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/30 rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <h1 className="text-2xl font-bold text-red-400">Configuration Error</h1>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-zinc-300">
            The application cannot start due to missing or invalid configuration.
          </p>

          <div className="bg-zinc-950 border border-red-500/20 rounded p-4">
            <h2 className="font-semibold text-red-400 mb-2">Errors:</h2>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validation.errors.map((error, i) => (
                <li key={i} className="text-zinc-400">{error}</li>
              ))}
            </ul>
          </div>

          {validation.warnings.length > 0 && (
            <div className="bg-zinc-950 border border-amber-500/20 rounded p-4">
              <h2 className="font-semibold text-amber-400 mb-2">Warnings:</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validation.warnings.map((warning, i) => (
                  <li key={i} className="text-zinc-400">{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3">
          <h2 className="font-semibold text-zinc-100">Quick Setup:</h2>
          <div className="space-y-2 text-sm">
            <p className="text-zinc-400"><span className="font-semibold">Option 1 (Recommended):</span> Backend Mode</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-500 ml-4">
              <li>Copy <code className="text-cyan-400">.env.example</code> to <code className="text-cyan-400">.env</code></li>
              <li>Set <code className="text-cyan-400">VITE_BACKEND_URL=http://localhost:3001</code></li>
              <li>Follow <a href="/BACKEND_SETUP.md" className="text-cyan-400 underline">BACKEND_SETUP.md</a> to start the backend</li>
              <li>Reload this page</li>
            </ol>

            <p className="text-zinc-400 mt-4"><span className="font-semibold">Option 2 (Development Only):</span> Legacy Mode</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-500 ml-4">
              <li>Copy <code className="text-cyan-400">.env.example</code> to <code className="text-cyan-400">.env</code></li>
              <li>Add your API keys: <code className="text-cyan-400">VITE_GEMINI_API_KEY</code> and <code className="text-cyan-400">VITE_ANTHROPIC_API_KEY</code></li>
              <li>Reload this page</li>
              <li className="text-amber-400">⚠️ WARNING: This exposes API keys in the browser</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href="/BACKEND_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-center rounded transition-colors"
          >
            View Setup Guide
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

function MainContent() {
  const { activeTab } = useFinanceStore();

  // Enable keyboard navigation
  useKeyboardShortcuts();

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
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-950 dark:bg-zinc-950"
        role="banner"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-100">Financial Model</h1>
              <p className="text-xs text-zinc-500">Real-time DCF Valuation</p>
            </div>
            <TickerSearch />
            <div className="ml-auto sm:ml-0 flex items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
          <TabNav />
        </div>
      </header>

      {/* Company Header */}
      <div className="px-6 pt-4">
        <CompanyHeader />
      </div>

      {/* Content */}
      <div id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950" role="main">
        <Suspense fallback={<ComponentLoader />}>
          {renderContent()}
        </Suspense>
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
  const [showConfigBanner, setShowConfigBanner] = useState(true);
  const [configValidation, setConfigValidation] = useState(() => validateConfig());
  const { setAssumptionsFromExtraction } = useFinanceStore();
  const { metadata, reset: resetUpload } = useUploadStore();

  // Validate configuration on mount
  useEffect(() => {
    const validation = validateConfig();
    setConfigValidation(validation);

    // Log configuration status to console
    if (validation.isValid) {
      console.log(`✅ Configuration valid - Running in ${validation.mode.toUpperCase()} mode`);
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
      }
    } else {
      console.error('❌ Configuration errors:', validation.errors);
    }
  }, []);

  // Fetch CSRF token on mount (backend mode only)
  useEffect(() => {
    const mode = getConfigMode();
    if (mode === 'backend') {
      fetchCsrfToken().catch((error: Error) => {
        console.error('[CSRF] Failed to fetch token on mount:', error);
      });
    }
  }, []);

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

  // Show error screen if configuration is invalid
  if (!configValidation.isValid) {
    return <ConfigErrorScreen validation={configValidation} />;
  }

  return (
    <PageErrorBoundary>
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 dark:bg-zinc-950 dark:text-zinc-300">
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b',
            color: '#d4d4d8',
            border: '1px solid #27272a',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#18181b',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#18181b',
            },
          },
        }}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp />

      {showConfigBanner && (
        <ConfigStatusBanner onDismiss={() => setShowConfigBanner(false)} />
      )}
      <SectionErrorBoundary name="main-content">
        <Suspense fallback={<ComponentLoader />}>
          {renderView()}
        </Suspense>
      </SectionErrorBoundary>
    </div>
    </PageErrorBoundary>
  );
}
