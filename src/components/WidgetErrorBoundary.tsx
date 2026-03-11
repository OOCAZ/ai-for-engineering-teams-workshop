'use client';

import React from 'react';
import { WidgetError } from '@/types/errors';

// ---------------------------------------------------------------------------
// Props & State
// ---------------------------------------------------------------------------

export interface WidgetErrorBoundaryProps {
  widgetName: string;
  onError?: (error: WidgetError) => void;
  children: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Widget-level error boundary.
 *
 * Isolates individual widget failures so the rest of the dashboard remains
 * functional. Provides a "Try again" button that resets the error state.
 * After MAX_AUTO_RETRIES (3) failed re-renders the retry button is still
 * shown but labeled to indicate manual intervention is needed.
 *
 * In development mode the error message is displayed inline; in production
 * only a friendly fallback is shown.
 */
export default class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const widgetError =
      error instanceof WidgetError
        ? error
        : new WidgetError(error.message, this.props.widgetName, {
            stack: error.stack ?? '',
            componentStack: info.componentStack ?? '',
          });

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[WidgetErrorBoundary:${this.props.widgetName}] Caught error:`,
        widgetError,
        info,
      );
    }

    this.props.onError?.(widgetError);
  }

  handleRetry(): void {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = process.env.NODE_ENV === 'development';
    const exhausted = this.state.retryCount >= MAX_AUTO_RETRIES;

    return (
      <div
        role="alert"
        aria-live="polite"
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 mt-0.5 w-5 h-5 text-red-500"
            aria-hidden="true"
          >
            <svg
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
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">
              {this.props.widgetName} failed to load.
            </p>

            {isDev && this.state.error !== null && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-mono break-words">
                {this.state.error.message}
              </p>
            )}

            {!isDev && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                An unexpected error occurred. The rest of the dashboard is unaffected.
              </p>
            )}

            {exhausted ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This widget is repeatedly failing. Please{' '}
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                >
                  try again
                </button>{' '}
                or reload the dashboard.
              </p>
            ) : (
              <button
                type="button"
                onClick={this.handleRetry}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
