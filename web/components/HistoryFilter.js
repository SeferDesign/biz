'use client';

import { useEffect, useState } from 'react';
import { ListFilter } from 'lucide-react';
import { Button } from './ui/button.js';
import { Combobox } from './ui/combobox.js';

const options = [
  { value: '', label: 'All records' },
  { value: 'client', label: 'Clients' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'expense', label: 'Expenses' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'year', label: 'Years' }
];

export default function HistoryFilter({ value = '' }) {
  const [entityType, setEntityType] = useState(value);

  useEffect(() => setEntityType(value), [value]);

  return (
    <form
      action="/history"
      method="get"
      className="mb-5 flex w-full flex-wrap items-end gap-3 rounded-md border border-border bg-muted/30 p-3 sm:gap-4"
    >
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium sm:max-w-sm">
        Record type
        <Combobox
          name="entity_type"
          value={entityType}
          onValueChange={setEntityType}
          options={options}
          placeholder="All records"
          searchPlaceholder="Search record types..."
          emptyMessage="No record types match."
          aria-label="Record type"
          className="w-full"
        />
      </label>
      <Button type="submit" variant="outline" className="w-full sm:w-auto">
        <ListFilter aria-hidden="true" />
        Apply filter
      </Button>
    </form>
  );
}
