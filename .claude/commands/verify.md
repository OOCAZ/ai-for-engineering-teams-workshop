Verify the component at: $ARGUMENTS

Run a full static verification pass and report a pass/fail summary with specific issues.

---

## Check 1 — TypeScript Types

1. Read the component file at `$ARGUMENTS`.
2. Run the TypeScript compiler check:
   ```
   npx tsc --noEmit
   ```
3. If errors reference `$ARGUMENTS`, record each as a **FAIL** with the exact error message and line number.
4. If the build is clean, record **PASS**.

Also perform manual type inspection:
- Confirm all props are typed (no implicit `any`)
- Confirm all imported types are used correctly (e.g., `Customer` fields accessed on the component match the `Customer` interface in `src/data/mock-customers.ts`)
- Flag any type assertions (`as`) or non-null assertions (`!`) that bypass safety

---

## Check 2 — Compatibility with Mock Data

Read `src/data/mock-customers.ts` and cross-reference with the component:

For each field the component accesses on its data prop, verify:

| Field | In `Customer` interface? | Optional? | Component handles undefined? |
|-------|--------------------------|-----------|------------------------------|
| ...   | ✅/❌                    | yes/no    | ✅/❌                        |

Test these specific scenarios against the mock data in `mockCustomers`:

1. **High health score (≥ 71)** — e.g., John Smith (85), Emily Davis (92), Robert Chen (88). Verify the correct color/class is applied.
2. **Moderate health score (31–70)** — e.g., Sarah Johnson (45), David Wilson (60), Lisa Anderson (73 → boundary case). Verify correct treatment.
3. **Low health score (≤ 30)** — e.g., Michael Brown (15). Verify correct treatment.
4. **Multiple domains** — e.g., Acme Corp (2), Global Solutions (3), DataFlow Analytics (3). Verify count label appears.
5. **Single domain** — e.g., TechStart Inc (1), Smart Ventures (1). Verify no count label.
6. **Optional fields** — create a minimal customer object with only required fields (`id`, `name`, `company`, `healthScore`, no `domains`, no `email`). Verify no crash/render error.

For each: trace the component logic and mark ✅ handled correctly or ❌ with the specific issue.

---

## Check 3 — Responsive Design

Read the component and audit all layout-related Tailwind classes:

**Width/sizing constraints:**
- Does the component have a max-width class? (e.g., `max-w-[320px]`, `max-w-sm`)
- Does it use `w-full` or relative widths that adapt to container?

**Breakpoint classes present:**
- List all responsive prefixes used: `sm:`, `md:`, `lg:`, `xl:`
- For each, describe what changes at that breakpoint

**Narrow viewport (320px) check:**
- Are text elements protected against overflow? (`truncate`, `overflow-hidden`, `break-words`)
- Are flex/grid layouts safe from wrapping issues at small widths?
- Are there any fixed pixel widths that could cause overflow at 320px?

**Touch targets:**
- Are interactive elements large enough (min 44×44px)? Check `p-*`, `h-*`, `w-*` on buttons/clickable areas.

Report each as ✅ PASS or ❌ FAIL with the class or line that causes the issue.

---

## Check 4 — Linting

Run ESLint on the file:
```
npx eslint $ARGUMENTS
```

Record any warnings or errors. Mark each as:
- ❌ **Error** — must fix
- ⚠️ **Warning** — should fix

---

## Check 5 — Accessibility

Read the component and check:

1. **Interactive elements**: if the component is clickable (has `onClick`), verify it also has:
   - `role="button"` or is a `<button>` element
   - `tabIndex={0}` for keyboard access
   - `onKeyDown` handler for Enter/Space key activation

2. **ARIA labels**: for non-text visual indicators (color dots, icons), verify `aria-label` or `aria-describedby` is present with meaningful text.

3. **Image alt text**: any `<img>` elements must have descriptive `alt` attributes.

4. **Semantic HTML**: check for appropriate use of `<ul>/<li>` for lists, headings hierarchy, etc.

Report each as ✅ PASS or ❌ FAIL.

---

## Final Summary

Output a consolidated report:

---

## Verification Report: `$ARGUMENTS`

### Overall Result: PASS / FAIL / PASS WITH WARNINGS

| Check | Result | Issues |
|-------|--------|--------|
| TypeScript types | ✅/❌ | count |
| Mock data compatibility | ✅/❌ | count |
| Responsive design | ✅/❌ | count |
| Linting | ✅/⚠️/❌ | count |
| Accessibility | ✅/❌ | count |

### Issues

List every failure with:
- **Check**: which category
- **Severity**: Error / Warning
- **Location**: file and line number if known
- **Problem**: what is wrong
- **Fix**: specific change needed

### Recommended Next Steps
Ordered list of fixes, most critical first.

---

If all checks pass with no issues, output:
> ✅ **All checks passed.** Component is correctly typed, handles all mock data scenarios, is responsive, lint-clean, and accessible.
