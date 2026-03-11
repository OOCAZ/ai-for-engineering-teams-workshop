/**
 * Shared alert interfaces for the Predictive Intelligence feature.
 * Used by lib/alerts.ts, components/PredictiveIntelligencePanel.tsx, and related modules.
 */

export type AlertPriority = 'high' | 'medium';

export type AlertType =
  | 'payment_risk'
  | 'engagement_cliff'
  | 'contract_expiration_risk'
  | 'support_ticket_spike'
  | 'feature_adoption_stall';

export interface Alert {
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  recommendedAction: string;
  triggeredAt: string; // ISO date string
}

export interface HealthHistory {
  scoreSevenDaysAgo?: number;
  overduePaymentDays?: number; // days payment has been overdue
}

// ---------------------------------------------------------------------------
// Customer data shapes consumed by the individual rule evaluators
// ---------------------------------------------------------------------------

export interface PaymentData {
  overdueAmountUsd: number;       // amount currently overdue in USD
  daysSinceLastPayment: number;   // days since last successful payment
}

export interface EngagementData {
  loginFrequencyPerMonth: number;   // logins in the current month
  loginFrequency30DayAvg?: number;  // rolling 30-day average logins per month
  newFeaturesUsedLast30Days?: number; // count of new features adopted in last 30 days
}

export interface ContractData {
  daysUntilRenewal: number;
  contractValueUsd: number; // Annual Contract Value (ACV / ARR proxy) in USD
  recentUpgrades: number;   // count of tier upgrades in the account's history
}

export interface SupportData {
  ticketsLast7Days?: number;
  hasEscalatedTicket: boolean;
}

export interface AlertEngineInput {
  customerId: string;
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
  healthScore: number;
  healthHistory?: HealthHistory;
  existingAlerts?: Alert[]; // for deduplication / cooldown
}

export interface AlertEngineResult {
  alerts: Alert[]; // deduplicated, sorted high→medium then by ARR proxy
  suppressedCount: number;
}
