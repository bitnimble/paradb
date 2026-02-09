import { PromisedResult, wrapError } from 'base/result';
import { Collection, CollectionMap } from 'schema/collections';
import { camelCaseKeys, DbError } from 'services/db/helpers';
import { IdDomain, generateId } from 'services/db/id_gen';
import { getDbPool } from 'services/db/pool';
import { getServerContext } from 'services/server_context';
import snakeCaseKeys from 'snakecase-keys';
import * as db from 'zapatos/db';

export type FindCollectionsBy =
  | { by: 'id'; ids: string[] }
  | { by: 'creator'; creatorId: string }
  | { by: 'all' };

export const enum GetCollectionError {
  MISSING_COLLECTION = 'missing_collection',
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}

export const enum CreateCollectionError {
  TOO_MANY_ID_GEN_ATTEMPTS = 'too_many_id_gen_attempts',
}

export const enum UpdateCollectionError {
  MISSING_COLLECTION = 'missing_collection',
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}

export const enum DeleteCollectionError {
  MISSING_COLLECTION = 'missing_collection',
}

export class CollectionsRepo {
  async findCollections(
    findBy: FindCollectionsBy,
    userId?: string
  ): PromisedResult<Collection[], DbError> {
    const pool = await getDbPool();

    const whereable =
      findBy.by === 'id'
        ? { id: db.conditions.isIn(findBy.ids) }
        : findBy.by === 'creator'
          ? { creator_id: findBy.creatorId }
          : {};

    try {
      const collections = await db
        .select('collections', whereable, {
          lateral: {
            maps: db.select(
              'collection_maps',
              { collection_id: db.parent('id') },
              {
                columns: ['map_id', 'position'],
                order: { by: 'position', direction: 'ASC' },
              }
            ),
            favorites: db.count('collection_favorites', { collection_id: db.parent('id') }),
            ...(userId
              ? {
                  userProjection: db.selectOne(
                    'collection_favorites',
                    {
                      collection_id: db.parent('id'),
                      user_id: userId,
                    },
                    {
                      columns: [],
                      lateral: {
                        isFavorited: db.selectOne(
                          'collection_favorites',
                          {
                            collection_id: db.parent('collection_id'),
                            user_id: userId,
                          },
                          { alias: 'collection_favorites2' }
                        ),
                      },
                    }
                  ),
                }
              : {}),
          },
          columns: ['id', 'creator_id', 'creation_date', 'name', 'description', 'album_art'],
          order: { by: 'creation_date', direction: 'DESC' },
        })
        .run(pool);

      return {
        success: true,
        value: collections.map((c) =>
          Collection.decode({
            ...camelCaseKeys(c),
            maps: c.maps.map((m) => CollectionMap.decode(camelCaseKeys(m))),
            userProjection: {
              isFavorited: !!c.userProjection?.isFavorited,
            },
          })
        ),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async getCollection(
    collectionId: string,
    userId?: string
  ): PromisedResult<Collection, GetCollectionError> {
    const { pool } = await getServerContext();

    try {
      const collection = await db
        .selectOne('collections', { id: collectionId }, {
          lateral: {
            maps: db.select(
              'collection_maps',
              { collection_id: db.parent('id') },
              {
                columns: ['map_id', 'position'],
                order: { by: 'position', direction: 'ASC' },
              }
            ),
            favorites: db.count('collection_favorites', { collection_id: db.parent('id') }),
          },
          columns: ['id', 'creator_id', 'creation_date', 'name', 'description', 'album_art'],
        })
        .run(pool);

      if (collection == null) {
        return { success: false, errors: [{ type: GetCollectionError.MISSING_COLLECTION }] };
      }

      const userProjection = userId
        ? {
            isFavorited: !!(await db
              .selectOne('collection_favorites', { collection_id: collectionId, user_id: userId })
              .run(pool)),
          }
        : undefined;

      return {
        success: true,
        value: Collection.decode({
          ...camelCaseKeys(collection),
          maps: collection.maps.map((m) => CollectionMap.decode(camelCaseKeys(m))),
          userProjection,
        }),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, GetCollectionError.UNKNOWN_DB_ERROR)] };
    }
  }

  async createCollection({
    creatorId,
    name,
    description,
    albumArt,
    mapIds,
  }: {
    creatorId: string;
    name: string;
    description?: string;
    albumArt?: string;
    mapIds?: string[];
  }): PromisedResult<{ id: string }, CreateCollectionError | DbError> {
    const pool = await getDbPool();
    const id = await generateId(
      IdDomain.COLLECTIONS,
      async (id) => !!(await db.selectOne('collections', { id }).run(pool))
    );
    if (id == null) {
      return { success: false, errors: [{ type: CreateCollectionError.TOO_MANY_ID_GEN_ATTEMPTS }] };
    }

    try {
      await db
        .insert('collections', [
          snakeCaseKeys({
            id,
            creatorId,
            creationDate: new Date(),
            name,
            description: description || null,
            albumArt: albumArt || null,
          }),
        ])
        .run(pool);

      if (mapIds && mapIds.length > 0) {
        await db
          .insert(
            'collection_maps',
            mapIds.map((mapId, index) =>
              snakeCaseKeys({
                collectionId: id,
                mapId,
                position: index,
              })
            )
          )
          .run(pool);
      }

      return { success: true, value: { id } };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async updateCollection({
    id,
    name,
    description,
    albumArt,
    mapIds,
  }: {
    id: string;
    name?: string;
    description?: string;
    albumArt?: string;
    mapIds?: string[];
  }): PromisedResult<undefined, UpdateCollectionError> {
    const { pool } = await getServerContext();

    try {
      const updateData: Record<string, string | null> = {};
      if (name != null) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (albumArt !== undefined) updateData.album_art = albumArt || null;

      if (Object.keys(updateData).length > 0) {
        const updated = await db.update('collections', updateData, { id }).run(pool);
        if (updated.length === 0) {
          return { success: false, errors: [{ type: UpdateCollectionError.MISSING_COLLECTION }] };
        }
      }

      if (mapIds != null) {
        await db.deletes('collection_maps', { collection_id: id }).run(pool);
        if (mapIds.length > 0) {
          await db
            .insert(
              'collection_maps',
              mapIds.map((mapId, index) =>
                snakeCaseKeys({
                  collectionId: id,
                  mapId,
                  position: index,
                })
              )
            )
            .run(pool);
        }
      }

      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, UpdateCollectionError.UNKNOWN_DB_ERROR)] };
    }
  }

