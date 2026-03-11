---
name: Component Patterns — CustomerCard
description: Established conventions from the CustomerCard component, the first concrete component built in this project
type: project
---

## CustomerCard conventions (established baseline)

File: `src/components/CustomerCard.tsx`

### Structural patterns
- `'use client'` at the top — required for any component using event handlers or hooks
- Named export for props interface (`CustomerCardProps`), default export for the component itself
- Component wrapped in `React.memo` at the bottom: `export default React.memo(CustomerCard)`
- Explicit return type annotation on the component function: `): React.JSX.Element`
- Event handlers extracted as named inner functions (`handleClick`, `handleKeyDown`) rather than inline lambdas on JSX

### Health score utility
`getHealthStatus(score)` returns `{ colorDot, colorText, label }`:
- 0–30: `bg-red-500` / `text-red-600` / "Critical"
- 31–70: `bg-yellow-500` / `text-yellow-600` / "Warning"
- 71–100: `bg-green-500` / `text-green-600` / "Healthy"

### Accessibility
- Card root: `role="button"`, `tabIndex={0}`, `onKeyDown` guarding `e.key === 'Enter'`
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- Health dot `<span>` carries `aria-label` in the form "Health score: 85 – Healthy" (en-dash via `\u2013`)
- Numeric score also shown beside dot (color-coded with `colorText`) so color is not the only signal

### Sizing and layout
- `max-w-[400px]` and `min-h-[120px]` set on card root
- `flex-1 min-w-0` on left column + `flex-shrink-0` on right column prevents overflow
- `truncate` on all text elements for safe narrow-viewport rendering

### Domain section
- Guarded by `domains.length > 0` (defaults to `[]` via `?? []`)
- Domain count label shown only when `domains.length > 1`
- Domain names rendered in `font-mono` inside a `<ul>/<li>` for semantic list structure
- Section separated from header by a `border-t`

### Dark mode
All colors have dark-mode variants (`dark:bg-gray-800`, `dark:border-gray-700`, `dark:text-gray-100`, etc.).
