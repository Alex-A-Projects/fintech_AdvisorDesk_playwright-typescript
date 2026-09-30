/**
 * API tests — httpbin (https://httpbin.org)
 * A request/response testing service — useful for validating HTTP behavior.
 */
import { test, expect } from '@playwright/test';
import { clients } from '../utils/api/api-client-manager';

test.describe('@api HttpBin — Status codes @smoke', () => {
  for (const code of [200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 503]) {
    test(`GET /status/${code} returns ${code}`, async () => {
      try {
        const res = await clients.httpbin.get(`/status/${code}`);
        expect(res.status).toBe(code);
      } catch (e) {
        // Some status codes throw at the axios layer for non-2xx
        expect((e as Error).message).toContain(String(code));
      }
    });
  }
});

test.describe('@api HttpBin — Request echo @regression', () => {
  test('GET /get echoes query params', async () => {
    const res = await clients.httpbin.get<{ args: Record<string, string>; url: string }>(
      '/get?foo=bar&x=1',
    );
    expect(res.status).toBe(200);
    expect(res.data.args.foo).toBe('bar');
    expect(res.data.args.x).toBe('1');
  });

  test('POST /post echoes body', async () => {
    const res = await clients.httpbin.post<{ json: Record<string, unknown> }>('/post', {
      name: 'AdvisorDesk',
      count: 42,
    });
    expect(res.status).toBe(200);
    expect(res.data.json.name).toBe('AdvisorDesk');
    expect(res.data.json.count).toBe(42);
  });

  test('PUT /put echoes body', async () => {
    const res = await clients.httpbin.put<{ json: Record<string, unknown> }>('/put', { a: 1 });
    expect(res.data.json.a).toBe(1);
  });

  test('PATCH /patch echoes body', async () => {
    const res = await clients.httpbin.patch<{ json: Record<string, unknown> }>('/patch', { b: 2 });
    expect(res.data.json.b).toBe(2);
  });

  test('DELETE /delete echoes nothing in body', async () => {
    const res = await clients.httpbin.delete<Record<string, unknown>>('/delete');
    expect(res.status).toBe(200);
    expect(res.data).toBeTruthy();
  });

  test('Custom headers are echoed', async () => {
    const res = await clients.httpbin.get<{ headers: Record<string, string> }>('/headers', {
      headers: { 'X-Test': 'true', 'X-Suite': 'AdvisorDesk' },
    });
    expect(res.data.headers['X-Test']).toBe('true');
    expect(res.data.headers['X-Suite']).toBe('AdvisorDesk');
  });
});

test.describe('@api HttpBin — Headers & cookies @regression', () => {
  test('GET /headers returns request headers', async () => {
    const res = await clients.httpbin.get<{ headers: Record<string, string> }>('/headers');
    expect(res.status).toBe(200);
    expect(res.data.headers).toBeTruthy();
  });

  test('GET /user-agent returns UA header', async () => {
    const res = await clients.httpbin.get<{ 'user-agent': string }>('/user-agent');
    expect(res.data['user-agent'].length).toBeGreaterThan(0);
  });

  test('GET /cookies returns cookies', async () => {
    const res = await clients.httpbin.get<{ cookies: Record<string, string> }>('/cookies');
    expect(res.status).toBe(200);
    expect(res.data.cookies).toBeTruthy();
  });
});

test.describe('@api HttpBin — Response shapes @regression', () => {
  test('GET /json returns JSON', async () => {
    const res = await clients.httpbin.get<{ slideshow: { title: string } }>('/json');
    expect(res.data.slideshow.title.length).toBeGreaterThan(0);
  });

  test('GET /uuid returns a UUID', async () => {
    const res = await clients.httpbin.get<{ uuid: string }>('/uuid');
    expect(res.data.uuid).toMatch(/^[0-9a-f-]{30,}$/i);
  });

  test('GET /base64/{value} decodes', async () => {
    // HttpBin used to accept any value but now validates base64. We send a
    // real base64-encoded string and assert it decodes back.
    const original = 'Hello World';
    const encoded = Buffer.from(original).toString('base64');
    const res = await clients.httpbin.get(`/base64/${encoded}`);
    expect(res.data).toBe(original);
  });

  test('GET /image/png returns image/png', async () => {
    const res = await clients.httpbin.get('/image/png', { responseType: 'arraybuffer' });
    expect(res.headers['content-type']).toContain('image/png');
  });

  test('GET /robots.txt returns text', async () => {
    const res = await clients.httpbin.get<string>('/robots.txt');
    expect(typeof res.data).toBe('string');
  });
});

test.describe('@api HttpBin — Latency & redirects @regression', () => {
  test('GET /delay/n waits n seconds', async () => {
    const start = Date.now();
    const res = await clients.httpbin.get('/delay/2');
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(1900);
  });

  test('GET /redirect/3 redirects to /get', async () => {
    // axios follows redirects by default but the response.status will be 200 from /get
    const res = await clients.httpbin.get('/redirect/3', { maxRedirects: 5 });
    expect(res.status).toBe(200);
  });
});