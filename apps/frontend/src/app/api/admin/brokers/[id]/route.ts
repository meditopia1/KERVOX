import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { data: broker, error } = await supabase
      .from('brokers')
      .update({
        name: body.name,
        broker_commission_rate: parseFloat(body.broker_commission_rate),
        branch_commission_rate: parseFloat(body.branch_commission_rate),
        agent_commission_rate: parseFloat(body.agent_commission_rate),
        policy_prefix: body.policy_prefix,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ broker })
  } catch (error: any) {
    console.error('Error updating broker:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update broker' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    return NextResponse.json(
      {
        error: 'Broker deletion is disabled. Use inactive/archived status instead.',
        code: 'DELETE_DISABLED'
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error deleting broker:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete broker' },
      { status: 500 }
    );
  }
}
