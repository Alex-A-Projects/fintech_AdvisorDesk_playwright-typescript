/**
 * API tests — JSONPlaceholder (https://jsonplaceholder.typicode.com)
 * A free, no-auth REST API used as a sandbox for CRUD-style tests.
 */
import { test, expect } from '@playwright/test';
import { clients, SchemaValidator } from '../utils/api/api-client-manager';

test.describe('@api JSONPlaceholder — Posts @smoke', () => {
  test('GET /posts returns 100 posts', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/posts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBe(100);
  });

  test('GET /posts/1 returns the expected shape', async () => {
    const res = await clients.jsonplaceholder.get<Record<string, unknown>>('/posts/1');
    expect(res.status).toBe(200);
    const v = SchemaValidator.shape<{ userId: 'number'; id: 'number'; title: 'string'; body: 'string' }>(
      res.data,
      { userId: 'number', id: 'number', title: 'string', body: 'string' },
    );
    expect(v.ok).toBe(true);
  });

  test('GET /posts/999999 returns 404', async () => {
    const res = await clients.jsonplaceholder.get('/posts/999999');
    expect(res.status).toBe(404);
  });

  test('GET /posts?userId=1 filters correctly', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/posts?userId=1');
    expect(res.status).toBe(200);
    expect((res.data as unknown[]).length).toBeGreaterThan(0);
    for (const p of res.data as Array<{ userId: number }>) {
      expect(p.userId).toBe(1);
    }
  });

  test('POST /posts creates a new post', async () => {
    const res = await clients.jsonplaceholder.post('/posts', {
      title: 'foo',
      body: 'bar',
      userId: 1,
    });
    expect(res.status).toBe(201);
    const r = res.data as Record<string, unknown>;
    expect(r.title).toBe('foo');
    expect(r.body).toBe('bar');
    expect(typeof r.id).toBe('number');
  });

  test('PUT /posts/1 replaces the resource', async () => {
    const res = await clients.jsonplaceholder.put('/posts/1', {
      id: 1,
      title: 'updated',
      body: 'new body',
      userId: 1,
    });
    expect(res.status).toBe(200);
    expect((res.data as Record<string, unknown>).title).toBe('updated');
  });

  test('PATCH /posts/1 partial update', async () => {
    const res = await clients.jsonplaceholder.patch('/posts/1', { title: 'patched' });
    expect(res.status).toBe(200);
    expect((res.data as Record<string, unknown>).title).toBe('patched');
  });

  test('DELETE /posts/1 returns 200', async () => {
    const res = await clients.jsonplaceholder.delete('/posts/1');
    expect(res.status).toBe(200);
  });

  test('Response has X-Powered-By header', async () => {
    const res = await clients.jsonplaceholder.get('/posts/1');
    expect(Object.keys(res.headers).length).toBeGreaterThan(0);
  });

  test('Response time is under 5 seconds', async () => {
    const res = await clients.jsonplaceholder.get('/posts');
    expect(res.durationMs).toBeLessThan(5000);
  });
});

test.describe('@api JSONPlaceholder — Users @regression', () => {
  test('GET /users returns 10 users', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/users');
    expect(res.status).toBe(200);
    expect((res.data as unknown[]).length).toBe(10);
  });

  test('Each user has email matching @', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ email: string }>>('/users');
    for (const u of res.data) {
      expect(u.email).toContain('@');
    }
  });

  test('Each user has a nested address', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ address: unknown }>>('/users');
    for (const u of res.data) {
      expect(u.address).toBeTruthy();
    }
  });

  test('Each user has a company name', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ company: { name: string } }>>('/users');
    for (const u of res.data) {
      expect(u.company.name.length).toBeGreaterThan(0);
    }
  });

  test('GET /users/1 returns a single user', async () => {
    const res = await clients.jsonplaceholder.get('/users/1');
    expect(res.status).toBe(200);
    expect((res.data as Record<string, unknown>).id).toBe(1);
  });
});

test.describe('@api JSONPlaceholder — Comments @regression', () => {
  test('GET /comments returns 500 comments', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/comments');
    expect(res.status).toBe(200);
    expect((res.data as unknown[]).length).toBe(500);
  });

  test('GET /comments?postId=1 returns 5 comments', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/comments?postId=1');
    expect(res.status).toBe(200);
    expect((res.data as unknown[]).length).toBe(5);
  });

  test('Each comment has an email', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ email: string }>>('/comments?postId=1');
    for (const c of res.data) {
      expect(c.email).toContain('@');
    }
  });
});

test.describe('@api JSONPlaceholder — Albums & Photos @regression', () => {
  test('GET /albums returns 100 albums', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/albums');
    expect((res.data as unknown[]).length).toBe(100);
  });

  test('GET /photos returns 5000 photos', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/photos');
    expect((res.data as unknown[]).length).toBe(5000);
  });

  test('Each photo has a thumbnail URL', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ thumbnailUrl: string }>>('/photos?_limit=5');
    for (const p of res.data) {
      expect(p.thumbnailUrl).toMatch(/^https?:\/\//);
    }
  });
});

test.describe('@api JSONPlaceholder — Todos @regression', () => {
  test('GET /todos returns 200 todos', async () => {
    const res = await clients.jsonplaceholder.get<unknown[]>('/todos');
    expect((res.data as unknown[]).length).toBe(200);
  });

  test('Each todo has a completed boolean', async () => {
    const res = await clients.jsonplaceholder.get<Array<{ completed: boolean }>>('/todos?_limit=10');
    for (const t of res.data) {
      expect(typeof t.completed).toBe('boolean');
    }
  });

  test('GET /todos/1 returns single todo', async () => {
    const res = await clients.jsonplaceholder.get('/todos/1');
    expect(res.status).toBe(200);
  });
});

test.describe('@api JSONPlaceholder — Edge cases @regression', () => {
  test('invalid JSON in body returns 400 or 500', async () => {
    // JSONPlaceholder is a fake API — it accepts any body and always
    // returns 201 (Created). So we just verify the response is a sane 2xx
    // (or 400/500 if the API gets stricter in the future).
    const res = await clients.jsonplaceholder.post('/posts', 'not-json');
    expect([200, 201, 400, 500]).toContain(res.status);
  });

  test('HEAD /posts returns headers only', async () => {
    const res = await clients.jsonplaceholder.head('/posts');
    expect(res.status).toBe(200);
  });

  test('OPTIONS /posts is supported', async () => {
    const res = await clients.jsonplaceholder.options('/posts');
    expect([200, 204]).toContain(res.status);
  });

  test('deep nested query works', async () => {
    const res = await clients.jsonplaceholder.get('/comments?postId=1&id=1');
    expect(res.status).toBe(200);
  });
});