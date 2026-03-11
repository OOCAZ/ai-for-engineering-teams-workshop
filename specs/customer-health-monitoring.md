# Spec: Customer Health Monitoring

## Feature: CustomerHealthDisplay + healthCalculator + AlertEngine

### Context
- Comprehensive customer health scoring and predictive alerting system for the Customer Intelligence Dashboard
- Combines real-time health score calculation with an intelligent alert rules engine to surface churn risk and relationship issues proactively
- Used by customer success managers and operators to triage accounts, prioritize outreach, and act before customers churn
- Consists of three parts: a pure calculation library (`lib/healthCalculator.ts`), an alert rules engine (`lib/alerts.ts`), and a unified UI widget (`components/CustomerHealthDisplay.tsx`)
- Integrates with `CustomerSelector` so all scores and alerts update in real-time when the selected customer changes

### Requirements

#### lib/healthCalculator.ts
- Export TypeScript interfaces for all inputs and outputs (see Constraints)
- Individual pure scoring functions for each factor:
  - `calculatePaymentScore(data: PaymentData): number` — returns 0–100
  - `calculateEngagementScore(data: EngagementData): number` — returns 0–100
  - `calculateContractScore(data: ContractData): number` — returns 0–100
  - `calculateSupportScore(data: SupportData): number` — returns 0–100
- Main `calculateHealthScore(input: HealthScoreInput): HealthScoreResult` combining factor scores: Payment 40%, Engagement 30%, Contract 20%, Support 10%
- Risk level classification: `'healthy'` (71–100), `'warning'` (31–70), `'critical'` (0–30)
- Input validation with descriptive error messages; throw `HealthScoreValidationError` for invalid inputs
- Edge cases: new customers with no history default to neutral scores rather than 0; missing optional fields handled gracefully
- JSDoc comments on every exported function explaining business logic and formulas

#### lib/alerts.ts
- Export TypeScript interfaces for all alert types, customer data, and engine responses (see Constraints)
- Individual pure rule evaluation functions:
  - `evaluatePaymentRisk(data: PaymentData, healthHistory: HealthHistory): Alert | null`
  - `evaluateEngagementCliff(data: EngagementData): Alert | null`
  - `evaluateContractExpirationRisk(data: ContractData, healthScore: number): Alert | null`
  - `evaluateSupportTicketSpike(data: SupportData): Alert | null`
  - `evaluateFeatureAdoptionStall(data: EngagementData, contractData: ContractData): Alert | null`
- Main `alertEngine(input: AlertEngineInput): AlertEngineResult` that evaluates all rules, deduplicates, and returns prioritized alerts
- Priority levels: `'high'` (immediate action) and `'medium'` (monitor closely)
- Cooldown logic: do not re-trigger the same alert type for the same customer within a configurable cooldown window
- Deduplication: suppress duplicate alerts for the same customer/issue combination
- Alert prioritization incorporating customer ARR (annual recurring revenue) as a weighting factor

#### components/CustomerHealthDisplay.tsx
- Display overall health score (0–100) with color-coded ring or gauge (green/yellow/red)
- Show risk level label (`Healthy` / `Warning` / `Critical`)
- Expandable breakdown section revealing individual factor scores and their weights
- Active alerts section below the score: list high-priority alerts in red, medium-priority in yellow, with recommended action text
- Loading state (skeleton or spinner) while data is fetching/calculating
- Error state with a friendly message when calculation or alert evaluation fails
- Real-time update when the selected customer changes via `CustomerSelector`

### Constraints

#### Technical Stack
- Next.js 15, React 19, TypeScript (strict), Tailwind CSS
- No external UI libraries; Tailwind utility classes only
- `"use client"` directive on the widget component

#### TypeScript Interfaces

