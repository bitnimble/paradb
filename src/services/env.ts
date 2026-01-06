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
  meilisearchHost: string;
  meilisearchKey: string;
  dynamicConfigEndpoint: string;
  dynamicConfigBucket: string;
  dynamicConfigAccessKeyId: string;
  dynamicConfigSecretKey: string;
  dynamicConfigRepoFile: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  axiomApiToken: string;
  axiomDataset: string;
  axiomPublicApiToken: string;
  axiomPublicDataset: string;
};

/**
 * Retrieves and validates the environment variables.
 */
export function getEnvVars() {
  return getSingleton('_envVars', createEnvVars);
}

function createEnvVars(): EnvVars {
  const envVars: { [K in keyof EnvVars]: EnvVars[K] | undefined } = {
    baseUrl: process.env.BASE_URL,
    pgHost: process.env.PGHOST,
    pgPort: Number(process.env.PGPORT || undefined),
    pgDatabase: process.env.PGDATABASE,
    pgUser: process.env.PGUSER,
    pgPassword: process.env.PGPASSWORD,
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: process.env.SENTRY_ENV,
    publicS3BaseUrl: process.env.PUBLIC_S3_BASE_URL,
    s3Endpoint: process.env.S3_ENDPOINT,
    s3Region: process.env.S3_REGION,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
    s3AccessKeySecret: process.env.S3_ACCESS_KEY_SECRET,
    s3MapsBucket: process.env.S3_MAPS_BUCKET,
    meilisearchHost: process.env.MEILISEARCH_HOST,
    meilisearchKey: process.env.MEILISEARCH_KEY,
    dynamicConfigEndpoint: process.env.DYNAMIC_CONFIG_ENDPOINT,
    dynamicConfigBucket: process.env.DYNAMIC_CONFIG_BUCKET,
    dynamicConfigAccessKeyId: process.env.DYNAMIC_CONFIG_ACCESS_KEY_ID,
    dynamicConfigSecretKey: process.env.DYNAMIC_CONFIG_SECRET_KEY,
    dynamicConfigRepoFile: process.env.DYNAMIC_CONFIG_REPO_FILE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    axiomApiToken: process.env.AXIOM_API_TOKEN,
    axiomDataset: process.env.AXIOM_DATASET,
    axiomPublicApiToken: process.env.NEXT_PUBLIC_AXIOM_API_TOKEN,
    axiomPublicDataset: process.env.NEXT_PUBLIC_AXIOM_DATASET,
  };
  let fail = false;
  for (const [key, value] of Object.entries(envVars)) {
    if (
      value == null ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'number' && isNaN(value))
    ) {
      console.error(`${key} has been left blank in .env -- intentional?`);
      fail = true;
    }
  }
  if (fail) {
    throw new Error('One or more environment variables were missing, see above.');
  }

  return envVars as EnvVars;
}
