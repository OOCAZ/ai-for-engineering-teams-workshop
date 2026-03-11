'use client';

import React, { Suspense, lazy } from 'react';
import type { Alert } from '@/types/alerts';
import type { PredictiveIntelligencePanelProps } from '@/types/market-intelligence';
import { alertEngine } from '@/lib/alerts';

// Lazy-load the market widget so it does not block initial dashboard render
const MarketIntelligenceWidget = lazy(
  () => import('@/components/MarketIntelligenceWidget'),
);

// Re-export the props interface as a named export per project conventions
export type { PredictiveIntelligencePanelProps };

// ---------------------------------------------------------------------------
// Alert row sub-components
// ---------------------------------------------------------------------------

interface AlertRowProps {
  alert: Alert;
}

function AlertRow({ alert }: AlertRowProps): React.JSX.Element {
  const isHigh = alert.priority === 'high';
  const rowClasses = isHigh
    ? 'bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-3 rounded mb-2'
    : 'bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 p-3 rounded mb-2';

  return (
    <div
      role="listitem"
      className={rowClasses}
      aria-label={`${alert.priority === 'high' ? 'High' : 'Medium'} priority alert: ${alert.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isHigh ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
            {alert.title}
          </p>
          <p className={`text-sm mt-0.5 ${isHigh ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
            {alert.description}
          </p>
          <p className={`text-xs mt-1.5 italic ${isHigh ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            Recommended: {alert.recommendedAction}
          </p>
        </div>
        <span
          className={`flex-shrink-0 inline-block w-2.5 h-2.5 rounded-full mt-0.5 ${isHigh ? 'bg-red-500' : 'bg-yellow-500'}`}
          aria-label={`Priority: ${alert.priority}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Correlation insight callout
// ---------------------------------------------------------------------------

interface CorrelationCalloutProps {
  hasHighPriorityAlert: boolean;
  hasNegativeSentiment: boolean;
}

function CorrelationCallout({
  hasHighPriorityAlert,
  hasNegativeSentiment,
}: CorrelationCalloutProps): React.JSX.Element | null {
  if (!hasHighPriorityAlert || !hasNegativeSentiment) {
    return null;
  }

  return (
    <div
      role="note"
      aria-label="Correlation insight: market and account risk signals detected"
      className="bg-orange-50 dark:bg-orange-950 border border-orange-300 dark:border-orange-700 rounded p-3 text-sm text-orange-800 dark:text-orange-200 mb-4"
    >
      <span className="font-semibold">Correlation insight: </span>
      Market headwinds may be contributing to engagement decline. Consider external market conditions when crafting your outreach strategy.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market widget wrapper — independent failure boundary
// ---------------------------------------------------------------------------

function MarketWidgetFallback(): React.JSX.Element {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading market data">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  );
}

interface MarketSectionProps {
  company: string;
}

function MarketSection({ company }: MarketSectionProps): React.JSX.Element {
  return (
    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
      <Suspense fallback={<MarketWidgetFallback />}>
        <MarketIntelligenceWidget company={company} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PredictiveIntelligencePanel({
  alertInput,
  company,
  isLoading = false,
}: PredictiveIntelligencePanelProps): React.JSX.Element {
  // Run the alert engine only when input is available
  const engineResult = alertInput ? alertEngine(alertInput) : null;
  const alerts: Alert[] = engineResult?.alerts ?? [];
  const hasAlerts = alerts.length > 0;
  const hasHighPriorityAlert = alerts.some((a) => a.priority === 'high');

  // Correlation insight depends on sentiment from the market widget.
  // We use a state-lifting pattern via a child-to-parent callback to know
  // whether negative sentiment was returned. For simplicity and to keep
  // the panel independent from the market fetch lifecycle, we use a
  // conservative approach: render the callout conditionally after the
  // market widget has loaded (tracked via internal state).
  //
  // Because MarketIntelligenceWidget owns its own fetch state, we read
  // sentiment indirectly: we compute it here via the same mock data path
  // for the correlation callout only — the widget still renders independently.
  // To avoid duplicating the fetch, we pass a stable `onSentimentLoad` prop
  // but the simpler spec-compliant approach is to track it from the widget.
  // Per spec: "when a high-priority alert AND negative market sentiment are both present"
  // We implement this by passing a callback down to observe the loaded sentiment.

  const [negativeMarketSentiment, setNegativeMarketSentiment] = React.useState<boolean>(false);

  return (
    <article
      aria-label="Predictive intelligence panel"
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2"
    >
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">
        Predictive Intelligence
      </h2>

      {/* ---- Alerts section ---- */}
      <section aria-label="Active alerts">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Active Alerts
        </h3>

        {isLoading && (
          <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading alerts">
            <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
        )}

        {!isLoading && !hasAlerts && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-4 text-center">
            No active alerts for this account.
          </div>
        )}

        {!isLoading && hasAlerts && (
          <>
            {/* Correlation callout — shown when high alert + negative sentiment */}
            <CorrelationCallout
              hasHighPriorityAlert={hasHighPriorityAlert}
              hasNegativeSentiment={negativeMarketSentiment}
            />

            <div role="list" aria-label="Alert list">
              {alerts.map((alert, i) => (
                <AlertRow key={`${alert.type}-${i}`} alert={alert} />
              ))}
            </div>

            {engineResult && engineResult.suppressedCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {engineResult.suppressedCount} alert{engineResult.suppressedCount !== 1 ? 's' : ''} suppressed by cooldown.
              </p>
            )}
          </>
        )}
      </section>

      {/* ---- Market section (independent failure boundary) ---- */}
      <SentimentObserver
        company={company}
        onNegativeSentiment={setNegativeMarketSentiment}
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sentinel component that embeds the widget AND observes its sentiment output
// ---------------------------------------------------------------------------
// We wrap the widget in a thin component that fetches sentiment independently
// for the correlation callout, while rendering the full widget for the user.

interface SentimentObserverProps {
  company: string;
  onNegativeSentiment: (isNegative: boolean) => void;
}

function SentimentObserver({
  company,
  onNegativeSentiment,
}: SentimentObserverProps): React.JSX.Element {
  React.useEffect(() => {
    if (!company) return;

    let cancelled = false;
    const encoded = encodeURIComponent(company);

    fetch(`/api/market-intelligence/${encoded}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { sentiment?: { label?: string } } | null) => {
        if (!cancelled) {
          onNegativeSentiment(json?.sentiment?.label === 'negative');
        }
      })
      .catch(() => {
        if (!cancelled) onNegativeSentiment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [company, onNegativeSentiment]);

  return <MarketSection company={company} />;
}
