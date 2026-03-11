'use client';

/**
 * CustomerHealthDisplay.tsx
 *
 * Unified health-monitoring widget that shows:
 * - Overall health score with a color-coded circular gauge
 * - Risk level label (Healthy / Warning / Critical)
 * - Expandable factor-score breakdown
 * - Active alerts grouped by priority with recommended actions
 *
 * Supports loading skeleton and graceful error/empty states.
 */

import React, { useMemo, useState } from 'react';
import {
  calculateHealthScore,
  HealthScoreInput,
  HealthScoreResult,
} from '@/lib/healthCalculator';
import {
  alertEngine,
  Alert,
  AlertEngineInput,
  AlertEngineResult,
} from '@/lib/alerts';

// ---------------------------------------------------------------------------
// Props interface
// ---------------------------------------------------------------------------

export interface CustomerHealthDisplayProps {
  input: HealthScoreInput | null;
  alertEngineInput?: AlertEngineInput | null;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): { text: string; ring: string; bg: string } {
  if (score <= 30) return { text: 'text-red-600', ring: 'stroke-red-500', bg: 'bg-red-100' };
  if (score <= 70) return { text: 'text-yellow-500', ring: 'stroke-yellow-500', bg: 'bg-yellow-100' };
  return { text: 'text-green-600', ring: 'stroke-green-500', bg: 'bg-green-100' };
}

function getRiskLabel(riskLevel: HealthScoreResult['riskLevel']): string {
  switch (riskLevel) {
    case 'critical': return 'Critical';
    case 'warning': return 'Warning';
    case 'healthy': return 'Healthy';
  }
}

function getRiskLabelColor(riskLevel: HealthScoreResult['riskLevel']): string {
  switch (riskLevel) {
    case 'critical': return 'text-red-700 bg-red-100';
    case 'warning': return 'text-yellow-700 bg-yellow-100';
    case 'healthy': return 'text-green-700 bg-green-100';
  }
}

// ---------------------------------------------------------------------------
// Circular gauge SVG
// ---------------------------------------------------------------------------

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

