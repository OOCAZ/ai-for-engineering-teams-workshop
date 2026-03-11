# Spec: Predictive Intelligence

## Feature: AlertEngine + MarketIntelligenceWidget + PredictiveIntelligencePanel

### Context
- Unified predictive intelligence layer for the Customer Intelligence Dashboard that combines proactive risk alerting with real-time market context
- Surfaces early warning signals before customers churn by correlating internal behavioral data (engagement, payment, support) with external market conditions (sentiment, news)
- Used by customer success managers to prioritize daily outreach and understand both internal account health and external market pressures affecting each customer
- Consists of three parts: a pure alert rules engine (`lib/alerts.ts`), the market intelligence service and widget (`lib/marketIntelligenceService.ts` + `components/MarketIntelligenceWidget.tsx`), and a new combined panel (`components/PredictiveIntelligencePanel.tsx`) that presents both signals in one view
- All components integrate with `CustomerSelector` for real-time updates on customer change

### Requirements

#### lib/alerts.ts — Alert Rules Engine
- Export TypeScript interfaces for all alert types, customer inputs, and engine results (see Constraints)
- Pure rule evaluation functions (one per alert type):
  - `evaluatePaymentRisk(data: PaymentData, history: HealthHistory): Alert | null` — triggers if payment overdue > 30 days OR health score dropped > 20 pts in 7 days
  - `evaluateEngagementCliff(data: EngagementData): Alert | null` — triggers if login frequency drops > 50% vs 30-day average
  - `evaluateContractExpirationRisk(data: ContractData, healthScore: number): Alert | null` — triggers if renewal < 90 days AND health score < 50
  - `evaluateSupportTicketSpike(data: SupportData): Alert | null` — triggers if > 3 tickets in 7 days OR escalated ticket present
  - `evaluateFeatureAdoptionStall(data: EngagementData, contractData: ContractData): Alert | null` — triggers if no new feature usage in 30 days for growing accounts
- Main `alertEngine(input: AlertEngineInput): AlertEngineResult`:
  - Evaluates all rules, collects non-null alerts
  - Deduplicates alerts by `type` + `customerId` combination
  - Applies cooldown suppression using `existingAlerts` timestamps
  - Sorts output: high priority first, then by customer ARR descending within each tier
  - Returns `{ alerts, suppressedCount }`
- Priority scoring factors: urgency (rule severity), customer ARR, recency of trigger

#### lib/marketIntelligenceService.ts — Market Intelligence Service
- `MarketIntelligenceService` class with `getMarketData(company: string): Promise<MarketIntelligenceData>`
- In-memory cache keyed by company name with 10-minute TTL; pure `isCacheValid(entry: CacheEntry): boolean` helper
- On cache miss: generate mock data via `generateMockMarketData(company)` and compute sentiment via `calculateMockSentiment(headlines)`
- Custom `MarketIntelligenceError extends Error` with a `code: string` field
- No external API calls; mock data only for reliable, predictable behavior

#### app/api/market-intelligence/[company]/route.ts — API Route
- Next.js 15 App Router `GET` Route Handler
- Extract and validate `company` path param: reject empty, non-string, or special-character-only values with HTTP 400
- Sanitize company name (alphanumeric + spaces + hyphens, max 100 chars) before passing to service
- Call `MarketIntelligenceService.getMarketData(company)`
- Simulate realistic delay (200–500ms)
- Return `{ sentiment, articleCount, headlines, updatedAt }` on success
- Return HTTP 500 with a sanitized error message on service failure (no stack traces or internal details)

#### components/MarketIntelligenceWidget.tsx — Market Intelligence UI
- Accept `company: string` prop; fetch from `/api/market-intelligence/[company]` on mount and on `company` change
- Display market sentiment with color-coded badge: positive (green), neutral (yellow), negative (red)
- Show article count and "last updated" timestamp
- Render top 3 headlines with source and publication date
- Loading state while fetching; error state on API failure
- Must not expose raw API error details to the user

#### components/PredictiveIntelligencePanel.tsx — Combined View
- Composite panel combining alerts and market intelligence into one unified card
- Alert section (top): renders high-priority alerts in red rows, medium-priority in yellow rows, each with title, description, and recommended action
- Market section (bottom): embeds `MarketIntelligenceWidget` or renders inline market data
- "Correlation insight" callout: when a high-priority alert AND negative market sentiment are both present for the same customer, render a highlighted callout: e.g. "Market headwinds may be contributing to engagement decline"
- Loading and error states for each section independently (market data failure should not suppress alert display)
- Empty state: "No active alerts" message when no rules trigger

### Constraints

#### Technical Stack
- Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- `"use client"` directive on all interactive widget components
- No external UI libraries; Tailwind utility classes only

#### File Structure
```
src/
  app/
    api/
      market-intelligence/
        [company]/
          route.ts
  components/
    MarketIntelligenceWidget.tsx
    PredictiveIntelligencePanel.tsx
  lib/
    alerts.ts
    marketIntelligenceService.ts
  types/
    alerts.ts                    # shared alert interfaces
    market-intelligence.ts       # shared market interfaces
```

