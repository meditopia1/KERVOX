import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient, requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const GOP_NOTIFICATION_ROLES = [
  'claims',
  'claims_assessor',
  'admin',
  'system_admin',
  'africa_assist_authorization',
];

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, GOP_NOTIFICATION_ROLES);

    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from('hospital_claim_intakes')
      .select('id, intake_number, source_type, document_type, file_name, status, notification_status, created_at')
      .or('status.eq.new,notification_status.eq.new')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const newGopCount = data?.length || 0;

    return NextResponse.json({
      newGopCount,
      latestIntakes: data?.slice(0, 5) || [],
    });
  } catch (error) {
    console.error('Failed to fetch GOP notifications:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch GOP notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
