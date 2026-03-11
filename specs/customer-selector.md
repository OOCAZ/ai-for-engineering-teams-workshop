# Spec: CustomerSelector

## Feature: CustomerSelector Component

### Context
- Main customer selection panel for the Customer Intelligence Dashboard
- Renders a searchable, scrollable list of `CustomerCard` components
- Used by operators/admins who need to quickly find and select a customer to inspect domain health data
- Manages the currently selected customer and communicates the selection to parent components

### Requirements
- Render the full list of customers from `src/data/mock-customers.ts` using the `CustomerCard` component
- Provide a text input that filters the visible customer cards in real-time by customer `name` or `company`
- Highlight the currently selected customer card visually (e.g., ring or background change)
- Emit the selected customer to the parent via a callback prop when a card is clicked
- Support 100+ customers without layout or performance degradation (virtualize or use CSS scroll, not pagination)
- Show an empty-state message when no customers match the search query

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data source:** `src/data/mock-customers.ts` — use the exported `Customer` interface; do not redefine it
- **Props interface:**
  ```ts
  import { Customer } from '@/data/mock-customers';

  interface CustomerSelectorProps {
    customers: Customer[];
    selectedCustomerId?: string;
    onSelect: (customer: Customer) => void;
  }
  ```
- Component file: `src/components/CustomerSelector.tsx`
- Uses `CustomerCard` from `src/components/CustomerCard.tsx`; do not duplicate card markup
- No external UI libraries; style with Tailwind utility classes only
- Search input must include a visible label or `aria-label` for accessibility
- Panel must be scrollable and constrained in height (e.g., `max-h-[600px] overflow-y-auto`) so it fits inside a sidebar layout
- Selected state is controlled externally via `selectedCustomerId`; the component does not own selection state

### Acceptance Criteria
- [ ] All customers from the `customers` prop are rendered as `CustomerCard` components on initial load
- [ ] Typing in the search input filters cards by name and company (case-insensitive, real-time)
- [ ] Clearing the search input restores the full customer list
- [ ] An empty-state message is shown when no customers match the search query
- [ ] The card matching `selectedCustomerId` receives a distinct visual selection style
- [ ] Clicking a card calls `onSelect` with the correct `Customer` object
- [ ] The component scrolls internally without pushing page content when the list is long
- [ ] Search input has an accessible label (e.g., `aria-label="Search customers"`)
- [ ] Renders correctly when `customers` is an empty array
