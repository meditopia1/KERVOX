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
    await requireAnyRole(request, ['claims', 'admin', 'system_admin']);
    
    // Fetch all claims for statistics
    const { data: claims, error } = await supabaseAdmin
      .from('claims')
      .select('*')
      .order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
      return NextResponse.json(
        { error: 'Failed to fetch claims', details: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      // Queue counts
      pending_review: claims?.filter(c => c.status === 'pending').length || 0,
      pended_claims: claims?.filter(c => c.status === 'pended').length || 0,
      high_value_claims: claims?.filter(c => parseFloat(c.claimed_amount) > 50000).length || 0,
      
      // PMB and Fraud
      pmb_claims: claims?.filter(c => c.is_pmb).length || 0,
      fraud_alerts: claims?.filter(c => c.fraud_alert_triggered).length || 0,
      
      // Processing metrics
      total_claims: claims?.length || 0,
      approved_claims: claims?.filter(c => c.status === 'approved').length || 0,
      rejected_claims: claims?.filter(c => c.status === 'rejected').length || 0,
      paid_claims: claims?.filter(c => c.status === 'paid').length || 0,
      
      // Financial metrics
      total_claimed: claims?.reduce((sum, c) => sum + parseFloat(c.claimed_amount || 0), 0) || 0,
      total_approved: claims?.reduce((sum, c) => sum + parseFloat(c.approved_amount || 0), 0) || 0,
      
      // Time metrics
      avg_processing_time: (() => {
        const completedClaims = claims?.filter(c => c.processing_time_hours !== null) || [];
        if (completedClaims.length === 0) return 0;
        const totalHours = completedClaims.reduce((sum, c) => sum + parseFloat(c.processing_time_hours || 0), 0);
        return Math.round((totalHours / completedClaims.length) * 10) / 10;
      })(),
      
      // Recent activity (last 30 days)
      recent_submissions: claims?.filter(c => {
        const submissionDate = new Date(c.submission_date);
        return submissionDate >= thirtyDaysAgo;
      }).length || 0,
    };

    return NextResponse.json({ stats });

  } catch (error: any) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
