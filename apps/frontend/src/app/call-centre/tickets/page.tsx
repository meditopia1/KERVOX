'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth-fetch';

export default function CallCentreTicketsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [pendingApplications, setPendingApplications] = useState(0);
  const [underReviewApplications, setUnderReviewApplications] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && !user.roles.includes('call_centre_agent')) {
      router.push('/dashboard');
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadQueueStats();
    }
  }, [isAuthenticated, user]);

  const loadQueueStats = async () => {
    try {
      setLoadingStats(true);
      const response = await authFetch('/api/call-centre/applications');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load queue');
      }

      const applications = data.applications || [];
      setPendingApplications(applications.filter((app: any) => app.status === 'submitted').length);
      setUnderReviewApplications(applications.filter((app: any) => app.status === 'under_review').length);
    } catch (error) {
      console.error('Failed to load call centre queue:', error);
      setPendingApplications(0);
      setUnderReviewApplications(0);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || !user) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-600 mt-1">Loading support workspace...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">
            {loadingStats
              ? 'Loading queue and escalation shortcuts...'
              : 'Working queue and escalation shortcuts for the call-centre team'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardDescription>New Member Support</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{pendingApplications}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Applications still waiting for a call-centre review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Escalated To Review</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{underReviewApplications}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Applications already verified and moved onward</p>
            </CardContent>
          </Card>
        </div>

        {loadingStats && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Loading call-centre queue...</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Queue Actions</CardTitle>
            <CardDescription>Use these to continue member support work</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => router.push('/call-centre/support')}>Open Member Support Queue</Button>
            <Button variant="outline" onClick={() => router.push('/call-centre/members')}>Search a Member</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What counts as a ticket here?</CardTitle>
            <CardDescription>Until a dedicated ticket entity exists, the team works from these live queues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>1. A newly submitted application needing verification is a live support task.</p>
            <p>2. A member lookup or eligibility issue is resolved through the member and provider tools we wired up.</p>
            <p>3. A broken screen, missing record, or process defect should be escalated through the support process.</p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
