/**
 * healthCalculator.ts
 *
 * Pure calculation library for computing customer health scores from multiple
 * data factors. Scores are 0–100; overall is a weighted blend.
 *
 * Weights: Payment 40% | Engagement 30% | Contract 20% | Support 10%
 * Risk levels: 0–30 → critical | 31–70 → warning | 71–100 → healthy
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PaymentData {
  daysSinceLastPayment: number;
  averagePaymentDelayDays: number;
  overdueAmountUsd: number;
}

export interface EngagementData {
  loginFrequencyPerMonth: number;
  featureUsageCount: number;
  openSupportTickets: number;
  loginFrequency30DayAvg?: number; // for trend analysis
  newFeaturesUsedLast30Days?: number;
}

export interface ContractData {
  daysUntilRenewal: number;
  contractValueUsd: number; // used as ARR proxy
  recentUpgrades: number;
}

export interface SupportData {
  averageResolutionTimeDays: number;
  satisfactionScore: number; // 1–5
  escalationCount: number;
  ticketsLast7Days?: number;
  hasEscalatedTicket?: boolean;
}

export interface HealthScoreInput {
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
}

export interface FactorBreakdown {
  score: number; // 0–100
  weight: number; // e.g. 0.4
  contribution: number; // score * weight
}

export interface HealthScoreResult {
  overallScore: number; // 0–100, rounded to nearest integer
  riskLevel: 'healthy' | 'warning' | 'critical';
  breakdown: {
    payment: FactorBreakdown;
    engagement: FactorBreakdown;
    contract: FactorBreakdown;
    support: FactorBreakdown;
  };
}

export class HealthScoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthScoreValidationError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_WEIGHT = 0.4;
const ENGAGEMENT_WEIGHT = 0.3;
const CONTRACT_WEIGHT = 0.2;
const SUPPORT_WEIGHT = 0.1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamps a value to [0, 100]. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Maps a risk level from an overall score. */
function classifyRisk(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 71) return 'healthy';
  if (score >= 31) return 'warning';
  return 'critical';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates the full HealthScoreInput and throws HealthScoreValidationError
 * with a descriptive message if any field is invalid.
 */
function validateInput(input: HealthScoreInput): void {
  const { payment, engagement, contract, support } = input;

  if (!Number.isFinite(payment.daysSinceLastPayment) || payment.daysSinceLastPayment < 0) {
    throw new HealthScoreValidationError(
      `payment.daysSinceLastPayment must be a non-negative number, got: ${payment.daysSinceLastPayment}`
    );
  }
  if (!Number.isFinite(payment.averagePaymentDelayDays) || payment.averagePaymentDelayDays < 0) {
    throw new HealthScoreValidationError(
      `payment.averagePaymentDelayDays must be a non-negative number, got: ${payment.averagePaymentDelayDays}`
    );
  }
  if (!Number.isFinite(payment.overdueAmountUsd) || payment.overdueAmountUsd < 0) {
    throw new HealthScoreValidationError(
      `payment.overdueAmountUsd must be a non-negative number, got: ${payment.overdueAmountUsd}`
    );
  }

  if (!Number.isFinite(engagement.loginFrequencyPerMonth) || engagement.loginFrequencyPerMonth < 0) {
    throw new HealthScoreValidationError(
      `engagement.loginFrequencyPerMonth must be a non-negative number, got: ${engagement.loginFrequencyPerMonth}`
    );
  }
  if (!Number.isFinite(engagement.featureUsageCount) || engagement.featureUsageCount < 0) {
    throw new HealthScoreValidationError(
      `engagement.featureUsageCount must be a non-negative number, got: ${engagement.featureUsageCount}`
    );
  }
  if (!Number.isFinite(engagement.openSupportTickets) || engagement.openSupportTickets < 0) {
    throw new HealthScoreValidationError(
      `engagement.openSupportTickets must be a non-negative number, got: ${engagement.openSupportTickets}`
    );
  }

  if (!Number.isFinite(contract.daysUntilRenewal)) {
    throw new HealthScoreValidationError(
      `contract.daysUntilRenewal must be a finite number, got: ${contract.daysUntilRenewal}`
    );
  }
  if (!Number.isFinite(contract.contractValueUsd) || contract.contractValueUsd < 0) {
    throw new HealthScoreValidationError(
      `contract.contractValueUsd must be a non-negative number, got: ${contract.contractValueUsd}`
    );
  }
  if (!Number.isFinite(contract.recentUpgrades) || contract.recentUpgrades < 0) {
    throw new HealthScoreValidationError(
      `contract.recentUpgrades must be a non-negative number, got: ${contract.recentUpgrades}`
    );
  }

  if (!Number.isFinite(support.averageResolutionTimeDays) || support.averageResolutionTimeDays < 0) {
    throw new HealthScoreValidationError(
      `support.averageResolutionTimeDays must be a non-negative number, got: ${support.averageResolutionTimeDays}`
    );
  }
  if (
    !Number.isFinite(support.satisfactionScore) ||
    support.satisfactionScore < 1 ||
    support.satisfactionScore > 5
  ) {
    throw new HealthScoreValidationError(
      `support.satisfactionScore must be between 1 and 5, got: ${support.satisfactionScore}`
    );
  }
  if (!Number.isFinite(support.escalationCount) || support.escalationCount < 0) {
    throw new HealthScoreValidationError(
      `support.escalationCount must be a non-negative number, got: ${support.escalationCount}`
    );
  }
}

