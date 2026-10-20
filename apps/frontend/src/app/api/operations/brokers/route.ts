import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['operations_manager', 'system_admin', 'admin']);

    const supabase = createServerSupabaseClient();

    const { data: brokers, error } = await supabase
      .from('brokers')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('Brokers query error:', error);
      throw error;
    }

    const brokersWithCounts = await Promise.all(
      (brokers || []).map(async (broker) => {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('broker_id', broker.id)
          .eq('status', 'active');

        return {
          ...broker,
          member_count: count || 0,
        };
      })
    );

    return NextResponse.json({ brokers: brokersWithCounts });
  } catch (error) {
    console.error('Error fetching brokers:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch brokers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
