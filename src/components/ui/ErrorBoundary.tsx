// Comprehensive Error Boundary Components
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

// =============================================================================
// ERROR TYPES
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  resetKeys?: unknown[];
}

// =============================================================================
// MAIN ERROR BOUNDARY
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error boundary when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasKeyChanged) {
        this.resetError();
      }
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Render appropriate error UI based on level
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          level={level}
          onReset={this.resetError}
          showDetails={showDetails}
          onToggleDetails={this.toggleDetails}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// ERROR FALLBACK UI
// =============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  level: 'page' | 'section' | 'component';
  onReset: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

function ErrorFallback({
  error,
  errorInfo,
  level,
  onReset,
  showDetails,
  onToggleDetails,
}: ErrorFallbackProps) {
  const isPageLevel = level === 'page';
  const isSectionLevel = level === 'section';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isPageLevel && 'min-h-screen bg-zinc-950 p-8',
        isSectionLevel && 'min-h-[300px] bg-zinc-900/50 rounded-lg border border-zinc-800 p-6',
        level === 'component' && 'min-h-[100px] bg-zinc-900/30 rounded-lg border border-zinc-800 p-4'
      )}
    >
      {/* Error Icon */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          isPageLevel && 'bg-red-600/20 p-6',
          isSectionLevel && 'bg-red-600/20 p-4',
          level === 'component' && 'bg-red-600/20 p-3'
        )}
      >
        <AlertTriangle
          className={cn(
            'text-red-400',
            isPageLevel && 'w-12 h-12',
            isSectionLevel && 'w-8 h-8',
            level === 'component' && 'w-6 h-6'
          )}
        />
      </div>

      {/* Error Title */}
      <h2
        className={cn(
          'font-bold text-zinc-100 mb-2',
          isPageLevel && 'text-2xl',
          isSectionLevel && 'text-lg',
          level === 'component' && 'text-sm'
        )}
      >
        {isPageLevel
          ? 'Something went wrong'
          : isSectionLevel
          ? 'This section encountered an error'
          : 'Component error'}
      </h2>

      {/* Error Message */}
      <p
        className={cn(
          'text-zinc-400 mb-4 max-w-md',
          isPageLevel && 'text-base',
          isSectionLevel && 'text-sm',
          level === 'component' && 'text-xs'
        )}
      >
        {error?.message || 'An unexpected error occurred.'}
      </p>

      {/* Action Buttons */}
      <div className={cn('flex gap-2', level === 'component' && 'flex-col')}>
        <button
          onClick={onReset}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            'bg-emerald-600 text-white hover:bg-emerald-500',
            level === 'component' && 'text-xs px-3 py-1.5'
          )}
        >
          <RefreshCw size={level === 'component' ? 12 : 16} />
          Try again
        </button>

        {isPageLevel && (
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
          >
            <Home size={16} />
            Reload page
          </button>
        )}
      </div>

      {/* Error Details Toggle */}
      {(isPageLevel || isSectionLevel) && (
        <button
          onClick={onToggleDetails}
          className={cn(
            'flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors mt-4',
            isPageLevel ? 'text-sm' : 'text-xs'
          )}
        >
          <Bug size={isPageLevel ? 14 : 12} />
          {showDetails ? 'Hide' : 'Show'} technical details
          {showDetails ? (
            <ChevronUp size={isPageLevel ? 14 : 12} />
          ) : (
            <ChevronDown size={isPageLevel ? 14 : 12} />
          )}
        </button>
      )}

      {/* Error Details */}
      {showDetails && (
        <div
          className={cn(
            'mt-4 text-left w-full max-w-2xl',
            isPageLevel ? 'text-xs' : 'text-[10px]'
          )}
        >
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-4 overflow-auto max-h-[300px]">
            <p className="text-red-400 font-mono mb-2">
              {error?.name}: {error?.message}
            </p>
            {error?.stack && (
              <pre className="text-zinc-500 font-mono whitespace-pre-wrap text-[10px]">
                {error.stack}
              </pre>
            )}
            {errorInfo?.componentStack && (
              <>
                <p className="text-zinc-400 font-semibold mt-4 mb-1">Component Stack:</p>
                <pre className="text-zinc-500 font-mono whitespace-pre-wrap text-[10px]">
                  {errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SPECIALIZED ERROR BOUNDARIES
// =============================================================================

/**
 * Page-level error boundary - catches errors at the top level
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        // Could send to error tracking service here
        console.error('[Page Error]', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Section-level error boundary - for major UI sections
 */
export function SectionErrorBoundary({
  children,
  name,
  resetKeys,
}: {
  children: ReactNode;
  name?: string;
  resetKeys?: unknown[];
}) {
  return (
    <ErrorBoundary
      level="section"
      resetKeys={resetKeys}
      onError={(error) => {
        console.error(`[Section Error: ${name || 'unnamed'}]`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-level error boundary - for individual components
 */
export function ComponentErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary level="component" fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// CHART ERROR BOUNDARY
// =============================================================================

/**
 * Specialized error boundary for charts
 */
export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="component"
      fallback={
        <div className="flex items-center justify-center h-full min-h-[200px] bg-zinc-900/30 rounded-lg border border-zinc-800">
          <div className="text-center p-4">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Unable to render chart</p>
            <p className="text-xs text-zinc-500 mt-1">Check data validity</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// CALCULATION ERROR BOUNDARY
// =============================================================================

/**
 * Specialized error boundary for financial calculations
 */
export function CalculationErrorBoundary({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: (error: Error) => void;
}) {
  return (
    <ErrorBoundary
      level="section"
      onError={(error) => {
        console.error('[Calculation Error]', error);
        onError?.(error);
      }}
      fallback={
        <div className="flex items-center justify-center min-h-[200px] bg-zinc-900/50 rounded-lg border border-red-900/50">
          <div className="text-center p-6">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Calculation Error</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Unable to compute financial projections with current inputs.
            </p>
            <p className="text-xs text-zinc-500">
              Try adjusting assumptions (e.g., reduce growth rate, increase WACC)
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// ASYNC ERROR BOUNDARY (FOR SUSPENSE)
// =============================================================================

/**
 * Error boundary that works with React Suspense
 */
export function AsyncBoundary({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadingFallback: _loadingFallback,
  errorFallback,
}: {
  children: ReactNode;
  loadingFallback: ReactNode;
  errorFallback?: ReactNode;
}) {
  // Note: React.Suspense would wrap the children with loadingFallback
  // This is a placeholder for the pattern - loadingFallback would be used with Suspense
  return (
    <ErrorBoundary level="section" fallback={errorFallback}>
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// ERROR BOUNDARY HOOKS (FOR FUNCTIONAL COMPONENTS)
// =============================================================================

/**
 * Hook to manually throw errors within error boundaries
 * Useful for async errors that can't be caught by componentDidCatch
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}
