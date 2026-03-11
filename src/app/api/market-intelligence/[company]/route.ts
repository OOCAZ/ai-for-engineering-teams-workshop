/**
 * GET /api/market-intelligence/[company]
 * Returns market intelligence data for the given company name.
 *
 * - Validates and sanitizes the `company` path parameter
 * - Simulates a realistic 200–500ms network delay
 * - Returns sanitized error messages (no stack traces or internal details)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  marketIntelligenceService,
  MarketIntelligenceError,
} from '@/lib/marketIntelligenceService';

// Allowed characters: alphanumeric, spaces, hyphens
const VALID_COMPANY_RE = /^[a-zA-Z0-9 -]+$/;
const MAX_COMPANY_LENGTH = 100;

function sanitizeCompany(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COMPANY_LENGTH) {
    return null;
  }
  if (!VALID_COMPANY_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ company: string }> },
): Promise<NextResponse> {
  const { company: rawCompany } = await params;

  // Validate presence and type
  if (!rawCompany || typeof rawCompany !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid company parameter.' },
      { status: 400 },
    );
  }

  const company = sanitizeCompany(rawCompany);
  if (company === null) {
    return NextResponse.json(
      { error: 'Company name contains invalid characters or exceeds maximum length.' },
      { status: 400 },
    );
  }

  // Simulate realistic network delay (200–500ms)
  await randomDelay(200, 500);

  try {
    const data = await marketIntelligenceService.getMarketData(company);

    return NextResponse.json({
      sentiment: data.sentiment,
      articleCount: data.articleCount,
      headlines: data.headlines,
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    if (err instanceof MarketIntelligenceError) {
      // Return sanitized message — never expose internal codes or stack traces
      return NextResponse.json(
        { error: 'Unable to retrieve market intelligence data. Please try again later.' },
        { status: 500 },
      );
    }

    // Unexpected errors — still sanitized
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
