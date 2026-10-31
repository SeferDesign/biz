import { cn } from '@/lib/utils';

function Separator({ className, decorative = true, orientation = 'horizontal', ...props }) {
  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      role={decorative ? undefined : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  );
}

export { Separator };