  async deleteCollection({ id }: { id: string }): PromisedResult<undefined, DeleteCollectionError | DbError> {
    const { pool } = await getServerContext();

    try {
      await Promise.all([
        db.deletes('collection_maps', { collection_id: id }).run(pool),
        db.deletes('collection_favorites', { collection_id: id }).run(pool),
      ]);

      const deleted = await db.deletes('collections', { id }).run(pool);
      if (deleted.length === 0) {
        return { success: false, errors: [{ type: DeleteCollectionError.MISSING_COLLECTION }] };
      }

      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async setCollectionFavorites(
    userId: string,
    collectionIds: string[],
    isFavorited: boolean
  ): PromisedResult<void, DbError> {
    const { pool } = await getServerContext();
    const now = new Date();

    try {
      if (isFavorited) {
        await db
          .upsert(
            'collection_favorites',
            collectionIds.map((c) => ({ collection_id: c, user_id: userId, favorited_date: now })),
            ['collection_id', 'user_id'],
            { updateColumns: db.doNothing }
          )
          .run(pool);
      } else {
        await db.readCommitted(pool, async (client) =>
          Promise.all(
            collectionIds.map((c) =>
              db.deletes('collection_favorites', { user_id: userId, collection_id: c }).run(client)
            )
          )
        );
      }

      return { success: true, value: undefined };
    } catch {
      return { success: false, errors: [{ type: DbError.UNKNOWN_DB_ERROR }] };
    }
  }

  async getFavoriteCollections(userId: string): PromisedResult<Collection[], DbError> {
    const { pool } = await getServerContext();

    try {
      const favorites = await db.select('collection_favorites', { user_id: userId }).run(pool);
      const ids = favorites.map((f) => f.collection_id);
      const collectionsResult = await this.findCollections({ by: 'id', ids }, userId);
      return collectionsResult;
    } catch {
      return { success: false, errors: [{ type: DbError.UNKNOWN_DB_ERROR }] };
    }
  }
}
