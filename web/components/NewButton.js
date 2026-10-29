import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from './ui/button.js';

export default function NewButton({ href, label = 'New record', className = '' }) {
  return (
    <Button asChild className={`new-button ${className}`}>
      <Link href={href}>
        <Plus size={14} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}

export function NewIconButton({ href, label, className = '' }) {
  return (
    <Button asChild aria-label={label} className={className} size="icon" title={label} variant="ghost">
      <Link href={href}><Plus size={16} aria-hidden="true" /></Link>
    </Button>
  );
}
