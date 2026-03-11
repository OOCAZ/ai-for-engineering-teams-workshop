'use client';

import React, { useEffect, useState } from 'react';
import type { MarketIntelligenceData, Headline, Sentiment } from '@/types/market-intelligence';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarketIntelligenceWidgetProps {
  company: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSentimentBadgeClasses(label: Sentiment['label']): string {
  switch (label) {
    case 'positive':
      return 'text-green-600 bg-green-50';
    case 'negative':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-yellow-600 bg-yellow-50';
  }
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatUpdatedAt(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState(): React.JSX.Element {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading market intelligence data">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
    </div>
  );
}

function ErrorState(): React.JSX.Element {
  return (
    <div role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3">
      Unable to load market intelligence data. Please try again later.
    </div>
  );
}

interface HeadlineItemProps {
  headline: Headline;
}

function HeadlineItem({ headline }: HeadlineItemProps): React.JSX.Element {
  return (
    <li className="border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1">
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{headline.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        <span>{headline.source}</span>
        <span className="mx-1" aria-hidden="true">&middot;</span>
        <time dateTime={headline.publishedAt}>{formatDate(headline.publishedAt)}</time>
      </p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarketIntelligenceWidget({
  company,
}: MarketIntelligenceWidgetProps): React.JSX.Element {
  const [data, setData] = useState<MarketIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!company) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    setData(null);

    const encoded = encodeURIComponent(company);

    fetch(`/api/market-intelligence/${encoded}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<MarketIntelligenceData>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [company]);

  return (
    <section aria-label={`Market intelligence for ${company}`} className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
        Market Intelligence
      </h3>

      {isLoading && <LoadingState />}
      {!isLoading && hasError && <ErrorState />}

      {!isLoading && !hasError && data && (
        <>
          {/* Sentiment badge + metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getSentimentBadgeClasses(data.sentiment.label)}`}
              aria-label={`Market sentiment: ${data.sentiment.label}`}
            >
              {data.sentiment.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {data.articleCount} {data.articleCount === 1 ? 'article' : 'articles'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated{' '}
              <time dateTime={data.updatedAt}>{formatUpdatedAt(data.updatedAt)}</time>
            </span>
          </div>

          {/* Top 3 headlines */}
          {data.headlines.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Recent Headlines
              </p>
              <ul className="space-y-3" aria-label="Recent news headlines">
                {data.headlines.slice(0, 3).map((headline, i) => (
                  <HeadlineItem key={`${headline.source}-${i}`} headline={headline} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
