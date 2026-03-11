---
name: orchestrator_patterns
description: Patterns established by the DashboardOrchestrator implementation: error boundaries, export utils, sanitize, health API, security headers, lazy loading in page.tsx
type: project
---

## Error Boundary Pattern (class components, no react-error-boundary)
- `DashboardErrorBoundary` (app-level): `getDerivedStateFromError` + `componentDidCatch`; full-page red-50 card; "Reload dashboard" calls `window.location.reload()`
- `WidgetErrorBoundary` (widget-level): same class pattern; "Try again" resets state via `setState`; MAX_AUTO_RETRIES = 3; wraps native `Error` in `WidgetError` on catch
- Both check `process.env.NODE_ENV === 'development'` for stack trace visibility
- `onError` callback prop is the hook point for Sentry / external trackers

## Custom Error Classes (src/types/errors.ts)
- `DashboardError extends Error` with `context: Record<string, unknown>`
- `WidgetError extends Error` with `widgetName: string` and `context: Record<string, unknown>`
- Both call `Object.setPrototypeOf(this, X.prototype)` to fix instanceof in transpiled code

## Export Utils (src/lib/exportUtils.ts)
- `ExportableData` interface: `{ [key: string]: string | number | boolean | null }`
- `ExportOptions`: filename override, dateRange, segment, AbortSignal, onProgress callback
- Filename convention: `{dataType}-{YYYY-MM-DD}-{HH-mm}.{ext}`
- Progress reporting only fires when `data.length > 100` (PROGRESS_THRESHOLD)
- Cancellation: checks `signal?.aborted`; throws `DOMException('...', 'AbortError')`
- Audit log: `localStorage` key `'dashboard_export_audit_log'`; capped at 200 entries
- `triggerDownload` creates Blob → object URL → `<a>` click → `URL.revokeObjectURL`

## Sanitize (src/lib/sanitize.ts)
- `stripHtml(input)`: removes `<script>` and `<style>` blocks with content, then all HTML tags, then decodes common HTML entities
- `sanitizeString(input, maxLength=500)`: calls stripHtml then slices to maxLength
- `sanitizeRecord(record, maxLength=500)`: applies sanitizeString to all string values

## Health Check API (src/app/api/health/route.ts)
- `GET /api/health` → 200 `{ status: 'ok', timestamp, version }` or 503 `{ status: 'degraded', checks }`
- Uses `process.env.npm_package_version ?? '0.1.0'` for version
- Dependency check uses dynamic `require('@/data/mock-customers')` to verify data layer

## Security Headers (next.config.ts)
- Applied via `headers()` async function on source `/(.*)`
- CSP: default-src self; script-src self unsafe-inline unsafe-eval; style-src self unsafe-inline; img-src self data: blob:; connect-src self; font-src self; object-src none; frame-ancestors none; base-uri self; form-action self
- X-Frame-Options: DENY; X-Content-Type-Options: nosniff; Referrer-Policy: strict-origin-when-cross-origin; Permissions-Policy: camera=(), microphone=(), geolocation=()

## page.tsx Orchestrator Pattern
- Skip link is `<a href="#main-content">` with `sr-only focus:not-sr-only focus:fixed` classes — first focusable element
- Semantic landmarks: `<header>`, `<nav>`, `<main id="main-content">`, `<aside>`, `<footer>`
- `aria-live="polite"` hidden div (`id="dashboard-live-region"`) announces selected customer changes
- All widgets wrapped: `<WidgetErrorBoundary widgetName="..."><Suspense fallback={<WidgetSkeleton />}>...`
- `DashboardErrorBoundary` wraps the entire page tree
- `useCallback` for `handleSelectCustomer`, `useMemo` for `healthInput` and `alertInput`
- `ExportToolbar` handles progress bar (shows when `progress !== null`), cancel via `AbortController` stored in `useRef`
- `buildHealthScoreInput` and `buildAlertEngineInput` derive plausible inputs from `Customer.healthScore`