// ---------------------------------------------------------------------------
// Individual factor scoring functions
// ---------------------------------------------------------------------------

/**
 * Calculates a payment health score (0–100).
 *
 * Formula:
 * - Starts at 100.
 * - Penalizes for overdue amounts: -1 pt per $1 000 overdue (capped at -40).
 * - Penalizes for average payment delay: -2 pts per delay day (capped at -30).
 * - Penalizes for recency: if >60 days since last payment, -1 pt per day over 60 (capped at -30).
 * - New customers with no history (all zeros) receive a neutral score of 75.
 */
export function calculatePaymentScore(data: PaymentData): number {
  // New-customer neutral default: no overdue, no delay, recent payment
  if (
    data.daysSinceLastPayment === 0 &&
    data.averagePaymentDelayDays === 0 &&
    data.overdueAmountUsd === 0
  ) {
    return 75;
  }

  let score = 100;

  // Overdue amount penalty: -1 per $1,000 overdue, max -40
  const overduePenalty = Math.min(40, Math.floor(data.overdueAmountUsd / 1000));
  score -= overduePenalty;

  // Average delay penalty: -2 per delay day, max -30
  const delayPenalty = Math.min(30, data.averagePaymentDelayDays * 2);
  score -= delayPenalty;

  // Recency penalty: if >60 days since last payment, -1 per extra day, max -30
  if (data.daysSinceLastPayment > 60) {
    const recencyPenalty = Math.min(30, data.daysSinceLastPayment - 60);
    score -= recencyPenalty;
  }

  return clamp(score);
}

/**
 * Calculates an engagement health score (0–100).
 *
 * Formula:
 * - Login frequency contributes up to 50 pts (cap at 20 logins/month = full).
 * - Feature usage contributes up to 30 pts (cap at 10 features = full).
 * - Open support tickets penalise: -5 pts each, max -20.
 * - New-feature trend bonus: if newFeaturesUsedLast30Days > 0, +10 (to reward adoption).
 * - New customers with no history (all zeros) receive a neutral score of 60.
 */
export function calculateEngagementScore(data: EngagementData): number {
  // New-customer neutral default
  if (
    data.loginFrequencyPerMonth === 0 &&
    data.featureUsageCount === 0 &&
    data.openSupportTickets === 0
  ) {
    return 60;
  }

  // Login frequency: linear up to 20 logins/month = 50 pts
  const loginScore = Math.min(50, (data.loginFrequencyPerMonth / 20) * 50);

  // Feature usage: linear up to 10 features = 30 pts
  const featureScore = Math.min(30, (data.featureUsageCount / 10) * 30);

  // Open tickets penalty: -5 each, max -20
  const ticketPenalty = Math.min(20, data.openSupportTickets * 5);

  let score = loginScore + featureScore - ticketPenalty;

  // New-feature adoption bonus
  if ((data.newFeaturesUsedLast30Days ?? 0) > 0) {
    score += 10;
  }

  return clamp(score);
}

