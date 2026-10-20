import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['call_centre_agent', 'operations_manager', 'admin', 'system_admin']);

    const supabaseAdmin = createServerSupabaseClient();
    const { data: applications, error } = await supabaseAdmin
      .from('applications')
      .select(`
        *,
        contact:contacts(
          id,
          email,
          first_name,
          last_name,
          mobile,
          marketing_consent,
          source,
          tags
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const applicationsWithDependents = await Promise.all(
      (applications || []).map(async (app) => {
        const { data: dependents } = await supabaseAdmin
          .from('application_dependents')
          .select('*')
          .eq('application_id', app.id);

        return {
          ...app,
          dependents: dependents || []
        };
      })
    );

    const { count: memberCount } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true });

    const stats = {
      total: applicationsWithDependents.length + (memberCount || 0),
      submitted: applicationsWithDependents.filter((a) => a.status === 'submitted').length,
      under_review: applicationsWithDependents.filter((a) => a.status === 'under_review').length,
      approved: memberCount || 0,
      rejected: applicationsWithDependents.filter((a) => a.status === 'rejected').length,
    };

    return NextResponse.json({
      applications: applicationsWithDependents,
      stats
    });
  } catch (error) {
    console.error('Failed to fetch call centre applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAnyRole(request, ['call_centre_agent', 'operations_manager', 'admin', 'system_admin']);
    const supabaseAdmin = createServerSupabaseClient();
    const body = await request.json();
    const { applicationId, status, reviewNotes } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    if (user.roles.includes('call_centre_agent')) {
      if (status !== 'under_review') {
        return NextResponse.json(
          { error: 'Call centre can only move applications to under_review' },
          { status: 403 }
        );
      }
    }

    const { data: application, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ application: data });
  } catch (error) {
    console.error('Failed to update call centre application:', error);
    return NextResponse.json(
      { error: 'Failed to update application', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
