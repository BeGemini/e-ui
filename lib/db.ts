/**
 * MySQL Database Connection Pool
 * Provides connection pooling and query execution utilities
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 */
export async function initializeDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse DATABASE_URL format: mysql://user:password@host:port/database
  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = parseInt(url.port || '3306', 10);
  const database = url.pathname.slice(1);

  pool = await mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log(`✅ Database connection pool initialized for ${database}@${host}`);
  return pool;
}

/**
 * Get the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Close the database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}

/**
 * Execute a query that returns rows
 */
export async function query<T = RowDataPacket>(
  sql: string,
  values?: (string | number | boolean | null)[]
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(sql, values);
  return rows as unknown as T[];
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  values?: (string | number | boolean | null)[]
): Promise<ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, values);
  return result;
}

/**
 * Get a single row from query result
 */
export async function queryOne<T = RowDataPacket>(
  sql: string,
  values?: (string | number | boolean | null)[]
): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get a single value from query result
 */
export async function queryValue<T>(
  sql: string,
  values?: (string | number | boolean | null)[]
): Promise<T | null> {
  const row = await queryOne<RowDataPacket>(sql, values);
  if (!row) return null;
  
  const firstValue = Object.values(row)[0];
  return firstValue as T | null;
}

/**
 * Execute a transaction with multiple queries
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await queryValue<number>('SELECT 1');
    return result === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getStats(): Promise<{
  connected: boolean;
  poolSize: number;
  queueSize: number;
}> {
  if (!pool) {
    return { connected: false, poolSize: 0, queueSize: 0 };
  }

  return {
    connected: true,
    poolSize: pool.config.connectionLimit || 10,
    queueSize: 0, // mysql2 doesn't expose queue size in public API
  };
}

const dbModule = {
  initializeDatabase,
  getPool,
  closeDatabase,
  query,
  execute,
  queryOne,
  queryValue,
  transaction,
  healthCheck,
  getStats,
};

export default dbModule;
