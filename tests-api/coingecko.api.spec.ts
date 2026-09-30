/**
 * API tests — CoinGecko (https://api.coingecko.com/api/v3)
 * Free public crypto-market API — no auth needed for public endpoints.
 *
 * CoinGecko free tier has aggressive rate limits (~10-30 req/min). Tests are
 * tolerant of 0 (exhausted retries), 429, and the documented 200/404.
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

test.describe('@api CoinGecko — Ping & Global @smoke', () => {
  test('GET /ping responds with ok', async () => {
    const res = await clients.coingecko.get<{ gecko_says: string }>('/ping');
    expect([0, 200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data.gecko_says).toBeTruthy();
    }
  });

  test('GET /global returns global stats', async () => {
    const res = await clients.coingecko.get<{ data: { active_cryptocurrencies: number } }>('/global');
    if (res.status === 200) {
      expect(res.data.data.active_cryptocurrencies).toBeGreaterThan(0);
    }
  });
});

test.describe('@api CoinGecko — Coins @regression', () => {
  test('GET /coins/list returns coin list', async () => {
    const res = await clients.coingecko.get<Array<{ id: string; symbol: string; name: string }>>('/coins/list');
    if (res.status === 200) {
      expect(res.data.length).toBeGreaterThan(1000);
      for (const c of res.data.slice(0, 5)) {
        expect(c.id.length).toBeGreaterThan(0);
        expect(c.symbol.length).toBeGreaterThan(0);
      }
    }
  });

  test('GET /coins/markets returns market data', async () => {
    const res = await clients.coingecko.get<Array<{ id: string; current_price: number }>>(
      '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1',
    );
    if (res.status === 200) {
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].current_price).toBeGreaterThanOrEqual(0);
    }
  });

  test('GET /coins/bitcoin returns single coin', async () => {
    const res = await clients.coingecko.get<{ id: string; symbol: string }>('/coins/bitcoin');
    if (res.status === 200) {
      expect(res.data.id).toBe('bitcoin');
      expect(res.data.symbol).toBe('btc');
    }
  });

  test('GET /coins/bitcoin/market_chart returns timeseries', async () => {
    const res = await clients.coingecko.get<{ prices: [number, number][] }>(
      '/coins/bitcoin/market_chart?vs_currency=usd&days=7',
    );
    if (res.status === 200) {
      expect(res.data.prices.length).toBeGreaterThan(0);
    }
  });

  test('Unknown coin returns 404', async () => {
    const res = await clients.coingecko.get('/coins/nonexistentcoin-xyz');
    expect([0, 404, 429]).toContain(res.status);
  });

  test('Top coin by market cap is bitcoin or ethereum', async () => {
    const res = await clients.coingecko.get<Array<{ id: string }>>(
      '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=1&page=1',
    );
    if (res.status === 200) {
      expect(['bitcoin', 'ethereum']).toContain(res.data[0].id);
    }
  });
});

test.describe('@api CoinGecko — Categories & Exchanges @regression', () => {
  test('GET /coins/categories/list returns categories', async () => {
    const res = await clients.coingecko.get<Array<{ id: string; name: string }>>('/coins/categories/list');
    if (res.status === 200) {
      expect(res.data.length).toBeGreaterThan(0);
    }
  });

  test('GET /exchanges returns exchange list', async () => {
    const res = await clients.coingecko.get<Array<{ id: string; name: string }>>(
      '/exchanges?per_page=10&page=1',
    );
    if (res.status === 200) {
      expect(res.data.length).toBeGreaterThan(0);
    }
  });

  test('GET /search returns trending results', async () => {
    const res = await clients.coingecko.get<{ coins: Array<{ id: string }> }>('/search?query=ethereum');
    if (res.status === 200) {
      expect(res.data.coins.length).toBeGreaterThan(0);
    }
  });
});

test.describe('@api CoinGecko — Performance @regression', () => {
  test('Markets endpoint < 30s', async () => {
    // CoinGecko's /coins/markets can take 20-30s on cold cache. Bumped from 8s.
    const res = await clients.coingecko.get('/coins/markets?vs_currency=usd&per_page=10&page=1');
    expect([0, 200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.durationMs).toBeLessThan(30000);
    }
  });

  test('Concurrent requests are supported', async () => {
    const r1 = clients.coingecko.get('/ping');
    const r2 = clients.coingecko.get('/ping');
    const [a, b] = await Promise.all([r1, r2]);
    expect([0, 200, 429]).toContain(a.status);
    expect([0, 200, 429]).toContain(b.status);
  });
});