import { createApp } from './routing/app.js';
import { initializeSchema } from './db/schema.js';
import { MySqlStore } from './db/store.js';
import { startRecurringExpenseWorker } from './jobs/recurring-expense-worker.js';

// Tables are created with IF NOT EXISTS, so this only adds missing ones.
await initializeSchema();
const store = new MySqlStore();
startRecurringExpenseWorker(store);
const app = createApp({ store });
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
