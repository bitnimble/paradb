export type ResultSuccess<T> = { success: true, value: T };
export type ResultError<E extends string> = {
  success: false,
  errors: {
    type: E,
    /**
     * An error message to be displayed to the user.
     */
    userMessage?: string,
    internalMessage?: string,
    stack?: string,
  }[],
};
export function wrapError<E extends string, _Error extends ResultError<E>>(
  e: unknown,
  type: E,
  userMessage?: string,
) {
  return {
    type,
    userMessage,
    internalMessage: (e as Error).message,
    stack: (new Error().stack || '') + ((e as Error).stack || ''),
  };
}
export type Result<T, E extends string> = ResultSuccess<T> | ResultError<E>;

export type PromisedResult<T, E extends string> = Promise<Result<T, E>>;

/**
 * Unsafe -- exported for tests only
 */
export async function _unwrap<T, E extends string>(r: PromisedResult<T, E>) {
  const _r = await r;
  if (!_r.success) {
    throw new Error('Attempted to unwrap a PromisedResult but it was not successful');
  }
  return _r.value;
}
