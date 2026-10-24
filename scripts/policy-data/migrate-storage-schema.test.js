const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const script = path.join(__dirname, 'migrate-storage-schema.js');
const { ensureBuckets, ensurePolicies } = require('./migrate-storage-schema');

function dumpBuckets(sourceBuckets) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kervox-storage-test-'));
  const bucketFile = path.join(dir, 'buckets.json');
  const sourceFile = path.join(dir, 'source.json');

  try {
    if (sourceBuckets) fs.writeFileSync(sourceFile, JSON.stringify(sourceBuckets));

    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8',
      env: {
        ...process.env,
        STORAGE_MIGRATION_PHASE: 'dump',
        ALLOW_STORAGE_SCHEMA_FALLBACK: 'true',
        SOURCE_DB_URL: '',
        SOURCE_SCHEMA_SQL: '',
        SOURCE_BUCKETS_JSON: sourceBuckets ? sourceFile : '',
        STORAGE_BUCKETS: 'applications,call-recordings,public-assets',
        STORAGE_MIGRATION_OUT_DIR: dir,
        STORAGE_SCHEMA_OUT: path.join(dir, 'schema.sql'),
        STORAGE_BUCKETS_OUT: bucketFile,
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(fs.readFileSync(bucketFile, 'utf8'));
  } finally {
    const tempRoot = path.resolve(os.tmpdir());
    assert.ok(path.resolve(dir).startsWith(`${tempRoot}${path.sep}`));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('defaults sensitive Storage buckets to private', () => {
  const buckets = dumpBuckets();
  assert.equal(buckets.find((bucket) => bucket.id === 'applications').public, false);
  assert.equal(buckets.find((bucket) => bucket.id === 'call-recordings').public, false);
  assert.equal(buckets.find((bucket) => bucket.id === 'public-assets').public, true);
});

test('does not copy public source flags for sensitive Storage buckets', () => {
  const buckets = dumpBuckets([
    { id: 'applications', name: 'applications', public: true },
    { id: 'call-recordings', name: 'call-recordings', public: true },
    { id: 'public-assets', name: 'public-assets', public: true },
  ]);

  assert.equal(buckets.find((bucket) => bucket.id === 'applications').public, false);
  assert.equal(buckets.find((bucket) => bucket.id === 'call-recordings').public, false);
  assert.equal(buckets.find((bucket) => bucket.id === 'public-assets').public, true);
});

test('apply phase never grants public object access to sensitive buckets', async () => {
  const statements = [];
  const client = {
    query: async (sql, values) => {
      statements.push({ sql, values });
      return { rows: [], rowCount: 0 };
    },
  };

  const buckets = await ensureBuckets(client, [
    { id: 'applications', name: 'applications', public: true },
    { id: 'call-recordings', name: 'call-recordings', public: true },
  ]);
  await ensurePolicies(client, buckets);

  assert.deepEqual(buckets.map((bucket) => bucket.public), [false, false]);
  assert.equal(statements.filter(({ sql }) => sql.includes('insert into storage.buckets')).length, 2);
  assert.ok(statements.filter(({ sql }) => sql.includes('insert into storage.buckets')).every(({ values }) => values[2] === false));
  assert.ok(statements.every(({ sql }) => !sql.includes('create policy "Allow public')));
  assert.equal(statements.filter(({ sql }) => sql.includes('drop policy if exists')).length, 13);
  assert.ok(statements.some(({ sql }) => sql.includes("where id in ('applications', 'call-recordings')")));
  assert.ok(statements.some(({ sql }) => sql.includes('as restrictive') && sql.includes('to anon, authenticated')));
});

test('partial source bucket lists still privatize existing target upload buckets', async () => {
  const statements = [];
  const client = {
    query: async (sql, values) => {
      statements.push({ sql, values });
      return { rows: [], rowCount: 0 };
    },
  };

  await ensureBuckets(client, [{ id: 'public-assets', name: 'public-assets', public: true }]);

  assert.ok(statements.some(({ sql }) =>
    sql.includes('update storage.buckets') &&
    sql.includes("where id in ('applications', 'call-recordings')")));
});
