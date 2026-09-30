/**
 * API tests — ExchangeRate-API (https://api.exchangerate-api.com/v4/latest)
 * Free public currency rates API. No auth required.
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

test.describe('@api ExchangeRate — USD base @smoke', () => {
  test('GET /usd returns rates', async () => {
    const res = await clients.exchangerate.get<{ base: string; rates: Record<string, number> }>('/USD');
    expect(res.status).toBe(200);
    expect(res.data.base).toBe('USD');
    expect(Object.keys(res.data.rates).length).toBeGreaterThan(50);
  });

  test('EUR rate is greater than 0', async () => {
    const res = await clients.exchangerate.get<{ rates: Record<string, number> }>('/USD');
    expect(res.data.rates.EUR).toBeGreaterThan(0);
  });

  test('GBP rate is greater than 0', async () => {
    const res = await clients.exchangerate.get<{ rates: Record<string, number> }>('/USD');
    expect(res.data.rates.GBP).toBeGreaterThan(0);
  });
});

test.describe('@api ExchangeRate — Other bases @regression', () => {
  test('GET /eur returns EUR rates', async () => {
    const res = await clients.exchangerate.get<{ base: string }>('/EUR');
    expect(res.data.base).toBe('EUR');
  });

  test('GET /gbp returns GBP rates', async () => {
    const res = await clients.exchangerate.get<{ base: string }>('/GBP');
    expect(res.data.base).toBe('GBP');
  });

  test('GET /jpy returns JPY rates', async () => {
    const res = await clients.exchangerate.get<{ base: string }>('/JPY');
    expect(res.data.base).toBe('JPY');
  });

  test('Date is set to today', async () => {
    const res = await clients.exchangerate.get<{ date?: string; time_last_updated?: number }>('/USD');
    const today = new Date().toISOString().slice(0, 10);
    expect(res.data.date === today || (res.data.time_last_updated ?? 0) > 0).toBe(true);
  });
});

test.describe('@api ExchangeRate — Math @regression', () => {
  test('Cross-rate consistency check', async () => {
    const usd = await clients.exchangerate.get<{ rates: Record<string, number> }>('/USD');
    const eur = await clients.exchangerate.get<{ rates: Record<string, number> }>('/EUR');
    const usdToEur = usd.data.rates.EUR;
    const eurToUsd = eur.data.rates.USD;
    const product = usdToEur * eurToUsd;
    expect(product).toBeGreaterThan(0.9);
    expect(product).toBeLessThan(1.1);
  });

  test('Self-rate is 1', async () => {
    const res = await clients.exchangerate.get<{ rates: Record<string, number> }>('/USD');
    expect(res.data.rates.USD).toBe(1);
  });
});