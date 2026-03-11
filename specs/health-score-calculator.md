# Spec: Health Score Calculator

## Feature: CustomerHealthDisplay + healthCalculator

### Context
- Customer health scoring system for the Customer Intelligence Dashboard
- Provides predictive analytics on relationship health and churn risk for each customer
- Used by operators/admins viewing the dashboard to assess customer status at a glance
- Consists of two parts: a pure calculation library (`lib/healthCalculator.ts`) and a UI widget (`components/CustomerHealthDisplay.tsx`)
- Integrates with the existing `CustomerSelector` to update in real-time when a customer is selected

### Requirements

#### lib/healthCalculator.ts
- Export TypeScript interfaces for all inputs and outputs (see Constraints)
- Individual scoring functions for each factor:
  - `calculatePaymentScore(data: PaymentData): number` — returns 0–100
  - `calculateEngagementScore(data: EngagementData): number` — returns 0–100
  - `calculateContractScore(data: ContractData): number` — returns 0–100
  - `calculateSupportScore(data: SupportData): number` — returns 0–100
- Main `calculateHealthScore(input: HealthScoreInput): HealthScoreResult` that combines factor scores using weighted formula: Payment 40%, Engagement 30%, Contract 20%, Support 10%
- Risk level classification derived from overall score: `'healthy'` (71–100), `'warning'` (31–70), `'critical'` (0–30)
- Input validation with descriptive error messages; throw typed errors for invalid inputs
- Edge case handling: new customers with no history, missing optional fields default to neutral scores
- Pure functions with no side effects

#### components/CustomerHealthDisplay.tsx
- Display overall health score (0–100) with color-coded ring or gauge (green/yellow/red matching risk level)
- Show risk level label (`Healthy` / `Warning` / `Critical`)
- Expandable breakdown section revealing individual factor scores and their weights
- Loading state (skeleton or spinner) while data is being calculated/fetched
- Error state with a friendly message when calculation fails
- Real-time update when the selected customer changes via `CustomerSelector`

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS
- **No external UI libraries;** use Tailwind utility classes only
- **TypeScript interfaces:**
  ```ts
  interface PaymentData {
    daysSinceLastPayment: number;
    averagePaymentDelayDays: number;
    overdueAmountUsd: number;
  }

  interface EngagementData {
    loginFrequencyPerMonth: number;
    featureUsageCount: number;
    openSupportTickets: number;
  }

  interface ContractData {
    daysUntilRenewal: number;
    contractValueUsd: number;
    recentUpgrades: number;
  }

  interface SupportData {
    averageResolutionTimeDays: number;
    satisfactionScore: number; // 1–5
    escalationCount: number;
  }

  interface HealthScoreInput {
    payment: PaymentData;
    engagement: EngagementData;
    contract: ContractData;
    support: SupportData;
  }

  interface FactorBreakdown {
    score: number;       // 0–100
    weight: number;      // e.g. 0.4
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
  ```
- **Props interface for CustomerHealthDisplay:**
  ```ts
  interface CustomerHealthDisplayProps {
    input: HealthScoreInput | null;
    isLoading?: boolean;
  }
  ```
- File locations:
  - `src/lib/healthCalculator.ts`
  - `src/components/CustomerHealthDisplay.tsx`
- JSDoc comments on every exported function explaining business logic and formula
- Custom error class: `class HealthScoreValidationError extends Error`
- Color coding: green for `healthy`, yellow/amber for `warning`, red for `critical` — consistent with other dashboard health indicators

### Acceptance Criteria
- [ ] `calculateHealthScore` returns a score in [0, 100] for all valid inputs
- [ ] Weighted formula is correct: `(paymentScore × 0.4) + (engagementScore × 0.3) + (contractScore × 0.2) + (supportScore × 0.1)`
- [ ] Risk levels map correctly: 71–100 → `healthy`, 31–70 → `warning`, 0–30 → `critical`
- [ ] Invalid inputs (negative values, out-of-range scores) throw `HealthScoreValidationError` with a descriptive message
- [ ] New customer with all-neutral data produces a mid-range score rather than 0
- [ ] `CustomerHealthDisplay` renders the overall score and risk level for a given `HealthScoreInput`
- [ ] Breakdown section is hidden by default and expands on user interaction
- [ ] Color coding matches risk level (green / amber / red)
- [ ] Loading state renders when `isLoading={true}`
- [ ] Error state renders gracefully if `input` is `null` and not loading
- [ ] Score updates when a different customer is selected via `CustomerSelector`
- [ ] All calculator functions have unit tests covering happy path, boundary conditions, and validation errors