function ScoreGauge({ score, size = 96 }: ScoreGaugeProps): React.JSX.Element {
  const { text, ring } = getScoreColor(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Health score gauge: ${score} out of 100`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={8}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={ring}
          strokeWidth={8}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      {/* Score label in center */}
      <span
        className={`absolute text-xl font-bold tabular-nums ${text}`}
        aria-hidden="true"
      >
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factor breakdown row
// ---------------------------------------------------------------------------

interface FactorRowProps {
  label: string;
  score: number;
  weight: number;
  contribution: number;
}

function FactorRow({ label, score, weight, contribution }: FactorRowProps): React.JSX.Element {
  const { bg, text } = getScoreColor(score);
  const weightPct = `${Math.round(weight * 100)}%`;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-28 text-sm text-gray-600 dark:text-gray-400 shrink-0">{label}</span>
      {/* Mini bar */}
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${bg.replace('bg-', 'bg-').replace('100', '400')}`}
          style={{ width: `${score}%` }}
          aria-hidden="true"
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${text}`}>{score}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-10 text-right">{weightPct}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right tabular-nums">
        {contribution.toFixed(1)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert row
// ---------------------------------------------------------------------------

interface AlertRowProps {
  alert: Alert;
}

function AlertRow({ alert }: AlertRowProps): React.JSX.Element {
  const isHigh = alert.priority === 'high';

  return (
    <div
      className={
        isHigh
          ? 'bg-red-50 border-l-4 border-red-500 p-3 rounded dark:bg-red-950/30 dark:border-red-600'
          : 'bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded dark:bg-yellow-950/30 dark:border-yellow-600'
      }
      role="alert"
      aria-label={`${isHigh ? 'High' : 'Medium'} priority alert: ${alert.title}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className={`text-sm font-semibold ${isHigh ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
          {alert.title}
        </p>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
            isHigh
              ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
          }`}
          aria-label={`Priority: ${isHigh ? 'High' : 'Medium'}`}
        >
          {isHigh ? 'High' : 'Medium'}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{alert.description}</p>
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Action: </span>
        {alert.recommendedAction}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse"
      role="status"
      aria-label="Loading customer health data"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      {/* Breakdown placeholder */}
      <div className="space-y-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        ))}
      </div>
      {/* Alert placeholder */}
      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chevron icon
// ---------------------------------------------------------------------------

function ChevronIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CustomerHealthDisplay({
  input,
  alertEngineInput,
  isLoading = false,
}: CustomerHealthDisplayProps): React.JSX.Element {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Compute health score result
  const scoreResult = useMemo<HealthScoreResult | null>(() => {
    if (!input) return null;
    try {
      return calculateHealthScore(input);
    } catch {
      return null;
    }
  }, [input]);

  // Compute alert engine result
  const alertResult = useMemo<AlertEngineResult | null>(() => {
    if (!alertEngineInput) return null;
    try {
      return alertEngine(alertEngineInput);
    } catch {
      return null;
    }
  }, [alertEngineInput]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error / empty state: input is null and not loading
  if (!input || !scoreResult) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center min-h-[180px] text-center"
        role="status"
        aria-label="No customer data available"
      >
        <div className="text-4xl mb-3" aria-hidden="true">—</div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">No customer selected</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select a customer to view their health score and active alerts.
        </p>
      </div>
    );
  }

  const { overallScore, riskLevel, breakdown } = scoreResult;
  const colors = getScoreColor(overallScore);
  const riskLabel = getRiskLabel(riskLevel);
  const riskLabelColor = getRiskLabelColor(riskLevel);

  const highAlerts = alertResult?.alerts.filter((a) => a.priority === 'high') ?? [];
  const mediumAlerts = alertResult?.alerts.filter((a) => a.priority === 'medium') ?? [];
  const totalAlerts = highAlerts.length + mediumAlerts.length;

  function toggleBreakdown(): void {
    setBreakdownOpen((prev) => !prev);
  }

  function handleBreakdownKeyDown(e: React.KeyboardEvent<HTMLButtonElement>): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleBreakdown();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 w-full">

      {/* ---- Score header ---- */}
      <div className="flex items-center gap-5 mb-5">
        <ScoreGauge score={overallScore} size={96} />
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Customer Health Score
          </h2>
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-medium ${riskLabelColor}`}
            aria-label={`Risk level: ${riskLabel}`}
          >
            {riskLabel}
          </span>
          {totalAlerts > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {totalAlerts} active {totalAlerts === 1 ? 'alert' : 'alerts'}
            </p>
          )}
        </div>
      </div>

      {/* ---- Breakdown toggle ---- */}
      <button
        type="button"
        onClick={toggleBreakdown}
        onKeyDown={handleBreakdownKeyDown}
        aria-expanded={breakdownOpen}
        aria-controls="health-breakdown-panel"
        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        <span>Score Breakdown</span>
        <ChevronIcon open={breakdownOpen} />
      </button>

      {/* ---- Breakdown panel ---- */}
      {breakdownOpen && (
        <div
          id="health-breakdown-panel"
          className="px-3 py-2 mb-4 border border-gray-100 dark:border-gray-700 rounded-md"
        >
          {/* Column headers */}
          <div className="flex items-center gap-3 mb-1 pb-1 border-b border-gray-100 dark:border-gray-700">
            <span className="w-28 text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">Factor</span>
            <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500">Score</span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-8 text-right">Pts</span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-10 text-right">Wt.</span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-10 text-right">Contrib</span>
          </div>
          <FactorRow
            label="Payment"
            score={breakdown.payment.score}
            weight={breakdown.payment.weight}
            contribution={breakdown.payment.contribution}
          />
          <FactorRow
            label="Engagement"
            score={breakdown.engagement.score}
            weight={breakdown.engagement.weight}
            contribution={breakdown.engagement.contribution}
          />
          <FactorRow
            label="Contract"
            score={breakdown.contract.score}
            weight={breakdown.contract.weight}
            contribution={breakdown.contract.contribution}
          />
          <FactorRow
            label="Support"
            score={breakdown.support.score}
            weight={breakdown.support.weight}
            contribution={breakdown.support.contribution}
          />
          {/* Overall */}
          <div className="flex items-center gap-3 mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="w-28 text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">Overall</span>
            <div className="flex-1" />
            <span className={`text-sm font-bold tabular-nums w-8 text-right ${colors.text}`}>
              {overallScore}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 w-10 text-right">100%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right tabular-nums">
              {overallScore.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* ---- Active alerts ---- */}
      {(highAlerts.length > 0 || mediumAlerts.length > 0) && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Active Alerts
          </h3>
          <div className="space-y-2">
            {highAlerts.map((alert) => (
              <AlertRow key={alert.type} alert={alert} />
            ))}
            {mediumAlerts.map((alert) => (
              <AlertRow key={alert.type} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* No alerts message */}
      {alertEngineInput && alertResult?.alerts.length === 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center py-2">
          No active alerts — account is in good standing.
        </p>
      )}
    </div>
  );
}
