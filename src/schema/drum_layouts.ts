import { z } from 'zod';
import { ApiError, ApiSuccess } from './api';
import { MapValidity, MapVisibility } from './maps';

export { MapValidity, MapVisibility };

/* Layout Format Schema */
export const DrumLayoutFormat = z.object({
  drumCounts: z.record(z.string(), z.number()),
});
export type DrumLayoutFormat = z.infer<typeof DrumLayoutFormat>;

/* Structs */
export const DrumLayout = z.object({
  id: z.string(),
  visibility: z.nativeEnum(MapVisibility),
  validity: z.nativeEnum(MapValidity),
  submissionDate: z.coerce.date(),
  name: z.string(),
  description: z.string().nullish(),
  uploader: z.string(),
  imagePath: z.string().nullish(),
  layoutFormat: DrumLayoutFormat,
  downloadCount: z.number(),
});
export type DrumLayout = z.infer<typeof DrumLayout>;

/* GET getDrumLayout */
export const GetDrumLayoutSuccess = ApiSuccess.extend({
  drumLayout: DrumLayout,
});
export type GetDrumLayoutSuccess = z.infer<typeof GetDrumLayoutSuccess>;

export const GetDrumLayoutResponse = z.discriminatedUnion('success', [
  GetDrumLayoutSuccess,
  ApiError,
]);
export type GetDrumLayoutResponse = z.infer<typeof GetDrumLayoutResponse>;

/* GET findDrumLayouts */
export const FindDrumLayoutsSuccess = ApiSuccess.extend({
  drumLayouts: z.array(DrumLayout),
});
export type FindDrumLayoutsSuccess = z.infer<typeof FindDrumLayoutsSuccess>;

export const FindDrumLayoutsResponse = z.discriminatedUnion('success', [
  FindDrumLayoutsSuccess,
  ApiError,
]);
export type FindDrumLayoutsResponse = z.infer<typeof FindDrumLayoutsResponse>;

/* POST submitDrumLayout */
export const SubmitDrumLayoutRequest = z.object({
  name: z.string(),
  id: z.string().optional(),
});
export type SubmitDrumLayoutRequest = z.infer<typeof SubmitDrumLayoutRequest>;

export const SubmitDrumLayoutSuccess = ApiSuccess.extend({
  id: z.string(),
  url: z.string(),
});
export type SubmitDrumLayoutSuccess = z.infer<typeof SubmitDrumLayoutSuccess>;

export const SubmitDrumLayoutError = ApiError.extend({});
export type SubmitDrumLayoutError = z.infer<typeof SubmitDrumLayoutError>;

export const SubmitDrumLayoutResponse = z.discriminatedUnion('success', [
  SubmitDrumLayoutSuccess,
  SubmitDrumLayoutError,
]);
export type SubmitDrumLayoutResponse = z.infer<typeof SubmitDrumLayoutResponse>;

/* DELETE deleteDrumLayout */
export const DeleteDrumLayoutSuccess = ApiSuccess.extend({});
export type DeleteDrumLayoutSuccess = z.infer<typeof DeleteDrumLayoutSuccess>;

export const DeleteDrumLayoutResponse = z.discriminatedUnion('success', [
  DeleteDrumLayoutSuccess,
  ApiError,
]);
export type DeleteDrumLayoutResponse = z.infer<typeof DeleteDrumLayoutResponse>;
