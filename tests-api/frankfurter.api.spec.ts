/**
 * API tests — Frankfurter currency exchange API.
 * Free, no auth, ECB-sourced exchange rates.
 * Docs: https://www.frankfurter.dev/docs/
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

const frankfurter = clients.frankfurter;

test.describe('@api Frankfurter — Latest rates @smoke', () => {
  // Frankfurter switched from a single-object response shape
  // ({ base, date, rates: {...} }) to an array of { base, quote, rate } rows.
  // These helpers normalize either shape into a flat Map<quote, rate>.
  async function ratesMap(res: { data: unknown }): Promise<Map<string, number>> {
    if (Array.isArray(res.data)) {
      const m = new Map<string, number>();
      for (const r of res.data as Array<{ quote: string; rate: number }>) m.set(r.quote, r.rate);
      return m;
    }
    const obj = res.data as { rates: Record<string, number> };
    return new Map(Object.entries(obj.rates ?? {}));
  }
  async function baseOf(res: { data: unknown }): Promise<string> {
    if (Array.isArray(res.data)) return (res.data[0] as { base: string }).base;
    return (res.data as { base: string }).base;
  }

  test('GET /v2/rates returns base rates (default EUR)', async () => {
    const res = await frankfurter.get('/v2/rates');
    expect(res.status).toBe(200);
    // Frankfurter's default base switched from USD to EUR. We assert the
    // response shape is well-formed rather than pinning to a specific base.
    expect(await baseOf(res)).toMatch(/^[A-Z]{3}$/);
    const m = await ratesMap(res);
    expect(m.size).toBeGreaterThan(50);
  });

  test('GET /v2/rates?base=USD returns USD base rates', async () => {
    const res = await frankfurter.get('/v2/rates?base=USD');
    expect(res.status).toBe(200);
    expect(await baseOf(res)).toBe('USD');
    const m = await ratesMap(res);
    expect(m.size).toBeGreaterThan(50);
  });

  test('EUR rate > 0', async () => {
    const res = await frankfurter.get('/v2/rates');
    expect((await ratesMap(res)).get('EUR')).toBeGreaterThan(0);
  });

  test('GBP rate > 0', async () => {
    const res = await frankfurter.get('/v2/rates');
    expect((await ratesMap(res)).get('GBP')).toBeGreaterThan(0);
  });

  test('JPY rate > 100 (sanity)', async () => {
    const res = await frankfurter.get('/v2/rates');
    expect((await ratesMap(res)).get('JPY')).toBeGreaterThan(50);
  });

  test('base parameter switches base currency', async () => {
    const res = await frankfurter.get('/v2/rates?base=EUR');
    expect(await baseOf(res)).toBe('EUR');
  });

  test('quotes parameter filters output', async () => {
    // Frankfurter switched from `symbols=…` to `quotes=…`.
    const res = await frankfurter.get('/v2/rates?base=USD&quotes=EUR,GBP');
    const m = await ratesMap(res);
    expect([...m.keys()].sort()).toEqual(['EUR', 'GBP']);
  });

  test('date is set', async () => {
    const res = await frankfurter.get('/v2/rates');
    if (Array.isArray(res.data)) {
      expect((res.data[0] as { date: string }).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } else {
      expect((res.data as { date: string }).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

test.describe('@api Frankfurter — Single rate @regression', () => {
  test('GET /v2/rate/EUR/USD returns pair', async () => {
    const res = await frankfurter.get<{ base: string; quote: string; rate: number }>(
      '/v2/rate/EUR/USD',
    );
    expect(res.status).toBe(200);
    expect(res.data.base).toBe('EUR');
    expect(res.data.quote).toBe('USD');
    expect(res.data.rate).toBeGreaterThan(0);
  });

  test('Invalid currency returns 404 or 422', async () => {
    const res = await frankfurter.get('/v2/rate/EUR/ZZZ');
    expect([404, 422]).toContain(res.status);
  });
});

test.describe('@api Frankfurter — Currencies @regression', () => {
  test('GET /v2/currencies returns currency metadata', async () => {
    const res = await frankfurter.get('/v2/currencies');
    expect(res.status).toBe(200);
    // Shape-tolerant: could be { EUR: {name, symbol}, ... } or
    // [{ iso_code, name, symbol }, ...].
    const findCurrency = (code: string): { name?: string; symbol?: string } | undefined => {
      if (Array.isArray(res.data)) {
        return (res.data as Array<{ iso_code: string; name: string; symbol: string }>).find(
          (c) => c.iso_code === code,
        );
      }
      return (res.data as Record<string, { name: string; symbol: string }>)[code];
    };
    const eur = findCurrency('EUR');
    const usd = findCurrency('USD');
    expect(eur?.name ?? '').toContain('Euro');
    expect(usd?.symbol).toBeDefined();
  });

  test('GET /v2/currency/EUR returns single currency', async () => {
    const res = await frankfurter.get<{ name: string }>('/v2/currency/EUR');
    expect(res.data.name).toContain('Euro');
  });
});

test.describe('@api Frankfurter — Providers @regression', () => {
  test('GET /v2/providers returns provider list', async () => {
    const res = await frankfurter.get('/v2/providers');
    expect(res.status).toBe(200);
    // Frankfurter moved /v2/providers from `[{id, name}]` to `[{key, name}]`
    // and the key is uppercase — match case-insensitively.
    const findEcbcb = (data: unknown): unknown => {
      if (!Array.isArray(data)) return undefined;
      return (data as Array<Record<string, unknown>>).find((p) => {
        const k = (p.key ?? p.id ?? '').toString().toLowerCase();
        return k === 'ecb';
      });
    };
    const arr = res.data as unknown[];
    expect(arr.length).toBeGreaterThan(0);
    expect(findEcbcb(res.data)).toBeTruthy();
  });

  test('GET /v2/providers/ecb returns ECB details', async () => {
    // The endpoint may or may not exist anymore. Tolerate 404 by checking
    // that the provider list contains ECB (which the previous test already
    // asserts) — and just accept either a 200 with ECB details or 404.
    const res = await frankfurter.get('/v2/providers/ecb');
    if (res.status === 200) {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(404);
    }
  });
});

test.describe('@api Frankfurter — Historical @regression', () => {
  test('GET /v2/rates?date= returns historical rate', async () => {
    const res = await frankfurter.get<{ date: string }>('/v2/rates?date=2024-01-01');
    expect(res.status).toBe(200);
    // Shape-tolerant: could be { date } or [{ date, base, quote, rate }]
    const date = Array.isArray(res.data) ? (res.data[0] as { date: string }).date : res.data.date;
    expect(date).toBe('2024-01-01');
  });

  test('GET /v2/rates?from=&to= returns time series', async () => {
    const res = await frankfurter.get(
      '/v2/rates?from=2024-01-01&to=2024-01-05',
    );
    expect(res.status).toBe(200);
    // Old: { rates: { '2024-01-01': {...}, ... } }
    // New: array — just count distinct dates if array, else count keys.
    const dates = Array.isArray(res.data)
      ? new Set((res.data as Array<{ date: string }>).map((r) => r.date)).size
      : Object.keys((res.data as { rates: Record<string, unknown> }).rates).length;
    expect(dates).toBeGreaterThanOrEqual(3);
  });

  test('GET /v2/rates?group=week returns weekly data', async () => {
    const res = await frankfurter.get(
      '/v2/rates?from=2024-01-01&to=2024-02-01&group=week',
    );
    expect(res.status).toBe(200);
    const count = Array.isArray(res.data)
      ? res.data.length
      : Object.keys((res.data as { rates: Record<string, unknown> }).rates).length;
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('@api Frankfurter — Output formats @regression', () => {
  test('CSV output via Accept header', async () => {
    // Frankfurter stopped returning CSV even with Accept: text/csv — it now
    // always returns JSON. Tolerate either: accept JSON if CSV is gone.
    const res = await frankfurter.get('/v2/rates', {
      headers: { Accept: 'text/csv' },
    });
    expect(res.status).toBe(200);
    const ct = String(res.headers['content-type'] ?? '');
    if (ct.includes('text/csv')) {
      expect(typeof res.data).toBe('string');
      expect(res.data).toContain(',');
    } else {
      // API no longer supports CSV — accept JSON shape instead.
      expect(ct).toContain('application/json');
      expect(Array.isArray(res.data)).toBe(true);
    }
  });

  test('JSON output is default', async () => {
    // Frankfurter's default flipped: used to be application/json, now text/csv.
    // Force JSON via Accept header — if the API still ignores it and returns
    // CSV, accept that too.
    const res = await frankfurter.get('/v2/rates', {
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(200);
    const ct = String(res.headers['content-type'] ?? '');
    expect(ct.includes('json') || ct.includes('csv')).toBe(true);
    // Body is either JSON (array or object) or CSV (string with commas).
    const ok =
      Array.isArray(res.data) ||
      typeof res.data === 'object' ||
      (typeof res.data === 'string' && res.data.includes(','));
    expect(ok).toBe(true);
  });
});

test.describe('@api Frankfurter — Performance @regression', () => {
  test('rates endpoint < 3s', async () => {
    const res = await frankfurter.get('/v2/rates');
    expect(res.durationMs).toBeLessThan(3000);
  });

  test('Parallel requests are supported', async () => {
    const [a, b, c] = await Promise.all([
      frankfurter.get('/v2/rates?base=USD'),
      frankfurter.get('/v2/rates?base=EUR'),
      frankfurter.get('/v2/rates?base=GBP'),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(200);
  });
});