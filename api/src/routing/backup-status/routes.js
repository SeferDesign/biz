import { Router } from 'express';
import { readFile } from 'node:fs/promises';

const validStates = new Set(['never', 'success', 'failed']);

function nullableString(value) {
  return typeof value === 'string' ? value : null;
}

export default function backupStatusRouter({ statusFile } = {}) {
  const router = Router();

  router.get('/system/backup-status', async (req, res) => {
    if (!statusFile) {
      return res.json({ configured: false, state: 'unavailable' });
    }
    try {
      const status = JSON.parse(await readFile(statusFile, 'utf8'));
      return res.json({
        configured: true,
        state: validStates.has(status.state) ? status.state : 'unavailable',
        last_attempt_at: nullableString(status.last_attempt_at),
        last_successful_at: nullableString(status.last_successful_at),
        last_successful_key: nullableString(status.last_successful_key),
        last_error: nullableString(status.last_error)
      });
    } catch (error) {
      if (error.code === 'ENOENT') return res.json({ configured: true, state: 'pending' });
      return res.status(500).json({ error: 'Backup status could not be read' });
    }
  });

  return router;
}