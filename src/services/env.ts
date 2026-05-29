import { getSingleton } from './singleton';

/** Keep in sync with the test env vars in `jest_setup.ts` */
export type EnvVars = {
  baseUrl: string;
  pgHost: string;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  sentryDsn: string;
  sentryEnvironment: string;
  publicS3BaseUrl: string;
  s3Endpoint: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3AccessKeySecret: string;
  s3MapsBucket: string;
  /** 'real' talks to S3; 'fake' returns hardcoded data (for tests, no bucket required). */
  s3Implementation: string;
  flagsImplementation: string;
  flagsEdgeConfig: string;
  flagsEdgeConfigKey: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  axiomApiToken: string;
  axiomDataset: string;
  axiomPublicApiToken: string;
  axiomPublicDataset: string;
};

/**
 * Retrieves the environment variables. Each variable is validated lazily on first access (see
 * `createEnvVars`), so reading one variable never forces unrelated ones to be present. This lets
 * code paths (and tests) that don't touch a given service avoid requiring its config — e.g. the
 * S3 credentials are never read when the fake S3 implementation is in use.
 */
export function getEnvVars() {
  return getSingleton('_envVars', createEnvVars);
}

function requireString(envKey: string): string {
  const value = process.env[envKey];
  if (value == null || value.trim() === '') {
    throw new Error(`${envKey} has been left blank in .env -- intentional?`);
  }
  return value;
}

function requireNumber(envKey: string): number {
  const value = Number(process.env[envKey] || undefined);
  if (isNaN(value)) {
    throw new Error(`${envKey} is missing or not a number in .env -- intentional?`);
  }
  return value;
}

function createEnvVars(): EnvVars {
  const getters: { [K in keyof EnvVars]: () => EnvVars[K] } = {
    baseUrl: () => requireString('NEXT_PUBLIC_BASE_URL'),
    pgHost: () => requireString('PGHOST'),
    pgPort: () => requireNumber('PGPORT'),
    pgDatabase: () => requireString('PGDATABASE'),
    pgUser: () => requireString('PGUSER'),
    pgPassword: () => requireString('PGPASSWORD'),
    sentryDsn: () => requireString('SENTRY_DSN'),
    sentryEnvironment: () => requireString('SENTRY_ENV'),
    publicS3BaseUrl: () => requireString('PUBLIC_S3_BASE_URL'),
    s3Endpoint: () => requireString('S3_ENDPOINT'),
    s3Region: () => requireString('S3_REGION'),
    s3AccessKeyId: () => requireString('S3_ACCESS_KEY_ID'),
    s3AccessKeySecret: () => requireString('S3_ACCESS_KEY_SECRET'),
    s3MapsBucket: () => requireString('S3_MAPS_BUCKET'),
    s3Implementation: () => process.env.S3_IMPLEMENTATION || 'real',
    flagsImplementation: () => requireString('FLAGS_IMPLEMENTATION'),
    flagsEdgeConfig: () => requireString('FLAGS_EDGE_CONFIG'),
    flagsEdgeConfigKey: () => requireString('FLAGS_EDGE_CONFIG_KEY'),
    supabaseUrl: () => requireString('NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: () => requireString('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    supabaseSecretKey: () => requireString('SUPABASE_SECRET_KEY'),
    axiomApiToken: () => requireString('AXIOM_API_TOKEN'),
    axiomDataset: () => requireString('AXIOM_DATASET'),
    axiomPublicApiToken: () => requireString('NEXT_PUBLIC_AXIOM_API_TOKEN'),
    axiomPublicDataset: () => requireString('NEXT_PUBLIC_AXIOM_DATASET'),
  };

  const cache = new Map<keyof EnvVars, EnvVars[keyof EnvVars]>();
  const envVars = {} as EnvVars;
  for (const key of Object.keys(getters) as (keyof EnvVars)[]) {
    Object.defineProperty(envVars, key, {
      enumerable: true,
      get() {
        if (!cache.has(key)) {
          cache.set(key, getters[key]());
        }
        return cache.get(key);
      },
    });
  }
  return envVars;
}
