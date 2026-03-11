import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Returns application health status for load balancers and uptime monitors.
 *
 * Healthy:   HTTP 200 { status: 'ok', timestamp, version }
 * Degraded:  HTTP 503 { status: 'degraded', timestamp, version, checks: {...} }
 */

interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  checks?: Record<string, 'ok' | 'fail'>;
}

const APP_VERSION = process.env.npm_package_version ?? '0.1.0';

/**
 * Runs dependency checks and returns a map of check name → status.
 * Currently checks that the mock data module loads correctly as a proxy
 * for the data layer. Extend this with real DB/service checks in production.
 */
function runChecks(): Record<string, 'ok' | 'fail'> {
  const checks: Record<string, 'ok' | 'fail'> = {};

  // Data layer check: verify the mock customer data is accessible
  try {
    // Dynamic require keeps this tree-shakeable and testable
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockCustomers } = require('@/data/mock-customers') as {
      mockCustomers: unknown[];
    };
    checks.data = Array.isArray(mockCustomers) && mockCustomers.length > 0 ? 'ok' : 'fail';
  } catch {
    checks.data = 'fail';
  }

  return checks;
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const timestamp = new Date().toISOString();
  const version = APP_VERSION;

  const checks = runChecks();
  const allOk = Object.values(checks).every((v) => v === 'ok');

  if (allOk) {
    return NextResponse.json<HealthCheckResponse>(
      { status: 'ok', timestamp, version },
      { status: 200 },
    );
  }

  return NextResponse.json<HealthCheckResponse>(
    { status: 'degraded', timestamp, version, checks },
    { status: 503 },
  );
}
