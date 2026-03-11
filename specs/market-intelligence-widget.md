# Spec: Market Intelligence Widget

## Feature: MarketIntelligenceWidget

### Context
- Provides real-time market sentiment and news analysis for customer companies in the Customer Intelligence Dashboard
- Sits alongside CustomerCard, CustomerSelector, and CustomerHealthDisplay widgets in the main dashboard grid
- Used by customer success managers to monitor market conditions affecting their accounts
- Receives the selected customer's company name as a prop and displays relevant market data

### Requirements

#### Functional Requirements
- Accept a `company` prop (string) representing the customer's company name
- Fetch market intelligence data from `/api/market-intelligence/[company]` on mount and when company changes
- Display market sentiment as a color-coded indicator: positive (green), neutral (yellow), negative (red)
- Show total news article count and a "last updated" timestamp
- Render the top 3 headlines with source name and publication date
- Handle loading state while fetching data
- Handle error state when the API call fails
- Re-fetch data when the `company` prop changes

#### API Route (`/api/market-intelligence/[company]/route.ts`)
- Next.js 15 App Router Route Handler (`GET`)
- Extract and validate `company` param — reject empty or non-string values with `400`
- Sanitize company name before passing to service layer
- Call `MarketIntelligenceService.getMarketData(company)`
- Return JSON: `{ sentiment, articleCount, headlines, updatedAt }`
- Simulate realistic API delay (200–500ms) via `setTimeout`/`Promise`
- Return `500` with sanitized error message on service failure

#### Service Layer (`/src/lib/marketIntelligenceService.ts`)
- `MarketIntelligenceService` class with static or instance methods
- `getMarketData(company: string): Promise<MarketIntelligenceData>` — main entry point
- In-memory cache keyed by company name with 10-minute TTL
- On cache miss: call `generateMockMarketData(company)` and `calculateMockSentiment(headlines)`
- Custom `MarketIntelligenceError` class extending `Error` with `code` field
- Pure helper functions for cache TTL check and response assembly (for testability)

#### Data Types (`/src/types/market-intelligence.ts` or inline)
```typescript
interface Headline {
  title: string;
  source: string;
  publishedAt: string; // ISO date string
}

interface Sentiment {
  score: number;       // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;  // 0 to 1
}

interface MarketIntelligenceData {
  sentiment: Sentiment;
  articleCount: number;
  headlines: Headline[];
  updatedAt: string;   // ISO date string
}

interface MarketIntelligenceWidgetProps {
  company: string;
}
```

#### Dashboard Integration
- Import `MarketIntelligenceWidget` in `src/app/page.tsx` using dynamic import with Suspense boundary
- Pass `selectedCustomer.company` as the `company` prop
- Place widget in the responsive grid alongside existing widgets
- Fallback gracefully (placeholder div) when component is not yet available

### Constraints

#### Technical Stack
- Next.js 15 App Router — Route Handlers for API, RSC/client components for UI
- React 19 — `useState`, `useEffect` hooks; `"use client"` directive on widget component
- TypeScript strict mode — all props, state, and return types explicitly typed
- Tailwind CSS v4 — utility classes only, no custom CSS

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
  lib/
    marketIntelligenceService.ts
  data/
    mock-market-intelligence.ts   (already exists — reuse)
```

#### Performance
- API response time target: under 1 second (mock delay ≤ 500ms)
- Component must not block dashboard render — use Suspense + dynamic import
- Cache prevents redundant mock data generation within 10-minute window

#### Design Constraints
- Widget card: `bg-white rounded-lg shadow p-6` — matches existing widget shells
- Section heading: `text-lg font-semibold mb-4`
- Sentiment badge colors:
  - Positive: `text-green-600 bg-green-50`
  - Neutral: `text-yellow-600 bg-yellow-50`
  - Negative: `text-red-600 bg-red-50`
- Headline list: `space-y-3`, headline title `text-sm font-medium text-gray-900`, meta `text-xs text-gray-500`
- Loading state: `text-gray-500 text-sm` spinner or skeleton placeholder
- Error state: `text-red-600 text-sm` message inside card
- Responsive: full-width on mobile, fits `md:grid-cols-2 lg:grid-cols-3` grid

#### Security
- Validate and sanitize `company` path parameter in route handler (alphanumeric + spaces + hyphens only, max 100 chars)
- Do not reflect raw user input into error messages returned to client
- No external API calls — mock data only, eliminating third-party vulnerabilities
- Errors returned to client must not expose internal stack traces or service details

### Acceptance Criteria
- [ ] Widget renders a loading indicator while the API call is in-flight
- [ ] Sentiment label and badge color correctly map positive/neutral/negative states
- [ ] Top 3 headlines display with source and publication date
- [ ] Article count and last-updated timestamp are visible
- [ ] Widget re-fetches and updates when a different customer is selected
- [ ] API returns `400` for missing or invalid company param
- [ ] API returns `500` (sanitized message) on service error
- [ ] Cache returns stale data within TTL; fetches fresh data after TTL expiry
- [ ] Company name with special characters (e.g., `<script>`) is rejected or sanitized before processing
- [ ] Widget renders without errors in the dashboard grid on both mobile and desktop breakpoints
- [ ] All TypeScript types are explicit — no `any`
