Review and validate the spec file at: $ARGUMENTS

Use @templates/spec-template.md as the reference template.

Perform the following validation steps:

1. **Read the spec file** at the path provided.

2. **Check for required sections** — verify each of these headings exists:
   - `### Context`
   - `### Requirements`
   - `### Constraints`
   - `### Acceptance Criteria`

3. **Validate section content** — for each present section, check:
   - **Context**: Has purpose/role, system fit, and user/usage info. Flag if any are missing or still contain placeholder text.
   - **Requirements**: Has functional, UI, data, and integration requirements. Flag if fewer than 2 items are listed or placeholders remain.
   - **Constraints**: Has technical stack, performance, design, file/naming, TypeScript/props, and security notes. Flag missing sub-topics.
   - **Acceptance Criteria**: Has at least 2 checkbox items (`- [ ]`). Flag if items are generic/placeholder or if none are testable.

4. **Check the feature heading** — confirm a `## Feature:` heading exists and has a real name (not `[Component/Feature Name]`).

5. **Return a structured validation report** in this format:

---

## Spec Review: `<filename>`

### Summary
**Status**: PASS / NEEDS WORK / FAIL
**Completeness**: X/5 sections valid

### Section Checklist
| Section | Status | Notes |
|---------|--------|-------|
| Feature heading | ✅/❌ | ... |
| Context | ✅/⚠️/❌ | ... |
| Requirements | ✅/⚠️/❌ | ... |
| Constraints | ✅/⚠️/❌ | ... |
| Acceptance Criteria | ✅/⚠️/❌ | ... |

Legend: ✅ Complete  ⚠️ Present but incomplete  ❌ Missing

### Issues Found
List each issue with:
- **Section**: which section
- **Problem**: what is missing or incomplete
- **Action**: specific text or content to add

### Recommendations
Prioritized list of the top 3 improvements to make this spec implementation-ready.

---

Be specific and actionable. Reference the template's expected content when calling out gaps.
