'use client';

import React, {
  Suspense,
  lazy,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { mockCustomers, Customer } from '@/data/mock-customers';
import type { HealthScoreInput } from '@/lib/healthCalculator';
import type { AlertEngineInput } from '@/types/alerts';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import { exportToCSV, exportToJSON, type ExportableData } from '@/lib/exportUtils';

// ---------------------------------------------------------------------------
// Lazy-loaded widgets — each widget is its own code-split chunk
// ---------------------------------------------------------------------------

const CustomerSelector = lazy(() => import('@/components/CustomerSelector'));
const CustomerCard = lazy(() => import('@/components/CustomerCard'));
const CustomerHealthDisplay = lazy(() => import('@/components/CustomerHealthDisplay'));
const PredictiveIntelligencePanel = lazy(
  () => import('@/components/PredictiveIntelligencePanel'),
);

// ---------------------------------------------------------------------------
// Suspense fallback shared by all widgets
// ---------------------------------------------------------------------------

function WidgetSkeleton({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse"
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock health-score input builder
// Derives a HealthScoreInput from a Customer for demo purposes
// ---------------------------------------------------------------------------

function buildHealthScoreInput(customer: Customer): HealthScoreInput {
  // Map the customer's healthScore to plausible factor inputs
  const score = customer.healthScore;
  return {
    payment: {
      daysSinceLastPayment: score > 70 ? 15 : score > 30 ? 45 : 75,
      averagePaymentDelayDays: score > 70 ? 0 : score > 30 ? 5 : 15,
      overdueAmountUsd: score > 70 ? 0 : score > 30 ? 500 : 3000,
    },
    engagement: {
      loginFrequencyPerMonth: Math.round((score / 100) * 20),
      featureUsageCount: Math.round((score / 100) * 10),
      openSupportTickets: score > 70 ? 0 : score > 30 ? 1 : 3,
      loginFrequency30DayAvg: Math.round((score / 100) * 20),
      newFeaturesUsedLast30Days: score > 50 ? 2 : 0,
    },
    contract: {
      daysUntilRenewal: score > 70 ? 200 : score > 30 ? 85 : 25,
      contractValueUsd:
        customer.subscriptionTier === 'enterprise'
          ? 50000
          : customer.subscriptionTier === 'premium'
            ? 15000
            : 5000,
      recentUpgrades: score > 70 ? 1 : 0,
    },
    support: {
      averageResolutionTimeDays: score > 70 ? 1 : score > 30 ? 3 : 7,
      satisfactionScore: score > 70 ? 4.5 : score > 30 ? 3 : 2,
      escalationCount: score > 70 ? 0 : score > 30 ? 0 : 1,
      ticketsLast7Days: score > 70 ? 1 : score > 30 ? 2 : 5,
      hasEscalatedTicket: score <= 30,
    },
  };
}

function buildAlertEngineInput(customer: Customer): AlertEngineInput {
  const score = customer.healthScore;
  return {
    customerId: customer.id,
    healthScore: score,
    payment: {
      overdueAmountUsd: score > 70 ? 0 : score > 30 ? 500 : 3000,
      daysSinceLastPayment: score > 70 ? 15 : score > 30 ? 45 : 75,
    },
    engagement: {
      loginFrequencyPerMonth: Math.round((score / 100) * 20),
      loginFrequency30DayAvg: Math.round((score / 100) * 20) + (score < 50 ? 10 : 0),
      newFeaturesUsedLast30Days: score > 50 ? 2 : 0,
    },
    contract: {
      daysUntilRenewal: score > 70 ? 200 : score > 30 ? 85 : 25,
      contractValueUsd:
        customer.subscriptionTier === 'enterprise'
          ? 50000
          : customer.subscriptionTier === 'premium'
            ? 15000
            : 5000,
      recentUpgrades: score > 70 ? 1 : 0,
    },
    support: {
      ticketsLast7Days: score > 70 ? 1 : score > 30 ? 2 : 5,
      hasEscalatedTicket: score <= 30,
    },
    healthHistory: {
      scoreSevenDaysAgo: Math.min(100, score + (score < 50 ? 25 : 5)),
    },
  };
}

// ---------------------------------------------------------------------------
// Export toolbar
// ---------------------------------------------------------------------------

interface ExportToolbarProps {
  customers: Customer[];
}

function ExportToolbar({ customers }: ExportToolbarProps): React.JSX.Element {
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const exportData = useMemo<ExportableData[]>(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        healthScore: c.healthScore,
        subscriptionTier: c.subscriptionTier ?? null,
        email: c.email ?? null,
      })),
    [customers],
  );

  function handleCancel(): void {
    abortRef.current?.abort();
    setProgress(null);
  }

  function handleExportCSV(): void {
    abortRef.current = new AbortController();
    setProgress(0);
    try {
      exportToCSV(exportData, 'customers', {
        signal: abortRef.current.signal,
        onProgress: (pct) => setProgress(pct),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled — already reset by handleCancel
      }
    } finally {
      setProgress(null);
    }
  }

  function handleExportJSON(): void {
    abortRef.current = new AbortController();
    setProgress(0);
    try {
      exportToJSON(exportData, 'customers', {
        signal: abortRef.current.signal,
        onProgress: (pct) => setProgress(pct),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled — already reset by handleCancel
      }
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap" aria-label="Export options">
      {progress !== null ? (
        <>
          <div
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            aria-live="polite"
            aria-label={`Export progress: ${progress}%`}
          >
            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="tabular-nums text-xs">{progress}%</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
            Export:
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
            aria-label="Export customer data as CSV file"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
            aria-label="Export customer data as JSON file"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            JSON
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard page
// ---------------------------------------------------------------------------

export default function Home(): React.JSX.Element {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSelectCustomer = useCallback((customer: Customer): void => {
    setSelectedCustomer(customer);
  }, []);

  const healthInput = useMemo<HealthScoreInput | null>(
    () => (selectedCustomer ? buildHealthScoreInput(selectedCustomer) : null),
    [selectedCustomer],
  );

  const alertInput = useMemo<AlertEngineInput | null>(
    () => (selectedCustomer ? buildAlertEngineInput(selectedCustomer) : null),
    [selectedCustomer],
  );

  return (
    <DashboardErrorBoundary>
      {/* Skip link — first focusable element for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Site header / nav landmark */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Customer Intelligence Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Monitor customer health, alerts, and market signals in one place.
              </p>
            </div>

            <nav aria-label="Dashboard actions">
              <ExportToolbar customers={mockCustomers} />
            </nav>
          </div>
        </header>

        {/* Main content landmark */}
        <main id="main-content" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Live region for dynamic updates (alert/score changes) */}
          <div
            aria-live="polite"
            aria-atomic="false"
            className="sr-only"
            id="dashboard-live-region"
          >
            {selectedCustomer
              ? `Selected customer: ${selectedCustomer.name}, ${selectedCustomer.company}, health score ${selectedCustomer.healthScore}.`
              : 'No customer selected.'}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ---- Left column: Customer selector ---- */}
            <aside
              aria-label="Customer list"
              className="lg:col-span-1 space-y-4"
            >
              <section aria-labelledby="selector-heading">
                <h2
                  id="selector-heading"
                  className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3"
                >
                  Customers
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({mockCustomers.length})
                  </span>
                </h2>

                <WidgetErrorBoundary widgetName="CustomerSelector">
                  <Suspense fallback={<WidgetSkeleton label="customer selector" />}>
                    <CustomerSelector
                      customers={mockCustomers}
                      selectedCustomerId={selectedCustomer?.id}
                      onSelect={handleSelectCustomer}
                    />
                  </Suspense>
                </WidgetErrorBoundary>
              </section>
            </aside>

            {/* ---- Right columns: Detail widgets ---- */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selected customer card */}
              {selectedCustomer !== null ? (
                <>
                  <section aria-labelledby="selected-customer-heading">
                    <h2
                      id="selected-customer-heading"
                      className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3"
                    >
                      Selected Customer
                    </h2>
                    <WidgetErrorBoundary widgetName="CustomerCard">
                      <Suspense fallback={<WidgetSkeleton label="customer card" />}>
                        <CustomerCard customer={selectedCustomer} />
                      </Suspense>
                    </WidgetErrorBoundary>
                  </section>

                  {/* Health display */}
                  <section aria-labelledby="health-heading">
                    <h2
                      id="health-heading"
                      className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3"
                    >
                      Health Score
                    </h2>
                    <WidgetErrorBoundary widgetName="CustomerHealthDisplay">
                      <Suspense fallback={<WidgetSkeleton label="health display" />}>
                        <CustomerHealthDisplay
                          input={healthInput}
                          alertEngineInput={null}
                        />
                      </Suspense>
                    </WidgetErrorBoundary>
                  </section>

                  {/* Predictive intelligence + market widget */}
                  <section aria-labelledby="predictive-heading">
                    <h2
                      id="predictive-heading"
                      className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3"
                    >
                      Predictive Intelligence
                    </h2>
                    <WidgetErrorBoundary widgetName="PredictiveIntelligencePanel">
                      <Suspense
                        fallback={<WidgetSkeleton label="predictive intelligence panel" />}
                      >
                        <PredictiveIntelligencePanel
                          alertInput={alertInput}
                          company={selectedCustomer.company}
                        />
                      </Suspense>
                    </WidgetErrorBoundary>
                  </section>
                </>
              ) : (
                /* Empty state when no customer is selected */
                <div
                  className="flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12"
                  aria-label="No customer selected"
                >
                  <div
                    className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4"
                    aria-hidden="true"
                  >
                    <svg
                      className="w-6 h-6 text-gray-400 dark:text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Select a customer to view details
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Choose a customer from the list on the left to see their health
                    score, active alerts, and market intelligence.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer landmark */}
        <footer className="mt-12 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customer Intelligence Dashboard — AI for Engineering Teams Workshop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Health scores update on customer selection.
            </p>
          </div>
        </footer>
      </div>
    </DashboardErrorBoundary>
  );
}
