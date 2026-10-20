import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['operations_manager', 'system_admin', 'admin', 'finance_manager']);

    const { data, error } = await supabase
      .from('payment_groups')
      .select('*')
      .order('group_name');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching payment groups:', error);
    return NextResponse.json({ error: 'Failed to fetch payment groups' }, { status: 500 });
  }
}
