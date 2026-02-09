import { z } from 'zod';
import { ApiError, ApiSuccess } from './api';

/* Structs */
export const CollectionUserProjection = z.object({
  isFavorited: z.boolean(),
});
export type CollectionUserProjection = z.infer<typeof CollectionUserProjection>;

export const CollectionMap = z.object({
  mapId: z.string(),
  position: z.number(),
});
export type CollectionMap = z.infer<typeof CollectionMap>;

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
export type Collection = z.infer<typeof Collection>;

/* GET getCollection */
export const GetCollectionSuccess = ApiSuccess.extend({
  collection: Collection,
});
export type GetCollectionSuccess = z.infer<typeof GetCollectionSuccess>;

export const GetCollectionResponse = z.discriminatedUnion('success', [
  GetCollectionSuccess,
  ApiError,
]);
export type GetCollectionResponse = z.infer<typeof GetCollectionResponse>;

/* GET findCollections */
export const FindCollectionsSuccess = ApiSuccess.extend({
  collections: z.array(Collection),
});
export type FindCollectionsSuccess = z.infer<typeof FindCollectionsSuccess>;

export const FindCollectionsResponse = z.discriminatedUnion('success', [
  FindCollectionsSuccess,
  ApiError,
]);
export type FindCollectionsResponse = z.infer<typeof FindCollectionsResponse>;

/* POST createCollection */
export const CreateCollectionRequest = z.object({
  name: z.string(),
  description: z.string().optional(),
  albumArt: z.string().optional(),
  mapIds: z.array(z.string()).optional(),
});
export type CreateCollectionRequest = z.infer<typeof CreateCollectionRequest>;

export const CreateCollectionSuccess = ApiSuccess.extend({
  id: z.string(),
});
export type CreateCollectionSuccess = z.infer<typeof CreateCollectionSuccess>;

export const CreateCollectionResponse = z.discriminatedUnion('success', [
  CreateCollectionSuccess,
  ApiError,
]);
export type CreateCollectionResponse = z.infer<typeof CreateCollectionResponse>;

/* PUT updateCollection */
export const UpdateCollectionRequest = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  albumArt: z.string().optional(),
  mapIds: z.array(z.string()).optional(),
});
export type UpdateCollectionRequest = z.infer<typeof UpdateCollectionRequest>;

export const UpdateCollectionResponse = z.discriminatedUnion('success', [ApiSuccess, ApiError]);
export type UpdateCollectionResponse = z.infer<typeof UpdateCollectionResponse>;

/* DELETE deleteCollection */
export const DeleteCollectionSuccess = ApiSuccess.extend({});
export type DeleteCollectionSuccess = z.infer<typeof DeleteCollectionSuccess>;

export const DeleteCollectionResponse = z.discriminatedUnion('success', [
  DeleteCollectionSuccess,
  ApiError,
]);
export type DeleteCollectionResponse = z.infer<typeof DeleteCollectionResponse>;

/* Collection Favorites */
export const SetCollectionFavoritesRequest = z.object({
  collectionIds: z.array(z.string()),
  isFavorite: z.boolean(),
});
export type SetCollectionFavoritesRequest = z.infer<typeof SetCollectionFavoritesRequest>;

export const GetFavoriteCollectionsSuccess = ApiSuccess.extend({
  collections: z.array(Collection),
});
export type GetFavoriteCollectionsSuccess = z.infer<typeof GetFavoriteCollectionsSuccess>;

export const GetFavoriteCollectionsResponse = z.discriminatedUnion('success', [
  GetFavoriteCollectionsSuccess,
  ApiError,
]);
export type GetFavoriteCollectionsResponse = z.infer<typeof GetFavoriteCollectionsResponse>;
