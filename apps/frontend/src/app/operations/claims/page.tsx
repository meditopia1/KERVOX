'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/auth-fetch';

interface Claim {
  id: string;
  claim_number: string;
  status: string;
  claim_type?: string;
  benefit_type?: string;
  claimed_amount?: number | string;
  approved_amount?: number | string;
  service_date?: string;
  submission_date?: string;
  members?: {
    member_number?: string;
    first_name?: string;
    last_name?: string;
    plan_name?: string;
  };
  providers?: {
    provider_number?: string;
    name?: string;
    practice_name?: string;
  };
}

interface ClaimStats {
  total: number;
  pending: number;
  pended: number;
  approved: number;
  paid: number;
  rejected: number;
  high_value: number;
  total_claimed: number;
  total_approved: number;
  avg_processing_time: number;
}

const emptyStats: ClaimStats = {
  total: 0,
  pending: 0,
  pended: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
  high_value: 0,
  total_claimed: 0,
  total_approved: 0,
  avg_processing_time: 0,
};

export default function OperationsClaimsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<ClaimStats>(emptyStats);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user) {
      fetchClaims();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, searchTerm, statusFilter]);

  const fetchClaims = async () => {
    try {
      setPageLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);

      const response = await authFetch(`/api/claims${params.toString() ? `?${params.toString()}` : ''}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load claims');
      }

      const rows = data.claims || [];
      setClaims(rows as Claim[]);
      setStats({
        total: data.stats?.total || rows.length || 0,
        pending: data.stats?.pending || 0,
        pended: data.stats?.pended || 0,
        approved: data.stats?.approved || 0,
        paid: data.stats?.paid || 0,
        rejected: data.stats?.rejected || 0,
        high_value: data.stats?.high_value || 0,
        total_claimed: data.stats?.total_claimed || 0,
        total_approved: data.stats?.total_approved || 0,
        avg_processing_time: data.stats?.avg_processing_time || 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch claims:', err);
      setError(err.message || 'Failed to load claims');
      setClaims([]);
      setStats(emptyStats);
    } finally {
      setPageLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
  };

  const formatCurrency = (value?: number | string) => {
    const amount = Number(value || 0);
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-ZA');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      pended: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading || (pageLoading && claims.length === 0)) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!loading && !user) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims Oversight</h1>
          <p className="text-gray-600 mt-1">Claims activity and operational monitoring</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Total Claims</p><p className="text-3xl font-bold mt-1">{stats.total}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Pending</p><p className="text-3xl font-bold mt-1 text-yellow-600">{stats.pending + stats.pended}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Approved/Paid</p><p className="text-3xl font-bold mt-1 text-green-600">{stats.approved + stats.paid}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">High Value</p><p className="text-3xl font-bold mt-1 text-red-600">{stats.high_value}</p></div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Total Claimed</p><p className="text-2xl font-bold mt-1">{formatCurrency(stats.total_claimed)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Total Approved</p><p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(stats.total_approved)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm text-gray-600">Avg Processing</p><p className="text-2xl font-bold mt-1">{stats.avg_processing_time}h</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Claim number, member, provider..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                  <Button onClick={handleSearch}>Search</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="pended">Pended</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claims Register</CardTitle>
            <CardDescription>Showing {claims.length} claims</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {claims.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No claims found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Claim</th>
                      <th className="text-left py-3 px-4 font-medium">Member</th>
                      <th className="text-left py-3 px-4 font-medium">Provider</th>
                      <th className="text-left py-3 px-4 font-medium">Service Date</th>
                      <th className="text-right py-3 px-4 font-medium">Claimed</th>
                      <th className="text-right py-3 px-4 font-medium">Approved</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => {
                      const memberName = [claim.members?.first_name, claim.members?.last_name].filter(Boolean).join(' ') || '-';
                      const providerName = claim.providers?.practice_name || claim.providers?.name || '-';

                      return (
                        <tr key={claim.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-mono text-sm font-medium">{claim.claim_number}</p>
                            <p className="text-xs text-gray-500">{claim.claim_type || claim.benefit_type || 'General'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium">{memberName}</p>
                            <p className="text-xs text-gray-500">{claim.members?.member_number || '-'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p>{providerName}</p>
                            <p className="text-xs text-gray-500">{claim.providers?.provider_number || '-'}</p>
                          </td>
                          <td className="py-3 px-4">{formatDate(claim.service_date || claim.submission_date)}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(claim.claimed_amount)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(claim.approved_amount)}</td>
                          <td className="py-3 px-4">{getStatusBadge(claim.status || 'pending')}</td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" onClick={() => router.push(`/operations/claims/${claim.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
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
