// @ts-expect-error - camelcase-keys-recursive types are incorrect
import _camelcaseKeys from 'camelcase-keys-recursive';
import _snakecaseKeys from 'snakecase-keys';
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

type UpperCaseCharacters =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';
type SnakeCaseKey<T extends PropertyKey> = T extends string
  ? string extends T
    ? string
    : T extends `${infer P}${UpperCaseCharacters}${infer R}`
    ? T extends `${P}${infer F}${R}`
      ? F extends UpperCaseCharacters
        ? T extends `${infer P}${F}${infer R}`
          ? `${SnakeCaseKey<P>}_${Uncapitalize<F>}${SnakeCaseKey<R>}`
          : never
        : never
      : never
    : T
  : never;

export type SnakeCase<T> = {
  [K in keyof T as SnakeCaseKey<K>]: T[K] extends NonArrayObject
    ? SnakeCase<T[K]>
    : T[K] extends (infer V)[]
    ? SnakeCase<V>[]
    : T[K];
};

export function snakeCaseKeys<T extends readonly any[] | Record<string, unknown>>(
  data: T,
): SnakeCase<T> {
  return _snakecaseKeys(data) as unknown as SnakeCase<T>;
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
