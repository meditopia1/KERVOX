import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Require claims assessor, admin, or operations manager role
    await requireAnyRole(request, ['claims', 'admin', 'operations_manager']);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected, expired
    const urgency = searchParams.get('urgency'); // routine, urgent, emergency

    // Build query
    let query = supabaseAdmin
      .from('pre_authorizations')
      .select(`
        *,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name,
          email,
          mobile,
          plan_name,
          date_of_birth,
          id_number
        ),
        providers:provider_id (
          id,
          provider_number,
          name,
          practice_name,
          type,
          email,
          phone
        )
      `)
      .order('requested_date', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by urgency if provided
    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data: preauths, error } = await query;

    if (error) {
      console.error('Error fetching pre-authorizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pre-authorizations', details: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: preauths?.length || 0,
      pending: preauths?.filter(p => p.status === 'pending').length || 0,
      approved: preauths?.filter(p => p.status === 'approved').length || 0,
      rejected: preauths?.filter(p => p.status === 'rejected').length || 0,
      expired: preauths?.filter(p => p.status === 'expired').length || 0,
      urgent: preauths?.filter(p => p.urgency === 'urgent').length || 0,
      emergency: preauths?.filter(p => p.urgency === 'emergency').length || 0
    };

    return NextResponse.json({
      preauths: preauths || [],
      stats
    });

  } catch (error: any) {
    console.error('Error in pre-authorization GET API:', error);
    
    // Handle authentication errors
    if (error.message.includes('Access denied') || error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Access denied') ? 403 : 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
