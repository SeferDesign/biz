'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Spinner } from './ui/spinner.js';
import {
  AlertDialog,
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
  const [open, setOpen] = useState(false);
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
      toast.success(`${label} completed.`);
      setOpen(false);
      router.push(returnTo);
      router.refresh();
    } catch {
      setError('Could not reach the API. Check the API URL, CORS_ALLOWED_ORIGINS, and browser TLS trust.');
      setDeleting(false);
    }
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!deleting) setOpen(nextOpen); }}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" type="button"><Trash2 className="size-4" aria-hidden="true" />{label}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" disabled={deleting}>Cancel</Button></AlertDialogCancel>
            <Button aria-busy={deleting} variant="destructive" disabled={deleting} onClick={remove}>{deleting ? <Spinner /> : <Trash2 className="size-4" aria-hidden="true" />}{deleting ? 'Deleting...' : label}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
