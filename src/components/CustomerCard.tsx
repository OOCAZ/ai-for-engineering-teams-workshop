import { Customer } from '@/data/mock-customers';

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

function getHealthStatus(score: number): { color: string; label: string } {
  if (score <= 30) return { color: 'bg-red-500', label: 'Poor' };
  if (score <= 70) return { color: 'bg-yellow-500', label: 'Moderate' };
  return { color: 'bg-green-500', label: 'Good' };
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const { color, label } = getHealthStatus(customer.healthScore);
  const domains = customer.domains ?? [];

  return (
    <div
      className="w-full max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(customer)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(customer)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{customer.name}</p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
        </div>
        <div
          className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${color}`}
          aria-label={`Health score: ${customer.healthScore} – ${label}`}
        />
      </div>

      {domains.length > 0 && (
        <div className="mt-3">
          {domains.length > 1 && (
            <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">{domains.length} domains</p>
          )}
          <ul className="space-y-0.5">
            {domains.map((domain) => (
              <li key={domain} className="truncate text-xs text-gray-600 dark:text-gray-400">
                {domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
