# Spec: CustomerCard

## Feature: CustomerCard Component

### Context
- Individual customer display card for the Customer Intelligence Dashboard
- Rendered within the `CustomerSelector` container component to list all customers
- Used by operators/admins who need to quickly identify and select customers for domain health monitoring
- Serves as the visual entry point into per-customer health data

### Requirements
- Display customer `name` and `company` prominently
- Show a color-coded health indicator based on `healthScore`:
  - Red for scores 0–30 (poor)
  - Yellow for scores 31–70 (moderate)
  - Green for scores 71–100 (good)
- Display the customer's `domains` array as a list of website URLs
- When a customer has multiple domains, show a domain count (e.g., "3 domains")
- Handle customers with no `domains` value gracefully (field is optional)
- Responsive layout supporting mobile and desktop viewports

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data source:** `src/data/mock-customers.ts` — use the exported `Customer` interface directly; do not redefine it
- **Props interface:**
  ```ts
  import { Customer } from '@/data/mock-customers';

  interface CustomerCardProps {
    customer: Customer;
    onClick?: (customer: Customer) => void;
  }
  ```
- Component file: `src/components/CustomerCard.tsx`
- No external UI libraries; style with Tailwind utility classes only
- Health indicator must be an accessible element (e.g., `aria-label` describing the score and status)
- Card must not exceed a reasonable fixed width suitable for a sidebar list (~320px)

### Acceptance Criteria
- [ ] Customer name and company are visible and legible on each card
- [ ] Health score indicator renders in the correct color for all three bands (red/yellow/green)
- [ ] All domains are listed when `domains` is present
- [ ] Domain count label appears when a customer has more than one domain
- [ ] Card renders without error when `domains` is undefined or empty
- [ ] Layout is usable on screens as narrow as 320px
- [ ] `onClick` prop is called with the correct `Customer` object when the card is clicked
- [ ] Health indicator includes an accessible label (e.g., `aria-label="Health score: 85 – Good"`)
