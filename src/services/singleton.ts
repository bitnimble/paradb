export function getSingleton<T>(name: string, factory: () => T): T {
  // Assigning to globalThis should be synchronous, so that another request doesn't attempt
  // to recreate the singleton at the same time during the await.
  if (!(globalThis as any)[name]) {
    (globalThis as any)[name] = factory();
  }
  return (globalThis as any)[name];
}
