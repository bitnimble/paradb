import { camelCaseKeys, DbError, snakeCaseKeys } from 'services/db/helpers';
import { generateId, IdDomain } from 'services/db/id_gen';
import { checkExists } from 'base/preconditions';
import { PromisedResult, Result, ResultError, wrapError } from 'base/result';
import { getServerContext } from 'services/server_context';
// @ts-ignore
import * as encoding from 'encoding';
import { Index } from 'meilisearch';
import path from 'path';
import { MapSortableAttributes, PDMap } from 'schema/maps';
import * as unzipper from 'unzipper';
import * as db from 'zapatos/db';
import { deleteFiles, S3Error, uploadFiles } from './s3_handler';

const exists = <T>(t: T | undefined): t is NonNullable<T> => !!t;

export type MeilisearchMap = {
  id: string;
  title?: string;
  artist?: string;
  author?: string;
  uploader?: string;
  downloadCount?: number;
  description?: string;
  submissionDate?: number;
  favorites?: number;
};
export function convertToMeilisearchMap(map: Partial<PDMap> & { id: string }): MeilisearchMap {
  const {
    id,
    title,
    artist,
    author,
    uploader,
    downloadCount,
    description,
    submissionDate,
    favorites,
  } = map;
  return {
    id,
    title,
    artist,
    author: author || '',
    uploader,
    downloadCount,
    description: description || '',
    submissionDate: submissionDate != null ? Number(new Date(submissionDate)) : undefined,
    favorites,
  };
}

export type FindMapsBy = { by: 'id'; ids: string[] };

export const enum GetMapError {
  MISSING_MAP = 'missing_map',
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}
export const enum DeleteMapError {
  MISSING_MAP = 'missing_map',
}

type UpsertMapOpts = {
  // a map ID that this upsert will replace (if the mapFile is valid)
  id?: string;
  uploader: string;
  // zip file of the map
  mapFile: ArrayBuffer;
};
export const enum CreateMapError {
  TOO_MANY_ID_GEN_ATTEMPTS = 'too_many_id_gen_attempts',
}

type RawMap = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'description' | 'complexity' | 'difficulties'
>;
export const enum ValidateMapError {
  MISMATCHED_DIFFICULTY_METADATA = 'mismatched_difficulty_metadata',
  INCORRECT_FOLDER_STRUCTURE = 'incorrect_folder_structure',
  INCORRECT_FOLDER_NAME = 'incorrect_folder_name',
  NO_DATA = 'no_data',
  MISSING_ALBUM_ART = 'missing_album_art',
}
export const enum ValidateMapDifficultyError {
  INVALID_FORMAT = 'invalid_format',
  MISSING_VALUES = 'missing_values',
}
export const enum MeilisearchError {
  SEARCH_INDEX_ERROR = 'search-index-error',
}

export class MapsRepo {
  constructor(private readonly meilisearchMaps: Index<MeilisearchMap>) {}

