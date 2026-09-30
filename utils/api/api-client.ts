/**
 * Lightweight API client used by API tests.
 * Wraps axios with response normalization, timing, and error classification.
 *
 * Resilience features:
 *   - Per-host throttle so we don't slam free-tier rate limits.
 *   - Auto-retry on 429/5xx with exponential backoff (within the same call).
 *   - Honors `Retry-After` header when the server tells us to back off.
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { log } from '../helpers/logger';
import type { ApiResponse } from '../../types';

// In-memory per-host throttle: at most 1 request per THROTTLE_MS per host.
const THROTTLE_MS = 400;
const lastRequestAt = new Map<string, number>();

async function throttle(host: string): Promise<void> {
  const now = Date.now();
  const prev = lastRequestAt.get(host) ?? 0;
  const wait = Math.max(0, THROTTLE_MS - (now - prev));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

/**
 * Retry on transient failures. If retries are exhausted, fall through to a
 * final attempt that swallows all errors and returns a synthetic "empty"
 * response so tests can assert on status (e.g. "accept 200 OR 429")
 * instead of an uncaught error.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T | undefined> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch {
      // fn() throws "Retryable status 429" on retryable statuses.
      // Network errors bubble up the same way.
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  // Final attempt — capture whatever comes out, even errors.
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

export class ApiClient {
  private instance: AxiosInstance;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.instance = axios.create({
      baseURL,
      timeout: 15_000,
      validateStatus: () => true, // we handle status checks manually
      headers: { Accept: 'application/json', ...defaultHeaders },
    });

    this.instance.interceptors.request.use(async (cfg) => {
      const host = cfg.baseURL ? new URL(cfg.baseURL).host : 'unknown';
      await throttle(host);
      log.debug(`→ ${cfg.method?.toUpperCase()} ${cfg.baseURL}${cfg.url}`);
      return cfg;
    });

    this.instance.interceptors.response.use(async (resp) => {
      log.debug(
        `← ${resp.status} ${resp.config.method?.toUpperCase()} ${resp.config.url} (${resp.headers['x-response-time'] ?? '?'}ms)`,
      );
      return resp;
    });
  }

  /**
   * The raw axios call wrapped with a retry-on-transient-failure loop.
   * Honors `Retry-After` when the server returns one.
   */
  private async rawRequest<T>(method: Method, url: string, options: AxiosRequestConfig = {}): Promise<AxiosResponse<T> | undefined> {
    const resp = await withRetry(async () => {
      const r = await this.instance.request<T>({ method, url, ...options });
      if (RETRY_STATUSES.has(r.status)) {
        const retryAfterRaw = r.headers['retry-after'];
        const retryAfterMs = retryAfterRaw ? Number(retryAfterRaw) * 1000 : 800;
        log.debug(`  ${r.status} on ${url} — retrying after ${retryAfterMs}ms`);
        await new Promise((res) => setTimeout(res, retryAfterMs));
        throw new Error(`Retryable status ${r.status}`);
      }
      return r;
    });
    return resp;
  }

  async request<T = unknown>(
    method: Method,
    url: string,
    options: AxiosRequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const start = Date.now();
    const resp = await this.rawRequest<T>(method, url, options);
    const durationMs = Date.now() - start;

    // If retries were exhausted and the last call returned undefined
    // (network error after all retries), synthesize an empty 0-status
    // response so callers can assert on `res.status` without crashing.
    if (!resp) {
      return {
        status: 0,
        ok: false,
        data: undefined as unknown as T,
        headers: {},
        durationMs,
      };
    }

    const headers = Object.fromEntries(
      Object.entries(resp.headers).map(([k, v]) => [k, String(v)]),
    );
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      data: resp.data,
      headers,
      durationMs,
    };
  }

  get<T = unknown>(url: string, options?: AxiosRequestConfig) {
    return this.request<T>('GET', url, options);
  }
  post<T = unknown>(url: string, data?: unknown, options?: AxiosRequestConfig) {
    return this.request<T>('POST', url, { data, ...options });
  }
  put<T = unknown>(url: string, data?: unknown, options?: AxiosRequestConfig) {
    return this.request<T>('PUT', url, { data, ...options });
  }
  patch<T = unknown>(url: string, data?: unknown, options?: AxiosRequestConfig) {
    return this.request<T>('PATCH', url, { data, ...options });
  }
  delete<T = unknown>(url: string, options?: AxiosRequestConfig) {
    return this.request<T>('DELETE', url, options);
  }
  head<T = unknown>(url: string, options?: AxiosRequestConfig) {
    return this.request<T>('HEAD', url, options);
  }
  options<T = unknown>(url: string, options?: AxiosRequestConfig) {
    return this.request<T>('OPTIONS', url, options);
  }
}

export const SchemaValidator = {
  /**
   * Lightweight JSON schema-like check — verifies required keys exist and have the right type.
   * For full schema validation, use ajv.
   */
  shape<T extends Record<string, unknown>>(
    obj: unknown,
    shape: Record<keyof T, 'string' | 'number' | 'boolean' | 'object' | 'array'>,
  ): { ok: true } | { ok: false; missing: string[]; wrongType: string[] } {
    if (typeof obj !== 'object' || obj === null) return { ok: false, missing: [], wrongType: ['root'] };
    const o = obj as Record<string, unknown>;
    const missing: string[] = [];
    const wrongType: string[] = [];
    for (const [key, expected] of Object.entries(shape) as [keyof T, string][]) {
      if (!(key in o)) {
        missing.push(String(key));
        continue;
      }
      const actual = o[key as string];
      const t = Array.isArray(actual) ? 'array' : typeof actual;
      if (t !== expected && !(expected === 'array' && Array.isArray(actual))) {
        wrongType.push(`${String(key)}: expected ${expected}, got ${t}`);
      }
    }
    if (missing.length || wrongType.length) return { ok: false, missing, wrongType };
    return { ok: true };
  },
};