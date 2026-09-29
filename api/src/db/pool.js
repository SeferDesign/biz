import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be configured with a MySQL connection URL');
    }
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!['mysql:', 'mysql2:'].includes(databaseUrl.protocol)) {
      throw new Error('DATABASE_URL must use the mysql:// scheme');
    }
    pool = mysql.createPool({
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 3306),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: decodeURIComponent(databaseUrl.pathname.slice(1)),
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true
    });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
