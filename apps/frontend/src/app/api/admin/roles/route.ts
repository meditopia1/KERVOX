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

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);

    const [rolesResult, userRolesResult, rolePermissionsResult, permissionsResult] = await Promise.all([
      supabase.from('roles').select('id, name, description, created_at').order('name', { ascending: true }),
      supabase.from('user_roles').select('user_id, role_id'),
      supabase.from('role_permissions').select('role_id, permission_id'),
      supabase.from('permissions').select('id'),
    ]);

    if (rolesResult.error) throw rolesResult.error;
    if (userRolesResult.error) throw userRolesResult.error;
    if (rolePermissionsResult.error) throw rolePermissionsResult.error;
    if (permissionsResult.error) throw permissionsResult.error;

    const roleUserCounts = new Map<string, Set<string>>();
    for (const assignment of userRolesResult.data || []) {
      if (!roleUserCounts.has(assignment.role_id)) {
        roleUserCounts.set(assignment.role_id, new Set());
      }
      roleUserCounts.get(assignment.role_id)!.add(assignment.user_id);
    }

    const rolePermissionCounts = new Map<string, Set<string>>();
    for (const assignment of rolePermissionsResult.data || []) {
      if (!rolePermissionCounts.has(assignment.role_id)) {
        rolePermissionCounts.set(assignment.role_id, new Set());
      }
      rolePermissionCounts.get(assignment.role_id)!.add(assignment.permission_id);
    }

    const rolePriority: Record<string, number> = {
      system_admin: 0,
      admin: 1,
    };

    const roles = (rolesResult.data || [])
      .map((role) => ({
        id: role.id,
        name: role.name,
        description:
          role.name === 'admin'
            ? 'Legacy admin alias'
            : role.description,
        users: roleUserCounts.get(role.id)?.size || 0,
        permissions: rolePermissionCounts.get(role.id)?.size || 0,
        created_at: role.created_at,
      }))
      .sort((a, b) => {
        const priorityA = rolePriority[a.name] ?? 100;
        const priorityB = rolePriority[b.name] ?? 100;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return a.name.localeCompare(b.name);
      });

    const totalUsers = new Set((userRolesResult.data || []).map((assignment) => assignment.user_id)).size;

    return NextResponse.json({
      roles,
      totals: {
        roles: roles.length,
        users: totalUsers,
        permissions: permissionsResult.data?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
