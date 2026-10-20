/**
 * Migrate Supabase storage schema from a source database to a target database.
 *
 * Usage:
 *   SOURCE_DB_URL="postgresql://..." TARGET_DB_URL="postgresql://..." node scripts/policy-data/migrate-storage-schema.js
 *
 * Optional:
 *   STORAGE_MIGRATION_PHASE=dump|apply|both
 *   STORAGE_BUCKETS=call-recordings,applications
 *   SOURCE_SCHEMA_SQL=/path/to/storage-schema.sql
 *   SOURCE_BUCKETS_JSON=/path/to/storage-buckets.json
 *   STORAGE_SCHEMA_OUT=/path/to/storage-schema.generated.sql
 *   STORAGE_BUCKETS_OUT=/path/to/storage-buckets.generated.json
 *   ALLOW_STORAGE_SCHEMA_FALLBACK=true
 *   TARGET_EXEC_MODE=direct|compose|ssh-compose
 *   TARGET_COMPOSE_WORKDIR=/opt/supabase-project
 *   TARGET_COMPOSE_FILES=/opt/supabase-project/docker-compose.yml,/opt/supabase-project/docker-compose.pg17.yml
 *   TARGET_COMPOSE_SERVICE=db
 *   TARGET_SSH_HOST=169.255.58.175
 *   TARGET_SSH_USER=day1admin
 *   TARGET_SSH_PORT=22
 *   TARGET_SSH_KEY=C:\\Users\\you\\.ssh\\id_ed25519
 *   TARGET_REMOTE_SUDO_PASSWORD=your-server-sudo-password
 *
 * Behavior:
 * - Prefer an exact source schema dump via pg_dump when SOURCE_DB_URL is set and pg_dump is available.
 * - Sanitize Supabase-specific role ownership lines so the SQL can be replayed on self-hosted targets.
 * - Fall back to a bundled storage schema only when explicitly allowed.
 * - Recreate buckets on the target and add permissive policies for the configured buckets.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const SOURCE_DB_URL = process.env.SOURCE_DB_URL || process.env.SOURCE_DATABASE_URL;
const TARGET_DB_URL = process.env.TARGET_DB_URL || process.env.DATABASE_URL;
const SOURCE_SCHEMA_SQL = process.env.SOURCE_SCHEMA_SQL;
const SOURCE_BUCKETS_JSON = process.env.SOURCE_BUCKETS_JSON;
const ALLOW_STORAGE_SCHEMA_FALLBACK = String(process.env.ALLOW_STORAGE_SCHEMA_FALLBACK || '').toLowerCase() === 'true';
const STORAGE_MIGRATION_PHASE = (process.env.STORAGE_MIGRATION_PHASE || 'both').toLowerCase();
const TARGET_EXEC_MODE = (process.env.TARGET_EXEC_MODE || 'direct').toLowerCase();
const TARGET_COMPOSE_WORKDIR = process.env.TARGET_COMPOSE_WORKDIR || process.cwd();
const TARGET_COMPOSE_FILES = (process.env.TARGET_COMPOSE_FILES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const TARGET_COMPOSE_SERVICE = process.env.TARGET_COMPOSE_SERVICE || 'db';
const TARGET_SSH_HOST = process.env.TARGET_SSH_HOST;
const TARGET_SSH_USER = process.env.TARGET_SSH_USER || 'day1admin';
const TARGET_SSH_PORT = process.env.TARGET_SSH_PORT || '22';
const TARGET_SSH_KEY = process.env.TARGET_SSH_KEY;
const TARGET_SSH_BIN = process.env.TARGET_SSH_BIN || (process.platform === 'win32'
  ? 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
  : 'ssh');
const TARGET_REMOTE_SUDO_PASSWORD = process.env.TARGET_REMOTE_SUDO_PASSWORD;
const STORAGE_BUCKETS = (process.env.STORAGE_BUCKETS || 'call-recordings,applications')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const OUT_DIR = process.env.STORAGE_MIGRATION_OUT_DIR || path.join(__dirname, '../../tmp');
const STORAGE_SCHEMA_OUT = process.env.STORAGE_SCHEMA_OUT || path.join(OUT_DIR, 'storage-schema.generated.sql');
const STORAGE_BUCKETS_OUT = process.env.STORAGE_BUCKETS_OUT || path.join(OUT_DIR, 'storage-buckets.generated.json');

const FALLBACK_STORAGE_SQL = String.raw`
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.migrations (
  id integer PRIMARY KEY,
  name varchar(100) UNIQUE NOT NULL,
  hash varchar(40) NOT NULL,
  executed_at timestamp DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text NOT NULL,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id uuid,
  type text,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets USING BTREE (name);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  version text,
  owner_id uuid,
  user_metadata jsonb,
  CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id),
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects USING BTREE (bucket_id, name);
CREATE INDEX IF NOT EXISTS name_prefix_search ON storage.objects(name text_pattern_ops);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts,1)-1];
END
$function$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts,1)];
END
$function$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
_filename text;
BEGIN
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts,1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
END
$function$;

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits int DEFAULT 100, levels int DEFAULT 1, offsets int DEFAULT 0)
 RETURNS TABLE (
    name text,
    id uuid,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    metadata jsonb
  )
 LANGUAGE plpgsql
AS $function$
BEGIN
  return query
    with files_folders as (
      select ((string_to_array(objects.name, '/'))[levels]) as folder
      from objects
      where objects.name ilike prefix || '%'
      and bucket_id = bucketname
      GROUP by folder
      limit limits
      offset offsets
    )
    select files_folders.folder as name, objects.id, objects.updated_at, objects.created_at, objects.last_accessed_at, objects.metadata from files_folders
    left join objects
    on prefix || files_folders.folder = objects.name and objects.bucket_id = bucketname;
END
$function$;
`;

let cachedSourceSchemaSql = null;
let cachedSourceBuckets = null;

function fail(message) {
  throw new Error(message);
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function formatSql(text, values = []) {
  let sql = text;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const placeholder = new RegExp(`\\$${i + 1}(?!\\d)`, 'g');
    sql = sql.replace(placeholder, sqlLiteral(values[i]));
  }
  return sql;
}

function makeClient(url) {
  const hostname = new URL(url).hostname;
  const useSsl = hostname.endsWith('.supabase.co') || hostname.includes('pooler.supabase.com');
  return new Client({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function normalizeSql(sql) {
  return sql
    .replace(/^SET transaction_timeout = 0;\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

async function createTargetRunner() {
  if (TARGET_EXEC_MODE === 'direct') {
    if (!TARGET_DB_URL) {
      fail('Missing TARGET_DB_URL or DATABASE_URL');
    }

    const client = makeClient(TARGET_DB_URL);
    await client.connect();

    return {
      async query(text, values = []) {
        return client.query(text, values);
      },
      async end() {
        await client.end();
      },
      mode: 'direct',
    };
  }

  if (TARGET_EXEC_MODE === 'compose') {
    if (!TARGET_COMPOSE_FILES.length) {
      fail('Missing TARGET_COMPOSE_FILES for compose mode');
    }

    const composeArgs = ['compose'];
    for (const file of TARGET_COMPOSE_FILES) {
      composeArgs.push('-f', file);
    }
    composeArgs.push(
      'exec',
      '-T',
      TARGET_COMPOSE_SERVICE,
      'psql',
      '-X',
      '-qAt',
      '-F',
      '\t',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres'
    );

    return {
      async query(text, values = []) {
        const sql = formatSql(text, values);
        const result = spawnSync('docker', composeArgs, {
          input: sql,
          encoding: 'utf8',
          cwd: TARGET_COMPOSE_WORKDIR,
          maxBuffer: 50 * 1024 * 1024,
        });

        if (result.error) {
          throw result.error;
        }
        if (result.status !== 0) {
          throw new Error((result.stderr || result.stdout || 'compose psql failed').trim());
        }

        const stdout = (result.stdout || '').trim();
        if (!stdout) {
          return { rows: [], rowCount: 0 };
        }

        const rows = stdout
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => {
            const values = line.split('\t');
            if (values.length === 1) {
              return { value: values[0] };
            }

            const row = {};
            values.forEach((value, index) => {
              row[`column_${index + 1}`] = value;
            });
            return row;
          });

        return { rows, rowCount: rows.length };
      },
      async end() {},
      mode: 'compose',
    };
  }

  if (TARGET_EXEC_MODE === 'ssh-compose') {
    if (!TARGET_SSH_HOST) {
      fail('Missing TARGET_SSH_HOST for ssh-compose mode');
    }
    if (!TARGET_COMPOSE_FILES.length) {
      fail('Missing TARGET_COMPOSE_FILES for ssh-compose mode');
    }

    const remoteComposeArgs = ['compose'];
    for (const file of TARGET_COMPOSE_FILES) {
      remoteComposeArgs.push('-f', file);
    }

    const remoteComposeCommand = [
      'docker',
      ...remoteComposeArgs,
      'exec',
      '-T',
      TARGET_COMPOSE_SERVICE,
      'psql',
      '-X',
      '-qAt',
      '-F',
      "'\\t'",
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
    ].join(' ');

    return {
      async query(text, values = []) {
        const sql = formatSql(text, values);
        const remoteTempSql = `/tmp/storage-migration-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`;

        const uploadArgs = ['-p', TARGET_SSH_PORT];
        if (TARGET_SSH_KEY) {
          uploadArgs.push('-i', TARGET_SSH_KEY);
        }
        uploadArgs.push(`${TARGET_SSH_USER}@${TARGET_SSH_HOST}`, `cat > ${shellQuote(remoteTempSql)}`);

        const uploadResult = spawnSync(TARGET_SSH_BIN, uploadArgs, {
          input: sql,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
        });

        if (uploadResult.error) {
          throw uploadResult.error;
        }
        if (uploadResult.status !== 0) {
          throw new Error((uploadResult.stderr || uploadResult.stdout || 'ssh upload failed').trim());
        }

        const remoteExecCommand = [
          `cd ${shellQuote(TARGET_COMPOSE_WORKDIR)}`,
          '&&',
          TARGET_REMOTE_SUDO_PASSWORD
            ? `printf '%s\n' ${shellQuote(TARGET_REMOTE_SUDO_PASSWORD)} | sudo -S -p '' sh -lc ${shellQuote(
                `${remoteComposeCommand} < ${shellQuote(remoteTempSql)}`
              )}`
            : `sudo sh -lc ${shellQuote(`${remoteComposeCommand} < ${shellQuote(remoteTempSql)}`)}`,
          '&&',
          `rm -f ${shellQuote(remoteTempSql)}`,
        ].join(' ');

        const sshArgs = ['-p', TARGET_SSH_PORT];
        if (TARGET_SSH_KEY) {
          sshArgs.push('-i', TARGET_SSH_KEY);
        }
        sshArgs.push(`${TARGET_SSH_USER}@${TARGET_SSH_HOST}`, remoteExecCommand);

        const result = spawnSync(TARGET_SSH_BIN, sshArgs, {
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
        });

        if (result.error) {
          throw result.error;
        }
        if (result.status !== 0) {
          throw new Error((result.stderr || result.stdout || 'ssh compose psql failed').trim());
        }

        const stdout = (result.stdout || '').trim();
        if (!stdout) {
          return { rows: [], rowCount: 0 };
        }

        const rows = stdout
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => {
            const values = line.split('\t');
            if (values.length === 1) {
              return { value: values[0] };
            }

            const row = {};
            values.forEach((value, index) => {
              row[`column_${index + 1}`] = value;
            });
            return row;
          });

        return { rows, rowCount: rows.length };
      },
      async end() {},
      mode: 'ssh-compose',
    };
  }

  fail(`Unsupported TARGET_EXEC_MODE: ${TARGET_EXEC_MODE}`);
}

function normalizeBuckets(inputBuckets) {
  return (inputBuckets || [])
    .map((bucket) => ({
      id: bucket.id || bucket.name,
      name: bucket.name || bucket.id,
      public: bucket.public ?? true,
    }))
    .filter((bucket) => bucket.id && bucket.name);
}

function sanitizeSourceStorageSql(sql) {
  return normalizeSql(
    sql
      .replace(/^CREATE SCHEMA storage AUTHORIZATION .+;$/gm, 'CREATE SCHEMA IF NOT EXISTS storage;')
      .replace(/^ALTER SCHEMA storage OWNER TO .+;$/gm, 'ALTER SCHEMA storage OWNER TO postgres;')
      .replace(/^CREATE USER supabase_storage_admin .*;$/gm, '')
      .replace(/^ALTER USER supabase_storage_admin .*;$/gm, '')
      .replace(/^GRANT postgres\s+TO authenticator;$/gim, '')
      .replace(/^GRANT supabase_admin\s+TO postgres;$/gim, '')
      .replace(/^SET ROLE supabase_admin;$/gim, '')
      .replace(/^RESET ROLE;$/gim, '')
      .replace(/OWNER TO supabase_admin;/gim, 'OWNER TO postgres;')
      .replace(/AUTHORIZATION supabase_admin/gim, 'AUTHORIZATION postgres')
      .replace(/\n{3,}/g, '\n\n')
  );
}

function dumpStorageSchemaFromSource() {
  if (cachedSourceSchemaSql) {
    return cachedSourceSchemaSql;
  }

  if (SOURCE_SCHEMA_SQL) {
    cachedSourceSchemaSql = sanitizeSourceStorageSql(fs.readFileSync(SOURCE_SCHEMA_SQL, 'utf8'));
    return cachedSourceSchemaSql;
  }

  if (!SOURCE_DB_URL) {
    return null;
  }

  const dump = spawnSync(
    'pg_dump',
    ['--schema=storage', '--section=pre-data', '--section=post-data', '--no-owner', '--no-acl', SOURCE_DB_URL],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );

  if (dump.error || dump.status !== 0) {
    return null;
  }

  cachedSourceSchemaSql = sanitizeSourceStorageSql(dump.stdout);
  return cachedSourceSchemaSql;
}

async function tableExists(client, schema, table) {
  const result = await client.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = $2 limit 1`,
    [schema, table]
  );
  return result.rowCount > 0;
}

async function ensureStorageSchema(targetClient) {
  if (await tableExists(targetClient, 'storage', 'migrations')) {
    console.log('Target already has storage.migrations; skipping schema bootstrap.');
    return false;
  }

  let schemaSql = dumpStorageSchemaFromSource();
  if (!schemaSql) {
    if (!ALLOW_STORAGE_SCHEMA_FALLBACK) {
      fail(
        'Unable to obtain storage schema from source. Set SOURCE_DB_URL or SOURCE_SCHEMA_SQL, or set ALLOW_STORAGE_SCHEMA_FALLBACK=true to use the bundled fallback.'
      );
    }
    console.log('No source dump available; using bundled storage schema fallback.');
    schemaSql = FALLBACK_STORAGE_SQL;
  } else {
    console.log('Using storage schema from source dump.');
  }

  await targetClient.query(schemaSql);
  return true;
}

async function fetchSourceBuckets() {
  if (cachedSourceBuckets) {
    return cachedSourceBuckets;
  }

  if (SOURCE_BUCKETS_JSON && fs.existsSync(SOURCE_BUCKETS_JSON)) {
    cachedSourceBuckets = normalizeBuckets(JSON.parse(fs.readFileSync(SOURCE_BUCKETS_JSON, 'utf8')));
    return cachedSourceBuckets;
  }

  if (!SOURCE_DB_URL) return [];

  const sourceClient = makeClient(SOURCE_DB_URL);
  try {
    await sourceClient.connect();
    const result = await sourceClient.query(
      `select id, name, coalesce(public, false) as public
       from storage.buckets
       order by created_at nulls last, name`
    );
    cachedSourceBuckets = normalizeBuckets(result.rows);
    return cachedSourceBuckets;
  } catch (error) {
    console.log(`Could not read source buckets (${error.message}); using defaults.`);
    return [];
  } finally {
    await sourceClient.end().catch(() => {});
  }
}

async function ensureBuckets(targetClient, buckets) {
  if (!buckets.length) {
    buckets = STORAGE_BUCKETS.map((name) => ({ id: name, name, public: true }));
  }

  for (const bucket of buckets) {
    await targetClient.query(
      `
      insert into storage.buckets (id, name, public)
      values ($1, $2, $3)
      on conflict (id) do update
      set name = excluded.name,
          public = excluded.public
      `,
      [bucket.id, bucket.name, bucket.public ?? true]
    );
  }

  return buckets;
}

async function ensurePolicies(targetClient, buckets) {
  for (const bucket of buckets) {
    const safeName = bucket.id.replace(/[^a-zA-Z0-9_]+/g, '_');
    const bucketLiteral = sqlLiteral(bucket.id);

    await targetClient.query(`drop policy if exists "Allow public uploads ${safeName}" on storage.objects;`);
    await targetClient.query(`drop policy if exists "Allow public reads ${safeName}" on storage.objects;`);
    await targetClient.query(`drop policy if exists "Allow public updates ${safeName}" on storage.objects;`);
    await targetClient.query(`drop policy if exists "Allow public deletes ${safeName}" on storage.objects;`);

    await targetClient.query(`
      create policy "Allow public uploads ${safeName}"
      on storage.objects
      for insert
      to public
      with check (bucket_id = ${bucketLiteral})
    `);

    await targetClient.query(`
      create policy "Allow public reads ${safeName}"
      on storage.objects
      for select
      to public
      using (bucket_id = ${bucketLiteral})
    `);

    await targetClient.query(`
      create policy "Allow public updates ${safeName}"
      on storage.objects
      for update
      to public
      using (bucket_id = ${bucketLiteral})
      with check (bucket_id = ${bucketLiteral})
    `);

    await targetClient.query(`
      create policy "Allow public deletes ${safeName}"
      on storage.objects
      for delete
      to public
      using (bucket_id = ${bucketLiteral})
    `);
  }
}

async function main() {
  ensureOutDir();

  if (STORAGE_MIGRATION_PHASE === 'dump') {
    const schemaSql = dumpStorageSchemaFromSource();
    if (!schemaSql) {
      if (!ALLOW_STORAGE_SCHEMA_FALLBACK) {
        fail(
          'Unable to dump storage schema from source. Set SOURCE_DB_URL or SOURCE_SCHEMA_SQL, or set ALLOW_STORAGE_SCHEMA_FALLBACK=true.'
        );
      }
    }

    const sourceBuckets = await fetchSourceBuckets();
    const buckets = sourceBuckets.length
      ? normalizeBuckets(sourceBuckets)
      : STORAGE_BUCKETS.map((name) => ({ id: name, name, public: true }));
    fs.writeFileSync(STORAGE_SCHEMA_OUT, schemaSql || FALLBACK_STORAGE_SQL);
    fs.writeFileSync(STORAGE_BUCKETS_OUT, `${JSON.stringify(buckets, null, 2)}\n`);

    console.log('Storage dump complete.');
    console.log(`Schema written to: ${STORAGE_SCHEMA_OUT}`);
    console.log(`Buckets written to: ${STORAGE_BUCKETS_OUT}`);
    return;
  }

  const targetClient = await createTargetRunner();

  try {
    console.log(`Starting storage schema migration in ${targetClient.mode} mode...`);

    await ensureStorageSchema(targetClient);

    const sourceBuckets = normalizeBuckets(await fetchSourceBuckets());
    const buckets = await ensureBuckets(targetClient, sourceBuckets);
    await ensurePolicies(targetClient, buckets);

    const verification = await targetClient.query(`
      select coalesce(string_agg(table_name, ', ' order by table_name), '') as table_list
      from information_schema.tables
      where table_schema = 'storage'
        and table_name in ('migrations', 'buckets', 'objects')
    `);

    fs.writeFileSync(STORAGE_SCHEMA_OUT, dumpStorageSchemaFromSource() || FALLBACK_STORAGE_SQL);
    fs.writeFileSync(STORAGE_BUCKETS_OUT, `${JSON.stringify(buckets, null, 2)}\n`);

    console.log('Storage schema migration complete.');
    console.log('Verified tables:', verification.rows[0]?.value || verification.rows[0]?.table_list || '');
    console.log(`Generated SQL written to: ${STORAGE_SCHEMA_OUT}`);
    console.log(`Generated bucket list written to: ${STORAGE_BUCKETS_OUT}`);
    console.log('Buckets ensured:', buckets.map((bucket) => bucket.id).join(', '));
  } catch (error) {
    console.error('Storage migration failed.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await targetClient.end().catch(() => {});
  }
}

main();
