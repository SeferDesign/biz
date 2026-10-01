import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function NewButton({ href, label = 'New record', className = '' }) {
  const classes = ['primary-button', 'new-button', className].filter(Boolean).join(' ');
  return (
    <Link className={classes} href={href}>
      <Plus size={14} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function NewIconButton({ href, label, className = '' }) {
  const classes = ['table-action-button', className].filter(Boolean).join(' ');
  return (
    <Link aria-label={label} className={classes} href={href} title={label}>
      <Plus size={16} aria-hidden="true" />
    </Link>
  );
}
