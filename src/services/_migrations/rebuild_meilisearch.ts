import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE });

import { MeiliSearch } from 'meilisearch';
import { mapSortableAttributes } from 'schema/maps';
import { initPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { MapsRepo, MeilisearchMap, convertToMeilisearchMap } from 'services/maps/maps_repo';

(async () => {
  const pool = await initPool();

  const { meilisearchHost, meilisearchKey } = getEnvVars();
  const client = new MeiliSearch({ host: meilisearchHost, apiKey: meilisearchKey });
  console.log('Deleting old indexes');
  await client.deleteIndexIfExists('maps');
  console.log('Creating new indexes');
  await client.waitForTask((await client.createIndex('maps')).taskUid);
  console.log('Getting index');
  const mapsIndex = await client.getIndex<MeilisearchMap>('maps');

  const mapsRepo = new MapsRepo(mapsIndex);
  const mapsResult = await mapsRepo.findMaps();
  if (!mapsResult.success) {
    throw new Error(JSON.stringify(mapsResult.errors));
  }

  console.log('Setting up attribute fields');
  const updateRanking = await mapsIndex.updateRankingRules([
    'sort',
    'words',
    'typo',
    'proximity',
    'attribute',
    'exactness',
  ]);
  const updateSearch = await mapsIndex.updateSearchableAttributes([
    'title',
    'artist',
    'author',
    'description',
  ]);
  const updateFilters = await mapsIndex.updateFilterableAttributes([
    'artist',
    'author',
    'uploader',
  ]);

  console.log('Adding sortable attributes: ', mapSortableAttributes.join(', '));

  const updateSorts = await mapsIndex.updateSortableAttributes([...mapSortableAttributes]);
  console.log('Adding data');
  const addData = await mapsIndex.addDocuments(
    mapsResult.value.map((m) => convertToMeilisearchMap(m)),
    { primaryKey: 'id' }
  );

  await client.waitForTasks(
    [updateRanking, updateSearch, updateFilters, updateSorts, addData].map((t) => t.taskUid)
  );
  console.log('Done!');

  pool.end();
})();
