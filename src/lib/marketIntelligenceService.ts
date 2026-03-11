/**
 * Market Intelligence Service
 * Provides market data for customer companies with in-memory caching (10-minute TTL).
 * Uses mock data only — no external API calls.
 */

import {
  generateMockMarketData,
  calculateMockSentiment,
} from '@/data/mock-market-intelligence';
import type { MarketIntelligenceData } from '@/types/market-intelligence';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Custom error type
// ---------------------------------------------------------------------------

export class MarketIntelligenceError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MarketIntelligenceError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Cache internals
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: MarketIntelligenceData;
  fetchedAt: number; // epoch ms
}

/**
 * Pure helper — determines whether a cache entry is still within the TTL window.
 */
export function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class MarketIntelligenceService {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Returns market intelligence data for the given company.
   * Returns cached data within the TTL; generates fresh mock data on cache miss.
   */
  async getMarketData(company: string): Promise<MarketIntelligenceData> {
    if (!company || company.trim().length === 0) {
      throw new MarketIntelligenceError(
        'Company name must not be empty.',
        'INVALID_COMPANY',
      );
    }

    const cacheKey = company.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);

    if (cached && isCacheValid(cached)) {
      return cached.data;
    }

    // Cache miss or expired — generate fresh mock data
    try {
      const mockData = generateMockMarketData(company);
      const sentiment = calculateMockSentiment(mockData.headlines);

      const data: MarketIntelligenceData = {
        sentiment,
        articleCount: mockData.articleCount,
        headlines: mockData.headlines.map((h) => ({
          title: h.title,
          source: h.source,
          publishedAt: h.publishedAt,
        })),
        updatedAt: new Date().toISOString(),
      };

      this.cache.set(cacheKey, { data, fetchedAt: Date.now() });
      return data;
    } catch {
      throw new MarketIntelligenceError(
        'Failed to generate market intelligence data.',
        'GENERATION_ERROR',
      );
    }
  }

  /**
   * Clears the entire in-memory cache. Useful for testing and forced refreshes.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Evicts a single company's cache entry.
   */
  evict(company: string): void {
    this.cache.delete(company.toLowerCase().trim());
  }
}

// Singleton instance shared across API route invocations within the same process.
export const marketIntelligenceService = new MarketIntelligenceService();
