/**
 * Environment configuration. Single source of truth for URLs, timeouts, and feature flags.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export interface Environment {
  name: string;
  baseUrl: string;
  apiBase: {
    jsonplaceholder: string;
    reqres: string;
    coingecko: string;
    openweather: string;
    exchangerate: string;
    randomuser: string;
    httpbin: string;
    pokeapi: string;
    swapi: string;
    nasa: string;
    github: string;
    catfacts: string;
    dogceo: string;
    countries: string;
  };
  db: {
    type: 'sqlite' | 'postgres';
    path: string;
    postgres?: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  };
  headless: boolean;
  logLevel: string;
}

const env = (key: string, fallback?: string): string => {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (fallback === undefined) throw new Error(`Missing required env var: ${key}`);
    return fallback;
  }
  return v;
};

export const environment: Environment = {
  name: env('TEST_ENV', 'staging'),
  baseUrl: env(
    'BASE_URL',
    'http://localhost:8765/demo.html',
  ),
  apiBase: {
    jsonplaceholder: env('JSONPLACEHOLDER_URL', 'https://jsonplaceholder.typicode.com'),
    reqres: env('REQRES_URL', 'https://reqres.in/api'),
    coingecko: env('COINGECKO_URL', 'https://api.coingecko.com/api/v3'),
    openweather: env('OPENWEATHER_URL', 'https://api.openweathermap.org/data/2.5'),
    exchangerate: env('EXCHANGERATE_URL', 'https://api.exchangerate-api.com/v4/latest'),
    randomuser: env('RANDOMUSER_URL', 'https://randomuser.me/api'),
    httpbin: env('HTTPBIN_URL', 'https://httpbin.org'),
    pokeapi: env('POKEAPI_URL', 'https://pokeapi.co/api/v2'),
    swapi: env('SWAPI_URL', 'https://swapi.dev/api'),
    nasa: env('NASA_URL', 'https://api.nasa.gov'),
    github: env('GITHUB_URL', 'https://api.github.com'),
    catfacts: env('CATFACTS_URL', 'https://catfact.ninja'),
    dogceo: env('DOGCEO_URL', 'https://dog.ceo/api'),
    countries: env('COUNTRY_URL', 'https://restcountries.com/v3.1'),
  },
  db: {
    type: (env('DB_TYPE', 'sqlite') as 'sqlite' | 'postgres'),
    path: env('DB_PATH', './utils/db/advisordesk.db'),
    postgres: process.env.POSTGRES_HOST
      ? {
          host: env('POSTGRES_HOST'),
          port: parseInt(env('POSTGRES_PORT', '5432'), 10),
          database: env('POSTGRES_DB', 'advisordesk_test'),
          user: env('POSTGRES_USER'),
          password: env('POSTGRES_PASSWORD'),
        }
      : undefined,
  },
  headless: env('HEADLESS', 'true') === 'true',
  logLevel: env('LOG_LEVEL', 'info'),
};

export const TEST_DATA = {
  validClient: {
    name: 'Acme Capital LLC',
    company: 'Acme Capital',
    email: 'contact@acme.example',
    phone: '+1-555-0100',
    status: 'active' as const,
    source: 'Referral',
    address: '123 Wall St, NY',
  },
  validProject: {
    name: 'Q4 Portfolio Review',
    stage: 'in_progress' as const,
    value: 12500,
  },
  validTask: {
    title: 'Send monthly statement',
    priority: 'high' as const,
  },
  validInvoice: {
    status: 'draft' as const,
    issueDate: '2026-09-29',
    dueDate: '2026-10-29',
    lines: [
      { description: 'Advisory fee', qty: 1, rate: 2500 },
      { description: 'Performance report', qty: 1, rate: 750 },
    ],
  },
};