'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';

const stateLabels = {
  success: 'Successful',
  failed: 'Failed',
  never: 'Not run yet',
  pending: 'Waiting for first backup',
  unavailable: 'Unavailable'
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
    <section className="editor-section backup-status-page">
      <div className="page-heading">
        <div>
          <h1>Backup Status</h1>
          <p className="page-description">Nightly MySQL backup uploads to encrypted S3 storage.</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Refresh backup status" title="Refresh backup status" onClick={() => router.refresh()}>
          <RefreshCw size={16} />
        </Button>
      </div>
      <Card className="backup-status-card">
        <CardHeader>
          <CardTitle>Latest backup job</CardTitle>
          <CardDescription>Backups are retained for 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="backup-status-details">
            <div>
              <dt>Latest attempt</dt>
              <dd><span className={`backup-state backup-state-${state}`}>{stateLabels[state]}</span></dd>
            </div>
            <div><dt>Attempted</dt><dd>{formatDateTime(status?.last_attempt_at)}</dd></div>
            <div><dt>Last successful backup</dt><dd>{formatDateTime(status?.last_successful_at)}</dd></div>
            <div><dt>Backup object</dt><dd>{status?.last_successful_key || 'None recorded'}</dd></div>
          </dl>
          {!status?.configured && <p className="backup-status-note">Backup status is not configured in this environment.</p>}
          {status?.last_error && <p className="backup-status-error" role="alert">{status.last_error}</p>}
        </CardContent>
      </Card>
    </section>
  );
}