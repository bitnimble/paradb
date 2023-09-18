import { error } from 'services/helpers';
import { ResultError } from 'base/result';
import { NextRequest } from 'next/server';
import { serializeApiError } from 'schema/api';

export async function getBody<T>(req: NextRequest, deserializer: (u8: Uint8Array) => T) {
  const arrayBuffer = await req.arrayBuffer();
  const u8 = new Uint8Array(arrayBuffer);
  return deserializer(u8);
}

export function checkBody(req: NextRequest, message: string) {
  if (!req.body) {
    return error({
      statusCode: 400,
      errorSerializer: serializeApiError,
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
