// Loaded as a `bun test` preload (see bunfig.toml). This project's tests run under Jest, not Bun's
// built-in test runner, so intercept `bun test` and point at the real scripts before any tests run.
console.error("`bun test` runs Bun's built-in test runner, which this project does not use.");
console.error('Did you mean `bun run test:unit` or `bun run test:integration`?');
process.exit(1);
