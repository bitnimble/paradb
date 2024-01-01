import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE });

import { MapStatus } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';

async function delay(ms: number) {
  return new Promise<void>((res) => {
    setTimeout(() => res(), ms);
  });
}

async function main() {
  const { mapsRepo } = await getServerContext();

  const allMaps = await mapsRepo.findMaps({ by: 'all' });
  if (!allMaps.success) {
    console.error(`Could not retrieve all map IDs: ${JSON.stringify(allMaps.errors)}`);
    return;
  }

  for (const map of allMaps.value) {
    const { id } = map;
    console.log(`Revalidating ${id}`);
    const result = await mapsRepo.revalidateMap(id);
    if (!result.success) {
      console.log(`Validation failed. Marking map as invalid: ${JSON.stringify(result.errors)}`);
      const updateResult = await mapsRepo.changeMapStatus(id, MapStatus.INVALID);
      if (!updateResult.success) {
        console.log(`Failed to update map status for map ${id}`);
      }
    }
    await delay(2000);
  }
}

main();
