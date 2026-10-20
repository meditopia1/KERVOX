'use client';

import { useEffect, useState } from 'react';
import { Building2, CheckCircle, Clock3, DollarSign, FileText, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardMetricCard } from '@/components/dashboard/dashboard-metric-card';
import { authFetch } from '@/lib/auth-fetch';

function formatPersonName(value?: string) {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    totalApproved: 0,
    totalPending: 0,
  });
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProviderClaims();
    }
  }, [isAuthenticated, user]);

  const fetchProviderClaims = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      const response = await authFetch('/api/provider/claims?limit=5');
      const data = await response.json();

      const apiStats = data.stats || {};
      setStats({
        totalClaims: apiStats.totalClaims ?? apiStats.total ?? 0,
        pendingClaims: apiStats.pendingClaims ?? apiStats.pending ?? 0,
        approvedClaims: apiStats.approvedClaims ?? apiStats.approved ?? 0,
        totalApproved: apiStats.totalApproved ?? apiStats.total_approved ?? 0,
        totalPending: apiStats.totalPending ?? apiStats.total_pending ?? 0,
      });
      setRecentClaims(data.claims || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Provider Dashboard"
          description="Preparing your provider overview"
          message="Loading provider claims, payments, and practice details..."
        />
      </SidebarLayout>
    );
  }

  if (!user) return null;

  const providerSurname = formatPersonName(user.doctorSurname) || formatPersonName(user.lastName) || 'Provider';
  const providerPracticeName = user.practiceName?.trim() || 'Not set';
  const providerNumber = user.providerNumber?.trim() || 'Not set';

  if (loading || loadingData) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Provider Dashboard"
          description={`Welcome back, Dr. ${providerSurname}! Here's your provider overview`}
          message="Loading provider claims, payments, and practice details..."
        />
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, Dr. {providerSurname}! Here's your provider overview</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Provider Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">Practice Name</p>
                  <p className="text-lg font-semibold mt-1 text-gray-900">{providerPracticeName}</p>
                  <p className="text-xs text-gray-500 mt-1">Registered provider practice</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Provider Number</p>
                  <p className="text-lg font-semibold mt-1 text-gray-900 font-mono">{providerNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">Unique provider identifier</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-cyan-600" />
                  </div>
                  <p className="text-sm text-gray-600">Login Email</p>
                  <p className="text-lg font-semibold mt-1 text-gray-900 break-all">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Provider account contact</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardMetricCard
            title="Claims This Month"
            value={stats.totalClaims}
            subtitle={stats.totalClaims === 0 ? 'No claims yet' : 'Total submitted'}
            icon={<FileText className="w-6 h-6 text-green-600" />}
            accentColor="rgba(16, 185, 129, 1)"
            glowFrom="rgba(16, 185, 129, 0.075)"
            glowTo="rgba(16, 185, 129, 0.2)"
            iconBackgroundClassName="bg-green-100"
          />
          <DashboardMetricCard
            title="Pending Claims"
            value={stats.pendingClaims}
            subtitle={stats.pendingClaims === 0 ? 'No pending claims' : 'Awaiting review'}
            icon={<Clock3 className="w-6 h-6 text-yellow-600" />}
            accentColor="rgba(234, 179, 8, 1)"
            glowFrom="rgba(234, 179, 8, 0.075)"
            glowTo="rgba(234, 179, 8, 0.2)"
            valueClassName="text-yellow-600"
            iconBackgroundClassName="bg-yellow-100"
          />
          <DashboardMetricCard
            title="Approved Amount"
            value={`R${stats.totalApproved.toLocaleString()}`}
            subtitle={`${stats.approvedClaims} claims approved`}
            icon={<DollarSign className="w-6 h-6 text-green-600" />}
            accentColor="rgba(34, 197, 94, 1)"
            glowFrom="rgba(34, 197, 94, 0.075)"
            glowTo="rgba(34, 197, 94, 0.2)"
            iconBackgroundClassName="bg-green-100"
          />
          <DashboardMetricCard
            title="Pending Amount"
            value={`R${stats.totalPending.toLocaleString()}`}
            subtitle="Under review"
            icon={<Clock3 className="w-6 h-6 text-orange-600" />}
            accentColor="rgba(249, 115, 22, 1)"
            glowFrom="rgba(249, 115, 22, 0.075)"
            glowTo="rgba(249, 115, 22, 0.2)"
            iconBackgroundClassName="bg-orange-100"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>Your latest claim submissions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/provider/claims/history')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentClaims.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No claims submitted yet</p>
                <Button className="mt-4" onClick={() => router.push('/provider/claims/submit')}>
                  Submit Your First Claim
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{claim.claim_type}</p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            claim.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : claim.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : claim.status === 'pended'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {claim.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-500">Claim Number</p>
                          <p className="font-mono">{claim.claim_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Patient</p>
                          <p>{claim.member?.first_name} {claim.member?.last_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p>{new Date(claim.service_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-medium">R{parseFloat(claim.claimed_amount).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/provider/claims/history')}>
                      View
                    </Button>
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
