const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function describeSchema() {
  console.log('📊 DETAILED DATABASE SCHEMA\n');
  console.log('='.repeat(100));
  
  const tables = [
    { name: 'members', description: 'Core member records' },
    { name: 'member_dependants', description: 'Member dependants/family' },
    { name: 'applications', description: 'New member applications' },
    { name: 'contacts', description: 'Lead capture and contacts' },
    { name: 'brokers', description: 'Broker/agent information' },
    { name: 'providers', description: 'Healthcare provider network' },
    { name: 'claims', description: 'Member claims' },
    { name: 'claim_lines', description: 'Individual claim line items' },
    { name: 'products', description: 'Insurance products/plans' },
    { name: 'users', description: 'System users (staff)' },
    { name: 'plus1_upgrade_requests', description: 'Plus1 member upgrade requests' },
    { name: 'plus1_dependant_requests', description: 'Plus1 dependant addition requests' },
    { name: 'benefit_usage', description: 'Benefit utilization tracking' },
    { name: 'pre_authorizations', description: 'Pre-authorization requests' },
    { name: 'provider_claims', description: 'Provider-submitted claims' },
    { name: 'provider_payments', description: 'Provider payment records' }
  ];
  
  for (const table of tables) {
    try {
      // Get row count
      const { count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      // Get sample row to infer columns
      const { data: sample } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      console.log(`\n📋 ${table.name.toUpperCase()}`);
      console.log(`   ${table.description}`);
      console.log(`   Rows: ${count || 0}`);
      
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`   Columns (${columns.length}):`);
        
        // Group columns by type
        const idCols = columns.filter(c => c === 'id' || c.endsWith('_id'));
        const dateCols = columns.filter(c => c.includes('date') || c.includes('_at'));
        const statusCols = columns.filter(c => c === 'status' || c.includes('status'));
        const otherCols = columns.filter(c => 
          !idCols.includes(c) && 
          !dateCols.includes(c) && 
          !statusCols.includes(c)
        );
        
        if (idCols.length > 0) {
          console.log(`     IDs: ${idCols.join(', ')}`);
        }
        if (statusCols.length > 0) {
          console.log(`     Status: ${statusCols.join(', ')}`);
        }
        if (dateCols.length > 0) {
          console.log(`     Dates: ${dateCols.join(', ')}`);
        }
        if (otherCols.length > 0) {
          console.log(`     Other: ${otherCols.slice(0, 15).join(', ')}${otherCols.length > 15 ? '...' : ''}`);
        }
      } else {
        console.log(`   (No data to infer schema)`);
      }
      
      console.log('   ' + '-'.repeat(96));
      
    } catch (err) {
      console.log(`\n❌ ${table.name.toUpperCase()} - Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(100));
  
  // Summary statistics
  console.log('\n📈 DATABASE STATISTICS\n');
  
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const { count: totalDependants } = await supabase
    .from('member_dependants')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalProviders } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeProviders } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const { count: totalClaims } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total Members: ${totalMembers}`);
  console.log(`Active Members: ${activeMembers}`);
  console.log(`Total Dependants: ${totalDependants}`);
  console.log(`Total Providers: ${totalProviders}`);
  console.log(`Active Providers: ${activeProviders}`);
  console.log(`Total Claims: ${totalClaims}`);
  console.log(`\nAverage Dependants per Member: ${(totalDependants / totalMembers).toFixed(2)}`);
  
  console.log('\n' + '='.repeat(100));
}

describeSchema().catch(console.error);