#### TypeScript Interfaces

```ts
// types/alerts.ts
type AlertPriority = 'high' | 'medium';
type AlertType =
  | 'payment_risk'
  | 'engagement_cliff'
  | 'contract_expiration_risk'
  | 'support_ticket_spike'
  | 'feature_adoption_stall';

interface Alert {
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  recommendedAction: string;
  triggeredAt: string; // ISO date string
}

interface HealthHistory {
  scoreSevenDaysAgo?: number;
  overduePaymentDays?: number;
}

interface AlertEngineInput {
  customerId: string;
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
  healthScore: number;
  healthHistory?: HealthHistory;
  existingAlerts?: Alert[];
}

interface AlertEngineResult {
  alerts: Alert[];
  suppressedCount: number;
}

// types/market-intelligence.ts
interface Headline {
  title: string;
  source: string;
  publishedAt: string; // ISO date string
}

interface Sentiment {
  score: number;      // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0 to 1
}

interface MarketIntelligenceData {
  sentiment: Sentiment;
  articleCount: number;
  headlines: Headline[];
  updatedAt: string; // ISO date string
}

interface MarketIntelligenceWidgetProps {
  company: string;
}

// PredictiveIntelligencePanel
interface PredictiveIntelligencePanelProps {
  alertInput: AlertEngineInput | null;
  company: string;
  isLoading?: boolean;
}
```

#### Alert Rule Thresholds
| Rule | Condition | Priority |
|---|---|---|
| Payment Risk | Overdue > 30 days OR score drop > 20 pts in 7 days | High |
| Engagement Cliff | Login freq drops > 50% vs 30-day avg | High |
| Contract Expiration Risk | Renewal < 90 days AND health score < 50 | High |
| Support Ticket Spike | > 3 tickets/7 days OR escalated ticket | Medium |
| Feature Adoption Stall | No new features in 30 days for growing accounts | Medium |

#### Performance Constraints
- Market intelligence API response time ≤ 1 second (mock delay ≤ 500ms)
- `PredictiveIntelligencePanel` must not block dashboard render — use Suspense + `React.lazy`
- In-memory cache prevents redundant mock generation within 10-minute TTL window

#### Design Constraints
- Panel card: `bg-white rounded-lg shadow p-6` — matches existing widget shells
- High-priority alert row: `bg-red-50 border-l-4 border-red-500 p-3 rounded mb-2`
- Medium-priority alert row: `bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded mb-2`
- Correlation insight callout: `bg-orange-50 border border-orange-300 rounded p-3 text-sm text-orange-800`
- Sentiment badge: positive `text-green-600 bg-green-50`, neutral `text-yellow-600 bg-yellow-50`, negative `text-red-600 bg-red-50`
- Section headings: `text-base font-semibold text-gray-800 mb-3`
- Responsive: full-width on mobile, spans 2 columns in `lg:grid-cols-3` dashboard grid

#### Security Constraints
- Validate and sanitize `company` path param in route handler (alphanumeric + spaces + hyphens only, max 100 chars)
- Do not reflect raw user input in error messages returned to client
- Alert descriptions must not include unescaped customer PII beyond names/IDs already visible in the UI
- No `any` types; all interfaces explicitly defined

### Acceptance Criteria
- [ ] `alertEngine` returns the correct alert type for each trigger condition in the threshold table
- [ ] High-priority alerts appear before medium-priority alerts in `AlertEngineResult.alerts`
- [ ] Duplicate alerts (same `type` + `customerId`) are suppressed; `suppressedCount` reflects the count
- [ ] Cooldown prevents re-triggering the same alert within its configured window
- [ ] `MarketIntelligenceWidget` renders loading state while API call is in-flight
- [ ] Sentiment badge color correctly maps to positive/neutral/negative label
- [ ] Top 3 headlines display with source and publication date
- [ ] Widget re-fetches and updates when `company` prop changes (customer reselected)
- [ ] API returns HTTP 400 for missing or invalid `company` param
- [ ] API returns HTTP 500 with sanitized message on service error (no stack traces)
- [ ] Cache returns data within TTL; fetches fresh data after TTL expiry
- [ ] `PredictiveIntelligencePanel` renders alert section and market section independently — market failure does not hide alerts
- [ ] Correlation insight callout renders when a high-priority alert AND negative sentiment are both present
- [ ] Empty state ("No active alerts") renders when no alert rules trigger
- [ ] All components update in real-time when a different customer is selected via `CustomerSelector`
- [ ] Lighthouse accessibility score ≥ 90 for the panel (color-coded elements have text labels)
- [ ] Unit tests cover all 5 alert rule functions: happy path, boundary conditions, and null (no-trigger) cases
- [ ] Unit tests cover market intelligence service: cache hit, cache miss, TTL expiry, and error handling
- [ ] No `any` types anywhere in the feature's TypeScript files
