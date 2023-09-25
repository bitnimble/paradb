import { setupMigration } from './migration';
import { getEnvVars } from 'services/env';
import { MeiliSearch } from 'meilisearch';

(async () => {
  await setupMigration();

  const { meilisearchHost } = getEnvVars();

  const masterKey = process.env.MEILISEARCH_MASTER_KEY;
  const client = new MeiliSearch({ host: meilisearchHost, apiKey: masterKey });
  const createdKey = await client.createKey({
    description: 'paradb-access-key',
    actions: ['*'],
    indexes: ['*'],
    expiresAt: null,
  });
  const { uid, key } = createdKey;
  console.log(`Created key: '${key}' with UID '${uid}'`);
})();
