/**
 * API tests — Dog CEO + Advice Slip.
 * Both free, no auth, JSON.
 */
import { test, expect } from '@playwright/test';
import { ApiClient } from '../utils/api/api-client-manager';

const advice = new ApiClient('https://api.adviceslip.com');

test.describe('@api Dog CEO @smoke', () => {
  test('GET /breeds/list/all returns breeds', async () => {
    const res = await fetch('https://dog.ceo/api/breeds/list/all');
    const data = (await res.json()) as { message: Record<string, string[]>; status: string };
    expect(res.status).toBe(200);
    // Dog CEO wraps the payload in { message, status }. `status: "success"`
    // is the API's own status field, separate from HTTP status.
    expect(data.status).toBe('success');
    expect(Object.keys(data.message).length).toBeGreaterThan(50);
  });

  test('GET /breeds/image/random returns dog image', async () => {
    const res = await fetch('https://dog.ceo/api/breeds/image/random');
    const data = (await res.json()) as { message: string; status: string };
    expect(res.status).toBe(200);
    expect(data.message).toMatch(/\.jpg$/);
  });

  test('GET /breed/hound/images returns hound images', async () => {
    const res = await fetch('https://dog.ceo/api/breed/hound/images');
    const data = (await res.json()) as { message: string[]; status: string };
    expect(res.status).toBe(200);
    expect(data.message.length).toBeGreaterThan(0);
  });

  test('GET /breed/hound/list returns sub-breeds', async () => {
    const res = await fetch('https://dog.ceo/api/breed/hound/list');
    const data = (await res.json()) as { message: Record<string, string[]>; status: string };
    expect(res.status).toBe(200);
    expect(typeof data.message).toBe('object');
  });
});

test.describe('@api Advice Slip @regression', () => {
  test('GET /advice returns random advice', async () => {
    const res = await advice.get<{ slip: { id: number; advice: string } }>('/advice');
    expect(res.status).toBe(200);
    expect(res.data.slip.advice.length).toBeGreaterThan(0);
  });

  test('GET /advice/{id} returns specific advice', async () => {
    const res = await advice.get<{ slip: { id: number } }>('/advice/1');
    expect(res.data.slip.id).toBe(1);
  });

  test('GET /advice/search/{q} returns matches', async () => {
    const res = await advice.get<{ total_results: string | number; slips: unknown[] }>(
      '/advice/search/money',
    );
    expect(res.status).toBe(200);
    // Advice Slip now returns total_results as a string ("1"). Coerce.
    expect(Number(res.data.total_results)).toBeGreaterThan(0);
  });
});