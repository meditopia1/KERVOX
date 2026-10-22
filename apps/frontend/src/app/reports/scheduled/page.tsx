'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { AvailabilityState } from '@/components/ui/availability-state';
import { Button } from '@/components/ui/button';

export default function ScheduledReportsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <SidebarLayout><InlinePageLoading title="Scheduled reports" description="Opening reporting workspace" message="Checking your account..." /></SidebarLayout>;
  }
  if (!user) return null;

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="premium-page-heading">
          <p className="kervox-eyebrow">Workspace / Reporting</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--kv-ink)]">Scheduled reports</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--kv-text-muted)]">Manage recurring reports when report scheduling is available.</p>
        </header>
        <AvailabilityState
          eyebrow="Scheduling unavailable"
          title="Report schedules are not connected"
          description="This workspace does not currently have a live report-scheduling service. No schedules are active here, and creating, editing, running, or emailing a schedule is unavailable until that integration is built."
        >
          <Button asChild variant="outline"><Link href="/reports/dashboard">Back to reports</Link></Button>
        </AvailabilityState>
      </div>
    </SidebarLayout>
  );
}
