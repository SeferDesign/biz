'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog.js';

export default function DeleteButton({ endpoint, returnTo, label = 'Delete record' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || `Could not delete record (${response.status})`);
        setDeleting(false);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setDeleting(false);
    }
  }

  return (
    <div className="delete-action">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" type="button" disabled={deleting}>{label}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button variant="destructive" disabled={deleting} onClick={remove}>{deleting ? 'Deleting...' : label}</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <span className="action-error" role="alert">{error}</span>}
    </div>
  );
}
