import type { Config } from 'jest';

// Pure unit tests: run entirely within Jest with no server, Postgres, S3, or Supabase.
// Tests opt in by using the `.unit.test.ts` suffix. Crucially, this config does NOT load
// `jest_setup.ts`, which connects to and truncates a real database.
//
// Transformed with @swc/jest (not next/jest's transformer) because the app uses standard-proposal
// decorators / `accessor` fields, which next/jest's SWC setup doesn't enable. Unit tests need no
// Next-specific transforms (CSS, fonts, etc.), so a plain SWC transform is enough.
const config: Config = {
  testMatch: ['**/*.unit.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/src/services/jest_setup.unit.ts'],
  modulePaths: ['<rootDir>/src'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: true },
          transform: { decoratorVersion: '2022-03' },
          target: 'es2022',
          keepClassNames: true,
        },
      },
    ],
  },
};

export default config;
