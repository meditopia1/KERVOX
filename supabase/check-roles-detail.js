const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRolesDetail() {
  console.log('👥 ROLE-BASED ACCESS CONTROL VERIFICATION\n');
  console.log('='.repeat(80));
  
  // 1. Get all roles
  console.log('\n1️⃣  ALL ROLES IN SYSTEM\n');
  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .order('name');
  
  if (roles) {
    console.log(`   Total roles: ${roles.length}\n`);
    roles.forEach(role => {
      console.log(`   • ${role.name.padEnd(25)} - ${role.description}`);
    });
  }
  
  // 2. Get all permissions
  console.log('\n\n2️⃣  ALL PERMISSIONS IN SYSTEM\n');
  const { data: permissions } = await supabase
    .from('permissions')
    .select('*')
    .order('resource, action');
  
  if (permissions) {
    console.log(`   Total permissions: ${permissions.length}\n`);
    
    // Group by resource
    const byResource = {};
    permissions.forEach(perm => {
      if (!byResource[perm.resource]) byResource[perm.resource] = [];
      byResource[perm.resource].push(perm);
    });
    
    Object.keys(byResource).sort().forEach(resource => {
      console.log(`   📁 ${resource.toUpperCase()}`);
      byResource[resource].forEach(perm => {
        console.log(`      - ${perm.name.padEnd(30)} (${perm.action})`);
      });
      console.log('');
    });
  }
  
  // 3. Get user-role assignments
  console.log('\n3️⃣  USER ROLE ASSIGNMENTS\n');
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      role_id,
      assigned_at,
      users (email),
      roles (name)
    `);
  
  if (userRoles) {
    console.log(`   Total assignments: ${userRoles.length}\n`);
    userRoles.forEach(ur => {
      const email = ur.users?.email || 'Unknown';
      const roleName = ur.roles?.name || 'Unknown';
      console.log(`   ${email.padEnd(35)} → ${roleName}`);
    });
  }
  
  // 4. Get role-permission mappings
  console.log('\n\n4️⃣  ROLE PERMISSIONS MAPPING\n');
  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select(`
      role_id,
      permission_id,
      roles (name),
      permissions (name, resource, action)
    `);
  
  if (rolePerms) {
    // Group by role
    const byRole = {};
    rolePerms.forEach(rp => {
      const roleName = rp.roles?.name || 'Unknown';
      if (!byRole[roleName]) byRole[roleName] = [];
      byRole[roleName].push(rp.permissions);
    });
    
    Object.keys(byRole).sort().forEach(roleName => {
      console.log(`   🔑 ${roleName.toUpperCase()}`);
      console.log(`      Permissions: ${byRole[roleName].length}`);
      byRole[roleName].forEach(perm => {
        console.log(`      - ${perm.name} (${perm.resource}:${perm.action})`);
      });
      console.log('');
    });
  }
  
  console.log('='.repeat(80));
}

checkRolesDetail().catch(console.error);
