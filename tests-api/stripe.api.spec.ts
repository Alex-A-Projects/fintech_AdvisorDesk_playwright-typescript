/**
 * API tests — Stripe-style smoke (using Stripe's public API surface).
 * We exercise the public docs endpoints that don't require auth.
 * Most Stripe endpoints need a key; here we just sanity-check error shapes.
 */
import { test, expect } from '@playwright/test';
import { ApiClient } from '../utils/api/api-client-manager';

const stripe = new ApiClient('https://api.stripe.com/v1');

test.describe('@api Stripe — Public endpoints @regression', () => {
  test('Missing auth returns 401', async () => {
    const res = await stripe.get('/charges?limit=1');
    expect(res.status).toBe(401);
  });

  test('Invalid auth returns 401', async () => {
    const res = await stripe.get('/charges?limit=1', { headers: { Authorization: 'Bearer fake' } });
    expect(res.status).toBe(401);
  });

  test('401 response is JSON', async () => {
    const res = await stripe.get('/charges?limit=1');
    expect(res.headers['content-type']).toContain('application/json');
    const body = res.data as { error?: { type: string; message: string } };
    expect(body.error?.type).toBeTruthy();
  });
});

/**
 * Public Square API used by the AdvisorDesk demo for Square integrations.
 * Docs: https://developer.squareup.com/reference/square
 */
const square = new ApiClient('https://connect.squareup.com/v2');

test.describe('@api Square — Public endpoints @regression', () => {
  test('Missing auth returns 401', async () => {
    const res = await square.get('/locations');
    expect(res.status).toBe(401);
  });
});

/**
 * PayPal public endpoints.
 */
const paypal = new ApiClient('https://api-m.paypal.com/v1');

test.describe('@api PayPal — Public endpoints @regression', () => {
  test('Token endpoint rejects bad credentials', async () => {
    const res = await paypal.post('/oauth2/token', 'grant_type=client_credentials', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect([401, 400]).toContain(res.status);
  });
});

/**
 * Notion API - public schema discovery.
 */
const notion = new ApiClient('https://api.notion.com/v1');

test.describe('@api Notion — Public endpoints @regression', () => {
  test('Missing auth returns 401', async () => {
    const res = await notion.get('/users/me', { headers: { 'Notion-Version': '2022-06-28' } });
    expect(res.status).toBe(401);
  });

  test('Invalid integration token returns 401', async () => {
    const res = await notion.get('/users/me', {
      headers: { 'Notion-Version': '2022-06-28', Authorization: 'Bearer fake' },
    });
    expect(res.status).toBe(401);
  });
});