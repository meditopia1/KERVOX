'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Provider {
  id: string;
  provider_number: string;
  name: string;
  type: string;
  practice_name: string;
  region: string;
  suburb: string;
  address: string;
  status: string;
  profession: string;
  tel: string;
  fax: string;
  prno: string;
  email: string;
  disp_province: string;
}

export default function OperationsProvidersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
  });
  const pageSize = 25;

  useEffect(() => {
    if (!loading && user) {
      fetchProviders();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  async function fetchStats() {
    const [total, active, pending, inactive] = await Promise.all([
      supabase.from('providers').select('*', { count: 'exact', head: true }),
      supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('providers').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
    ]);

    setStats({
      total: total.count || 0,
      active: active.count || 0,
      pending: pending.count || 0,
      inactive: inactive.count || 0,
    });
  }

  async function fetchProviders(options?: { search?: string; status?: string }) {
    try {
      setIsLoading(true);
      setError('');

      const search = options?.search ?? searchTerm;
      const status = options?.status ?? statusFilter;

      let query = supabase
        .from('providers')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(0, pageSize - 1);

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,provider_number.ilike.%${search.trim()}%,practice_name.ilike.%${search.trim()}%`
        );
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      setProviders(data || []);
      setTotalCount(count || data?.length || 0);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.message || 'Failed to load providers');
      setProviders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = () => {
    setSearchTerm(searchInput);
    fetchProviders({ search: searchInput, status: statusFilter });
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  if (isLoading && providers.length === 0) {
    return <PageLoading message="Loading providers..." />;
  }

  if (!loading && !user) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Providers Directory</h1>
            <p className="text-gray-600 mt-1">View the healthcare provider directory</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-3xl font-bold mt-1 text-gray-600">{stats.inactive}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Name, provider number, practice..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                  />
                  <Button onClick={handleSearch} className="whitespace-nowrap">
                    Search
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setStatusFilter(nextStatus);
                    fetchProviders({ search: searchInput, status: nextStatus });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Click to select</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Provider Directory</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {providers.length} of {totalCount} providers
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {providers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No providers found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-medium">Provider Number</th>
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Practice</th>
                      <th className="text-left p-3 text-sm font-medium">Profession</th>
                      <th className="text-left p-3 text-sm font-medium">Phone</th>
                      <th className="text-left p-3 text-sm font-medium">Region</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm font-mono">{provider.provider_number}</td>
                        <td className="p-3 text-sm font-medium">{provider.name}</td>
                        <td className="p-3 text-sm">{provider.practice_name || '-'}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {provider.profession || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-sm">{provider.tel || '-'}</td>
                        <td className="p-3 text-sm">{provider.region || '-'}</td>
                        <td className="p-3 text-sm">{getStatusBadge(provider.status)}</td>
                        <td className="p-3 text-sm">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/operations/providers/${provider.id}`)}
                          >
                            View
                          </Button>
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
