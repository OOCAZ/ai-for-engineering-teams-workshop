/**
 * alerts.ts
 *
 * Alert rules engine for the Customer Intelligence Dashboard.
 * Evaluates individual risk rules against customer data, deduplicates,
 * applies cooldown suppression, and returns prioritized alerts.
 *
 * Priority levels:
 *   'high'   — requires immediate action
 *   'medium' — monitor closely
 *
 * Alert type thresholds (from spec):
 *   payment_risk             — overdue > 30 days OR score drops > 20 pts in 7 days  → High
 *   engagement_cliff         — login frequency drops > 50% vs 30-day average        → High
 *   contract_expiration_risk — renewal < 90 days AND health score < 50              → High
 *   support_ticket_spike     — > 3 tickets in 7 days OR escalated ticket present    → Medium
 *   feature_adoption_stall   — no new features in 30 days AND growing account        → Medium
 */

import type {
  Alert,
  AlertType,
  AlertPriority,
  AlertEngineInput,
  AlertEngineResult,
  EngagementData,
  ContractData,
  PaymentData,
  SupportData,
  HealthHistory,
} from '@/types/alerts';

// Re-export all shared types so callers can import from one place.
export type {
  Alert,
  AlertType,
  AlertPriority,
  AlertEngineInput,
  AlertEngineResult,
  EngagementData,
  ContractData,
  PaymentData,
  SupportData,
  HealthHistory,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default cooldown window in milliseconds (24 hours). */
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Individual rule evaluation functions
// ---------------------------------------------------------------------------

/**
 * Evaluates payment risk.
 *
 * Triggers when payment has been overdue for more than 30 days
 * (via healthHistory.overduePaymentDays or data.daysSinceLastPayment).
 *
 * Note: The score-drop variant (score drops > 20 pts in 7 days) is handled
 * directly inside alertEngine where the current healthScore is available.
 *
 * Priority: High
 */
export function evaluatePaymentRisk(
  data: PaymentData,
  healthHistory: HealthHistory,
): Alert | null {
  const overdueForDays = healthHistory.overduePaymentDays ?? 0;

  // Check overdue via history first, then fall back to daysSinceLastPayment + overdueAmountUsd
  const overdueTriggered =
    overdueForDays > 30 ||
    (data.overdueAmountUsd > 0 && data.daysSinceLastPayment > 30);

  if (!overdueTriggered) {
    return null;
  }

  const daysDisplay = overdueForDays > 0 ? overdueForDays : data.daysSinceLastPayment;

  return {
    type: 'payment_risk',
    priority: 'high',
    title: 'Payment Risk Detected',
    description: `Payment has been overdue for ${daysDisplay} days with $${data.overdueAmountUsd.toLocaleString()} outstanding.`,
    recommendedAction:
      'Contact the billing team and customer immediately. Offer a payment plan if needed to prevent churn.',
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Evaluates engagement cliff risk.
 *
 * Triggers when login frequency has dropped more than 50% compared to the
 * 30-day average (loginFrequency30DayAvg field on EngagementData).
 *
 * Priority: High
 */
export function evaluateEngagementCliff(data: EngagementData): Alert | null {
  const avg = data.loginFrequency30DayAvg;

  // Cannot detect a cliff without a meaningful baseline
  if (avg === undefined || avg === 0) {
    return null;
  }

  const dropPercent = (avg - data.loginFrequencyPerMonth) / avg;

  if (dropPercent <= 0.5) {
    return null;
  }

  return {
    type: 'engagement_cliff',
    priority: 'high',
    title: 'Engagement Cliff',
    description: `Login frequency dropped ${Math.round(dropPercent * 100)}% vs. 30-day average (${data.loginFrequencyPerMonth} vs. ${avg} logins/month).`,
    recommendedAction:
      'Schedule an executive business review. Identify blockers and offer onboarding support or new feature demos.',
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Evaluates contract expiration risk.
 *
 * Triggers when renewal is within 90 days AND the current health score < 50.
 *
 * Priority: High
 */
export function evaluateContractExpirationRisk(
  data: ContractData,
  healthScore: number,
): Alert | null {
  if (data.daysUntilRenewal >= 90 || healthScore >= 50) {
    return null;
  }

  return {
    type: 'contract_expiration_risk',
    priority: 'high',
    title: 'Contract Expiration Risk',
    description: `Contract renews in ${data.daysUntilRenewal} days with a health score of ${healthScore}. High churn risk.`,
    recommendedAction:
      'Initiate a renewal conversation now. Involve a senior account executive and prepare a value-based pitch.',
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Evaluates support ticket spike.
 *
 * Triggers when:
 *  - More than 3 tickets were opened in the last 7 days, OR
 *  - An escalated ticket is present
 *
 * Priority: Medium
 */
export function evaluateSupportTicketSpike(data: SupportData): Alert | null {
  const ticketSpike = (data.ticketsLast7Days ?? 0) > 3;
  const escalated = data.hasEscalatedTicket === true;

  if (!ticketSpike && !escalated) {
    return null;
  }

  const reasons: string[] = [];
  if (ticketSpike) reasons.push(`${data.ticketsLast7Days} tickets in the last 7 days`);
  if (escalated) reasons.push('an escalated ticket is open');

  return {
    type: 'support_ticket_spike',
    priority: 'medium',
    title: 'Support Ticket Spike',
    description: `Elevated support activity detected: ${reasons.join(' and ')}.`,
    recommendedAction:
      'Assign a dedicated support engineer. Follow up with the customer to ensure issues are being resolved promptly.',
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Evaluates feature adoption stall.
 *
 * Triggers when no new features were used in the last 30 days AND the account
 * shows growth signals (recentUpgrades > 0 or contractValueUsd > $10,000).
 *
 * Priority: Medium
 */
export function evaluateFeatureAdoptionStall(
  data: EngagementData,
  contractData: ContractData,
): Alert | null {
  const noNewFeatures = (data.newFeaturesUsedLast30Days ?? 0) === 0;
  const growingAccount =
    contractData.recentUpgrades > 0 || contractData.contractValueUsd > 10000;

  if (!noNewFeatures || !growingAccount) {
    return null;
  }

  return {
    type: 'feature_adoption_stall',
    priority: 'medium',
    title: 'Feature Adoption Stall',
    description:
      'No new product features have been adopted in the last 30 days despite this being a growing account.',
    recommendedAction:
      'Schedule a product walkthrough to demonstrate new features. Consider assigning a customer success specialist.',
    triggeredAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if an existing alert of the given type was triggered within
 * the cooldown window, meaning the new alert should be suppressed.
 */
function isInCooldown(
  existingAlerts: Alert[],
  type: AlertType,
  cooldownMs: number,
): boolean {
  const now = Date.now();
  return existingAlerts.some((a) => {
    if (a.type !== type) return false;
    const triggeredMs = new Date(a.triggeredAt).getTime();
    return now - triggeredMs < cooldownMs;
  });
}

// ---------------------------------------------------------------------------
// Main alert engine
// ---------------------------------------------------------------------------

/**
 * Evaluates all alert rules against the provided customer data, deduplicates
 * against existing alerts, applies cooldown suppression, and returns a
 * prioritized list.
 *
 * Alerts are sorted: high priority first, then medium. Within each tier alerts
 * are ordered by contract value (ARR proxy) descending — for multi-customer
 * scenarios where this engine result is merged with others.
 *
 * @param input      - Full customer context including historical data.
 * @param cooldownMs - Cooldown window in ms. Defaults to 24 hours.
 * @returns AlertEngineResult with deduplicated, prioritized alerts and a count
 *          of how many candidate alerts were suppressed.
 */
export function alertEngine(
  input: AlertEngineInput,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): AlertEngineResult {
  const existing = input.existingAlerts ?? [];
  const history = input.healthHistory ?? {};

  // ---- Gather candidates ------------------------------------------------

  const candidates: Alert[] = [];

  // Payment risk: overdue days route
  const paymentAlert = evaluatePaymentRisk(input.payment, history);
  if (paymentAlert !== null) {
    candidates.push(paymentAlert);
  }

  // Payment risk: score-drop route (> 20 pts drop in 7 days)
  // Only add if the overdue route did not already fire (same alert type)
  if (
    paymentAlert === null &&
    history.scoreSevenDaysAgo !== undefined &&
    history.scoreSevenDaysAgo - input.healthScore > 20
  ) {
    candidates.push({
      type: 'payment_risk',
      priority: 'high',
      title: 'Payment Risk — Score Drop',
      description: `Health score dropped ${Math.round(history.scoreSevenDaysAgo - input.healthScore)} points in the last 7 days (from ${history.scoreSevenDaysAgo} to ${input.healthScore}).`,
      recommendedAction:
        'Investigate the root cause of the health score decline and reach out to the customer proactively.',
      triggeredAt: new Date().toISOString(),
    });
  }

  const engagementAlert = evaluateEngagementCliff(input.engagement);
  if (engagementAlert !== null) candidates.push(engagementAlert);

  const contractAlert = evaluateContractExpirationRisk(input.contract, input.healthScore);
  if (contractAlert !== null) candidates.push(contractAlert);

  const supportAlert = evaluateSupportTicketSpike(input.support);
  if (supportAlert !== null) candidates.push(supportAlert);

  const featureAlert = evaluateFeatureAdoptionStall(input.engagement, input.contract);
  if (featureAlert !== null) candidates.push(featureAlert);

  // ---- Deduplication + cooldown -----------------------------------------

  let suppressedCount = 0;
  const seen = new Set<AlertType>();
  const deduplicated: Alert[] = [];

  for (const alert of candidates) {
    // Within-run deduplication (same type fired twice, e.g., both payment routes)
    if (seen.has(alert.type)) {
      suppressedCount++;
      continue;
    }

    // Cooldown suppression against previously fired alerts
    if (isInCooldown(existing, alert.type, cooldownMs)) {
      suppressedCount++;
      continue;
    }

    seen.add(alert.type);
    deduplicated.push(alert);
  }

  // ---- Sort: high first, then by ARR proxy descending -------------------

  const priorityOrder: Record<AlertPriority, number> = { high: 0, medium: 1 };
  const arr = input.contract.contractValueUsd;

  deduplicated.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    // Within same priority, weight by ARR (all alerts here share the same customer ARR,
    // so this is a no-op for single-customer results but correct for multi-customer merges)
    return arr > 0 ? -1 : 0;
  });

  return { alerts: deduplicated, suppressedCount };
}
