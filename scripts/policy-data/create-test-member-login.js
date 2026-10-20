const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require(path.join(__dirname, '../../apps/frontend/node_modules/bcryptjs'));
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials in apps/frontend/.env.local');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const MEMBER_NUMBER = 'TESTMEM001';
const EMAIL = 'test.member@day1health.test';
const PIN = '1234';
const PIN_HASH_ROUNDS = 10;

async function createTestMemberLogin() {
  const timestamp = new Date().toISOString();
  const pinHash = await bcrypt.hash(PIN, PIN_HASH_ROUNDS);

  const baseMember = {
    member_number: MEMBER_NUMBER,
    dependant_code: 0,
    dependant_type: 'MainMember',
    first_name: 'Test',
    last_name: 'Member',
    date_of_birth: '1990-01-01',
    id_number: '9001015009087',
    gender: 'female',
    status: 'active',
    email: EMAIL,
    phone: null,
    mobile: null,
    broker_code: 'DAY1',
    plan_name: 'Test Member Plan',
    start_date: '2026-06-04',
    monthly_premium: 0,
    collection_method: 'individual_debit_order',
    payment_status: 'active',
    pin_code: null,
    pin_hash: pinHash,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: timestamp,
    updated_at: timestamp
  };

  const { data: existingByMemberNumber, error: memberNumberError } = await supabase
    .from('members')
    .select('id, member_number, mobile, pin_hash, status')
    .eq('member_number', MEMBER_NUMBER)
    .maybeSingle();

  if (memberNumberError) {
    throw memberNumberError;
  }

  const { data: existingByEmail, error: emailError } = await supabase
    .from('members')
    .select('id, member_number, email, pin_hash, status')
    .ilike('email', EMAIL)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  const existing = existingByMemberNumber || existingByEmail;

  if (existing) {
    const { data, error } = await supabase
      .from('members')
      .update({
        ...baseMember,
        updated_at: timestamp
      })
      .eq('id', existing.id)
      .select('id, member_number, mobile, status')
      .single();

    if (error) {
      throw error;
    }

    console.log('Updated existing test member login:');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const { data, error } = await supabase
    .from('members')
    .insert({
      id: crypto.randomUUID(),
      ...baseMember
    })
    .select('id, member_number, mobile, status')
    .single();

  if (error) {
    throw error;
  }

  console.log('Created test member login:');
  console.log(JSON.stringify(data, null, 2));
}

createTestMemberLogin().catch((error) => {
  console.error('Failed to create test member login:');
  console.error(error);
  process.exit(1);
});
