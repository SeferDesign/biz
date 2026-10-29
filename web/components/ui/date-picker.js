'use client';

import { useEffect, useRef, useState } from 'react';
import { format, isValid, parse, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button.js';
import { Calendar } from './calendar.js';
import { Input } from './input.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

const displayFormat = 'PPP';
const inputFormats = [displayFormat, 'P', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];

function dateFromIso(value) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function dateFromText(value) {
  const text = value.trim();
  if (!text) return undefined;
  for (const dateFormat of inputFormats) {
    const date = parse(text, dateFormat, new Date());
    if (isValid(date) && format(date, dateFormat).toLowerCase() === text.toLowerCase()) return date;
  }
  return undefined;
}

function toIsoDate(date) {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

function DatePicker({ value = '', onChange, label, name, required = false, min, max, compact = false, className, inputClassName }) {
  const inputRef = useRef(null);
  const previousValue = useRef(value);
  const [text, setText] = useState(() => {
    const date = dateFromIso(value);
    return date ? format(date, displayFormat) : '';
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value !== previousValue.current) {
      previousValue.current = value;
      const date = dateFromIso(value);
      setText(date ? format(date, displayFormat) : '');
      inputRef.current?.setCustomValidity('');
    }
  }, [value]);

  function updateText(nextText) {
    setText(nextText);
    const date = dateFromText(nextText);
    const isoDate = date ? toIsoDate(date) : '';
    inputRef.current?.setCustomValidity(nextText && !date ? 'Enter a valid date.' : '');
    if (isoDate !== previousValue.current) {
      previousValue.current = isoDate;
      onChange(isoDate);
    }
  }

  function selectDate(date) {
    const isoDate = toIsoDate(date);
    previousValue.current = isoDate;
    setText(date ? format(date, displayFormat) : '');
    inputRef.current?.setCustomValidity('');
    onChange(isoDate);
    setOpen(false);
  }

  const selectedDate = dateFromIso(value);
  const minDate = dateFromIso(min);
  const maxDate = dateFromIso(max);

  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={inputRef}
        name={name}
        type="text"
        aria-label={label}
        autoComplete="off"
        placeholder="Select date"
        required={required}
        value={text}
        onChange={(event) => updateText(event.target.value)}
        className={cn(compact ? 'h-[35px] rounded-none border-transparent bg-transparent px-2 pr-8 py-1 text-xs shadow-none focus-visible:ring-0' : 'pr-10', inputClassName)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className={cn('absolute right-0 top-0 text-muted-foreground', compact ? 'size-[35px]' : 'size-10')} type="button" variant="ghost" size="icon" aria-label={`Choose ${label || 'date'}`}>
            <CalendarDays aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={selectDate}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DatePicker };