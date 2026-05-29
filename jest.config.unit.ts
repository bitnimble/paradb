import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

// Pure unit tests: run entirely within Jest with no server, Postgres, S3, or Supabase.
// Tests opt in by using the `.unit.test.ts` suffix. Crucially, this config does NOT load
// `jest_setup.ts`, which connects to and truncates a real database.
const config = {
  testMatch: ['**/*.unit.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/src/services/jest_setup.unit.ts'],
  modulePaths: ['<rootDir>/src'],
};

export default createJestConfig(config);
