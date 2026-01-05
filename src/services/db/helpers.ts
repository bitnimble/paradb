// @ts-expect-error - camelcase-keys-recursive does not provide types
import _camelcaseKeys from 'camelcase-keys-recursive';
import { ByteArrayString, toBuffer } from 'zapatos/db';

export type NullToUndefined<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends null
        ? NonNullable<NullToUndefined<T[K]>> | undefined
        : NullToUndefined<T[K]>;
    }
  : T extends null
    ? NonNullable<T> | undefined
    : T;

type CamelCaseKey<T extends PropertyKey> = T extends string
  ? string extends T
    ? string
    : T extends `${infer F}_${infer R}`
      ? `${F}${Capitalize<CamelCaseKey<R>>}`
      : T
  : T;

interface NonArrayObject {
  [key: string]: string | number | boolean | NonArrayObject | NonArrayObject[];
}
export type CamelCase<T> = {
  [K in keyof T as CamelCaseKey<K>]: T[K] extends NonArrayObject
    ? CamelCase<T[K]>
    : T[K] extends (infer V)[]
      ? CamelCase<V>[]
      : T[K];
};

export function camelCaseKeys<T>(data: T): NullToUndefined<CamelCase<T>> {
  return _camelcaseKeys(data) as unknown as NullToUndefined<CamelCase<T>>;
}

export function toBytea(s: string): ByteArrayString {
  return `\\x${Buffer.from(s).toString('hex')}`;
}

export function fromBytea(ba: ByteArrayString): string {
  return toBuffer(ba).toString('utf8');
}

export const enum DbError {
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}
