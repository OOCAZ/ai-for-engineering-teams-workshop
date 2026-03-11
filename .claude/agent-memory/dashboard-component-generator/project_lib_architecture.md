---
name: Lib Architecture — healthCalculator + alerts dual-type system
description: Architecture decisions and type-boundary facts for src/lib/ added during CustomerHealthDisplay implementation
type: project
---

## Two separate type worlds in this codebase

### src/lib/healthCalculator.ts
- Defines its own rich `PaymentData`, `EngagementData`, `ContractData`, `SupportData` interfaces
- These are used exclusively for health score calculation
- `SupportData` includes `averageResolutionTimeDays`, `satisfactionScore`, `escalationCount`, `ticketsLast7Days`, `hasEscalatedTicket`
- `PaymentData` includes `daysSinceLastPayment`, `averagePaymentDelayDays`, `overdueAmountUsd`
- `EngagementData` includes `loginFrequencyPerMonth`, `featureUsageCount`, `openSupportTickets`, optional trend fields

### src/types/alerts.ts (shared types for the alert engine)
- Slimmer versions of the same domain types used by `alerts.ts` and `PredictiveIntelligencePanel.tsx`
- `PaymentData` here only has `overdueAmountUsd` and `daysSinceLastPayment` (no `averagePaymentDelayDays`)
- `SupportData` only has `ticketsLast7Days` and `hasEscalatedTicket` (no resolution time, satisfaction, escalation count)
- `EngagementData` only has `loginFrequencyPerMonth`, optional `loginFrequency30DayAvg`, optional `newFeaturesUsedLast30Days`

### src/lib/alerts.ts
- Imports all shared types from `@/types/alerts` and re-exports them — callers can use either import path
- Do NOT move types back into alerts.ts inline — they belong in src/types/alerts.ts as the canonical source
- A linter/formatter previously rewrote this file; always verify the import path after saves
- Exports: `evaluatePaymentRisk`, `evaluateEngagementCliff`, `evaluateContractExpirationRisk`, `evaluateSupportTicketSpike`, `evaluateFeatureAdoptionStall`, `alertEngine`
- `alertEngine` accepts an optional `cooldownMs` second parameter (default 24 hours)

### CustomerHealthDisplay.tsx
- `HealthScoreInput` comes from `@/lib/healthCalculator`
- `AlertEngineInput` comes from `@/lib/alerts` (which re-exports from `@/types/alerts`)
- Callers must construct two separate input objects — one with the richer healthCalculator fields, one with the slimmer alerts fields

## No test framework
The spec criterion for unit tests cannot be met — project has no test runner by design (CLAUDE.md: "No test framework — use tsc --noEmit and eslint for validation").

## Predictive Intelligence feature (implemented 2026-03-11)
- `src/types/alerts.ts` — canonical alert type definitions; `PaymentData` has `overdueAmountUsd` + `daysSinceLastPayment`; `EngagementData` has `loginFrequencyPerMonth` + optional `loginFrequency30DayAvg` + optional `newFeaturesUsedLast30Days`; `ContractData` has `daysUntilRenewal`, `contractValueUsd`, `recentUpgrades`
- `src/types/market-intelligence.ts` — `Headline`, `Sentiment`, `MarketIntelligenceData`, `MarketIntelligenceWidgetProps`, `PredictiveIntelligencePanelProps`; imports `AlertEngineInput` from `@/types/alerts`
- `src/lib/marketIntelligenceService.ts` — singleton `marketIntelligenceService`; 10-min TTL in-memory cache; `MarketIntelligenceError` with `code` field; `isCacheValid()` pure helper
- `src/app/api/market-intelligence/[company]/route.ts` — validates + sanitizes company param (alphanumeric/spaces/hyphens, max 100 chars); 200–500ms simulated delay; Next.js 15 `params: Promise<{company}>` pattern
- `src/components/MarketIntelligenceWidget.tsx` — `'use client'`; fetches on mount and company change; cancels stale requests via `cancelled` flag; independent loading/error states
- `src/components/PredictiveIntelligencePanel.tsx` — `'use client'`; lazy-loads `MarketIntelligenceWidget` via `React.lazy`; `SentimentObserver` child component fetches sentiment independently for correlation callout; correlation callout uses `bg-orange-50 border border-orange-300`; `lg:col-span-2` for dashboard grid placement

## Widget card shell
Design constraint: `bg-white rounded-lg shadow p-6` — matches all existing widget shells. Always use this for card-level containers.

## SVG gauge pattern
`CustomerHealthDisplay` uses an inline SVG circle with `stroke-dasharray` for the gauge ring. Pattern: rotate SVG -90deg so the arc starts at top; track circle in `stroke-gray-200 dark:stroke-gray-700`; progress circle colored per health score.
