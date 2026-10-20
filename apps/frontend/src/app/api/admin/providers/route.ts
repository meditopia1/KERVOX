import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin', 'operations_manager']);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const limit = Math.max(1, Number(searchParams.get('limit') || '25'));
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'));

    let query = supabase
      .from('providers')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,provider_number.ilike.%${search}%,practice_name.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: providers, error, count } = await query;

    if (error) throw error;

    const statsQuery = async (statusValue?: string) => {
      let q = supabase.from('providers').select('*', { count: 'exact', head: true });
      if (statusValue) {
        q = q.eq('status', statusValue);
      }
      if (search) {
        q = q.or(
          `name.ilike.%${search}%,provider_number.ilike.%${search}%,practice_name.ilike.%${search}%`
        );
      }
      const { count: statCount, error: statError } = await q;
      if (statError) throw statError;
      return statCount || 0;
    };

    const [total, active, pending, inactive] = await Promise.all([
      statsQuery(),
      statsQuery('active'),
      statsQuery('pending'),
      statsQuery('inactive'),
    ]);

    const stats = {
      total,
      active,
      pending,
      inactive,
    };

    console.log(`✅ API: Fetched ${providers?.length || 0} providers (total ${count || 0})`);

    return NextResponse.json({
      providers: providers || [],
      total: count || 0,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);

    const body = await request.json();
    const { login_email, login_password, first_name, last_name, ...providerData } = body;

    let userId = null;

    // Create user account if login credentials provided
    if (login_email && login_password) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: login_email,
        password: login_password,
        email_confirm: true,
        user_metadata: {
          firstName: first_name || providerData.name.split(' ')[0],
          lastName: last_name || providerData.name.split(' ').slice(1).join(' '),
          role: 'provider',
        },
      });

      if (authError) {
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      userId = authData.user.id;

      // Insert into users table
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: login_email,
          first_name: first_name || providerData.name.split(' ')[0],
          last_name: last_name || providerData.name.split(' ').slice(1).join(' '),
          roles: ['provider'],
          is_active: true,
        });

      if (userInsertError) {
        console.error('Error inserting user:', userInsertError);
      }

      // Insert into profiles table if it exists
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          first_name: first_name || providerData.name.split(' ')[0],
          last_name: last_name || providerData.name.split(' ').slice(1).join(' '),
        });

      if (profileError) {
        console.error('Error inserting profile:', profileError);
      }

      // Get or create provider role
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'provider')
        .single();

      if (roleData) {
        // Insert into user_roles table
        const { error: userRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: roleData.id,
          });

        if (userRoleError) {
          console.error('Error inserting user role:', userRoleError);
        }
      }
    }

    // Create provider with user_id link (password only stored in Supabase Auth)
    const { error } = await supabase
      .from('providers')
      .insert([{ 
        ...providerData, 
        user_id: userId,
        login_email: login_email || null,
      }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error creating provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create provider' },
      { status: 500 }
    );
  }
}
