'use client';

import React from 'react';
import { Customer } from '@/data/mock-customers';

export interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

function getHealthStatus(score: number): { colorDot: string; colorText: string; label: string } {
  if (score <= 30) return { colorDot: 'bg-red-500', colorText: 'text-red-600', label: 'Critical' };
  if (score <= 70) return { colorDot: 'bg-yellow-500', colorText: 'text-yellow-600', label: 'Warning' };
  return { colorDot: 'bg-green-500', colorText: 'text-green-600', label: 'Healthy' };
}

function CustomerCard({ customer, onClick }: CustomerCardProps): React.JSX.Element {
  const { colorDot, colorText, label } = getHealthStatus(customer.healthScore);
  const domains = customer.domains ?? [];

  function handleClick(): void {
    onClick?.(customer);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Enter') {
      onClick?.(customer);
    }
  }

  return (
    <div
      className="w-full min-h-[120px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Header row: customer info + health score */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: name, company, email */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug">
            {customer.name}
          </p>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {customer.company}
          </p>
          {customer.email !== undefined && customer.email !== '' && (
            <p className="truncate text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {customer.email}
            </p>
          )}
        </div>

        {/* Right: health score dot + numeric score */}
        <div className="flex flex-col items-center flex-shrink-0 gap-1 pt-0.5">
          <span
            className={`inline-block h-3 w-3 rounded-full ${colorDot}`}
            aria-label={`Health score: ${customer.healthScore} \u2013 ${label}`}
          />
          <span className={`text-xs font-semibold tabular-nums ${colorText}`}>
            {customer.healthScore}
          </span>
        </div>
      </div>

      {/* Domains section */}
      {domains.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {domains.length > 1 && (
            <p className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {domains.length} domains
            </p>
          )}
          <ul className="space-y-0.5">
            {domains.map((domain) => (
              <li
                key={domain}
                className="truncate text-xs text-gray-600 dark:text-gray-300 font-mono"
              >
                {domain}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default React.memo(CustomerCard);
