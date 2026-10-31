import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';

const validStates = new Set(['never', 'running', 'success', 'failed']);

function nullableString(value) {
  return typeof value === 'string' ? value : null;
}

export default function backupStatusRouter({ statusFile, triggerFile } = {}) {
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

  router.post('/system/backup', async (req, res) => {
    if (!triggerFile) {
      return res.status(503).json({ error: 'Manual backup trigger is not configured' });
    }

    if (statusFile) {
      try {
        const status = JSON.parse(await readFile(statusFile, 'utf8'));
        if (status.state === 'running') {
          return res.status(409).json({ error: 'A backup is already running' });
        }
      } catch (error) {
        if (error.code !== 'ENOENT') return res.status(500).json({ error: 'Backup status could not be read' });
      }
    }

    try {
      await writeFile(triggerFile, `${new Date().toISOString()}\n`, { flag: 'wx', mode: 0o600 });
      return res.status(202).json({ state: 'queued' });
    } catch (error) {
      if (error.code === 'EEXIST') return res.status(409).json({ error: 'A backup is already queued or running' });
      return res.status(503).json({ error: 'Manual backup trigger is unavailable' });
    }
  });

  return router;
}
