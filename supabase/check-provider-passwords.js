const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProviderPasswords() {
  console.log('🔍 Checking providers table for login_password column...\n');

  try {
    // 1. Check if login_password column exists by querying one row
    const { data: sampleRow, error: sampleError } = await supabase
      .from('providers')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') {
      console.error('Error querying providers:', sampleError);
      return;
    }

    const hasLoginPasswordColumn = sampleRow && 'login_password' in sampleRow;
    
    console.log('1. Does login_password column exist?');
    console.log(`   ${hasLoginPasswordColumn ? '✅ YES' : '❌ NO'}\n`);

    if (!hasLoginPasswordColumn) {
      console.log('✅ Good news: login_password column does not exist in providers table.');
      console.log('   No cleanup needed.\n');
      return;
    }

    // 2. Count rows with non-null login_password
    const { data: allProviders, error: allError } = await supabase
      .from('providers')
      .select('id, name, login_email, login_password')
      .not('login_password', 'is', null);

    if (allError) {
      console.error('Error querying providers:', allError);
      return;
    }

    const providersWithPasswords = allProviders || [];
    
    console.log('2. How many provider rows have login_password not null?');
    console.log(`   ${providersWithPasswords.length} rows\n`);

    if (providersWithPasswords.length === 0) {
      console.log('✅ Good news: No providers have login_password values.');
      console.log('   Column exists but is empty.\n');
    } else {
      console.log('⚠️  Found providers with login_password values:\n');
      
      // 3. Check if values look like plaintext
      providersWithPasswords.forEach((provider, index) => {
        const password = provider.login_password;
        const isPlaintext = password && password.length < 50 && !password.startsWith('$');
        
        console.log(`   ${index + 1}. Provider: ${provider.name}`);
        console.log(`      Email: ${provider.login_email || 'N/A'}`);
        console.log(`      Password length: ${password ? password.length : 0} chars`);
        console.log(`      Looks plaintext: ${isPlaintext ? '🚨 YES' : 'NO (might be hashed)'}`);
        if (password && password.length < 20) {
          console.log(`      Value preview: ${password.substring(0, 3)}***`);
        }
        console.log('');
      });
    }

    // 4. Provide SQL to clear values
    console.log('\n4. Safest SQL to clear those values:\n');
    console.log('   -- Clear all login_password values');
    console.log('   UPDATE providers SET login_password = NULL WHERE login_password IS NOT NULL;\n');
    console.log('   -- Verify cleared');
    console.log('   SELECT COUNT(*) FROM providers WHERE login_password IS NOT NULL;\n');

    // 5. Should column be dropped?
    console.log('5. Should the column be dropped from the table?');
    console.log('   ✅ YES - Recommended');
    console.log('   Reasons:');
    console.log('   - Passwords should NEVER be stored in application tables');
    console.log('   - Supabase Auth already stores passwords securely (hashed)');
    console.log('   - Keeping the column creates security risk');
    console.log('   - Column serves no legitimate purpose\n');
    console.log('   SQL to drop column:');
    console.log('   ALTER TABLE providers DROP COLUMN IF EXISTS login_password;\n');

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Column exists: ${hasLoginPasswordColumn ? 'YES' : 'NO'}`);
    console.log(`   Rows with values: ${providersWithPasswords.length}`);
    if (providersWithPasswords.length > 0) {
      const plaintextCount = providersWithPasswords.filter(p => 
        p.login_password && p.login_password.length < 50 && !p.login_password.startsWith('$')
      ).length;
      console.log(`   Plaintext passwords: ${plaintextCount}`);
      console.log(`   Security risk: 🔴 CRITICAL`);
    } else if (hasLoginPasswordColumn) {
      console.log(`   Security risk: 🟡 MEDIUM (column exists but empty)`);
    } else {
      console.log(`   Security risk: ✅ NONE`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkProviderPasswords().catch(console.error);