```ts
// healthCalculator.ts
interface PaymentData {
  daysSinceLastPayment: number;
  averagePaymentDelayDays: number;
  overdueAmountUsd: number;
}

interface EngagementData {
  loginFrequencyPerMonth: number;
  featureUsageCount: number;
  openSupportTickets: number;
  loginFrequency30DayAvg?: number; // for trend analysis
  newFeaturesUsedLast30Days?: number;
}

interface ContractData {
  daysUntilRenewal: number;
  contractValueUsd: number;      // used as ARR proxy
  recentUpgrades: number;
}

interface SupportData {
  averageResolutionTimeDays: number;
  satisfactionScore: number;     // 1–5
  escalationCount: number;
  ticketsLast7Days?: number;
  hasEscalatedTicket?: boolean;
}

interface HealthScoreInput {
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
}

interface FactorBreakdown {
  score: number;        // 0–100
  weight: number;       // e.g. 0.4
  contribution: number; // score * weight
}

interface HealthScoreResult {
  overallScore: number; // 0–100, rounded to nearest integer
  riskLevel: 'healthy' | 'warning' | 'critical';
  breakdown: {
    payment: FactorBreakdown;
    engagement: FactorBreakdown;
    contract: FactorBreakdown;
    support: FactorBreakdown;
  };
}

class HealthScoreValidationError extends Error {}

// alerts.ts
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
  overduePaymentDays?: number; // days payment has been overdue
}

interface AlertEngineInput {
  customerId: string;
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
  healthScore: number;
  healthHistory?: HealthHistory;
  existingAlerts?: Alert[]; // for deduplication
}

interface AlertEngineResult {
  alerts: Alert[];        // deduplicated, sorted high→medium then by ARR proxy
  suppressedCount: number;
}

// CustomerHealthDisplay
interface CustomerHealthDisplayProps {
  input: HealthScoreInput | null;
  alertEngineInput?: AlertEngineInput | null;
  isLoading?: boolean;
}
```

#### File Locations
```
src/
  lib/
    healthCalculator.ts
    alerts.ts
  components/
    CustomerHealthDisplay.tsx
```

#### Design Constraints
- Widget card: `bg-white rounded-lg shadow p-6` — matches existing widget shells
- Score ring/gauge: green (`text-green-600`) for healthy, amber (`text-yellow-500`) for warning, red (`text-red-600`) for critical
- High-priority alert row: `bg-red-50 border-l-4 border-red-500 p-3 rounded`
- Medium-priority alert row: `bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded`
- Breakdown section hidden by default, toggles on click; chevron icon indicates state
- Loading: `animate-pulse` skeleton matching card dimensions
- Responsive: full-width on mobile, fits `md:grid-cols-2 lg:grid-cols-3` dashboard grid

#### Alert Rule Thresholds
| Rule | Trigger Condition | Priority |
|---|---|---|
| Payment Risk | Overdue > 30 days OR score drops > 20 pts in 7 days | High |
| Engagement Cliff | Login frequency drops > 50% vs 30-day average | High |
| Contract Expiration Risk | Renewal < 90 days AND health score < 50 | High |
| Support Ticket Spike | > 3 tickets in 7 days OR escalated ticket present | Medium |
| Feature Adoption Stall | No new features used in 30 days AND growing account | Medium |

### Acceptance Criteria
- [ ] `calculateHealthScore` returns a score in [0, 100] for all valid inputs
- [ ] Weighted formula correct: `(payment × 0.4) + (engagement × 0.3) + (contract × 0.2) + (support × 0.1)`
- [ ] Risk levels map correctly: 71–100 → `healthy`, 31–70 → `warning`, 0–30 → `critical`
- [ ] Invalid inputs throw `HealthScoreValidationError` with a descriptive message
- [ ] New customer with neutral data produces a mid-range score rather than 0
- [ ] `alertEngine` returns high-priority alerts for each trigger condition listed in the threshold table
- [ ] Duplicate alerts for the same customer/type are suppressed (deduplication)
- [ ] Cooldown prevents re-triggering the same alert type within the configured window
- [ ] `CustomerHealthDisplay` renders overall score, risk level label, and color-coded gauge
- [ ] Breakdown section is collapsed by default and expands on user interaction
- [ ] Active alerts render below the score, grouped by priority with recommended actions visible
- [ ] Loading state renders when `isLoading={true}`
- [ ] Error state renders gracefully when `input` is `null` and not loading
- [ ] Score and alerts update in real-time when a different customer is selected via `CustomerSelector`
- [ ] All calculator and alert functions have unit tests covering happy path, boundary conditions, and validation errors
- [ ] No `any` types; all TypeScript interfaces explicitly defined
