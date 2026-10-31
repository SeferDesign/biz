'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button.js';
import { Badge } from './ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Alert, AlertDescription } from './ui/alert.js';
import { Separator } from './ui/separator.js';

const stateLabels = {
  success: 'Successful',
  failed: 'Failed',
  never: 'Not run yet',
  pending: 'Waiting for first backup',
  unavailable: 'Unavailable'
};

const stateVariants = {
  success: 'default',
  failed: 'destructive',
  never: 'outline',
  pending: 'secondary',
  unavailable: 'secondary'
};

function formatDateTime(value) {
  if (!value) return 'None recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export default function BackupStatus({ status }) {
  const router = useRouter();
  const state = stateLabels[status?.state] ? status.state : 'unavailable';

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Backup status</h1>
          <p className="text-sm text-muted-foreground">Nightly MySQL backup uploads to encrypted S3 storage.</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Refresh backup status" title="Refresh backup status" onClick={() => router.refresh()}>
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Latest backup job</CardTitle>
            <CardDescription>Backups are retained for 30 days.</CardDescription>
          </div>
          <Badge variant={stateVariants[state]}>{stateLabels[state]}</Badge>
        </CardHeader>
        <Separator />
        <CardContent>
          <dl className="grid gap-x-8 gap-y-6 pt-6 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Latest attempt</dt>
              <dd className="text-sm font-medium tabular-nums">{formatDateTime(status?.last_attempt_at)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Last successful backup</dt>
              <dd className="text-sm font-medium tabular-nums">{formatDateTime(status?.last_successful_at)}</dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Backup object</dt>
              <dd className="text-sm font-medium">
                {status?.last_successful_key ? (
                  <code className="break-all rounded bg-muted px-1.5 py-1 text-xs">{status.last_successful_key}</code>
                ) : 'None recorded'}
              </dd>
            </div>
          </dl>
          {!status?.configured && (
            <Alert className="mt-6">
              <AlertDescription>Backup status is not configured in this environment.</AlertDescription>
            </Alert>
          )}
          {status?.last_error && (
            <Alert className="mt-6" variant="destructive">
              <AlertDescription>{status.last_error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
