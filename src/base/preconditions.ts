export function checkIs<T extends { type: string }>(
  obj: any,
  ...args: T['type'][]
): asserts obj is T {
  if (args.some((val) => val === obj.type)) {
    return;
  }
  throw new Error('Expected obj to be equal to something, but it was not');
}

export function checkExists<T>(obj: T, property?: string): NonNullable<T> {
  if (obj == null) {
    throw new Error(`Expected ${property || 'property'} to be defined, but found undefined`);
  }
  return obj as NonNullable<T>;
}

export function checkState(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true, but was false');
  }
}
