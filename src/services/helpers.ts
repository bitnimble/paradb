import { getQueryParams } from 'app/api/helpers';
import { ResultError } from 'base/result';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, serializeApiError } from 'schema/api';

export function error<P, T extends ApiError & P, E extends string>(opts: {
  statusCode: number;
  errorSerializer(o: T): Uint8Array;
  errorBody: P;
  message: string;
  resultError?: ResultError<E>;
}): NextResponse<Buffer> {
  const { errorSerializer, errorBody, statusCode, message, resultError } = opts;

  const errorResponse = { success: false, statusCode, errorMessage: message, ...errorBody } as T;

  // Attach error message and tags for Sentry. Just pick the details out of the first error for now.
  const internalMessage = resultError?.errors[0].internalMessage;
  const stack = resultError?.errors[0].stack;
  const internalTags = resultError ? { type: resultError.errors[0].type } : undefined;

  const error = new Error(internalMessage || message);
  if (stack) {
    error.stack = stack;
  }

  // TODO: fix sentry tagging
  const res: NextResponse<Buffer> = new NextResponse(Buffer.from(errorSerializer(errorResponse)), {
    status: statusCode,
  });
  (res as any).paradbError = error;
  (res as any).paradbErrorTags = internalTags;

  return res;
}

export function badRequest(message: string) {
  return error({
    statusCode: 400,
    errorSerializer: serializeApiError,
    message,
    errorBody: {},
  });
}

export function getOffsetLimit(req: NextRequest) {
  const { offset, limit } = getQueryParams(req);
  return { offset: Number(offset) || 0, limit: Number(limit) || 20 };
}
