import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SeferBiz API listening on http://localhost:${PORT}`);
});
