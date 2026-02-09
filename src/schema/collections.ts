import { z } from 'zod';
import { ApiError, ApiSuccess } from './api';

/* Structs */
export const CollectionUserProjection = z.object({
  isFavorited: z.boolean(),
});

export const CollectionMap = z.object({
  mapId: z.string(),
  position: z.number(),
});

export const Collection = z.object({
  id: z.string(),
  creatorId: z.string(),
  creationDate: z.iso.datetime({ local: true }),
  name: z.string(),
  description: z.string().nullish(),
  albumArt: z.string().nullish(),
  maps: z.array(CollectionMap),
  favorites: z.number(),
  userProjection: CollectionUserProjection.optional(),
});

/* GET getCollection */
export const GetCollectionSuccess = ApiSuccess.extend({
  collection: Collection,
});

export const GetCollectionResponse = z.discriminatedUnion('success', [
  GetCollectionSuccess,
  ApiError,
]);

/* GET findCollections */
export const FindCollectionsSuccess = ApiSuccess.extend({
  collections: z.array(Collection),
});

export const FindCollectionsResponse = z.discriminatedUnion('success', [
  FindCollectionsSuccess,
  ApiError,
]);

/* POST createCollection */
export const CreateCollectionRequest = z.object({
  name: z.string(),
  description: z.string().optional(),
  albumArt: z.string().optional(),
  mapIds: z.array(z.string()).optional(),
});

export const CreateCollectionSuccess = ApiSuccess.extend({
  id: z.string(),
});

export const CreateCollectionResponse = z.discriminatedUnion('success', [
  CreateCollectionSuccess,
  ApiError,
]);

/* PUT updateCollection */
export const UpdateCollectionRequest = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  albumArt: z.string().optional(),
  mapIds: z.array(z.string()).optional(),
});

export const UpdateCollectionResponse = z.discriminatedUnion('success', [ApiSuccess, ApiError]);

/* DELETE deleteCollection */
export const DeleteCollectionSuccess = ApiSuccess.extend({});

export const DeleteCollectionResponse = z.discriminatedUnion('success', [
  DeleteCollectionSuccess,
  ApiError,
]);

/* Collection Favorites */
export const SetCollectionFavoritesRequest = z.object({
  collectionIds: z.array(z.string()),
  isFavorite: z.boolean(),
});

export const GetFavoriteCollectionsSuccess = ApiSuccess.extend({
  collections: z.array(Collection),
});

export const GetFavoriteCollectionsResponse = z.discriminatedUnion('success', [
  GetFavoriteCollectionsSuccess,
  ApiError,
]);

/* Inferred types */
export type CollectionUserProjection = z.infer<typeof CollectionUserProjection>;
export type CollectionMap = z.infer<typeof CollectionMap>;
export type Collection = z.infer<typeof Collection>;
export type GetCollectionSuccess = z.infer<typeof GetCollectionSuccess>;
export type GetCollectionResponse = z.infer<typeof GetCollectionResponse>;
export type FindCollectionsSuccess = z.infer<typeof FindCollectionsSuccess>;
export type FindCollectionsResponse = z.infer<typeof FindCollectionsResponse>;
export type CreateCollectionRequest = z.infer<typeof CreateCollectionRequest>;
export type CreateCollectionSuccess = z.infer<typeof CreateCollectionSuccess>;
export type CreateCollectionResponse = z.infer<typeof CreateCollectionResponse>;
export type UpdateCollectionRequest = z.infer<typeof UpdateCollectionRequest>;
export type UpdateCollectionResponse = z.infer<typeof UpdateCollectionResponse>;
export type DeleteCollectionSuccess = z.infer<typeof DeleteCollectionSuccess>;
export type DeleteCollectionResponse = z.infer<typeof DeleteCollectionResponse>;
export type SetCollectionFavoritesRequest = z.infer<typeof SetCollectionFavoritesRequest>;
export type GetFavoriteCollectionsSuccess = z.infer<typeof GetFavoriteCollectionsSuccess>;
export type GetFavoriteCollectionsResponse = z.infer<typeof GetFavoriteCollectionsResponse>;
