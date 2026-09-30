/**
 * Minimal type declarations for the `faker` package (v5).
 * We only use a small subset — full coverage would balloon the types.
 */
declare module 'faker' {
  const faker: {
    seed(n: number): void;
    company: {
      name(): string;
      companyName(): string;
      buzzPhrase(): string;
      bs(): string;
      catchPhrase(): string;
    };
    internet: { email(): string; userName(): string };
    phone: { phoneNumber(format: string): string };
    address: {
      streetAddress(): string;
      city(): string;
      country(): string;
    };
    random: {
      arrayElement<T>(arr: T[]): T;
      arrayElements<T>(arr: T[], count?: number): T[];
      number(opts: { min: number; max: number }): number;
      uuid(): string;
      word(): string;
      alphaNumeric(count: number): string;
    };
    lorem: {
      sentence(n?: number): string;
      words(n: number): string[];
      paragraph(): string;
    };
    date: {
      recent(days: number): Date;
      soon(days: number): Date;
      past(years: number): Date;
    };
    name: { firstName(): string; lastName(): string; findName(): string };
    string: { alphanumeric(count: number): string; uuid(): string };
  };
  export default faker;
  export = faker;
}