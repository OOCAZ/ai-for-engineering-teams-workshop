# Customer Intelligence Dashboard

A workshop project for building a customer health monitoring dashboard using spec-driven development with AI agents.

## Tech Stack

- **Next.js 15** (App Router, `'use client'` where needed)
- **React 19**, **TypeScript** (strict mode), **Tailwind CSS v4**
- No external UI libraries — Tailwind utility classes only
- No test framework — use `tsc --noEmit` and `eslint` for validation

## Project Structure

```
src/
  app/           # Next.js pages and layouts
  components/    # React components (built during exercises)
  data/          # Mock data — mock-customers.ts, mock-market-intelligence.ts
requirements/    # Raw feature requirements (source of truth for specs)
specs/           # Generated specs (output of /spec command)
templates/       # spec-template.md — used by all spec commands
exercises/       # Workshop exercise instructions
.claude/commands/ # Custom slash commands
```

## Key Data Model

```ts
// src/data/mock-customers.ts
interface Customer {
  id: string;
  name: string;
  company: string;
  healthScore: number;        // 0–30 poor, 31–70 moderate, 71–100 good
  email?: string;
  subscriptionTier?: 'basic' | 'premium' | 'enterprise';
  domains?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

## Component Conventions

- Files: `src/components/[PascalCase].tsx`
- Import `Customer` from `@/data/mock-customers` — never redefine it
- Export component as default, export props interface as named export
- Accessible interactive elements: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter
- Color-only indicators must have `aria-label`

## Custom Commands

| Command | Purpose |
|---------|---------|
| `/spec [ComponentName]` | Generate a spec from `requirements/[name].md` → `specs/[name]-spec.md` |
| `/spec-review [path]` | Validate a spec against the template structure |
| `/implement [spec path]` | Build a component from a spec with iterative acceptance criteria verification |
| `/verify [component path]` | TypeScript, mock data, responsive design, lint, and accessibility checks |

## Spec-Driven Workflow

```
requirements/ → /spec → specs/ → /implement → src/components/ → /verify
```

Always write or find a spec before implementing. Use `/spec-review` to validate before handing to `/implement`.
