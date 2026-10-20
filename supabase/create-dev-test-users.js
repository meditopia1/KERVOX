const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/frontend/.env.local' });
function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const TEST_USER_PASSWORD = requireEnv('TEST_USER_PASSWORD');
const PROVIDER_TEST_PASSWORD = requireEnv('PROVIDER_TEST_PASSWORD');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USERS = [
  {
    email: 'admin@day1health.test',
    password: TEST_USER_PASSWORD,
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin', 'system_admin'],
  },
  {
    email: 'operations@day1health.test',
    password: TEST_USER_PASSWORD,
    firstName: 'Operations',
    lastName: 'Manager',
    roles: ['operations_manager'],
  },
  {
    email: 'claims@day1health.test',
    password: TEST_USER_PASSWORD,
    firstName: 'Claims',
    lastName: 'Assessor',
    roles: ['claims_assessor'],
  },
  {
    email: 'finance@day1health.test',
    password: TEST_USER_PASSWORD,
    firstName: 'Finance',
    lastName: 'Manager',
    roles: ['finance_manager'],
  },
  {
    email: 'callcentre@day1health.test',
    password: TEST_USER_PASSWORD,
    firstName: 'Call',
    lastName: 'Centre',
    roles: ['call_centre_agent'],
  },
];

const TEST_PROVIDERS = [
  {
    email: 'provider1@day1health.test',
    password: PROVIDER_TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Provider',
    providerNumber: 'GP000001',
    name: 'Dr. Test Provider',
    type: 'GP',
    profession: 'GP',
    practice_name: 'Test Medical Centre',
    status: 'active',
  },
  {
    email: 'provider2@day1health.test',
    password: PROVIDER_TEST_PASSWORD,
    firstName: 'Specialist',
    lastName: 'Test',
    providerNumber: 'SP000001',
    name: 'Dr. Specialist Test',
    type: 'Specialist',
    profession: 'Cardiologist',
    practice_name: 'Specialist Test Clinic',
    status: 'active',
  },
];

async function createTestUsers() {
  console.log('🔧 Creating development test users...\n');

  try {
    // Get all role IDs first
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, name');

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      return;
    }

    const roleMap = {};
    rolesData.forEach(role => {
      roleMap[role.name] = role.id;
    });

    console.log('📋 Available roles:', Object.keys(roleMap).join(', '));
    console.log('');

    // Create staff users
    console.log('👥 Creating staff users...\n');
    for (const user of TEST_USERS) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', user.email)
          .single();

        if (existingUser) {
          console.log(`⏭️  ${user.email} - Already exists, skipping`);
          continue;
        }

        // Create Supabase Auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
          },
        });

        if (authError) {
          console.error(`❌ ${user.email} - Auth error:`, authError.message);
          continue;
        }

        const userId = authData.user.id;

        // Insert into users table
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            roles: user.roles,
            is_active: true,
          });

        if (userInsertError) {
          console.error(`❌ ${user.email} - Users table error:`, userInsertError.message);
          continue;
        }

        // Insert into profiles table
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: user.firstName,
            last_name: user.lastName,
          });

        // Insert user_roles
        for (const roleName of user.roles) {
          const roleId = roleMap[roleName];
          if (roleId) {
            await supabase
              .from('user_roles')
              .insert({
                user_id: userId,
                role_id: roleId,
              });
          }
        }

        console.log(`✅ ${user.email} - Created with roles: ${user.roles.join(', ')}`);

      } catch (error) {
        console.error(`❌ ${user.email} - Error:`, error.message);
      }
    }

    // Create provider users
    console.log('\n🏥 Creating provider users...\n');
    for (const provider of TEST_PROVIDERS) {
      try {
        // Check if provider already exists
        const { data: existingProvider } = await supabase
          .from('providers')
          .select('id, name, login_email')
          .eq('provider_number', provider.providerNumber)
          .single();

        if (existingProvider) {
          console.log(`⏭️  ${provider.email} - Provider ${provider.providerNumber} already exists, skipping`);
          continue;
        }

        // Create Supabase Auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: provider.email,
          password: provider.password,
          email_confirm: true,
          user_metadata: {
            firstName: provider.firstName,
            lastName: provider.lastName,
            role: 'provider',
          },
        });

        if (authError) {
          console.error(`❌ ${provider.email} - Auth error:`, authError.message);
          continue;
        }

        const userId = authData.user.id;

        // Insert into users table
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: provider.email,
            first_name: provider.firstName,
            last_name: provider.lastName,
            roles: ['provider'],
            is_active: true,
          });

        if (userInsertError) {
          console.error(`❌ ${provider.email} - Users table error:`, userInsertError.message);
        }

        // Insert into profiles table
        await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: provider.firstName,
            last_name: provider.lastName,
          });

        // Insert user_roles
        const providerRoleId = roleMap['provider'];
        if (providerRoleId) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role_id: providerRoleId,
            });
        }

        // Create provider record
        const { error: providerError } = await supabase
          .from('providers')
          .insert({
            provider_number: provider.providerNumber,
            name: provider.name,
            type: provider.type,
            profession: provider.profession,
            practice_name: provider.practice_name,
            status: provider.status,
            login_email: provider.email,
            user_id: userId,
            is_active: true,
          });

        if (providerError) {
          console.error(`❌ ${provider.email} - Provider table error:`, providerError.message);
          continue;
        }

        console.log(`✅ ${provider.email} - Created provider ${provider.providerNumber} (${provider.name})`);

      } catch (error) {
        console.error(`❌ ${provider.email} - Error:`, error.message);
      }
    }

    console.log('\n✅ Test user creation complete!');
    console.log('\n📄 See DEV_TEST_USERS.md for login credentials');
    console.log('⚠️  Remember: These are for development only!\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUsers().catch(console.error);
