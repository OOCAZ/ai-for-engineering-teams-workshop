# Spec: Dashboard Orchestrator

## Feature: DashboardOrchestrator

### Context
- Top-level orchestration layer that transforms the Customer Intelligence Dashboard from prototype to production-ready application
- Manages multi-level error boundaries, data export capabilities, performance optimizations, and accessibility compliance across all dashboard widgets
- Used by all users of the dashboard; the orchestrator is invisible when things work and informative when they don't
- Wraps all existing widgets (CustomerSelector, CustomerCard, CustomerHealthDisplay, MarketIntelligenceWidget) with resilience, observability, and export infrastructure
- Deployed as the production `src/app/page.tsx` with accompanying server-side configuration in `next.config.ts`

### Requirements

#### Error Boundary System
- `DashboardErrorBoundary` (application level): catches unhandled errors from any child, renders a full-page recovery UI with a "Reload dashboard" button, logs error context
- `WidgetErrorBoundary` (widget level): isolates individual widget failures; renders a compact in-card fallback so the rest of the dashboard remains functional
- Both boundaries distinguish development mode (show stack trace) from production mode (show friendly message only)
- Retry mechanism: each `WidgetErrorBoundary` exposes a "Try again" button that resets its error state; max 3 automatic retries before requiring manual intervention
- Custom error classes: `DashboardError`, `WidgetError`, each extending `Error` with `context` and `widgetName` metadata fields
- Automatic error reporting: errors logged to `console.error` in development; hook point for production error tracking (e.g., Sentry) via an injectable `onError` callback

#### Data Export System
- `ExportUtils` module (`src/lib/exportUtils.ts`) with format-specific handlers:
  - `exportToCSV(data: ExportableData[], filename: string): void`
  - `exportToJSON(data: ExportableData[], filename: string): void`
- Configurable filters: date range, customer segment, data type (health scores, alerts, market intelligence)
- Progress indicator for exports > 100 rows; cancellation support via `AbortController`
- File naming convention: `{dataType}-{YYYY-MM-DD}-{HH-mm}.{ext}`
- Export audit log entry written to `localStorage` on each completed export (timestamp, type, row count)
- No sensitive PII exposed in exported filenames or audit entries

#### Performance Optimizations
- Wrap all widgets with `React.memo` to prevent unnecessary re-renders on unrelated state changes
- Use `React.lazy` + `Suspense` for all widgets; each widget is a separate code-split chunk
- `useMemo` for expensive derived data (health score breakdowns, alert lists)
- `useCallback` for all event handlers passed as props to memoized children
- Virtual scrolling (`react-window` or equivalent) for customer lists exceeding 50 entries
- Core Web Vitals targets: FCP < 1.5s, LCP < 2.5s, CLS < 0.1, TTI < 3.5s

#### Accessibility (WCAG 2.1 AA)
- Semantic HTML: `<main>`, `<nav>`, `<section>`, `<header>` landmarks throughout
- Skip link at page top: "Skip to main content" navigates to `#main-content`
- All interactive elements reachable and operable via keyboard (Tab, Enter, Space, arrow keys)
- Focus indicators meeting WCAG 3:1 contrast ratio against adjacent colors
- All images and icons have `alt` text or `aria-label`; decorative images use `alt=""`
- `aria-live="polite"` regions for dynamic content updates (alerts, score changes)
- Loading state announcements for async operations via `aria-busy` and live regions
- Color is never the sole means of conveying information (labels accompany all color-coded indicators)

#### Security Hardening (`next.config.ts`)
- Content Security Policy header restricting `script-src`, `style-src`, `img-src`, `connect-src` to trusted origins
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation
- Input sanitization helper (`src/lib/sanitize.ts`): strips HTML tags and limits length for all user-provided strings before rendering or exporting
- Rate limiting on export API endpoints: max 10 exports per minute per session (enforced client-side; server-side enforcement recommended for production)

