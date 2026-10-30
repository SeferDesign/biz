'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button.js';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

const emptyOptionValue = '__combobox_empty__';

export function Combobox({
  options = [],
  value = '',
  onValueChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  name,
  required = false,
  disabled = false,
  size = 'default',
  className,
  'aria-label': ariaLabel
}) {
  const [open, setOpen] = useState(false);
  const selectedValue = String(value ?? '');
  const selectedOption = options.find((option) => String(option.value) === selectedValue);

  function optionValue(option) {
    const optionValueString = String(option.value);
    return optionValueString === '' ? emptyOptionValue : optionValueString;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={size}
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-required={required || undefined}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className="truncate">{selectedOption?.label ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={String(option.value)}
                    value={optionValue(option)}
                    keywords={[String(option.label), String(option.value)]}
                    disabled={option.disabled}
                    onSelect={() => {
                      onValueChange?.(String(option.value));
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 size-4', selectedValue === String(option.value) ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={selectedValue} />}
    </>
  );
}