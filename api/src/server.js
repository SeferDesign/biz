import { createApp } from './routing/app.js';
import { initializeSchema } from './db/schema.js';

// Tables are created with IF NOT EXISTS, so this only adds missing ones.
await initializeSchema();
const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
