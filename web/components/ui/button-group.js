import { cn } from '@/lib/utils';

function ButtonGroup({ className, orientation = 'horizontal', ...props }) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        'flex w-fit items-stretch [&>*]:relative [&>*]:focus-visible:z-10',
        orientation === 'horizontal'
          ? '[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none'
          : 'flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
        className
      )}
      {...props}
    />
  );
}

function ButtonGroupText({ className, ...props }) {
  return (
    <div
      data-slot="button-group-text"
      className={cn('flex min-w-0 items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs', className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupText };
