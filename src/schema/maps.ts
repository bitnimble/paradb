import { z } from 'zod';
import { ApiError, ApiSuccess, PaginatedApiRequest, PaginatedApiResponse } from './api';

/* Enums */
export enum MapVisibility {
  PUBLIC = 'P',
  HIDDEN = 'H',
  INVALID = 'I',
}
export const mapVisibilityEnum = z.enum(MapVisibility);

export enum MapValidity {
  PENDING_UPLOAD = 'pending_upload',
  PENDING_REUPLOAD = 'pending_reupload',
  UPLOADED = 'uploaded',
  VALIDATING = 'validating',
  INVALID = 'invalid',
  VALID = 'valid',
}
export const mapValidityEnum = z.enum(MapValidity);

/* Structs */
export const Difficulty = z.object({
  difficulty: z.number().optional(),
  // Difficulty name is temporarily `optional` while we perform the migration and rescan all rlrr's.
  difficultyName: z.string().optional(),
});
export type Difficulty = z.infer<typeof Difficulty>;

export const MapUserProjection = z.object({
  isFavorited: z.boolean(),
});
export type MapUserProjection = z.infer<typeof MapUserProjection>;

export const PDMap = z.object({
  id: z.string(),
  visibility: mapVisibilityEnum,
  validity: mapValidityEnum,
  submissionDate: z.iso.datetime(),
  title: z.string(),
  artist: z.string(),
  author: z.string().nullish(),
  uploader: z.string(),
  downloadCount: z.number(),
  albumArt: z.string().nullish(),
  // complexity is temporarily `optional` while we perform the migration and rescan all rlrr's.
  complexity: z.number().nullish(),
  difficulties: z.array(Difficulty),
  description: z.string().nullish(),
  favorites: z.number(),
  userProjection: MapUserProjection.optional(),
});
export type PDMap = z.infer<typeof PDMap>;

/* GET getMap */
export const GetMapSuccess = ApiSuccess.extend({
  map: PDMap,
});
export type GetMapSuccess = z.infer<typeof GetMapSuccess>;

export const GetMapResponse = z.discriminatedUnion('success', [GetMapSuccess, ApiError]);
export type GetMapResponse = z.infer<typeof GetMapResponse>;

/* GET deleteMap */
export const DeleteMapSuccess = ApiSuccess.extend({});
export type DeleteMapSuccess = z.infer<typeof DeleteMapSuccess>;

export const DeleteMapResponse = z.discriminatedUnion('success', [DeleteMapSuccess, ApiError]);
export type DeleteMapResponse = z.infer<typeof DeleteMapResponse>;

/* GET findMaps */
export const FindMapsSuccess = ApiSuccess.extend({
  maps: z.array(PDMap),
});
export type FindMapsSuccess = z.infer<typeof FindMapsSuccess>;

export const FindMapsResponse = z.discriminatedUnion('success', [FindMapsSuccess, ApiError]);
export type FindMapsResponse = z.infer<typeof FindMapsResponse>;

/** No serialize/deserialize is provided, as SearchMapsRequest is only intended be used as a GET request via query parameters.  */
export const mapSortableAttributes = [
  'title',
  'artist',
  'author',
  'favorites',
  'submissionDate',
  'downloadCount',
] as const;
export type MapSortableAttributes = (typeof mapSortableAttributes)[number];
export type SearchMapsRequest = {
  query: string;
  offset: number;
  limit: number;
  sort?: MapSortableAttributes;
  sortDirection?: 'asc' | 'desc';
};

// Fields in this advanced search are AND'ed together
export const AdvancedSearchMapRequest = z.intersection(
  PaginatedApiRequest,
  z.object({
    title: z.string().nullish(),
    artist: z.string().nullish(),
    uploader: z.string().nullish(),
    submissionDateStart: z.date().nullish(),
    submissionDateEnd: z.date().nullish(),
  })
);

export const AdvancedSearchMapResponse = z.intersection(
  PaginatedApiResponse,
  z.object({
    success: z.literal(true),
    maps: z.array(PDMap),
  })
);

export type AdvancedSearchMapRequest = z.infer<typeof AdvancedSearchMapRequest>;
export type AdvancedSearchMapsResponse = z.infer<typeof AdvancedSearchMapResponse>;

/* POST submitMap */
export const SubmitMapRequest = z.object({
  title: z.string(),
  id: z.string().optional(),
});
export type SubmitMapRequest = z.infer<typeof SubmitMapRequest>;

export const SubmitMapSuccess = ApiSuccess.extend({
  id: z.string(),
  url: z.string(),
});
export type SubmitMapSuccess = z.infer<typeof SubmitMapSuccess>;

export const SubmitMapError = ApiError.extend({});
export type SubmitMapError = z.infer<typeof SubmitMapError>;

export const SubmitMapResponse = z.discriminatedUnion('success', [
  SubmitMapSuccess,
  SubmitMapError,
]);
export type SubmitMapResponse = z.infer<typeof SubmitMapResponse>;
