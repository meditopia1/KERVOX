const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const staffBearerToken = process.env.RLS_TEST_STAFF_BEARER_TOKEN;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in apps/frontend/.env.local'
  );
}

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const staffClient = staffBearerToken
  ? createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${staffBearerToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const tables = [
  'users',
  'roles',
  'user_roles',
  'permissions',
  'role_permissions',
  'members',
  'member_dependants',
  'claims',
  'providers',
  'applications',
];

async function checkAccess(client, label, table) {
  try {
    const { data, error, count, status } = await client
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      return {
        label,
        table,
        ok: false,
        status: status || 'n/a',
        message: error.message,
      };
    }

    return {
      label,
      table,
      ok: true,
      status: status || 'n/a',
      count: count ?? null,
      rowsReturned: Array.isArray(data) ? data.length : 0,
    };
  } catch (error) {
    return {
      label,
      table,
      ok: false,
      status: 'throw',
      message: error.message,
    };
  }
}

async function runChecks(client, label) {
  const results = [];
  for (const table of tables) {
    results.push(await checkAccess(client, label, table));
  }
  return results;
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function printResults(results) {
  for (const result of results) {
    if (result.ok) {
      console.log(
        `${result.label.padEnd(12)} ${result.table.padEnd(18)} OK     status=${String(result.status).padEnd(4)} count=${String(result.count).padEnd(6)} rows=${result.rowsReturned}`
      );
    } else {
      console.log(
        `${result.label.padEnd(12)} ${result.table.padEnd(18)} ERROR  status=${String(result.status).padEnd(4)} message=${result.message}`
      );
    }
  }
}

async function main() {
  console.log('DAY1 Phase 1 RLS Verification');
  console.log(`Target: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  printSection('Service Role Baseline');
  const serviceResults = await runChecks(serviceClient, 'service_role');
  printResults(serviceResults);

  printSection('Anon Access Check');
  const anonResults = await runChecks(anonClient, 'anon');
  printResults(anonResults);

  if (staffClient) {
    printSection('Authenticated Staff Check');
    const staffResults = await runChecks(staffClient, 'staff_token');
    printResults(staffResults);
  } else {
    printSection('Authenticated Staff Check');
    console.log('Skipped: set RLS_TEST_STAFF_BEARER_TOKEN to verify authenticated staff access after the SQL change.');
  }

  printSection('Expected Phase 1 Outcome');
  console.log('- service_role should still be able to read the target tables.');
  console.log('- anon should stop returning live rows from sensitive tables after containment is applied.');
  console.log('- authenticated staff should still be able to read operational tables if the token belongs to an approved internal role.');
}

main().catch((error) => {
  console.error('\nVerification failed:', error);
  process.exit(1);
});
