import { z } from 'zod';

export const ApiSuccess = z.object({
  success: z.literal(true),
});

export type ApiSuccess = z.infer<typeof ApiSuccess>;

export const ApiError = z.object({
  success: z.literal(false),
  statusCode: z.number(),
  errorMessage: z.string(),
});

export type ApiError = z.infer<typeof ApiError>;

export const ApiResponse = z.discriminatedUnion('success', [ApiSuccess, ApiError]);
export type ApiResponse = z.infer<typeof ApiResponse>;

export const PaginatedApiRequest = z.object({
  limitPerPage: z.number().nullish(),
  page: z.number().nullish(),
});

export const PaginatedApiResponse = z.object({
  totalCount: z.number(),
  page: z.number(),
});
