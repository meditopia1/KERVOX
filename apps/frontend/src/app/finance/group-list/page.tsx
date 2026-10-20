'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

interface PaymentGroup {
  id: string;
  group_code: string;
  group_name: string;
  company_name: string;
  collection_method: string;
  status: string;
  total_members: number;
  total_monthly_premium: number;
}

export default function FinanceGroupListPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups();
    }
  }, [isAuthenticated]);

  const fetchGroups = async () => {
    try {
      setDataLoading(true);
      const response = await authFetch('/api/operations/payment-groups');
      const data = await response.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load finance group list:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Group List"
          description="View finance-accessible payment groups"
          message="Loading group list..."
        />
      </SidebarLayout>
    );
  }

  if (!isAuthenticated) return null;

  const filteredGroups = groups.filter((group) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      group.group_name.toLowerCase().includes(term) ||
      group.company_name.toLowerCase().includes(term) ||
      group.group_code.toLowerCase().includes(term)
    );
  });

  return (
    <SidebarLayout>
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group List</h1>
            <p className="text-gray-600 mt-1">Read-only view of payment groups for finance</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/finance/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Input
              placeholder="Search group name, company, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Payment Groups ({filteredGroups.length})</h2>
                <p className="text-sm text-gray-500">Finance can review group membership and collection setup</p>
              </div>
            </div>

            {dataLoading ? (
              <div className="py-12 text-center text-gray-500">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No groups found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4">Group</th>
                      <th className="text-left py-3 pr-4">Company</th>
                      <th className="text-left py-3 pr-4">Method</th>
                      <th className="text-left py-3 pr-4">Members</th>
                      <th className="text-left py-3 pr-4">Premium</th>
                      <th className="text-left py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((group) => (
                      <tr key={group.id} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{group.group_name}</div>
                          <div className="text-xs text-gray-500">{group.group_code}</div>
                        </td>
                        <td className="py-3 pr-4">{group.company_name}</td>
                        <td className="py-3 pr-4 capitalize">{group.collection_method.replace(/_/g, ' ')}</td>
                        <td className="py-3 pr-4">{group.total_members}</td>
                        <td className="py-3 pr-4">R {Number(group.total_monthly_premium || 0).toFixed(2)}</td>
                        <td className="py-3 pr-4 capitalize">{group.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
