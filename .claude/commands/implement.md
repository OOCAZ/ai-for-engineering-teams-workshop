Implement a component from the spec file: $ARGUMENTS

## Phase 1 — Read & Parse the Spec

1. Read the spec file at `$ARGUMENTS`.
2. Extract and record:
   - **Component name** from the `## Feature:` heading (e.g., `CustomerCard`)
   - **Requirements** — all bullet points under `### Requirements`
   - **Constraints** — all items under `### Constraints` (stack, file path, props interface, style rules, etc.)
   - **Acceptance Criteria** — every `- [ ]` checkbox item, verbatim

3. Derive the output file path from the Constraints section. If not explicitly stated, default to `src/components/[ComponentName].tsx`.

## Phase 2 — Research the Codebase

Before writing any code, gather context:

1. Check if the component file already exists. If so, read it — you may be refining rather than starting fresh.
2. Find and read any data models, types, or interfaces referenced in the Constraints (e.g., `src/data/mock-customers.ts`).
3. Search for existing components that this one integrates with or is used by.
4. Check `src/app/page.tsx` or related pages to understand rendering context.
5. Note any patterns from neighboring components (naming, Tailwind usage, export style).

## Phase 3 — Implement

Write the component to the path identified in Phase 1. Follow all Constraints strictly:

- Use only the specified tech stack (Next.js 15, React 19, TypeScript, Tailwind CSS)
- Use the exact props interface from the spec; do not redefine imported types
- Apply only Tailwind utility classes for styling (no external UI libraries unless spec says otherwise)
- Follow file naming and export conventions found in the codebase
- Include accessibility attributes where required by the spec

## Phase 4 — Verify Against Acceptance Criteria

Go through every acceptance criterion from the spec one by one. For each:

1. **Read your implementation** and trace the logic that satisfies the criterion.
2. Mark it as:
   - ✅ **Met** — point to the specific code that satisfies it
   - ❌ **Not met** — describe what is missing

Output a verification table:

| # | Criterion | Status | Evidence / Gap |
|---|-----------|--------|----------------|
| 1 | ... | ✅/❌ | ... |

## Phase 5 — Refine (iterate until all criteria pass)

If any criteria are marked ❌:

1. Identify the root cause for each failure.
2. Update the component to address all gaps.
3. Re-verify the updated code against every criterion.
4. Repeat until the verification table shows ✅ for all items.

Do not stop at Phase 4 if any criteria are unmet. Always complete at least one refinement pass before reporting done.

## Phase 6 — Final Report

Once all criteria pass, output:

---

## Implementation Complete: `[ComponentName]`

**File saved:** `[output path]`

**Acceptance Criteria**
| # | Criterion | Status |
|---|-----------|--------|
| 1 | ... | ✅ |

**Implementation notes**
- Any non-obvious decisions made during implementation
- Any spec ambiguities resolved and how
- Anything the spec did not cover that was inferred from the codebase

---
