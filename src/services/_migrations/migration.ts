import { initPool } from 'services/db/pool';
import dotenv from 'dotenv';

export const setupMigration = async () => {
  // Allow using a custom .env file for migrations via environment variables; otherwise, use the current working directory .env
  dotenv.config({ path: process.env.ENV_FILE });
  await initPool();
};

// TODO: setup a test DB framework for testing migrations over fake data
