import * as msgpackr from 'msgpackr';

export interface Type<T> {
  /**
   * Serializes an input value and returns a Uint8Array to be sent over-the-wire. For record-like
   * types, this will strip any additional unspecified properties before serializing it.
   * @param t the value to be serialized
   * @returns a Uint8Array buffer representing a serialized form of the input value
   */
  serialize(t: T): Uint8Array;
  /**
   * Attempts to deserialize an input Uint8Array back to the original type, and then validates that
   * it conforms to the constraints originally provided to the builder function. For record-like
   * types, this will strip any additional unspecified properties that happened to be present in the
   * deserialized value before returning it to the caller.
   * @param u a Uint8Array buffer
   */
  deserialize(u: Uint8Array): T;
  /**
   * Validates that the input conforms to the constraints originally provided to the builder
   * function. This does not attempt to transform or deserialize the input value before validating,
   * so it must be of the correct type first.
   * For primitives, this will return the input value.
   * For record-like types, this will return a deep copy that has any additional unspecified
   * properties stripped.
   * @param u
   */
  validate(u: unknown): T;
}

/**
 * From T, pick a set of properties whose values are assignable to U
 */
type PickValues<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? K : never }[keyof T]>;
type OmitValues<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? never : K }[keyof T]>;
type PickOptionals<Schema extends Record<string, Type<any>>> = PickValues<
  Schema,
  { optional: true }
>;
type OmitOptionals<Schema extends Record<string, Type<any>>> = OmitValues<
  Schema,
  { optional: true }
>;
type ReifyType<T extends Type<any>> = ReturnType<T['validate']>;

export type Reify<Schema> = Schema extends Record<string, Type<any>>
  ? { [K in keyof PickOptionals<Schema>]?: ReifyType<PickOptionals<Schema>[K]> } & {
      [K in keyof OmitOptionals<Schema>]: ReifyType<OmitOptionals<Schema>[K]>;
    }
  : Schema extends Type<infer T>
  ? T extends (infer I)[]
    ? I[]
    : T
  : Schema extends (t: infer T) => Uint8Array
  ? T
  : Schema extends (u: Uint8Array) => infer T
  ? T
  : never;

class InvalidTypeError extends Error {
  constructor(name: string, expectedType: string, value: any) {
    super(
      `Expected ${name} to be ${expectedType} but found type ${typeof value} instead, with value ${JSON.stringify(
        value
      )}`
    );
  }
}

abstract class TypeImpl<T> implements Type<T> {
  constructor(readonly name: string) {}

  readonly serialize = (t: T) => {
    const validated = this.validate(t);
    return msgpackr.pack(validated);
  };

  readonly deserialize = (u: Uint8Array) => {
    const unpacked = msgpackr.unpack(u);
    const validated = this.validate(unpacked);
    return validated;
  };

  abstract validate(u: unknown): T;
}

export const bool = <T extends boolean>(name: string, literalValue?: T): Type<T> =>
  new BoolType<T>(name, literalValue);
class BoolType<T extends boolean> extends TypeImpl<T> {
  constructor(
    name: string,
    private readonly literalValue?: T
  ) {
    super(name);
  }

  readonly validate = (b: unknown) => {
    if (typeof b !== 'boolean') {
      throw new InvalidTypeError(this.name, 'boolean', b);
    }
    if (this.literalValue != null && b !== this.literalValue) {
      throw new InvalidTypeError(this.name, this.literalValue.toString(), b);
    }
    return b as T;
  };
}

export const str = <T extends string>(name: string, ...literalValues: T[]): Type<T> =>
  new StringType(name, literalValues);
class StringType<T extends string> extends TypeImpl<T> {
  constructor(
    name: string,
    private readonly literalValues: T[]
  ) {
    super(name);
  }

  readonly validate = (s: unknown) => {
    if (typeof s !== 'string') {
      throw new InvalidTypeError(this.name, 'string', s);
    }
    if (this.literalValues.length > 0) {
      if (!this.literalValues.includes(s as any)) {
        throw new Error(
          `Expected ${this.name} to be one of values [${this.literalValues
            .map((s) => `"${s}"`)
            .join(', ')}] but found "${s}" instead`
        );
      }
    }
    return s as T;
  };
}

export const num = <T extends number>(name: string, ...literalValues: T[]): Type<T> =>
  new NumberType(name, literalValues);
class NumberType<T extends number> extends TypeImpl<T> {
  constructor(
    name: string,
    private readonly literalValues: T[]
  ) {
    super(name);
  }

  readonly validate = (n: unknown) => {
    if (typeof n !== 'number') {
      throw new InvalidTypeError(this.name, 'number', n);
    }
    if (this.literalValues.length > 0) {
      if (!this.literalValues.includes(n as any)) {
        throw new Error(
          `Expected ${this.name} to be one of values [${this.literalValues.join(
            ', '
          )}] but found ${n} instead`
        );
      }
    }
    return n as T;
  };
}

export const u8array = (name: string): Type<Uint8Array> => new Uint8ArrayType(name);
class Uint8ArrayType extends TypeImpl<Uint8Array> {
  readonly validate = (u: unknown) => {
    if (!(u instanceof Uint8Array)) {
      throw new InvalidTypeError(this.name, 'u8array', u);
    }
    return u;
  };
}

// Nullable types will have the same `Type` as an optional type (i.e. `T | undefined | null`), so we add an additional
// meta-property `optional` to discriminate against it during `Reify`.
export const optional = <S extends Type<any>>(
  base: S
): Type<Reify<S> | undefined> & { optional: true } => new OptionalType<S>(base);
class OptionalType<T extends Type<any>> extends TypeImpl<Reify<T> | undefined> {
  readonly optional = true;

