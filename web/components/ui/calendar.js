'use client';

import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex h-7 items-center justify-center px-8',
        caption_label: 'text-sm font-medium',
        nav: 'absolute right-3 top-3 flex items-center gap-1',
        button_previous: 'inline-flex size-7 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
        button_next: 'inline-flex size-7 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 rounded-md text-center text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'relative size-8 p-0 text-center text-sm focus-within:z-20',
        day_button: 'inline-flex size-8 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn('size-4', iconClassName)} />;
        }
      }}
      {...props}
    />
  );
}

export { Calendar };