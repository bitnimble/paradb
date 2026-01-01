import { MeiliSearch } from 'meilisearch';
import { NextResponse } from 'next/server';
import { mapSortableAttributes } from 'schema/maps';
import { getEnvVars } from 'services/env';
import { MapsRepo, convertToMeilisearchMap } from 'services/maps/maps_repo';

const TEMP_MAPS_INDEX_UID = 'maps-new';

export async function GET() {
  await rebuildMeilisearchIndex();
  return new NextResponse('Success', { status: 200 });
}

export async function rebuildMeilisearchIndex() {
  const { meilisearchHost, meilisearchKey } = getEnvVars();
  const client = new MeiliSearch({ host: meilisearchHost, apiKey: meilisearchKey });
  console.log('Creating new indexes');
  await client.createIndex(TEMP_MAPS_INDEX_UID).waitTask();
  console.log('Getting index');
  const mapsIndex = await client.getIndex(TEMP_MAPS_INDEX_UID);
  const mapsRepo = new MapsRepo(mapsIndex);
  // TODO: paginate / stream this
  const mapsResult = await mapsRepo.findMaps({ by: 'all' });
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
  console.log(`Added ${mapsResult.value.length} maps, waiting for tasks to complete...`);

  const [_1, _2, _3, _4, addDataResults] = await client.tasks.waitForTasks(
    [updateRanking, updateSearch, updateFilters, updateSorts, addData].map((t) => t.taskUid),
    { timeout: 60000 }
  );
  console.log(addDataResults.error ? `Error: ${JSON.stringify(addDataResults.error)}` : '');

  console.log('Swapping indexes');
  // If the index already exists, then do a proper swap - otherwise, just rename the new temp index
  const rename = (await client.getIndexes()).results.find((i) => i.uid === 'maps') == null;
  await client.swapIndexes([{ indexes: [TEMP_MAPS_INDEX_UID, 'maps'], rename }]).waitTask();
  console.log('Deleting old index');
  await client.deleteIndexIfExists(TEMP_MAPS_INDEX_UID);
  console.log('Done!');
}
