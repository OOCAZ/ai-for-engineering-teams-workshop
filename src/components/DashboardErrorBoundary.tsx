'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// Props & State
// ---------------------------------------------------------------------------

export interface DashboardErrorBoundaryProps {
  onError?: (error: Error, info: React.ErrorInfo) => void;
  children: React.ReactNode;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Application-level error boundary.
 *
 * Catches any unhandled error thrown by child components and renders a
 * full-page recovery UI. In development mode the stack trace is shown;
 * in production only a friendly message is displayed.
 *
 * Accepts an optional `onError` callback as a hook point for production
 * error tracking (e.g., Sentry).
 */
export default class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ errorInfo: info });

    // Always log in development; in production delegate to the injected callback
    if (process.env.NODE_ENV === 'development') {
      console.error('[DashboardErrorBoundary] Caught error:', error, info);
    }

    this.props.onError?.(error, info);
  }

  handleReload(): void {
    window.location.reload();
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6"
      >
        <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl shadow-lg p-8 text-center">
          {/* Error icon */}
          <div
            className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100"
            aria-hidden="true"
          >
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-red-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-red-700 text-sm mb-6">
            The dashboard encountered an unexpected error. Your data is safe — reloading
            the page should resolve the issue.
          </p>

          {/* Development-only stack trace */}
          {isDev && this.state.error !== null && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-xs font-medium text-red-800 mb-2 select-none">
                Show error details (development only)
              </summary>
              <pre className="text-xs text-red-800 bg-red-100 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.message}
                {'\n\n'}
                {this.state.errorInfo?.componentStack ?? ''}
              </pre>
            </details>
          )}

          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 1119.42 15"
              />
            </svg>
            Reload dashboard
          </button>
        </div>
      </div>
    );
  }
}
