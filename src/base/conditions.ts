export function checkIsString(t: any, propName: string): string {
  if (typeof t !== 'string') {
    throw new Error(`Expected ${propName} to be a string but found ${typeof t}`);
  }
  return t;
}
