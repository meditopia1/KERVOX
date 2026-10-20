const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/frontend/.env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const KNOWN_COLUMNS = {
  applications: [
    'id',
    'contact_id',
    'application_number',
    'plan_id',
    'first_name',
    'last_name',
    'id_number',
    'date_of_birth',
    'gender',
    'email',
    'mobile',
    'address_line1',
    'address_line2',
    'city',
    'postal_code',
    'id_document_url',
    'id_document_ocr_data',
    'proof_of_address_url',
    'proof_of_address_ocr_data',
    'selfie_url',
    'face_verification_result',
    'bank_name',
    'account_number',
    'branch_code',
    'account_holder_name',
    'debit_order_day',
    'medical_history',
    'voice_recording_url',
    'signature_url',
    'terms_accepted_at',
    'terms_ip_address',
    'terms_user_agent',
    'marketing_consent',
    'marketing_consent_date',
    'email_consent',
    'sms_consent',
    'phone_consent',
    'plan_name',
    'plan_config',
    'monthly_price',
    'status',
    'submitted_at',
    'reviewed_by',
    'reviewed_at',
    'review_notes',
    'rejection_reason',
    'underwriting_status',
    'underwriting_notes',
    'risk_rating',
    'created_at',
    'updated_at',
  ],
  contacts: [
    'id',
    'first_name',
    'last_name',
    'email',
    'mobile',
    'id_number',
    'status',
    'is_lead',
    'is_applicant',
    'is_member',
    'member_activated_at',
    'application_submitted_at',
    'created_at',
    'updated_at',
  ],
  members: [
    'id',
    'member_number',
    'first_name',
    'last_name',
    'id_number',
    'date_of_birth',
    'gender',
    'email',
    'mobile',
    'address_line1',
    'address_line2',
    'city',
    'postal_code',
    'broker_code',
    'broker_id',
    'plan_id',
    'plan_name',
    'status',
    'monthly_premium',
    'payment_method',
    'debit_order_day',
    'collection_method',
    'application_id',
    'application_number',
    'approved_at',
    'approved_by',
    'created_at',
    'updated_at',
  ],
  member_dependants: [
    'id',
    'member_id',
    'member_number',
    'name',
    'relationship',
    'date_of_birth',
    'id_number',
    'gender',
    'created_at',
    'updated_at',
  ],
  brokers: ['id', 'broker_code', 'name', 'email', 'status', 'created_at', 'updated_at'],
  providers: ['id', 'provider_code', 'practice_name', 'email', 'status', 'created_at', 'updated_at'],
};

function usage() {
  console.log(`
Supabase DB Tool

Usage:
  node supabase/db-tool.js describe <table>
  node supabase/db-tool.js select <table> [--limit N] [--eq col=value] [--ilike col=value] [--is col=null] [--order col:asc|desc]
  node supabase/db-tool.js insert <table> '<json>'
  node supabase/db-tool.js update <table> '<json>' [--eq col=value ...]
  node supabase/db-tool.js upsert <table> '<json>' [--on-conflict col1,col2]
  node supabase/db-tool.js delete <table> [--eq col=value ...]

Examples:
  node supabase/db-tool.js describe applications
  node supabase/db-tool.js select applications --limit 5
  node supabase/db-tool.js select members --eq status=active --limit 3
  node supabase/db-tool.js update contacts '{"is_member":true}' --eq email=lindiwe@out.com
  node supabase/db-tool.js insert providers '{"practice_name":"Demo Clinic","email":"demo@clinic.com"}'
`);
}

function parseValue(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (!Number.isNaN(Number(raw)) && raw.trim() !== '') return Number(raw);
  return raw;
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift();
  const table = args.shift();
  const options = { limit: undefined, eq: [], ilike: [], is: [], order: undefined, onConflict: undefined };

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--limit') {
      options.limit = Number(args.shift());
    } else if (token === '--eq' || token === '--ilike' || token === '--is') {
      const [column, ...rest] = String(args.shift() || '').split('=');
      const value = rest.join('=');
      options[token.slice(2)].push([column, parseValue(value)]);
    } else if (token === '--order') {
      const [column, direction] = String(args.shift() || '').split(':');
      options.order = { column, direction: (direction || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc' };
    } else if (token === '--on-conflict') {
      options.onConflict = args.shift();
    } else {
      // Anything else is treated as a positional payload for write commands.
      args.unshift(token);
      break;
    }
  }

  const payloadRaw = args.length > 0 ? args.join(' ') : undefined;
  return { command, table, options, payloadRaw };
}

function applyFilters(query, options) {
  for (const [column, value] of options.eq) query = query.eq(column, value);
  for (const [column, value] of options.ilike) query = query.ilike(column, String(value));
  for (const [column, value] of options.is) query = query.is(column, value);
  if (options.order?.column) query = query.order(options.order.column, { ascending: options.order.direction !== 'desc' });
  if (options.limit) query = query.limit(options.limit);
  return query;
}

async function describeTable(table) {
  const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
  if (error) throw error;
  const sample = data?.[0];
  const columns = sample ? Object.keys(sample) : KNOWN_COLUMNS[table] || [];

  console.log(`\nTable: ${table}`);
  console.log(`Rows: ${count ?? 0}`);
  console.log(`Columns (${columns.length}):`);
  console.log(columns.join(', '));
}

async function selectRows(table, options) {
  let query = supabase.from(table).select('*');
  query = applyFilters(query, options);
  const { data, error } = await query;
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function writeRows(command, table, payloadRaw, options) {
  if (!payloadRaw) throw new Error('Missing JSON payload');
  const payload = JSON.parse(payloadRaw);

  let query = supabase.from(table);
  if (command === 'insert') {
    query = query.insert(payload).select('*');
  } else if (command === 'update') {
    query = applyFilters(query.update(payload).select('*'), options);
  } else if (command === 'upsert') {
    query = query.upsert(payload, options.onConflict ? { onConflict: options.onConflict } : undefined).select('*');
  } else if (command === 'delete') {
    query = applyFilters(query.delete().select('*'), options);
  } else {
    throw new Error(`Unsupported write command: ${command}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const { command, table, options, payloadRaw } = parseArgs(process.argv.slice(2));

  if (!command || !table) {
    usage();
    process.exit(command ? 1 : 0);
  }

  try {
    if (command === 'describe') {
      await describeTable(table);
    } else if (command === 'select') {
      await selectRows(table, options);
    } else if (command === 'insert' || command === 'update' || command === 'upsert' || command === 'delete') {
      await writeRows(command, table, payloadRaw, options);
    } else {
      usage();
      process.exit(1);
    }
  } catch (error) {
    console.error(`DB tool error for ${command} ${table}:`);
    console.error(error?.message || error);
    process.exit(1);
  }
}

main();
