const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearProviderPasswords() {
  console.log('🧹 Clearing provider passwords...\n');

  try {
    // Step 1: Update all rows to set login_password to NULL
    console.log('Step 1: Clearing login_password values...');
    const { data: updateData, error: updateError } = await supabase
      .rpc('exec_sql', { 
        sql: 'UPDATE providers SET login_password = NULL WHERE login_password IS NOT NULL' 
      });

    // Alternative approach using Supabase client
    const { data, error } = await supabase
      .from('providers')
      .update({ login_password: null })
      .not('login_password', 'is', null)
      .select('id, name');

    if (error) {
      console.error('❌ Error clearing passwords:', error);
      return;
    }

    console.log(`✅ Cleared login_password from ${data?.length || 0} providers`);
    if (data && data.length > 0) {
      data.forEach(p => console.log(`   - ${p.name}`));
    }
    console.log('');

    // Step 2: Verify cleared
    console.log('Step 2: Verifying all passwords cleared...');
    const { count, error: countError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .not('login_password', 'is', null);

    if (countError) {
      console.error('❌ Error verifying:', countError);
      return;
    }

    console.log(`   Rows with login_password not null: ${count || 0}`);
    
    if (count === 0) {
      console.log('   ✅ SUCCESS: All password values cleared\n');
    } else {
      console.log(`   ⚠️  WARNING: ${count} rows still have values\n`);
    }

    console.log('📊 CLEANUP COMPLETE');
    console.log('   Next step: Search codebase for login_password references');
    console.log('   Then: Drop the column from the table\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

clearProviderPasswords().catch(console.error);
