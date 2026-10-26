import { closePool } from '../db/pool.js';
import { MySqlStore } from '../db/store.js';
import { sendActivitySummaryEmail } from '../email/activity-summary-mailer.js';

const period = process.argv[2];

if (!['weekly', 'monthly'].includes(period)) {
  console.error('Usage: node src/jobs/activity-summary.js <weekly|monthly>');
  process.exitCode = 1;
} else {
  try {
    const snapshot = await new MySqlStore().getSnapshot();
    const { recipient, subject } = await sendActivitySummaryEmail({ period, snapshot });
    console.log(`Sent ${subject} to ${recipient}`);
  } catch (error) {
    console.error(`Could not send ${period} activity summary: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
