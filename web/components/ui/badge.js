import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        success: 'border-success/20 bg-success-soft text-success [a&]:hover:bg-success/15',
        warning: 'border-warning/20 bg-warning-soft text-warning [a&]:hover:bg-warning/15',
        info: 'border-info/20 bg-info-soft text-info [a&]:hover:bg-info/15',
        danger: 'border-danger/20 bg-danger-soft text-danger [a&]:hover:bg-danger/15',
        destructive: 'border-transparent bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: 'border-transparent [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'border-transparent text-primary underline-offset-4 [a&]:hover:underline'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
