import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    await requireAnyRole(request, ['operations_manager', 'system_admin', 'admin']);
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
    const { data, error } = await supabase
      .from('members')
      .update({
        payment_group_id: null,
        collection_method: 'individual_debit_order',
      })
      .eq('id', params.memberId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing member from group:', error);
    return NextResponse.json({ error: 'Failed to remove member from group' }, { status: 500 });
  }
}
