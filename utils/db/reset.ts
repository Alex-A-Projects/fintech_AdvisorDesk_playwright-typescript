/**
 * Reset script — wipes the DB and re-seeds.
 *   ts-node utils/db/reset.ts
 */
import { seed } from './seed';
import { closeDb } from './connection';

const counts = seed();
closeDb();
// eslint-disable-next-line no-console
console.log('Reset & reseeded:', counts);