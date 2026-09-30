/**
 * Real Postgres connection for integration tests.
 *
 * This complements the SQLite-backed `connection.ts`. By default the test
 * suite uses SQLite (file-based, no setup). Set `DB_TYPE=postgres` plus the
 * `POSTGRES_*` env vars in `.env` to switch.
 *
 * Brings up the DB only when tests need it (via globalSetup). When the
 * connection drops, every repo helper will reconnect lazily.
 */
import { Client, Pool, PoolClient } from 'pg';
import { environment } from '../../config/environments';
import { SCHEMA } from './schema.pg';
import { log } from '../helpers/logger';

let pool: Pool | null = null;
let pgClient: PoolClient | null = null;

export const pgConfig = () => {
  if (!environment.db.postgres) {
    throw new Error('Postgres not configured — set POSTGRES_HOST in .env');
  }
  return environment.db.postgres;
};

export async function connectPg(): Promise<void> {
  if (pool) return;
  const cfg = pgConfig();
  log.info(`[pg] connecting to ${cfg.host}:${cfg.port}/${cfg.database}`);
  pool = new Pool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pgClient = await pool.connect();
}

export async function applyPgSchema(): Promise<void> {
  if (!pgClient) throw new Error('connectPg() first');
  await pgClient.query(SCHEMA);
}

export async function closePg(): Promise<void> {
  if (pgClient) {
    pgClient.release();
    pgClient = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Convenience wrapper — automatically reconnects if the pool is dead.
 */
export async function pgQuery<R = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<R[]> {
  if (!pool) await connectPg();
  const client = await pool!.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as R[];
  } finally {
    client.release();
  }
}

export async function pgExec(sql: string, params: unknown[] = []): Promise<void> {
  if (!pool) await connectPg();
  const client = await pool!.connect();
  try {
    await client.query(sql, params);
  } finally {
    client.release();
  }
}

/**
 * Quick connectivity check — used in globalSetup to bail early if no DB.
 */
export async function pgPing(): Promise<boolean> {
  try {
    const client = new Client({
      host: pgConfig().host,
      port: pgConfig().port,
      database: pgConfig().database,
      user: pgConfig().user,
      password: pgConfig().password,
      connectionTimeoutMillis: 2000,
    });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (e) {
    log.warn(`[pg] not reachable: ${(e as Error).message}`);
    return false;
  }
}