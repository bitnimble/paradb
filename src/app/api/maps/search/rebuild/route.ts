import { MeiliSearch } from 'meilisearch';
import { NextResponse } from 'next/server';
import { mapSortableAttributes } from 'schema/maps';
import { getEnvVars } from 'services/env';
import { MapsRepo } from 'services/maps/maps_repo';
import { MeilisearchIndex, SearchableMap } from 'services/search/meilisearch';

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
  const tempNewIndex = await client.getIndex<SearchableMap>(TEMP_MAPS_INDEX_UID);
  const searchIndex = new MeilisearchIndex(tempNewIndex);
  const mapsRepo = new MapsRepo(searchIndex);
  // TODO: paginate / stream this
  const mapsResult = await mapsRepo.findMaps({ by: 'all' });
  if (!mapsResult.success) {
    throw new Error(JSON.stringify(mapsResult.errors));
  }

  console.log('Setting up attribute fields');
  const updateRanking = await searchIndex._index.updateRankingRules([
    'sort',
    'words',
    'typo',
    'proximity',
    'attribute',
    'exactness',
  ]);
  const updateSearch = await searchIndex._index.updateSearchableAttributes([
    'title',
    'artist',
    'author',
    'description',
  ]);
  const updateFilters = await searchIndex._index.updateFilterableAttributes([
    'artist',
    'author',
    'uploader',
  ]);

  console.log('Adding sortable attributes: ', mapSortableAttributes.join(', '));

  const updateSorts = await searchIndex._index.updateSortableAttributes([...mapSortableAttributes]);

  const [_1, _2, _3, _4] = await client.tasks.waitForTasks(
    [updateRanking, updateSearch, updateFilters, updateSorts].map((t) => t.taskUid),
    { timeout: 60000 }
  );
  console.log(`Added ${mapsResult.value.length} maps, waiting for tasks to complete...`);
  console.log('Adding data');
  try {
    await searchIndex.updateDocuments(mapsResult.value);
  } catch (e) {
    console.log(`Error: ${JSON.stringify(e)}`);
  }

  console.log('Swapping indexes');
  // If the index already exists, then do a proper swap - otherwise, just rename the new temp index
  const rename = (await client.getIndexes()).results.find((i) => i.uid === 'maps') == null;
  await client.swapIndexes([{ indexes: [TEMP_MAPS_INDEX_UID, 'maps'], rename }]).waitTask();
  console.log('Deleting old index');
  await client.deleteIndexIfExists(TEMP_MAPS_INDEX_UID);
  console.log('Done!');
}