  constructor(private readonly base: T) {
    // TODO: wire parent name down into optionals
    super('');
  }

  readonly validate = (u: unknown): Reify<T> | undefined => {
    if (u != null) {
      return this.base.validate(u);
    }
    return undefined;
  };
}

// Helper type to encapsulate `record`, `extend` and `union`.
type Recordish = _Recordish<Record<string, Type<unknown>>>;
type _Recordish<S> = TypeImpl<S> & {
  schema: S;
  hasKey(key: string): boolean;
  validate(u: unknown, ignoredKeys?: string[]): Reify<S>;
  validateProperty(key: keyof S, value: S[keyof S]): S[keyof S];
};
type RecordSchema = Record<string, Type<unknown>>;

export const rec = <S extends RecordSchema>(name: string, schema: S): Type<Reify<S>> =>
  new RecordType<S>(name, schema);
class RecordType<S extends RecordSchema> extends TypeImpl<Reify<S>> {
  constructor(
    name: string,
    readonly schema: S
  ) {
    super(name);
  }

  hasKey = (key: string) => {
    return Object.keys(this.schema).includes(key);
  };

  readonly validate = (u: unknown, ignoredKeys?: string[]): Reify<S> => {
    if (typeof u !== 'object') {
      throw new InvalidTypeError(this.name, 'object', u);
    }
    const ignoredKeySet = new Set(ignoredKeys);
    let result: Partial<Reify<S>> = {};
    // Test all property constraints
    for (const [key, validator] of Object.entries(this.schema)) {
      if (ignoredKeySet.has(key)) {
        continue;
      }
      const propValue = (u as any)[key];
      const validatedValue = validator.validate(propValue);
      result[key as keyof Reify<S>] = validatedValue as any;
    }
    return result as Reify<S>;
  };

  readonly validateProperty = <SK extends keyof S>(key: SK, value: S[SK]) => {
    return this.schema[key].validate(value);
  };
}

export const extend = <S extends RecordSchema, B extends Type<Reify<RecordSchema>>>(
  name: string,
  base: B,
  schema: S
): Type<Omit<Reify<B>, keyof Reify<S>> & Reify<S>> =>
  new ExtendsType<S, B>(name, base as unknown as Recordish, schema);
class ExtendsType<S extends RecordSchema, B extends Type<Reify<RecordSchema>>> extends TypeImpl<
  Omit<Reify<B>, keyof Reify<S>> & Reify<S>
> {
  private subtype: RecordType<S>;

  constructor(
    name: string,
    private readonly baseType: Recordish,
    readonly schema: S
  ) {
    super(name);
    this.subtype = new RecordType(name, schema);
  }

  hasKey = (key: string) => {
    return Object.keys(this.schema).includes(key) || this.baseType.hasKey(key);
  };

  readonly validate = (u: unknown): Omit<Reify<B>, keyof Reify<S>> & Reify<S> => {
    const ignoredKeys = Object.keys(this.schema);
    const baseResult = this.baseType.validate(u, ignoredKeys);
    const schemaResult = this.subtype.validate(u);
    return { ...(baseResult as Reify<B>), ...schemaResult };
  };

  readonly validateProperty = <SK extends keyof S>(key: SK, value: S[SK]) => {
    return this.schema[key].validate(value);
  };
}

export const union = <D extends string, B extends Type<Record<string & D, any>>, S extends B[]>(
  name: string,
  discriminator: D,
  schemas: S
): Type<Reify<S[0]>> => new UnionRecordType(name, discriminator, schemas as any);

class UnionRecordType<
  D extends string,
  B extends Type<Record<string & D, any>>,
  S extends B[],
> extends TypeImpl<Reify<S[0]>> {
  constructor(
    name: string,
    private readonly discriminator: D,
    private readonly schemas: Recordish[]
  ) {
    super(name);
    for (const subschema of schemas) {
      if (!subschema.hasKey(discriminator)) {
        throw new Error(
          `Subschema "${subschema.name}" of union type "${name}" is missing discriminator property "${discriminator}"`
        );
      }
    }
  }

  hasKey = (key: string) => {
    return this.schemas.every((s) => s.hasKey(key));
  };

  readonly validate = (u: unknown) => {
    const schema = this.schemas.find((s) => {
      const ignoredKeys = Object.keys(s.schema);
      ignoredKeys.splice(ignoredKeys.indexOf(this.discriminator), 1);
      try {
        s.validate(u, ignoredKeys);
        return true;
      } catch (e) {
        return false;
      }
    });
    if (!schema) {
      throw new InvalidTypeError(this.name, 'union', u);
    }
    const validated = schema.validate(u);
    return validated as Reify<S[0]>;
  };

  readonly validateProperty = <SK extends keyof Reify<S[0]>>(key: SK, value: Reify<S[0]>[SK]) => {
    // Test against all schemas, and return the last one
    let result;
    for (const subschema of this.schemas) {
      result = subschema.validateProperty(key as unknown as string & D, value);
    }
    return result;
  };
}

export const list = <S extends Type<unknown>>(name: string, itemSchema: S): Type<Reify<S>[]> =>
  new ListType(name, itemSchema);
class ListType<I extends Type<unknown>> extends TypeImpl<Reify<I>[]> {
  constructor(
    name: string,
    private readonly itemSchema: I
  ) {
    super(name);
  }

  readonly validate = (u: unknown) => {
    if (!Array.isArray(u)) {
      throw new InvalidTypeError(this.name, 'array', u);
    }
    const result: Reify<I>[] = [];
    for (const i of u) {
      result.push(this.itemSchema.validate(i) as Reify<I>);
    }
    return result;
  };
}
