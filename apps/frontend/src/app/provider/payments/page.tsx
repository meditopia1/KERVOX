'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { AvailabilityState } from '@/components/ui/availability-state';

export default function ProviderPaymentsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <SidebarLayout><InlinePageLoading title="Payments & remittance" description="Opening your payment workspace" message="Checking your account..." /></SidebarLayout>;
  }
  if (!user) return null;

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="premium-page-heading">
          <p className="kervox-eyebrow">Provider workspace / Finance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--kv-ink)]">Payments & remittance</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--kv-text-muted)]">Payment history and remittance details will appear here when a live provider-payment feed is connected.</p>
        </header>
        <AvailabilityState
          eyebrow="Live payment feed needed"
          title="Payment records are not connected"
          description="We cannot show verified payment totals or downloadable remittance advice yet. Previously displayed example records have been removed so this page cannot be mistaken for a live financial statement."
        />
      </div>
    </SidebarLayout>
  );
}
