/**
 * Pre-configured ApiClient instances for every public API used in our test suite.
 *
 * Only includes fintech-relevant or API-pattern APIs:
 *   - jsonplaceholder / httpbin: generic API testing sandboxes
 *   - frankfurter / exchangerate / coingecko: currency, FX, crypto rates
 *   - github: REST + auth patterns
 *   - reqres: auth / CRUD / pagination patterns
 *   - stripe: payment endpoints
 *   - misc.api.spec.ts uses native fetch() for Dog CEO + Advice Slip.
 */
import { ApiClient, SchemaValidator } from './api-client';
import { environment } from '../../config/environments';

// Static clients loaded from .env / defaults.
export const clients = {
  jsonplaceholder: new ApiClient(environment.apiBase.jsonplaceholder),
  reqres: new ApiClient(environment.apiBase.reqres),
  coingecko: new ApiClient(environment.apiBase.coingecko),
  exchangerate: new ApiClient(environment.apiBase.exchangerate),
  httpbin: new ApiClient(environment.apiBase.httpbin),
  github: new ApiClient(environment.apiBase.github),
  frankfurter: new ApiClient('https://api.frankfurter.dev'),
  // Stripe lives in tests-api/stripe.api.spec.ts — uses raw fetch() since
  // we only have a handful of negative-path tests.
};

export { ApiClient, SchemaValidator };
export type ApiClientKey = keyof typeof clients;