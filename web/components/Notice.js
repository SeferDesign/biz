import { Alert, AlertDescription, AlertTitle } from './ui/alert.js';

export default function Notice({ title, children, variant = 'destructive', role, className }) {
  return (
    <Alert className={className} role={role || (variant === 'success' ? 'status' : 'alert')} variant={variant}>
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
