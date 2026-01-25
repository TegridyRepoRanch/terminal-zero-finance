// Error Boundary Component
// Catches React errors and displays fallback UI instead of crashing

import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // In production, you could send this to an error reporting service
    // Example: sendToErrorReporting(error, errorInfo);
  }

  handleReset = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-zinc-900 border border-red-500/30 rounded-lg p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                    Something went wrong
                  </h1>
                  <p className="text-zinc-400">
                    The application encountered an unexpected error. This has been logged for investigation.
                  </p>
                </div>
              </div>

              {/* Error Details (Development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="space-y-3">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <p className="text-sm font-mono text-red-400 mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>

                  {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                      <p className="text-sm font-semibold text-zinc-300 mb-2">
                        Component Stack:
                      </p>
                      <pre className="text-xs font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="
                    flex items-center gap-2 px-4 py-2
                    bg-emerald-600 hover:bg-emerald-500
                    text-white font-medium rounded-lg
                    transition-colors
                  "
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Application
                </button>
                <button
                  onClick={() => {
                    this.setState({
                      hasError: false,
                      error: null,
                      errorInfo: null,
                    });
                  }}
                  className="
                    px-4 py-2
                    text-zinc-400 hover:text-zinc-200
                    font-medium transition-colors
                  "
                >
                  Try Again
                </button>
              </div>

              {/* Help Text */}
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-500">
                  If this problem persists, try clearing your browser cache or contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
