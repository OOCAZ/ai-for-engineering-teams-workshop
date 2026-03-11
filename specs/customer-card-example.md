# Spec: CustomerCard

## Feature: CustomerCard Component

### Context
- Individual customer display component for the Customer Intelligence Dashboard
- Rendered within the `CustomerSelector` container component to list all customers
- Displays customer health scores and domain info for business analysts and operators
- Used by business analysts to monitor customer status at a glance
- Foundation component for domain health monitoring; clicking navigates to per-customer detail

### Requirements

#### Functional Requirements
- Display customer name, company name, email, and health score (0-100)
- Show customer domains (websites) for health monitoring context
- Visual health indicator with color coding based on score
- Clickable card that invokes `onClick` callback with the customer object
- Clean, card-based responsive design

#### User Interface Requirements
- Color-coded health indicators:
  - Red: 0-30 (critical)
  - Yellow: 31-70 (warning)
  - Green: 71-100 (healthy)
- Responsive design for mobile and desktop
- Clear typography hierarchy (name > company > email > domains)
- Visual hover state to indicate clickability

#### Data Requirements
- Accepts customer object via props using the exported `Customer` interface from `@/data/mock-customers`
- Customer interface: name, email (optional), company, healthScore, domains (optional array)
- Do not redefine the `Customer` interface; import it directly

#### Integration Requirements
- Rendered by `CustomerSelector` (`src/components/CustomerSelector.tsx`)
- Props-based data flow from parent component
- `onClick` prop is optional; card still renders correctly without it

### Constraints

#### Technical Stack
- Next.js 15 (App Router)
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling; no external UI libraries

#### Props Interface
```ts
import { Customer } from '@/data/mock-customers';

export interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}
```

#### Performance Requirements
- Efficient re-renders: wrap with `React.memo` when rendered in lists of 50+ customers
- No layout shift during load

#### Design Constraints
- Component file: `src/components/CustomerCard.tsx`
- Maximum card width: 400px
- Minimum card height: 120px
- Consistent spacing using Tailwind spacing scale
- Follow project naming conventions (PascalCase for components)

#### Security Considerations
- React's JSX escaping is sufficient for XSS prevention; do not use `dangerouslySetInnerHTML`
- No sensitive customer data exposed in client-side logs

### Acceptance Criteria
- [ ] Customer name, company, and health score are visible and legible on each card
- [ ] Email is displayed when present; card renders correctly when email is absent
- [ ] Health score indicator renders in the correct color for all three bands (red/yellow/green)
- [ ] All domains are listed when `domains` is present; domain count label appears when more than one domain
- [ ] Card renders without error when `domains` is undefined or empty
- [ ] `onClick` prop is called with the correct `Customer` object when the card is clicked
- [ ] Card is keyboard-accessible: Enter key triggers `onClick`
- [ ] Health indicator includes an accessible label (e.g., `aria-label="Health score: 85 – Good"`)
- [ ] Responsive design works on screens as narrow as 320px
- [ ] Card is visually distinct in its hover state
