import { checkExists } from 'base/preconditions';
import { PromisedResult, Result, wrapError } from 'base/result';
import { Index } from 'meilisearch';
import { MapSortableAttributes, PDMap } from 'schema/maps';
import { AdvancedSearchMapRequest, MapValidity, MapVisibility } from 'schema/maps_zod';
import { DbError, camelCaseKeys } from 'services/db/helpers';
import snakeCaseKeys from 'snakecase-keys';
import { IdDomain, generateId } from 'services/db/id_gen';
import { getDbPool } from 'services/db/pool';
import {
  ValidateMapDifficultyError,
  ValidateMapError,
  validateMap,
} from 'services/maps/map_validator';
import { getServerContext } from 'services/server_context';
import * as db from 'zapatos/db';
import { S3Error, deleteFiles, promoteTempMapFiles, uploadAlbumArtFiles } from './s3_handler';

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

type ProcessMapOpts = {
  id: string;
  uploader: string;
  // zip file of the map
  mapFile: Buffer;
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
          { ...whereable, visibility: MapVisibility.PUBLIC },
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
              'visibility',
              'validity',
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
          { id: mapId, visibility: MapVisibility.PUBLIC },
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
              'visibility',
              'validity',
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

  async changeMapVisibility(
    id: string,
    visibility: MapVisibility
  ): Promise<Result<undefined, UpdateMapError>> {
    const { pool } = await getServerContext();
    try {
      await db.update('maps', { visibility }, { id }).run(pool);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, UpdateMapError.UNKNOWN_DB_ERROR)] };
    }
  }

  async setValidity(id: string, validity: MapValidity): PromisedResult<undefined, UpdateMapError> {
    const pool = await getDbPool();
    try {
      await db.update('maps', { validity }, { id }).run(pool);
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
  }: {
    id: string;
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
      // Attempt to delete any orphaned S3 temp files just in case
      await Promise.all([deleteFiles(id, true), deleteFiles(id, false)]);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async createNewMap({
    title,
    uploader,
  }: {
    title: string;
    uploader: string;
  }): PromisedResult<{ id: string }, CreateMapError | DbError> {
    const pool = await getDbPool();
    const id = await generateId(
      IdDomain.MAPS,
      async (id) => !!(await db.selectOne('maps', { id }).run(pool))
    );
    if (id == null) {
      return { success: false, errors: [{ type: CreateMapError.TOO_MANY_ID_GEN_ATTEMPTS }] };
    }

    try {
      await db
        .insert('maps', [
          snakeCaseKeys({
            id,
            visibility: MapVisibility.HIDDEN,
            validity: MapValidity.PENDING_UPLOAD,
            uploader,
            submissionDate: new Date(),
            title,
            artist: '',
            complexity: 0,
          }),
        ])
        .run(pool);
      return { success: true, value: { id } };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async validateUploadedMap(
    opts: ProcessMapOpts
  ): PromisedResult<
    PDMap,
    | S3Error
    | DbError
    | CreateMapError
    | ValidateMapError
    | ValidateMapDifficultyError
    | MeilisearchError
  > {
    const { id, mapFile: buffer, uploader } = opts;
    await this.setValidity(id, MapValidity.VALIDATING);
    const validatedMapResult = await validateMap({ id, buffer });
    if (!validatedMapResult.success) {
      return validatedMapResult;
    }

    const { title, artist, author, description, complexity, difficulties, albumArtFiles } =
      validatedMapResult.value;

    // We are updating a map; delete the old file off S3 first
    const existingMap = await this.getMap(id);
    const isExistingMap = existingMap.success && existingMap.value.validity === MapValidity.VALID;
    const uploadResult = await uploadAlbumArtFiles(id, albumArtFiles, true);
    if (!uploadResult.success) {
      return uploadResult;
    }
    const albumArt = uploadResult.value;

    const now = new Date();
    const pool = await getDbPool();
    try {
      const insertedMap = await db
        .upsert(
          'maps',
          snakeCaseKeys({
            id,
            visibility: MapVisibility.PUBLIC,
            validity: MapValidity.VALID,
            submissionDate: now,
            title: title,
            artist: artist,
            author: author || null,
            uploader,
            albumArt: albumArt || null,
            description: description || null,
            complexity: checkExists(complexity, 'complexity'),
          }),
          ['id']
        )
        .run(pool);
      if (isExistingMap) {
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

      await promoteTempMapFiles(id);

      const mapResult = camelCaseKeys({
        ...insertedMap,
        difficulties: insertedDifficulties,
        favorites: (existingMap.success && existingMap.value.favorites) || 0,
        userProjection: {
          isFavorited: !!(await db
            .selectOne('favorites', { map_id: id, user_id: uploader })
            .run(pool)),
        },
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
  [S3Error.S3_GET_ERROR]: internalError,
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
