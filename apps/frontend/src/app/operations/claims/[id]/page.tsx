'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { PageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth-fetch';

interface ClaimDetail {
  claim: any;
  audit_trail: Array<any>;
  documents: Array<any>;
}

export default function OperationsClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [data, setData] = useState<ClaimDetail | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && params.id) {
      fetchClaim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, params.id]);

  const fetchClaim = async () => {
    try {
      setPageLoading(true);
      setError('');

      const response = await authFetch(`/api/claims/${params.id}`, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load claim');
      }

      setData(result);
    } catch (err: any) {
      console.error('Error loading claim:', err);
      setError(err.message || 'Failed to load claim');
      setData(null);
    } finally {
      setPageLoading(false);
    }
  };

  const formatCurrency = (value?: number | string) => {
    const amount = Number(value || 0);
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading || pageLoading) {
    return <PageLoading message="Loading claim details..." />;
  }

  if (!loading && !user) {
    return null;
  }

  if (error && !data) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Claim Not Found</h1>
            <Button variant="outline" onClick={() => router.push('/operations/claims')}>
              Back to Claims
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

  const claim = data?.claim;
  const member = claim?.members?.[0] || claim?.members || null;
  const provider = claim?.providers?.[0] || claim?.providers || null;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claim Details</h1>
            <p className="text-gray-600 mt-1">{claim?.claim_number}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/operations/claims')}>
            Back to Claims
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Claim Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Claim Number</p>
                <p className="font-mono text-gray-900">{claim?.claim_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-gray-900">{String(claim?.status || '-').toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Claim Type</p>
                <p className="text-gray-900">{claim?.claim_type || claim?.benefit_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Service Date</p>
                <p className="text-gray-900">{claim?.service_date ? new Date(claim.service_date).toLocaleDateString('en-ZA') : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Claimed Amount</p>
                <p className="text-gray-900 font-medium">{formatCurrency(claim?.claimed_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved Amount</p>
                <p className="text-gray-900 font-medium">{formatCurrency(claim?.approved_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-gray-900">
                  {[member?.first_name, member?.last_name].filter(Boolean).join(' ') || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Number</p>
                <p className="text-gray-900 font-mono">{member?.member_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-gray-900">{member?.plan_name || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-gray-900">{provider?.practice_name || provider?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Provider Number</p>
                <p className="text-gray-900 font-mono">{provider?.provider_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-gray-900">{provider?.provider_type || provider?.type || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.audit_trail?.length ? (
              <div className="space-y-3">
                {data.audit_trail.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{entry.action}</p>
                        <p className="text-sm text-gray-600">{entry.notes || 'No notes'}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('en-ZA') : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No audit trail found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.documents?.length ? (
              <div className="space-y-3">
                {data.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <p className="font-medium text-gray-900">{doc.document_type || 'Document'}</p>
                      <p className="text-sm text-gray-600">{doc.file_name || doc.document_url || doc.url || '-'}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-ZA') : '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No documents attached.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
