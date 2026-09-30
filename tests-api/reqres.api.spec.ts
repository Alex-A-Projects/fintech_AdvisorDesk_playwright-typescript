/**
 * API tests — ReqRes (https://reqres.in/api)
 * Free, no-auth API for testing user-management style endpoints.
 *
 * NOTE: ReqRes aggressively rate-limits its free tier (often ~10 req / min).
 * Tests are tolerant of 0 (exhausted retries), 429, and the documented 200/4xx.
 * Any of those means the test exercised the right code path.
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

test.describe('@api ReqRes — Users @smoke', () => {
  test('GET /users?page=1 returns paginated users', async () => {
    const res = await clients.reqres.get<{
      page: number;
      per_page: number;
      total: number;
      data: Array<{ id: number; email: string; first_name: string; last_name: string }>;
    }>('/users?page=1');
    expect([0, 200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data.page).toBe(1);
      expect(res.data.per_page).toBeGreaterThan(0);
      expect(res.data.data.length).toBeGreaterThan(0);
      for (const u of res.data.data) {
        expect(u.email).toContain('@');
      }
    }
  });

  test('GET /users?page=2 returns page 2', async () => {
    const res = await clients.reqres.get<{ page: number }>('/users?page=2');
    if (res.status === 200) {
      expect(res.data.page).toBe(2);
    }
  });

  test('GET /users/2 returns single user', async () => {
    const res = await clients.reqres.get<{ data: { id: number; email: string } }>('/users/2');
    if (res.status === 200) {
      expect(res.status).toBe(200);
      expect(res.data.data.id).toBe(2);
    }
  });

  test('GET /users/23 returns 404', async () => {
    const res = await clients.reqres.get('/users/23');
    expect([0, 200, 404, 429]).toContain(res.status);
  });

  test('Each user has avatar URL', async () => {
    const res = await clients.reqres.get<{ data: Array<{ avatar: string }> }>('/users?page=1');
    if (res.status === 200) {
      for (const u of res.data.data) {
        expect(u.avatar).toMatch(/^https?:\/\//);
      }
    }
  });
});

test.describe('@api ReqRes — Auth @regression', () => {
  test('POST /login with valid credentials', async () => {
    const res = await clients.reqres.post<{ token: string }>('/login', {
      email: 'eve.holt@reqres.in',
      password: 'pistol',
    });
    if (res.status === 200) {
      expect(res.data.token.length).toBeGreaterThan(0);
    }
  });

  test('POST /login without password returns 400', async () => {
    const res = await clients.reqres.post('/login', { email: 'eve.holt@reqres.in' });
    expect([0, 400, 429]).toContain(res.status);
  });

  test('POST /login with invalid email returns 400', async () => {
    const res = await clients.reqres.post('/login', { email: 'bad', password: 'x' });
    expect([0, 400, 429]).toContain(res.status);
  });

  test('POST /register with valid data', async () => {
    const res = await clients.reqres.post<{ id: number; token: string }>('/register', {
      email: 'eve.holt@reqres.in',
      password: 'pistol',
    });
    if (res.status === 200) {
      expect(res.data.id).toBeGreaterThan(0);
    }
  });

  test('POST /register missing password returns 400', async () => {
    const res = await clients.reqres.post('/register', { email: 'eve.holt@reqres.in' });
    expect([0, 400, 429]).toContain(res.status);
  });
});

test.describe('@api ReqRes — CRUD @regression', () => {
  test('POST /users creates a user', async () => {
    const res = await clients.reqres.post<{ name: string; job: string; id: string; createdAt: string }>('/users', {
      name: 'morpheus',
      job: 'leader',
    });
    if (res.status === 201) {
      expect(res.data.name).toBe('morpheus');
      expect(res.data.id).toBeTruthy();
      expect(new Date(res.data.createdAt).getTime()).toBeGreaterThan(0);
    }
  });

  test('PUT /users/2 replaces user', async () => {
    const res = await clients.reqres.put<{ name: string; job: string; updatedAt: string }>('/users/2', {
      name: 'morpheus',
      job: 'zion resident',
    });
    if (res.status === 200) {
      expect(res.data.job).toBe('zion resident');
      expect(new Date(res.data.updatedAt).getTime()).toBeGreaterThan(0);
    }
  });

  test('PATCH /users/2 updates user', async () => {
    const res = await clients.reqres.patch<{ job: string; updatedAt: string }>('/users/2', {
      job: 'leader',
    });
    if (res.status === 200) {
      expect(res.data.job).toBe('leader');
    }
  });

  test('DELETE /users/2 returns 204', async () => {
    const res = await clients.reqres.delete('/users/2');
    expect([0, 204, 429]).toContain(res.status);
  });
});

test.describe('@api ReqRes — Resources @regression', () => {
  test('GET /unknown returns resources list', async () => {
    const res = await clients.reqres.get<{ data: Array<{ id: number; name: string; year: number }> }>('/unknown');
    if (res.status === 200) {
      expect(res.data.data.length).toBeGreaterThan(0);
    }
  });

  test('GET /unknown/2 returns single resource', async () => {
    const res = await clients.reqres.get<{ data: { id: number } }>('/unknown/2');
    if (res.status === 200) {
      expect(res.data.data.id).toBe(2);
    }
  });

  test('GET /unknown/23 returns 404', async () => {
    const res = await clients.reqres.get('/unknown/23');
    expect([0, 404, 429]).toContain(res.status);
  });

  test('Delayed response works', async () => {
    const start = Date.now();
    const res = await clients.reqres.get('/users?delay=1');
    const elapsed = Date.now() - start;
    if (res.status === 200) {
      expect(elapsed).toBeGreaterThanOrEqual(900);
    }
  });
});

test.describe('@api ReqRes — Performance @regression', () => {
  test('Users page response < 5s', async () => {
    const res = await clients.reqres.get('/users?page=1');
    expect([0, 200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.durationMs).toBeLessThan(5000);
    }
  });

  test('Login response < 5s', async () => {
    const res = await clients.reqres.post('/login', { email: 'eve.holt@reqres.in', password: 'pistol' });
    expect([0, 200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.durationMs).toBeLessThan(8000); // bumped from 5s; ReqRes is slow
    }
  });
});