/**
 * Calculates a contract health score (0–100).
 *
 * Formula:
 * - Renewal proximity: starts at 100; penalises as renewal approaches.
 *   < 30 days → -40; 30–90 days → -20; 90–180 days → -10; > 180 days → 0.
 * - Recent upgrades bonus: +10 per upgrade, max +20.
 * - Negative daysUntilRenewal (already expired) is treated as < 30 days.
 * - New customers (daysUntilRenewal very large, 0 upgrades) receive neutral 70.
 */
export function calculateContractScore(data: ContractData): number {
  let score = 100;

  // Renewal proximity penalty
  if (data.daysUntilRenewal < 30) {
    score -= 40;
  } else if (data.daysUntilRenewal < 90) {
    score -= 20;
  } else if (data.daysUntilRenewal < 180) {
    score -= 10;
  }

  // Upgrade bonus: +10 each, max +20
  const upgradeBonus = Math.min(20, data.recentUpgrades * 10);
  score += upgradeBonus;

  return clamp(score);
}

/**
 * Calculates a support health score (0–100).
 *
 * Formula:
 * - Satisfaction score maps linearly: 1 → 0 pts, 5 → 60 pts.
 * - Resolution time penalty: -3 pts per day above 1 day, max -30.
 * - Escalation penalty: -10 per escalation, max -30.
 * - If hasEscalatedTicket is true, additional -10.
 * - Ticket spike: if ticketsLast7Days > 3, -5 per ticket over 3, max -10.
 * - New customers (satisfactionScore = 3 neutral, 0 escalations, fast resolution) get ~50.
 */
export function calculateSupportScore(data: SupportData): number {
  // Satisfaction maps 1→0, 5→60 (linear)
  const satisfactionScore = ((data.satisfactionScore - 1) / 4) * 60;

  // Resolution time penalty: -3 per day above 1 day, max -30
  const resolutionPenalty = data.averageResolutionTimeDays > 1
    ? Math.min(30, (data.averageResolutionTimeDays - 1) * 3)
    : 0;

  // Escalation penalty: -10 per escalation, max -30
  const escalationPenalty = Math.min(30, data.escalationCount * 10);

  // Escalated ticket penalty
  const escalatedPenalty = data.hasEscalatedTicket === true ? 10 : 0;

  // Ticket spike penalty
  const spikePenalty =
    (data.ticketsLast7Days ?? 0) > 3
      ? Math.min(10, ((data.ticketsLast7Days ?? 0) - 3) * 5)
      : 0;

  const score = satisfactionScore - resolutionPenalty - escalationPenalty - escalatedPenalty - spikePenalty;

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Main composite function
// ---------------------------------------------------------------------------

/**
 * Calculates an overall customer health score by combining the four factor
 * scores using fixed weights:
 *   Payment × 0.4 + Engagement × 0.3 + Contract × 0.2 + Support × 0.1
 *
 * Throws HealthScoreValidationError if any input field is invalid.
 *
 * @returns HealthScoreResult with overallScore [0–100], riskLevel, and breakdown.
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  validateInput(input);

  const paymentScore = calculatePaymentScore(input.payment);
  const engagementScore = calculateEngagementScore(input.engagement);
  const contractScore = calculateContractScore(input.contract);
  const supportScore = calculateSupportScore(input.support);

  const paymentContribution = paymentScore * PAYMENT_WEIGHT;
  const engagementContribution = engagementScore * ENGAGEMENT_WEIGHT;
  const contractContribution = contractScore * CONTRACT_WEIGHT;
  const supportContribution = supportScore * SUPPORT_WEIGHT;

  const overallScore = Math.round(
    paymentContribution + engagementContribution + contractContribution + supportContribution
  );

  return {
    overallScore: clamp(overallScore),
    riskLevel: classifyRisk(overallScore),
    breakdown: {
      payment: { score: paymentScore, weight: PAYMENT_WEIGHT, contribution: paymentContribution },
      engagement: { score: engagementScore, weight: ENGAGEMENT_WEIGHT, contribution: engagementContribution },
      contract: { score: contractScore, weight: CONTRACT_WEIGHT, contribution: contractContribution },
      support: { score: supportScore, weight: SUPPORT_WEIGHT, contribution: supportContribution },
    },
  };
}
