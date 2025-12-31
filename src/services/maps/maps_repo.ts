import { camelCaseKeys, DbError, snakeCaseKeys } from 'services/db/helpers';
import { generateId, IdDomain } from 'services/db/id_gen';
import { checkExists } from 'base/preconditions';
import { PromisedResult, Result, wrapError } from 'base/result';
import { getServerContext } from 'services/server_context';
import { Index } from 'meilisearch';
import { MapSortableAttributes, PDMap } from 'schema/maps';
import * as db from 'zapatos/db';
import { deleteFiles, S3Error, uploadFiles } from './s3_handler';
import {
  validateMap,
  ValidateMapDifficultyError,
  ValidateMapError,
} from 'services/maps/map_validator';
import { getEnvVars } from 'services/env';
import { AdvancedSearchMapRequest } from 'schema/maps_zod';
import { getDbPool } from 'services/db/pool';

const exists = <T>(t: T | undefined): t is NonNullable<T> => !!t;

export const enum MapStatus {
  PUBLIC = 'P',
  HIDDEN = 'H',
  INVALID = 'I',
}

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

export type FindMapsBy =
  | { by: 'id'; ids: string[] }
  // This should not be allowed to be performed outside of an authorized server call. Do not allow
  // users to query all maps.
  | { by: 'all' };

export const enum GetMapError {
  MISSING_MAP = 'missing_map',
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}
export const enum UpdateMapError {
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
export const enum MeilisearchError {
  SEARCH_INDEX_ERROR = 'search-index-error',
}

export class MapsRepo {
  constructor(private readonly meilisearchMaps: Index<MeilisearchMap>) {}

  // TODO: add search parameters to findMaps
  // TODO: pull `userId` out as RequestContext
  async findMaps(findBy: FindMapsBy, userId?: string): PromisedResult<PDMap[], DbError> {
    const pool = await getDbPool();

    // TODO: validate by.by === 'all' against the user role. Only an admin or root context can
    // perform a query to fetch all maps.
    const whereable = findBy.by === 'id' ? { id: db.conditions.isIn(findBy.ids) } : {};

    try {
      const maps = await db
        .select(
          'maps',
          // Only select publicly visible maps.
          { ...whereable, map_status: MapStatus.PUBLIC },
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
              'tags',
              'complexity',
              'album_art',
            ],
            order: { by: 'title', direction: 'ASC' },
          }
        )
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

    // Note: hidden or invalid maps may be indexed in Meilisearch, but should be filtered out when
    // querying further metadata via `findMaps`.
    // TODO: look at stripping hidden/invalid maps from Meilisearch as well, but this should be
    // good enough for now.
    const mapsResult = await this.findMaps({ by: 'id', ids }, user);
    if (!mapsResult.success) {
      return mapsResult;
    }

    const maps = new Map(mapsResult.value.map((m) => [m.id, m]));
    return { success: true, value: searchResults.map((m) => maps.get(m.id)).filter(exists) };
  }

  async advancedSearchMaps(searchOptions: AdvancedSearchMapRequest) {
    // TODO: prevent escaping the search query lol
    const filterParts = [
      searchOptions.artist ? `artist = "${searchOptions.artist}"` : null,
      searchOptions.uploader ? `uploader = "${searchOptions.uploader}"` : null,
    ].filter(exists);

    const searchResponse = await this.meilisearchMaps.search(searchOptions.title, {
      filter: filterParts.join(' AND '),
      hitsPerPage: searchOptions.limitPerPage || 20,
      page: searchOptions.page || 1,
    });
    const searchResults = searchResponse.hits;
    const ids = searchResults.map((r) => r.id);

    // Note: hidden or invalid maps may be indexed in Meilisearch, but should be filtered out when
    // querying further metadata via `findMaps`.
    // TODO: look at stripping hidden/invalid maps from Meilisearch as well, but this should be
    // good enough for now.
    // TODO: include user projection for requesting-user-specific metadata
    const mapsResult = await this.findMaps({ by: 'id', ids });
    if (!mapsResult.success) {
      return mapsResult;
    }

    const maps = new Map(mapsResult.value.map((m) => [m.id, m]));
    return {
      success: true,
      totalCount: searchResponse.totalHits,
      page: searchResponse.page,
      maps: searchResults
        .map((m) => maps.get(m.id))
        .filter(exists)
        .map((m) => {
          const submissionDate = new Date(m.submissionDate);
          return {
            ...m,
            submissionDate,
          };
        }),
    } as const;
  }

  async getMap(mapId: string, userId?: string): PromisedResult<PDMap, GetMapError> {
    const { pool } = await getServerContext();
    try {
      const map = await db
        .selectOne(
          'maps',
          { id: mapId, map_status: MapStatus.PUBLIC },
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
              'tags',
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

  async changeMapStatus(id: string, status: MapStatus): Promise<Result<undefined, UpdateMapError>> {
    const { pool } = await getServerContext();
    try {
      await db.update('maps', { map_status: status }, { id }).run(pool);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, UpdateMapError.UNKNOWN_DB_ERROR)] };
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
    const validatedMapResult = await validateMap({ id, buffer });
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
            mapStatus: MapStatus.PUBLIC,
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

  async revalidateMap(
    id: string
  ): Promise<Result<undefined, ValidateMapError | ValidateMapDifficultyError>> {
    // Download the map from S3
    const ab = await fetch(`${getEnvVars().publicS3BaseUrl}/${id}.zip`).then((r) =>
      r.arrayBuffer()
    );
    const buffer = Buffer.from(ab);
    const validateResult = await validateMap({ id, buffer });

    // Re-spread the result object to strip out anything else from the valdiator that we don't care
    // about, e.g. albumArtFiles
    if (!validateResult.success) {
      return {
        success: false,
        errors: validateResult.errors,
      };
    }
    return { success: true, value: undefined };
  }
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
  [ValidateMapDifficultyError.NO_AUDIO]: [400, 'Invalid map archive; missing audio files'],
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
