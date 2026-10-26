import { closePool, getPool } from './pool.js';
import { initializeSchema } from './schema.js';

try {
  await initializeSchema(getPool());
  console.log('MySQL schema is ready.');
} finally {
  await closePool();
}
