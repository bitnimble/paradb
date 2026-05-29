// Setup for pure unit tests. Must NOT import server_context/env/db — unit tests run with no
// external dependencies. Keep this to lightweight test-environment tweaks only.
global.console.info = jest.fn();
