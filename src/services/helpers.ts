import * as Sentry from '@sentry/nextjs';
import { getQueryParams } from 'app/api/helpers';
import { ResultError } from 'base/result';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from 'schema/api';
import { getLog } from './logging/server_logger';

const log = getLog(['api']);

export function error<P, T extends ApiError & P, E extends string>(opts: {
  statusCode: number;
  errorBody: P;
  message: string;
  resultError?: ResultError<E>;
  errorSerializer: (value: unknown) => unknown;
}): NextResponse {
  const { errorBody, statusCode, message, resultError, errorSerializer } = opts;

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
  }
  Sentry.captureException(error);
  if (statusCode > 499) {
    log.error('Server error: ' + message, {
      error,
      details,
    });
  }

  const errorResponse = { success: false, statusCode, errorMessage: message, ...errorBody } as T;
  return NextResponse.json(errorSerializer(errorResponse), {
    status: statusCode,
  });
}

export function actionError<P, E extends string>(opts: {
  errorBody: P;
  message: string;
  resultError?: ResultError<E>;
  shouldLog?: boolean;
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
  }
  Sentry.captureException(error);
  if (opts.shouldLog) {
    log.error('Server error: ' + message, {
      error,
      details,
    });
  }

  return { success: false, errorMessage: message, ...errorBody } as const;
}

export function badRequest(message: string) {
  return error({
    statusCode: 400,
    message,
    errorBody: {},
    errorSerializer: ApiError.parse,
  });
}

export function getOffsetLimit(req: NextRequest) {
  const { offset, limit } = getQueryParams(req);
  return { offset: Number(offset) || 0, limit: Number(limit) || 20 };
}