#### Health Check Endpoint
- `GET /api/health` returns `{ status: 'ok', timestamp, version }` with HTTP 200
- Returns `{ status: 'degraded', checks: {...} }` with HTTP 503 if any critical dependency check fails
- Used by load balancers and uptime monitors

### Constraints

#### Technical Stack
- Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- React error boundaries require class components or a wrapper library (`react-error-boundary` acceptable)
- No new third-party UI libraries; Tailwind only for styling

#### File Structure
```
src/
  app/
    page.tsx                          # DashboardOrchestrator root
    api/
      health/
        route.ts
  components/
    DashboardErrorBoundary.tsx
    WidgetErrorBoundary.tsx
  lib/
    exportUtils.ts
    sanitize.ts
  types/
    errors.ts                         # DashboardError, WidgetError
next.config.ts                        # security headers + performance config
```

#### TypeScript Interfaces

```ts
// errors.ts
class DashboardError extends Error {
  context: Record<string, unknown>;
}

class WidgetError extends Error {
  widgetName: string;
  context: Record<string, unknown>;
}

// exportUtils.ts
interface ExportableData {
  [key: string]: string | number | boolean | null;
}

interface ExportOptions {
  filename?: string;
  dateRange?: { from: string; to: string }; // ISO strings
  segment?: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

// DashboardErrorBoundary
interface DashboardErrorBoundaryProps {
  onError?: (error: Error, info: React.ErrorInfo) => void;
  children: React.ReactNode;
}

// WidgetErrorBoundary
interface WidgetErrorBoundaryProps {
  widgetName: string;
  onError?: (error: WidgetError) => void;
  children: React.ReactNode;
}

// Health check response
interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  checks?: Record<string, 'ok' | 'fail'>;
}
```

#### Performance Constraints
- Initial JS bundle for dashboard page must not exceed 200 KB gzipped (excluding widget chunks)
- Each widget chunk must be independently loadable with a Suspense fallback
- Memoization must not suppress legitimate re-renders when selected customer or data changes

#### Design Constraints
- `DashboardErrorBoundary` full-page fallback: centered card with error icon, message, and "Reload dashboard" button using `bg-red-50 border border-red-200`
- `WidgetErrorBoundary` in-card fallback: same `bg-white rounded-lg shadow p-6` shell as widgets; error message in `text-red-600 text-sm`; "Try again" link in `text-blue-600`
- Export buttons: `text-sm font-medium text-gray-700 hover:text-gray-900` with download icon

### Acceptance Criteria
- [ ] `DashboardErrorBoundary` catches an unhandled error thrown by any child widget and renders a recovery UI without crashing the browser tab
- [ ] `WidgetErrorBoundary` isolates a widget failure so all other widgets remain interactive
- [ ] "Try again" button in `WidgetErrorBoundary` successfully resets error state and re-renders the widget
- [ ] Development mode shows error stack trace; production mode shows only a friendly message
- [ ] `exportToCSV` and `exportToJSON` trigger a file download with correctly formatted content and the specified naming convention
- [ ] Export progress indicator appears for datasets > 100 rows and disappears on completion or cancellation
- [ ] Cancelling an export via `AbortController` stops processing mid-stream without throwing an unhandled error
- [ ] Export audit entry written to `localStorage` after each successful export
- [ ] All widgets lazy-load independently; removing one widget's chunk does not block others
- [ ] Lighthouse accessibility score ≥ 90 on the dashboard page
- [ ] Skip link is the first focusable element and correctly moves focus to `#main-content`
- [ ] All color-coded health indicators have accompanying text labels readable by screen readers
- [ ] `aria-live` regions announce alert and score changes without requiring manual refresh
- [ ] `GET /api/health` returns `{ status: 'ok' }` with HTTP 200 in a healthy environment
- [ ] Security headers (`Content-Security-Policy`, `X-Frame-Options`, etc.) present in all production responses
- [ ] Input sanitization strips `<script>` tags and HTML from any user-provided strings before rendering
- [ ] No `any` types; all TypeScript interfaces explicitly defined
- [ ] Unit tests cover: export formatting, sanitization, error class construction, and health check route
