'use client';

import Link from 'next/link';
import { BarChart3, ArrowRight } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { AvailabilityState } from '@/components/ui/availability-state';
import { Button } from '@/components/ui/button';

export default function MarketingReportsPage() {
  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="premium-page-heading">
          <p className="kervox-eyebrow">Marketing workspace / Insights</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--kv-ink)]">Reports</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--kv-text-muted)]">A clear view of campaign performance belongs here. Reporting and scheduling are not connected yet.</p>
        </header>
        <AvailabilityState
          eyebrow="Reporting connection needed"
          title="No live reports are available yet"
          description="Report generation, scheduled delivery, and email distribution are not connected to live data. We will show results here when those capabilities are available; no sample totals are presented as real activity."
        >
          <Button asChild variant="outline"><Link href="/marketing/dashboard"><BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />View live overview</Link></Button>
          <Button asChild variant="outline"><Link href="/marketing/landing-pages">Manage landing pages<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
        </AvailabilityState>
      </div>
    </SidebarLayout>
  );
}
