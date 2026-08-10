import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.test' });
config();

const sourceUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!sourceUrl)
  throw new Error('DATABASE_URL or TEST_DATABASE_URL is required');

const testUrl = new URL(sourceUrl);
if (!process.env.TEST_DATABASE_URL) testUrl.pathname = '/myapp_test';
const databaseName = testUrl.pathname.replace(/^\//, '');
if (!databaseName.endsWith('_test'))
  throw new Error(
    `Refusing to run integration tests against non-test database "${databaseName}"`,
  );

const maintenanceUrl = new URL(testUrl);
maintenanceUrl.pathname = '/postgres';
maintenanceUrl.searchParams.delete('schema');
const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
await client.connect();
try {
  const exists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName],
  );
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${databaseName}"`);
} finally {
  await client.end();
}

const childEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testUrl.toString(),
  SMTP_HOST: '',
  FIREBASE_SERVICE_ACCOUNT_JSON: '',
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (script: string) => {
  const result = spawnSync(npm, ['run', script], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('prisma:generate');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const migration = spawnSync(npx, ['prisma', 'migrate', 'deploy'], {
  cwd: process.cwd(),
  env: childEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status ?? 1);
run('prisma:seed');
run('test:direct');
