import * as Sentry from '@sentry/nextjs';
import { getQueryParams } from 'app/api/helpers';
import { ResultError } from 'base/result';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, serializeApiError } from 'schema/api';

export function error<P, T extends ApiError & P, E extends string>(opts: {
  statusCode: number;
  errorSerializer(o: T): string;
  errorBody: P;
  message: string;
  resultError?: ResultError<E>;
}): NextResponse<Buffer> {
  const { errorSerializer, errorBody, statusCode, message, resultError } = opts;

  // Attach error message and tags for Sentry. Just pick the details out of the first error for now.
  const details = resultError?.errors[0];
  const internalMessage = details?.internalMessage;
  const error = new Error(
    internalMessage ? `Internal message: ${internalMessage}\n${message}` : message
  );
  if (details?.stack) {
    error.stack = details.stack;
  }
  if (details) {
    Sentry.setTag('type', details.type);
    console.error(details.type);
  }
  Sentry.captureException(error);
  console.error(error);

  const errorResponse = { success: false, statusCode, errorMessage: message, ...errorBody } as T;
  return new NextResponse(errorSerializer(errorResponse), {
    status: statusCode,
  });
}

export function actionError<P, E extends string>(opts: {
  errorBody: P;
  message: string;
  resultError?: ResultError<E>;
}) {
  const { errorBody, message, resultError } = opts;

  // Attach error message and tags for Sentry. Just pick the details out of the first error for now.
  const details = resultError?.errors[0];
  const internalMessage = details?.internalMessage;
  const error = new Error(
    internalMessage ? `Internal message: ${internalMessage}\n${message}` : message
  );
  if (details?.stack) {
    error.stack = details.stack;
  }
  if (details) {
    Sentry.setTag('type', details.type);
    console.error(details.type);
  }
  Sentry.captureException(error);
  console.error(error);

  return { success: false, errorMessage: message, ...errorBody } as const;
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
