import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin', 'operations_manager']);
    
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // Auto-generate group_code from group_name if not provided
    if (!body.group_code && body.group_name) {
      const groupCode = body.group_name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      body.group_code = groupCode;
    }

    // Set group_type based on collection_method if not provided
    if (!body.group_type && body.collection_method) {
      body.group_type = body.collection_method === 'group_debit_order' ? 'debit_order_group' : 'eft_group';
    }

    const { data, error } = await supabase
      .from('payment_groups')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating payment group:', error);
    return NextResponse.json({ error: 'Failed to update payment group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin', 'operations_manager']);
    return NextResponse.json(
      {
        error: 'Payment group deletion is disabled. Use inactive/archived status instead.',
        code: 'DELETE_DISABLED'
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error deleting payment group:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete payment group' },
      { status: 500 }
    );
  }
}
