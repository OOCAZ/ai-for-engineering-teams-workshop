'use client';

import React, { useState } from 'react';
import { Customer } from '@/data/mock-customers';
import CustomerCard from '@/components/CustomerCard';

export interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelect: (customer: Customer) => void;
}

function CustomerSelector({ customers, selectedCustomerId, onSelect }: CustomerSelectorProps): React.JSX.Element {
  const [query, setQuery] = useState('');

  const filtered = query.trim() === ''
    ? customers
    : customers.filter((c) => {
        const q = query.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
      });

  return (
    <div className="flex flex-col gap-3 w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search customers"
        placeholder="Search by name or company…"
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      <div className="max-h-[600px] overflow-y-auto flex flex-col gap-2 pr-1">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No customers match your search.
          </p>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className={
                customer.id === selectedCustomerId
                  ? 'rounded-lg ring-2 ring-blue-500 ring-offset-1'
                  : ''
              }
            >
              <CustomerCard customer={customer} onClick={onSelect} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CustomerSelector;
