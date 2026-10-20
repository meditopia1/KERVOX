'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  is_active: boolean;
  user_id: string | null;
  login_email: string | null;
  login_password: string | null;
  created_at: string;
  updated_at: string;
}

export default function OperationsProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && params.id) {
      fetchProvider();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, params.id]);

  async function fetchProvider() {
    try {
      setIsLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', params.id as string)
        .single();

      if (error) throw error;

      setProvider(data);
    } catch (err: any) {
      console.error('Error fetching provider:', err);
      setError(err.message || 'Failed to load provider');
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading || isLoading) {
    return <PageLoading message="Loading provider details..." />;
  }

  if (!loading && !user) {
    return null;
  }

  if (error && !provider) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Provider Not Found</h1>
            <Button variant="outline" onClick={() => router.push('/operations/providers')}>
              Back to Directory
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Provider Details</h1>
            <p className="text-gray-600 mt-1">{provider?.provider_number}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/operations/providers')}>
            Back to Directory
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Provider Information</CardTitle>
              {provider && getStatusBadge(provider.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Provider Number</label>
                <p className="text-gray-900 font-mono">{provider?.provider_number}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{provider?.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Profession</label>
                <p className="text-gray-900">{provider?.profession}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Practice Name</label>
                <p className="text-gray-900">{provider?.practice_name || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{provider?.tel || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Fax</label>
                <p className="text-gray-900">{provider?.fax || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{provider?.email || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Practice Number (PRNO)</label>
                <p className="text-gray-900">{provider?.prno || '-'}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <p className="text-gray-900">{provider?.address || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Suburb</label>
                <p className="text-gray-900">{provider?.suburb || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Region</label>
                <p className="text-gray-900">{provider?.region || '-'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Province</label>
                <p className="text-gray-900">{provider?.disp_province || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {provider && (
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Created At</p>
                  <p className="text-gray-900">{new Date(provider.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="text-gray-900">{new Date(provider.updated_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Provider ID</p>
                  <p className="text-gray-900 font-mono text-xs">{provider.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}
