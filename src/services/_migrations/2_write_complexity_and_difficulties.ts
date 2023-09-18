// import { snakeCaseKeys } from 'db/helpers';
// import { getPool } from 'db/pool';
// import * as fs from 'fs/promises';
// import * as path from 'path';
// import { validateMapFiles } from 'services/maps/maps_repo';
// import * as unzipper from 'unzipper';
// import * as db from 'zapatos/db';
// import { setupMigration } from './migration';

// async function processMap(mapPath: string) {
//   const { pool } = await getServerContext();
//   const basename = path.basename(mapPath);
//   const id = basename.match(/(M[A-F0-9]{6})\.zip/)?.[1];
//   if (id == null) {
//     return;
//   }
//   const existing = await db.selectOne('maps', { id }).run(pool);
//   if (existing == null) {
//     return;
//   }
//   const buffer = await fs.readFile(mapPath);
//   const map = await unzipper.Open.buffer(buffer);
//   const mapFiles = map.files.filter(f => f.type === 'File');
//   const validatedMap = await validateMapFiles({ mapFiles });
//   if (!validatedMap.success) {
//     throw new Error(
//       `Map validation failed for path: ${mapPath}: ${JSON.stringify(validatedMap.errors)}`,
//     );
//   }

//   // Insert new difficulties
//   await db
//     .insert(
//       'difficulties',
//       validatedMap
//         .value
//         .difficulties
//         .map(d =>
//           snakeCaseKeys({
//             mapId: id,
//             difficulty: d.difficulty || null,
//             difficultyName: d.difficultyName || null,
//           })
//         ),
//     )
//     .run(pool);

//   // Update the map complexity to the complexity found in the first available difficulty
//   const complexity = validatedMap.value.complexity;
//   await db.update('maps', { complexity }, { id }).run(pool);
// }

// /**
//  * This migration script is expected to run AFTER `1_complexities_to_difficulties.sql`, and BEFORE
//  * `3_complexity_not_null.sql`.
//  * It will go through all stored maps and reinsert the difficulties found in the .rlrr files into the
//  * difficulties table.
//  */
// (async () => {
//   const envVars = await setupMigration();
//   const { pool } = await getServerContext();

//   // Drop all map difficulties
//   await db.truncate('difficulties').run(pool);

//   // Re-add all map difficulties
//   const entries = await fs.readdir(envVars.mapsDir);
//   const stats = await Promise.all(entries.map(async e => {
//     const fullPath = path.resolve(envVars.mapsDir, e);
//     const stat = await fs.stat(fullPath);
//     return { fullPath, stat };
//   }));
//   const files = stats
//     .filter(s => s.stat.isFile() && s.fullPath.endsWith('.zip'))
//     .map(s => s.fullPath);

//   for (let i = 0; i < files.length; i++) {
//     const file = files[i];
//     await processMap(file);
//     console.log(`Processed ${i + 1} / ${files.length}`);
//   }
// })();
