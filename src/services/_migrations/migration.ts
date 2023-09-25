import { initPool } from 'services/db/pool';

export const setupMigration = async () => {
  // Allow using a custom .env file for migrations via environment variables; otherwise, use the current working directory .env
  await initPool();
};

// TODO: setup a test DB framework for testing migrations over fake data