  // TODO: add search parameters to findMaps
  async findMaps(by?: FindMapsBy, userId?: string): PromisedResult<PDMap[], DbError> {
    const { pool } = await getServerContext();

    const whereable = by ? { id: db.conditions.isIn(by.ids) } : db.all;

    try {
      const maps = await db
        .select('maps', whereable, {
          lateral: {
            difficulties: db.select(
              'difficulties',
              { map_id: db.parent('id') },
              {
                columns: ['difficulty', 'difficulty_name'],
              }
            ),
            favorites: db.count('favorites', { map_id: db.parent('id') }),
            ...(userId
              ? {
                  userProjection: db.selectOne(
                    'favorites',
                    {
                      map_id: db.parent('id'),
                      user_id: userId,
                    },
                    {
                      columns: [],
                      lateral: {
                        isFavorited: db.selectOne(
                          'favorites',
                          {
                            map_id: db.parent('map_id'),
                            user_id: userId,
                          },
                          { alias: 'favorites2' }
                        ),
                      },
                    }
                  ),
                }
              : {}),
          },
          columns: [
            'id',
            'submission_date',
            'title',
            'artist',
            'author',
            'uploader',
            'download_count',
            'description',
            'complexity',
            'album_art',
          ],
          order: { by: 'title', direction: 'ASC' },
        })
        .run(pool);
      return {
        success: true,
        value: maps.map((m) => ({
          ...camelCaseKeys(m),
          userProjection: {
            isFavorited: !!m.userProjection?.isFavorited,
          },
        })),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  /** User id is used for projections (favorites, etc) */
  async searchMaps(searchOptions: {
    user?: string;
    query: string;
    sort?: MapSortableAttributes;
    sortDirection?: 'asc' | 'desc';
    offset: number;
    limit: number;
  }): PromisedResult<PDMap[], DbError> {
    const { user, query, offset, limit, sort, sortDirection } = searchOptions;
    const response = await this.meilisearchMaps.search<MeilisearchMap>(query, {
      offset,
      limit,
      sort: sort && sortDirection ? [`${sort}:${sortDirection}`] : undefined,
    });
    const searchResults = response.hits;
    const ids = searchResults.map((r) => r.id);

    const mapsResult = await this.findMaps({ by: 'id', ids }, user);
    if (!mapsResult.success) {
      return mapsResult;
    }

    const maps = new Map(mapsResult.value.map((m) => [m.id, m]));
    return { success: true, value: searchResults.map((m) => maps.get(m.id)).filter(exists) };
  }

  async getMap(mapId: string, userId?: string): PromisedResult<PDMap, GetMapError> {
    const { pool } = await getServerContext();
    try {
      const map = await db
        .selectOne(
          'maps',
          { id: mapId },
          {
            lateral: {
              difficulties: db.select(
                'difficulties',
                { map_id: db.parent('id') },
                {
                  columns: ['difficulty', 'difficulty_name'],
                }
              ),
              favorites: db.count('favorites', { map_id: db.parent('id') }),
            },
            columns: [
              'id',
              'submission_date',
              'title',
              'artist',
              'author',
              'uploader',
              'download_count',
              'description',
              'complexity',
              'album_art',
            ],
          }
        )
        .run(pool);
      if (map == null) {
        return { success: false, errors: [{ type: GetMapError.MISSING_MAP }] };
      }
      const userProjection = userId
        ? {
            isFavorited: !!(await db
              .selectOne('favorites', { map_id: mapId, user_id: userId })
              .run(pool)),
          }
        : undefined;
      return { success: true, value: { ...camelCaseKeys(map), userProjection } };
    } catch (e) {
      return { success: false, errors: [wrapError(e, GetMapError.UNKNOWN_DB_ERROR)] };
    }
  }

  private async updateMeilisearchMap(
    map: Partial<PDMap> & { id: string }
  ): PromisedResult<void, MeilisearchError> {
    // Update search index
    try {
      await this.meilisearchMaps.updateDocuments([convertToMeilisearchMap(map)], {
        primaryKey: 'id',
      });
    } catch (e) {
      return {
        success: false,
        errors: [{ type: MeilisearchError.SEARCH_INDEX_ERROR, internalMessage: JSON.stringify(e) }],
      };
    }
    return { success: true, value: undefined };
  }

  async incrementMapDownloadCount(mapId: string): PromisedResult<void, GetMapError> {
    const { pool } = await getServerContext();
    try {
      await db.serializable(pool, async (client) => {
        const map = await db
          .selectOne('maps', { id: mapId }, { columns: ['download_count'] })
          .run(client);
        if (map == null) {
          // TODO: wire a proper ResultError out of the `db.serializable`
          throw new Error(`Could not find map id ${mapId} to increment download count`);
        }
        const updatedMap = await db
          .update('maps', snakeCaseKeys({ downloadCount: map.download_count + 1 }), { id: mapId })
          .run(client);

        const meilisearchResp = await this.updateMeilisearchMap(camelCaseKeys(updatedMap[0]));
        if (!meilisearchResp.success) {
          // TODO: wire a proper ResultError out of the `db.serializable`
          throw new Error(`Could not update search index`);
        }
      });
    } catch (e) {
      return { success: false, errors: [wrapError(e, GetMapError.UNKNOWN_DB_ERROR)] };
    }
    return { success: true, value: undefined };
  }

  async deleteMap({
    id,
    mapsDir,
  }: {
    id: string;
    mapsDir: string;
  }): PromisedResult<undefined, DbError | DeleteMapError | S3Error> {
    const { pool } = await getServerContext();
    try {
      // Delete dependent tables / foreign keys first
      await Promise.all([
        db.deletes('difficulties', { map_id: id }).run(pool),
        db.deletes('favorites', { map_id: id }).run(pool),
      ]);
      // Delete the map
      // TODO: soft deletion
      const deleted = await db.deletes('maps', { id }).run(pool);
      if (deleted.length === 0) {
        return { success: false, errors: [{ type: DeleteMapError.MISSING_MAP }] };
      }
      await this.meilisearchMaps.deleteDocument(id);
      return deleteFiles({ mapsDir, id });
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async upsertMap(
    mapsDir: string,
    opts: UpsertMapOpts
  ): PromisedResult<
    PDMap,
    | S3Error
    | DbError
    | CreateMapError
    | ValidateMapError
    | ValidateMapDifficultyError
    | MeilisearchError
  > {
    const { pool } = await getServerContext();
    const id =
      opts.id ?? (await generateId(IdDomain.MAPS, async (id) => (await this.getMap(id)).success));
    if (id == null) {
      return { success: false, errors: [{ type: CreateMapError.TOO_MANY_ID_GEN_ATTEMPTS }] };
    }

    const buffer = Buffer.from(opts.mapFile);
    const validatedMapResult = await validateMap({ id, mapsDir: mapsDir, buffer });
    if (!validatedMapResult.success) {
      return validatedMapResult;
    }

    const { title, artist, author, description, complexity, difficulties, albumArtFiles } =
      validatedMapResult.value;

    // We are updating a map; delete the old file off S3 first
    if (opts.id) {
      const deleteResult = await deleteFiles({ mapsDir, id });
      if (!deleteResult.success) {
        return deleteResult;
      }
    }
    const uploadResult = await uploadFiles({ id: id, mapsDir: mapsDir, buffer, albumArtFiles });
    if (!uploadResult.success) {
      return uploadResult;
    }
    const albumArt = uploadResult.value;

    const now = new Date();
    try {
      const insertedMap = await db
        .upsert(
          'maps',
          snakeCaseKeys({
            id,
            submissionDate: now,
            title: title,
            artist: artist,
            author: author || null,
            uploader: opts.uploader,
            albumArt: albumArt || null,
            description: description || null,
            complexity: checkExists(complexity, 'complexity'),
          }),
          ['id']
        )
        .run(pool);
      if (opts.id) {
        await db.deletes('difficulties', snakeCaseKeys({ mapId: id })).run(pool);
      }
      const insertedDifficulties = await db
        .insert(
          'difficulties',
          difficulties.map((d) =>
            snakeCaseKeys({
              mapId: id,
              difficulty: d.difficulty || null,
              difficultyName: checkExists(d.difficultyName, 'difficultyName'),
            })
          )
        )
        .run(pool);
      const mapResult = camelCaseKeys({
        ...insertedMap,
        difficulties: insertedDifficulties,
        // A newly created map will never be favorited
        favorites: 0,
        userProjection: { isFavorited: false },
      });
      const meilisearchResp = await this.updateMeilisearchMap(mapResult);
      if (!meilisearchResp.success) {
        return meilisearchResp;
      }
      return { success: true, value: mapResult };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }
}

async function validateMap(opts: {
  id: string;
  mapsDir: string;
  buffer: Buffer;
}): PromisedResult<
  RawMap & { albumArtFiles: unzipper.File[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  let map: unzipper.CentralDirectory;
  try {
    map = await unzipper.Open.buffer(opts.buffer);
  } catch (e) {
    // Failed to open zip -- corrupted, or incorrect format
    return { success: false, errors: [{ type: ValidateMapError.NO_DATA }] };
  }
  // A submitted map must have exactly one directory in it, and all of the files must be directly
  // under that directory.
  const files = map.files.filter((f) => f.type === 'File');
  let mapName = files[0].path.match(/(.+?)\//)?.[1];
  if (mapName?.startsWith('/')) {
    mapName = mapName.substring(1);
  }
  if (mapName == null || !files.every((f) => path.dirname(f.path) === mapName)) {
    return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_STRUCTURE }] };
  }
  const validatedResult = validateMapFiles({ expectedMapName: mapName, mapFiles: files });
  return validatedResult;
}

function allExists<T>(a: (T | undefined)[]): a is T[] {
  return a.every((t) => t != null);
}
type RawMapMetadata = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'albumArt' | 'description' | 'complexity'
>;
async function validateMapFiles(opts: {
  expectedMapName: string;
  mapFiles: unzipper.File[];
}): PromisedResult<
  RawMap & { albumArtFiles: unzipper.File[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  // The map directory needs to have the same name as the rlrr files.
  // TODO: remove this check once Paradiddle supports arbitrary folder names
  const difficultyFiles = opts.mapFiles.filter((f) => f.path.endsWith('.rlrr'));
  if (!difficultyFiles.every((f) => path.basename(f.path).startsWith(opts.expectedMapName))) {
    return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_NAME }] };
  }

  const difficultyResults = await Promise.all(
    difficultyFiles.map((f) =>
      f.buffer().then((b) => validateMapMetadata(path.basename(f.path), b))
    )
  );
  if (difficultyResults.length === 0) {
    return { success: false, errors: [{ type: ValidateMapError.NO_DATA }] };
  }
  const firstError = difficultyResults.find((m) => m.success === false);
  if (firstError && firstError.success === false) {
    return { success: false, errors: firstError.errors };
  }

  const validDifficultyResults = difficultyResults as Exclude<
    (typeof difficultyResults)[number],
    ResultError<ValidateMapDifficultyError>
  >[];

  // Check that all maps have the same metadata.
  for (let i = 1; i < validDifficultyResults.length; i++) {
    const map = validDifficultyResults[i].value;
    for (const [key, value] of Object.entries(map)) {
      // Difficulty name is expected to change between difficulties.
      // Complexity is not, but some existing maps have mismatched complexities between rlrr files,
      // and so this check has been skipped temporarily.
      // TODO: fix all maps with mismatched complexities
      if (key === 'difficultyName' || key === 'complexity') {
        continue;
      }
      const expected = validDifficultyResults[0].value[key as keyof RawMapMetadata];
      if (value !== expected) {
        return {
          success: false,
          errors: [
            {
              type: ValidateMapError.MISMATCHED_DIFFICULTY_METADATA,
              userMessage: `mismatched '${key}': '${value}' vs '${expected}'`,
            },
          ],
        };
      }
    }
  }

  const albumArtFiles = validDifficultyResults
    .map((v) => v.value.albumArt)
    .filter((s): s is string => s != null)
    .map((fn) => opts.mapFiles.find((f) => path.basename(f.path) === fn));

  if (!allExists(albumArtFiles)) {
    return { success: false, errors: [{ type: ValidateMapError.MISSING_ALBUM_ART }] };
  }

  return {
    success: true,
    value: {
      title: validDifficultyResults[0].value.title,
      artist: validDifficultyResults[0].value.artist,
      author: validDifficultyResults[0].value.author,
      description: validDifficultyResults[0].value.description,
      complexity: validDifficultyResults[0].value.complexity,
      difficulties: validDifficultyResults.map((d) => ({
        // Currently, custom difficulty values are not supported in the rlrr format. Persist them as
        // undefined for now, and look into generating a difficulty level later based on the map
        // content.
        difficulty: undefined,
        difficultyName: d.value.difficultyName,
      })),
      albumArtFiles,
    },
  };
}

function validateMapMetadata(
  filename: string,
  mapBuffer: Buffer
): Result<RawMapMetadata & { difficultyName: string }, ValidateMapDifficultyError> {
  let map: any;
  try {
    map = parseJsonBuffer(mapBuffer);
  } catch (e) {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }
  const metadata = map.recordingMetadata;
  if (!metadata) {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }
  const requiredFields = {
    title: metadata.title,
    artist: metadata.artist,
    complexity: metadata.complexity,
  };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value == null) {
      return {
        success: false,
        errors: [
          {
            type: ValidateMapDifficultyError.MISSING_VALUES,
            userMessage: `Property ${key} was missing a value`,
          },
        ],
      };
    }
  }
  const optionalFields = {
    description: metadata.description,
    author: metadata.creator,
    albumArt: metadata.coverImagePath,
  };
  const difficultyMatch = filename.match(/.*_(.+?).rlrr/);
  if (difficultyMatch == null) {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }
  return {
    success: true,
    value: { ...requiredFields, ...optionalFields, difficultyName: difficultyMatch[1] },
  };
}

function parseJsonBuffer(buffer: Buffer) {
  if (buffer.indexOf('\uFEFF', 0, 'utf16le') === 0) {
    return JSON.parse(encoding.convert(buffer, 'utf8', 'utf16le'));
  }
  return JSON.parse(buffer.toString());
}

const internalError: [number, string] = [500, 'Could not submit map'];
export const submitErrorMap: Record<
  | S3Error
  | DbError
  | CreateMapError
  | ValidateMapError
  | ValidateMapDifficultyError
  | MeilisearchError,
  [number, string]
> = {
  [S3Error.S3_WRITE_ERROR]: internalError,
  [S3Error.S3_DELETE_ERROR]: internalError,
  [DbError.UNKNOWN_DB_ERROR]: internalError,
  [CreateMapError.TOO_MANY_ID_GEN_ATTEMPTS]: internalError,
  [ValidateMapError.INCORRECT_FOLDER_NAME]: [
    400,
    'The top-level folder name needs to match the names of the rlrr files',
  ],
  [ValidateMapError.INCORRECT_FOLDER_STRUCTURE]: [
    400,
    'Incorrect folder structure. There needs to be exactly one top-level folder containing all of the files, and the folder needs to match the song title.',
  ],
  [ValidateMapError.MISMATCHED_DIFFICULTY_METADATA]: [
    400,
    'All difficulties need to have identical metadata (excluding complexity)',
  ],
  [ValidateMapError.MISSING_ALBUM_ART]: [400, 'Missing album art'],
  [ValidateMapError.NO_DATA]: [400, 'Invalid map archive; could not find map data'],
  [ValidateMapDifficultyError.INVALID_FORMAT]: [
    400,
    'Invalid map data; could not process the map .rlrr files',
  ],
  [ValidateMapDifficultyError.MISSING_VALUES]: [
    400,
    'Invalid map data; a map .rlrr is missing a required field (title, artist or complexity)',
  ],
  [MeilisearchError.SEARCH_INDEX_ERROR]: internalError,
};
