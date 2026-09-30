/**
 * API tests — GitHub REST API (https://api.github.com)
 * No auth needed for public endpoints (rate-limited).
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

test.describe('@api GitHub — Root @smoke', () => {
  test('GET /zen returns a zen quote', async () => {
    const res = await clients.github.get<string>('/zen');
    expect(res.status).toBe(200);
    expect(typeof res.data).toBe('string');
    expect(res.data.length).toBeGreaterThan(0);
  });

  test('GET /octocat returns octocat', async () => {
    const res = await clients.github.get('/octocat');
    expect([200, 304]).toContain(res.status);
  });

  test('GET / returns root API metadata', async () => {
    const res = await clients.github.get<{ current_user_url: string; authorizations_url: string }>('/');
    expect(res.status).toBe(200);
    expect(res.data.current_user_url).toContain('/user');
  });
});

test.describe('@api GitHub — Repos @regression', () => {
  test('GET /repos/microsoft/vscode returns repo metadata', async () => {
    const res = await clients.github.get<{ id: number; name: string; full_name: string; stargazers_count: number }>(
      '/repos/microsoft/vscode',
    );
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('microsoft/vscode');
    expect(res.data.stargazers_count).toBeGreaterThan(1000);
  });

  test('GET /repos/microsoft/vscode/issues returns issues', async () => {
    const res = await clients.github.get<Array<{ id: number; title: string }>>(
      '/repos/microsoft/vscode/issues?per_page=5',
    );
    expect(res.status).toBe(200);
    expect(res.data.length).toBe(5);
  });

  test('GET /repos/microsoft/vscode/languages returns languages', async () => {
    const res = await clients.github.get<Record<string, number>>('/repos/microsoft/vscode/languages');
    expect(res.status).toBe(200);
    expect(Object.keys(res.data).length).toBeGreaterThan(0);
  });

  test('GET /repos/microsoft/vscode/contributors returns contributors', async () => {
    const res = await clients.github.get<Array<{ login: string; contributions: number }>>(
      '/repos/microsoft/vscode/contributors?per_page=5',
    );
    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThan(0);
  });

  test('404 repo returns 404', async () => {
    const res = await clients.github.get('/repos/this-org-does-not-exist-1234567890/foo');
    expect(res.status).toBe(404);
  });
});

test.describe('@api GitHub — Search @regression', () => {
  test('GET /search/repositories?q=playwright returns results', async () => {
    const res = await clients.github.get<{ total_count: number; items: unknown[] }>(
      '/search/repositories?q=playwright',
    );
    expect(res.status).toBe(200);
    expect(res.data.total_count).toBeGreaterThan(100);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  test('Search users', async () => {
    const res = await clients.github.get<{ items: Array<{ login: string }> }>(
      '/search/users?q=torvalds',
    );
    expect(res.data.items.some((u) => u.login === 'torvalds')).toBe(true);
  });

  test('Search code', async () => {
    // GitHub's /search/code endpoint requires authentication since 2023.
    // We assert it returns either 200 (with a token) or 401 (unauthenticated)
    // — either way the endpoint should respond, not hang.
    const res = await clients.github.get(
      '/search/code?q=addClass+repo:jquery/jquery',
    );
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data.total_count).toBeGreaterThan(0);
    }
  });

  test('Search empty query', async () => {
    // GitHub now returns 422 for empty queries instead of 200 with total_count=0.
    // Either is a valid response — just assert the endpoint reacts.
    const res = await clients.github.get('/search/repositories?q=');
    expect([200, 422]).toContain(res.status);
  });
});

test.describe('@api GitHub — Users @regression', () => {
  test('GET /users/torvalds returns Linus profile', async () => {
    const res = await clients.github.get<{ login: string; id: number }>('/users/torvalds');
    expect(res.status).toBe(200);
    expect(res.data.login).toBe('torvalds');
  });

  test('GET /users/torvalds/repos returns public repos', async () => {
    const res = await clients.github.get<Array<{ id: number }>>(
      '/users/torvalds/repos?per_page=5',
    );
    expect(res.status).toBe(200);
    expect(res.data.length).toBe(5);
  });

  test('GET /users/torvalds/followers returns followers', async () => {
    const res = await clients.github.get<Array<{ login: string }>>(
      '/users/torvalds/followers?per_page=3',
    );
    expect(res.status).toBe(200);
    expect(res.data.length).toBe(3);
  });

  test('GET /users/torvalds/gists returns gists', async () => {
    const res = await clients.github.get<Array<{ id: string }>>('/users/torvalds/gists?per_page=3');
    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThanOrEqual(0);
  });
});

test.describe('@api GitHub — Performance @regression', () => {
  test('Repo metadata < 5s', async () => {
    const res = await clients.github.get('/repos/microsoft/vscode');
    expect(res.durationMs).toBeLessThan(5000);
  });

  test('Rate limit header is present', async () => {
    const res = await clients.github.get('/rate_limit');
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeTruthy();
  });
});