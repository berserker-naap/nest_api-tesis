const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [, , requestedEnvironment, entrypoint, ...args] = process.argv;
const supportedEnvironments = new Set(['development', 'test', 'production']);

if (!supportedEnvironments.has(requestedEnvironment) || !entrypoint) {
  console.error(
    'Usage: node scripts/run-environment.cjs <development|test|production> <entrypoint> [...args]',
  );
  process.exit(1);
}

const environment = {
  ...process.env,
  APP_ENV: requestedEnvironment,
  NODE_ENV: requestedEnvironment,
};

if (requestedEnvironment === 'production') {
  environment.DB_SYNCHRONIZE = 'false';
}

const result = spawnSync(process.execPath, [path.resolve(entrypoint), ...args], {
  env: environment,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
