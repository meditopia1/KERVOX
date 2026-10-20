import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/auth-server';

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
    // Require provider authentication
    const user = await requireRole(request, 'provider');
    
    const providerId = user.providerId;
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID not found' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected, expired

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
          plan_name
        )
      `)
      .eq('provider_id', providerId)
      .order('requested_date', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: preauths, error } = await query;

    if (error) {
      console.error('Error fetching pre-authorizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pre-authorizations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preauths: preauths || [],
      count: preauths?.length || 0
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
