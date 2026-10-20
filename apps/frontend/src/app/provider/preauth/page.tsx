'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth-fetch';

interface PreauthItem {
  id: string;
  preauth_number: string;
  service_date: string;
  estimated_cost: number | string;
  urgency: string;
  status: string;
  requested_date: string;
  valid_until: string | null;
  diagnosis_codes: string[] | null;
  procedure_codes: string[] | null;
  members?: {
    member_number?: string;
    first_name?: string;
    last_name?: string;
    plan_name?: string;
  } | null;
}

export default function ProviderPreauthPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<PreauthItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchRequests();
    }
  }, [isAuthenticated, user, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await authFetch(`/api/provider/preauth${params.toString() ? `?${params}` : ''}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pre-authorizations');
      }

      setRequests(data.preauths || []);
    } catch (error) {
      console.error('Error fetching provider pre-authorizations:', error);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Pre-Authorization Requests"
          description="Track requests submitted for your members and procedures"
          message="Opening pre-authorization requests..."
        />
      </SidebarLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (loadingRequests) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Pre-Authorization Requests"
          description="Track requests submitted for your members and procedures"
          message="Loading provider requests..."
        />
      </SidebarLayout>
    );
  }

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pre-Authorization Requests</h1>
            <p className="text-gray-600 mt-1">Track requests submitted for your members and procedures</p>
          </div>
          <Button onClick={() => router.push('/provider/preauth/submit')}>+ New Request</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Requests</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <Button variant="outline" onClick={() => setStatusFilter('')}>Clear</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Requests</CardTitle>
            <CardDescription>{requests.length} request(s) found</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No pre-authorization requests found.</p>
                <Button className="mt-4" onClick={() => router.push('/provider/preauth/submit')}>
                  Submit Your First Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{request.preauth_number}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(request.status)}`}>
                            {request.status}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {request.urgency}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          Member: {request.members?.first_name || 'Unknown'} {request.members?.last_name || ''}
                          {request.members?.member_number ? ` (${request.members.member_number})` : ''}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                          <p>Service Date: {request.service_date || 'N/A'}</p>
                          <p>Estimated Cost: R{Number(request.estimated_cost || 0).toLocaleString('en-ZA')}</p>
                          <p>Requested: {request.requested_date ? new Date(request.requested_date).toLocaleDateString('en-ZA') : 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <p>Diagnosis: {(request.diagnosis_codes || []).join(', ') || 'N/A'}</p>
                          <p>Procedure: {(request.procedure_codes || []).join(', ') || 'N/A'}</p>
                        </div>
                        {request.valid_until && (
                          <p className="text-sm text-gray-600">
                            Valid Until: {new Date(request.valid_until).toLocaleDateString('en-ZA')}
                          </p>
                        )}
                      </div>
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
