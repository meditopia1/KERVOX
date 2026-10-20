require('dotenv').config({ path: '../apps/frontend/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ../apps/frontend/.env.local');
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

async function setAllActive() {
  console.log('🔄 Setting ALL providers to active status...\n');

  try {
    let page = 0;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
      const from = page * 1000;
      const to = from + 999;

      console.log(`Processing batch ${page + 1} (rows ${from}-${to})...`);

      // Get providers in this batch
      const { data: providers, error: fetchError } = await supabase
        .from('providers')
        .select('id')
        .range(from, to);

      if (fetchError) throw fetchError;

      if (!providers || providers.length === 0) {
        hasMore = false;
        break;
      }

      // Update this batch
      const { error: updateError } = await supabase
        .from('providers')
        .update({ status: 'active' })
        .in('id', providers.map(p => p.id));

      if (updateError) throw updateError;

      totalUpdated += providers.length;
      console.log(`  ✅ Updated ${providers.length} providers`);

      if (providers.length < 1000) {
        hasMore = false;
      }

      page++;
    }

    console.log(`\n✅ Total updated: ${totalUpdated} providers`);

    // Verify
    const { count, error: countError } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (countError) throw countError;

    console.log(`📊 Total active providers: ${count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setAllActive();
