import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function authorized(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  if (!user.roles.some((role) => ['marketing_manager', 'admin', 'system_admin'].includes(role))) {
    return { response: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  }
  return { response: null };
}

export async function GET(request: NextRequest) {
  const { response } = await authorized(request);
  if (response) return response;
  try {
    const { data, error } = await createServerSupabaseClient()
      .from('marketplace_requests')
      .select('id,request_type,full_name,email,company,product_name,category,item_condition,quantity,details,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Marketplace requests fetch failed:', error);
    return NextResponse.json({ error: 'Unable to load marketplace requests.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const { response } = await authorized(request);
  if (response) return response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) ||
    !['new', 'contacted', 'closed'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  try {
    const { data, error } = await createServerSupabaseClient()
      .from('marketplace_requests')
      .update({ status: body.status })
      .eq('id', body.id)
      .select('id,status')
      .single();
    if (error || !data) throw error || new Error('Request not found');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Marketplace request update failed:', error);
    return NextResponse.json({ error: 'Unable to update request.' }, { status: 503 });
  }
}
