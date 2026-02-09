// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  testMatch: ['**/tests/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  globalSetup: '<rootDir>/src/services/jest_global_setup.ts',
  setupFilesAfterEnv: ['<rootDir>/src/services/jest_setup.ts'],
  modulePaths: ['<rootDir>/src'],
};

module.exports = createJestConfig(config);
