/**
 * Lightweight logger — avoids a dependency on winston/pino.
 * Output levels: trace, debug, info, warn, error.
 */
import { environment } from '../../config/environments';

const LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const currentLevel = LEVELS[environment.logLevel] ?? LEVELS.info;

const stamp = (level: string, msg: string): string => {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  return `${prefix} ${msg}`;
};

export const log = {
  trace: (msg: string, ...args: unknown[]) =>
    console.debug(stamp('trace', msg), ...args),
  debug: (msg: string, ...args: unknown[]) => {
    if (currentLevel <= LEVELS.debug) console.debug(stamp('debug', msg), ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (currentLevel <= LEVELS.info) console.info(stamp('info', msg), ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (currentLevel <= LEVELS.warn) console.warn(stamp('warn', msg), ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (currentLevel <= LEVELS.error) console.error(stamp('error', msg), ...args);
  },
  step: (msg: string) => console.info(`\n→ ${msg}`),
};