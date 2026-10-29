import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative grid w-full gap-y-1 rounded-md border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/30 bg-red-50 text-destructive',
        success: 'border-status-success/50 bg-status-success text-status-success-foreground',
        info: 'border-status-info/50 bg-status-info text-status-info-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Alert({ className, variant, ...props }) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant, className }))} {...props} />;
}

function AlertTitle({ className, ...props }) {
  return <h5 data-slot="alert-title" className={cn('font-medium leading-none', className)} {...props} />;
}

function AlertDescription({ className, ...props }) {
  return <div data-slot="alert-description" className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
