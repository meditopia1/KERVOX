'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

interface MemberRow {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  email: string;
  phone: string;
  brokerName: string;
  product: string;
  monthlyPremium: number;
  joinDate: string;
}

export default function FinanceMemberListPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembers();
    }
  }, [isAuthenticated]);

  const fetchMembers = async () => {
    try {
      setDataLoading(true);
      const params = new URLSearchParams({ page_size: '25', include_dependants: 'true' });
      if (search.trim()) params.set('search', search.trim());
      const response = await authFetch(`/api/operations/members?${params.toString()}`);
      const data = await response.json();
      setMembers(data.members || []);
      setTotalCount(data.count || data.members?.length || 0);
    } catch (error) {
      console.error('Failed to load finance member list:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Member List"
          description="View finance-accessible member records"
          message="Loading member list..."
        />
      </SidebarLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarLayout>
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member List</h1>
            <p className="text-gray-600 mt-1">Read-only view of active member records for finance</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/finance/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Search name, member number, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchMembers();
                }}
              />
              <Button onClick={fetchMembers}>Search</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Members ({totalCount})</h2>
                <p className="text-sm text-gray-500">Showing the first 25 records by default</p>
              </div>
            </div>

            {dataLoading ? (
              <div className="py-12 text-center text-gray-500">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No members found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4">Member</th>
                      <th className="text-left py-3 pr-4">Plan</th>
                      <th className="text-left py-3 pr-4">Status</th>
                      <th className="text-left py-3 pr-4">Contact</th>
                      <th className="text-left py-3 pr-4">Premium</th>
                      <th className="text-left py-3 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{member.firstName} {member.lastName}</div>
                          <div className="text-xs text-gray-500">{member.memberNumber}</div>
                        </td>
                        <td className="py-3 pr-4">{member.product}</td>
                        <td className="py-3 pr-4 capitalize">{member.status}</td>
                        <td className="py-3 pr-4">
                          <div>{member.email}</div>
                          <div className="text-xs text-gray-500">{member.phone}</div>
                        </td>
                        <td className="py-3 pr-4">R {member.monthlyPremium.toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/operations/members/${member.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
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
