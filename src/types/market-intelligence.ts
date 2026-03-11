/**
 * Shared market intelligence interfaces.
 * Used by lib/marketIntelligenceService.ts, the API route, and UI components.
 */

import type { AlertEngineInput } from '@/types/alerts';

export interface Headline {
  title: string;
  source: string;
  publishedAt: string; // ISO date string
}

export interface Sentiment {
  score: number;      // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0 to 1
}

export interface MarketIntelligenceData {
  sentiment: Sentiment;
  articleCount: number;
  headlines: Headline[];
  updatedAt: string; // ISO date string
}

export interface MarketIntelligenceWidgetProps {
  company: string;
}

export interface PredictiveIntelligencePanelProps {
  alertInput: AlertEngineInput | null;
  company: string;
  isLoading?: boolean;
}
