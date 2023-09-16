export class UnreachableError extends Error {
  constructor(arg: never) {
    super();
  }
}
