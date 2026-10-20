'use client';

import { useEffect, useState } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth-fetch';

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  users: number;
  permissions: number;
  created_at: string;
}

interface RolesResponse {
  roles: RoleItem[];
  totals: {
    roles: number;
    users: number;
    permissions: number;
  };
}

const emptyTotals = {
  roles: 0,
  users: 0,
  permissions: 0,
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [totals, setTotals] = useState(emptyTotals);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await authFetch('/api/admin/roles', {
        cache: 'no-store',
      });
      const data: RolesResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load roles');
      }

      setRoles(data.roles || []);
      setTotals(data.totals || emptyTotals);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      setError(err.message || 'Failed to load roles');
      setRoles([]);
      setTotals(emptyTotals);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role & Permission Management</h1>
            <p className="text-gray-600 mt-1">Manage system roles and permissions (RBAC)</p>
          </div>
          <Button>+ Create Role</Button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Roles</p>
                <p className="text-3xl font-bold mt-1">{totals.roles}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold mt-1">{totals.users}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Permissions</p>
                <p className="text-3xl font-bold mt-1">{totals.permissions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center text-gray-600">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                <p className="mt-3 text-sm">Loading roles...</p>
              </div>
            ) : roles.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No roles found</div>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-lg">{role.description || role.name}</p>
                          <p className="text-sm text-gray-500 font-mono">{role.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mr-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{role.users}</p>
                        <p className="text-xs text-gray-500">Users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{role.permissions}</p>
                        <p className="text-xs text-gray-500">Permissions</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Permissions</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
