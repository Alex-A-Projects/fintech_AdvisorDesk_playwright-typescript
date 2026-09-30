/**
 * SQLite database connection. Pure JS — better-sqlite3 is synchronous, fast, and zero-config.
 * This DB mirrors the AdvisorDesk data model so DB tests can validate schema, CRUD,
 * constraints, transactions, and queries that back the UI.
 */
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { environment } from '../../config/environments';
import { log } from '../helpers/logger';
import { SCHEMA } from './schema';

const dbDir = path.dirname(environment.db.path);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db: Database.Database = new Database(environment.db.path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-apply schema if tables don't exist. Tests that need a clean slate
// (e.g. seed.ts) explicitly DROP/CREATE in their own setup.
const hasClients = (db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='clients'`).get() as { n: number }).n;
if (!hasClients) {
  log.debug('Applying schema to fresh DB');
  db.exec(SCHEMA);
}

log.debug(`SQLite opened at ${environment.db.path}`);

export function closeDb() {
  db.close();
}

export function exec(sql: string): void {
  db.exec(sql);
}