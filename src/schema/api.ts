import { bool, num, rec, Reify, str, union } from './builder';

export type ApiSuccess = Reify<typeof apiSuccess>;
export const apiSuccess = rec('apiSuccess', {
  success: bool('success', true),
});
export const { serialize: serializeApiSuccess, deserialize: deserializeApiSuccess } = apiSuccess;

export type ApiError = Reify<typeof serializeApiError>;
export const apiError = rec('apiError', {
  success: bool('success', false),
  statusCode: num('statusCode'),
  errorMessage: str('errorMessage'),
});
export const { serialize: serializeApiError, deserialize: deserializeApiError } = apiError;

export type ApiResponse = Reify<typeof apiResponse>;
export const apiResponse = union('apiResponse', 'success', [apiSuccess, apiError]);
