'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function Command({ className, ...props }) {
  return <CommandPrimitive data-slot="command" className={cn('flex size-full flex-col overflow-hidden rounded-xl bg-background p-1 text-foreground', className)} {...props} />;
}

function CommandInput({ className, children, ...props }) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <div className="flex h-8 items-center gap-2 rounded-lg border border-input/30 bg-input/30 px-2">
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input data-slot="command-input" className={cn('h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
        {children}
      </div>
    </div>
  );
}

function CommandList({ className, ...props }) {
  return <CommandPrimitive.List data-slot="command-list" className={cn('max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none', className)} {...props} />;
}

function CommandEmpty({ className, ...props }) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn('py-6 text-center text-sm', className)} {...props} />;
}

function CommandGroup({ className, ...props }) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn('overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground', className)} {...props} />;
}

function CommandItem({ className, ...props }) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn('relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground', className)} {...props} />;
}

function CommandShortcut({ className, ...props }) {
  return <span data-slot="command-shortcut" className={cn('ml-auto shrink-0 text-xs text-muted-foreground', className)} {...props} />;
}

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut };
