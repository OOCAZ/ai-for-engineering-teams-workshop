Generate a spec for the component: $ARGUMENTS

Use @templates/spec-template.md as the structure reference.

## Steps

1. **Derive file paths** from the component name `$ARGUMENTS`:
   - Convert to kebab-case (e.g., `CustomerCard` → `customer-card`)
   - Requirements file: `requirements/[kebab-name].md`
   - Output spec file: `specs/[kebab-name]-spec.md`

2. **Read the requirements file** at `requirements/[kebab-name].md`.
   - If the file does not exist, note that no requirements file was found and proceed using only the component name and any context you can infer from the codebase.
   - If it exists, use its content as the primary source for the spec.

3. **Search the codebase** for relevant context:
   - Look for an existing component file (e.g., `src/components/$ARGUMENTS.tsx`)
   - Look for related types, interfaces, or data models
   - Look for any existing tests or usage examples

4. **Generate the spec** following the template structure exactly:

---

# Spec: $ARGUMENTS

## Feature: $ARGUMENTS

### Context
- Purpose and role in the application
- How it fits into the larger system
- Who will use it and when

### Requirements
- Functional requirements (what it must do)
- User interface requirements
- Data requirements
- Integration requirements

### Constraints
- Technical stack: Next.js 15, React 19, TypeScript, Tailwind CSS
- Performance requirements
- Design constraints (responsive breakpoints, component size limits)
- File location and naming conventions
- Props interface with TypeScript definitions
- Security considerations

### Acceptance Criteria
- [ ] Testable success criteria (specific and verifiable)
- [ ] Edge cases handled
- [ ] User experience validated
- [ ] Integration points verified

---

5. **Save the spec** to `specs/[kebab-name]-spec.md`.

6. **Confirm** by outputting:
   - The path where the spec was saved
   - A brief summary of the key requirements captured
   - Whether a requirements file was found and used
