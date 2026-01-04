export class UnreachableError extends Error {
  constructor(_arg: never) {
    super();
  }
}
