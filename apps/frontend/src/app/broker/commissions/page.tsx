'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { AvailabilityState } from '@/components/ui/availability-state';

export default function BrokerCommissionsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <SidebarLayout><InlinePageLoading title="Commission statements" description="Opening your broker workspace" message="Checking your account..." /></SidebarLayout>;
  }
  if (!user) return null;

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="premium-page-heading">
          <p className="kervox-eyebrow">Broker workspace / Finance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--kv-ink)]">Commission statements</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--kv-text-muted)]">View verified commissions and statements when the broker-commission feed is connected.</p>
        </header>
        <AvailabilityState
          eyebrow="Live statements needed"
          title="Commission statements are not connected"
          description="This page cannot confirm commission amounts, payment status, or downloadable statements without a live data source. Example records and simulated downloads have been removed."
        />
      </div>
    </SidebarLayout>
  );
}
