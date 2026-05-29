import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config = {
  testMatch: ['**/tests/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  // Unit tests run in their own config (jest.config.unit.ts) without DB/server setup.
  testPathIgnorePatterns: ['/node_modules/', '\\.unit\\.test\\.[jt]sx?$'],
  setupFilesAfterEnv: ['<rootDir>/src/services/jest_setup.ts'],
  globalSetup: '<rootDir>/src/services/jest_global_setup.integration.ts',
  modulePaths: ['<rootDir>/src'],
};

export default createJestConfig(config);
