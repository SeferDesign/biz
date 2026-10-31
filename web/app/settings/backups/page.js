import BackupStatus from '../../../components/BackupStatus.js';
import Notice from '../../../components/Notice.js';
import { getApiData } from '../../../lib/api-server.js';

export const metadata = { title: 'Backup Status' };

export default async function BackupStatusPage() {
  const result = await getApiData('/system/backup-status');
  if (result.error) return <Notice title="Backup status unavailable">{result.error}</Notice>;
  return <BackupStatus status={result.data} />;
}