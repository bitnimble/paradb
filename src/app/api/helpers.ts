import { ResultError } from 'base/result';
import { NextRequest } from 'next/server';
import { ApiError } from 'schema/api';
import { error } from 'services/helpers';

export function checkBody(req: NextRequest, message: string) {
  if (!req.body) {
    return error({
      statusCode: 400,
      errorSerializer: ApiError.parse,
      errorBody: {},
      message,
    });
  }
}

export function getQueryParams(req: NextRequest) {
  return Object.fromEntries([...req.nextUrl.searchParams.entries()]);
}

export function joinErrors<E extends string>(result: ResultError<E>) {
  return result.errors
    .map((e) => e.userMessage)
    .filter(Boolean)
    .join('\n');
}
