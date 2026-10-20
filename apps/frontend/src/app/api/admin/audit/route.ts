import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyRole } from '@/lib/auth-server';

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

const getStartOfDayIso = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
};

const getDateLowerBound = (dateRange: string) => {
  if (dateRange === 'today') return getStartOfDayIso();
  if (dateRange === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (dateRange === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null;
};

const safeString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const toIsoTimestamp = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const sourceFilter = searchParams.get('source') || 'all';
    const dateRange = searchParams.get('date_range') || 'today';
    const limit = Math.max(1, Number(searchParams.get('limit') || '100'));
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'));
    const dateLowerBound = getDateLowerBound(dateRange);

    const fetchUsers = async (userIds: string[]) => {
      if (userIds.length === 0) return new Map<string, { id: string; email: string }>();

      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (error) throw error;

      return new Map((data || []).map((user) => [user.id, user]));
    };

    const fetchPlatformEvents = async () => {
      let query = supabase
        .from('audit_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dateLowerBound) {
        query = query.gte('created_at', dateLowerBound);
      }

      if (sourceFilter === 'platform') {
        // no-op, kept for consistency with the other sources
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((row: any) => row.user_id).filter(Boolean))];
      const usersMap = await fetchUsers(userIds);

      const rows = (data || []).map((row: any) => {
        const user = row.user_id ? usersMap.get(row.user_id) : null;
        const event = row.event_type || row.action || 'event';
        const entity = row.resource_type || 'Platform';
        const details = safeString(row.details || row.description || row.message || row.metadata || 'Platform event recorded');

        return {
          id: `audit_events:${row.id}`,
          timestamp: toIsoTimestamp(row.created_at),
          user: user?.email || row.user_email || 'System',
          source: 'Platform',
          event,
          entity,
          action: row.action || event,
          resource_type: row.resource_type || null,
          resource_id: row.resource_id || null,
          details,
          previous_status: null,
          new_status: null,
        };
      });

      return { rows, count: count || 0 };
    };

    const fetchClaimEvents = async () => {
      let query = supabase
        .from('claim_audit_trail')
        .select('id, claim_id, action, performed_by, previous_status, new_status, notes, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dateLowerBound) {
        query = query.gte('created_at', dateLowerBound);
      }

      if (sourceFilter === 'claims') {
        // no-op
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const claimIds = [...new Set((data || []).map((row) => row.claim_id).filter(Boolean))];
      const userIds = [...new Set((data || []).map((row) => row.performed_by).filter(Boolean))];

      const [claimsResult, usersMap] = await Promise.all([
        claimIds.length > 0
          ? supabase.from('claims').select('id, claim_number, status').in('id', claimIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        fetchUsers(userIds),
      ]);

      if (claimsResult.error) throw claimsResult.error;

      const claimsMap = new Map(claimsResult.data?.map((claim) => [claim.id, claim]) || []);

      const rows = (data || []).map((row) => {
        const claim = claimsMap.get(row.claim_id);
        const user = row.performed_by ? usersMap.get(row.performed_by) : null;
        const details = `${claim?.claim_number || 'Claim'} ${row.notes || row.new_status || row.action}`;

        return {
          id: `claim_audit_trail:${row.id}`,
          timestamp: row.created_at,
          user: user?.email || 'System',
          source: 'Claims',
          event: row.action,
          entity: 'Claim',
          action: row.action,
          resource_type: 'Claim',
          resource_id: row.claim_id || null,
          details,
          claim_number: claim?.claim_number || null,
          previous_status: row.previous_status,
          new_status: row.new_status,
        };
      });

      return { rows, count: count || 0 };
    };

    const fetchPreauthEvents = async () => {
      let query = supabase
        .from('preauth_audit_trail')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dateLowerBound) {
        query = query.gte('created_at', dateLowerBound);
      }

      if (sourceFilter === 'preauth') {
        // no-op
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((row: any) => row.performed_by).filter(Boolean))];
      const usersMap = await fetchUsers(userIds);

      const rows = (data || []).map((row: any) => {
        const user = row.performed_by ? usersMap.get(row.performed_by) : null;
        const resourceType = row.resource_type || 'Preauth';
        const resourceId = row.preauth_id || row.preauth_id || row.id || null;
        const details = safeString(row.notes || row.new_status || row.action || row.metadata || 'Preauth event recorded');

        return {
          id: `preauth_audit_trail:${row.id}`,
          timestamp: toIsoTimestamp(row.created_at),
          user: user?.email || row.user_email || 'System',
          source: 'Preauth',
          event: row.action || 'event',
          entity: resourceType,
          action: row.action || 'event',
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          claim_number: null,
          previous_status: row.previous_status || null,
          new_status: row.new_status || null,
        };
      });

      return { rows, count: count || 0 };
    };

    const fetchPlans: Array<{ source: 'platform' | 'claims' | 'preauth'; promise: Promise<{ rows: any[]; count: number }> }> = [];

    if (sourceFilter === 'all' || sourceFilter === 'platform') {
      fetchPlans.push({ source: 'platform', promise: fetchPlatformEvents() });
    }

    if (sourceFilter === 'all' || sourceFilter === 'claims') {
      fetchPlans.push({ source: 'claims', promise: fetchClaimEvents() });
    }

    if (sourceFilter === 'all' || sourceFilter === 'preauth') {
      fetchPlans.push({ source: 'preauth', promise: fetchPreauthEvents() });
    }

    const resolved = await Promise.all(
      fetchPlans.map(async (plan) => ({
        source: plan.source,
        ...(await plan.promise),
      }))
    );

    const platformResult = resolved.find((result) => result.source === 'platform') || { source: 'platform', rows: [], count: 0 };
    const claimResult = resolved.find((result) => result.source === 'claims') || { source: 'claims', rows: [], count: 0 };
    const preauthResult = resolved.find((result) => result.source === 'preauth') || { source: 'preauth', rows: [], count: 0 };

    const allRows = [...resolved.flatMap((result) => result.rows)]
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    const filteredRows = search
      ? allRows.filter((row) => {
          const haystack = [
            row.source,
            row.user,
            row.event,
            row.entity,
            row.action,
            row.details,
            row.claim_number,
            row.previous_status,
            row.new_status,
            row.resource_type,
            row.resource_id,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(search);
        })
      : allRows;

    const todayStart = getStartOfDayIso();
    const todayEvents = filteredRows.filter((row) => row.timestamp >= todayStart).length;

    return NextResponse.json({
      events: filteredRows,
      stats: {
        totalEvents: resolved.reduce((sum, result) => sum + result.count, 0),
        todayEvents,
        platformEvents: sourceFilter === 'all' || sourceFilter === 'platform' ? platformResult.count : 0,
        workflowEvents:
          (sourceFilter === 'all' || sourceFilter === 'claims' ? claimResult.count : 0) +
          (sourceFilter === 'all' || sourceFilter === 'preauth' ? preauthResult.count : 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
