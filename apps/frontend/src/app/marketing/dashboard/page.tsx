'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  AlertCircle,
  ClipboardList,
  Megaphone,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetricCard } from '@/components/dashboard/dashboard-metric-card';
import { authFetch } from '@/lib/auth-fetch';

type MarketingStats = {
  totalLeads: number;
  conversionRate: number;
  pipeline: { new: number; contacted: number; qualified: number; converted: number };
  lifecycle: { hot: number; warm: number; cold: number };
  recentLeads: Array<{ name: string; email: string; source: string; status: string; score: number }>;
  leadSources: Array<{ source: string; leads: number; conversion: number }>;
};

const quickActions = [
  { label: 'Review leads', description: 'Work through your contact pipeline', href: '/marketing/leads', icon: Users },
  { label: 'New campaign', description: 'Set up an outreach campaign', href: '/marketing/campaigns/new', icon: Megaphone },
  { label: 'View analytics', description: 'Explore available performance data', href: '/marketing/analytics', icon: BarChart3 },
  { label: 'Referral codes', description: 'Manage referral activity', href: '/marketing/referrals', icon: UserPlus },
];

const metricStyle = {
  accentColor: '#a64c34',
  glowFrom: 'rgba(166,76,52,.05)',
  glowTo: 'rgba(166,76,52,.11)',
  iconBackgroundClassName: 'bg-[#f7e9de]',
};

export default function MarketingDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    setRequiresSignIn(false);
    let sessionExpired = false;

    try {
      const response = await authFetch('/api/marketing/dashboard');
      const data = await response.json();

      if (response.status === 401) {
        sessionExpired = true;
        throw new Error('Your session has expired. Please sign in again.');
      }

      if (!response.ok || !data.stats) {
        throw new Error(data?.error || 'Could not load your marketing overview.');
      }

      setStats(data.stats as MarketingStats);
    } catch (cause) {
      console.error('Failed to fetch marketing dashboard stats:', cause);
      setRequiresSignIn(sessionExpired);
      setError(sessionExpired ? 'Your session has expired. Please sign in again.' : 'Could not load your marketing overview. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStats(null);
      setLoading(false);
      setRequiresSignIn(true);
      setError('Sign in to view your marketing overview.');
      return;
    }
    void loadStats();
  }, [authLoading, user, loadStats]);

  if (loading && !stats) {
    return (
      <SidebarLayout>
        <InlinePageLoading
          title="Marketing dashboard"
          description="Preparing your workspace overview"
          message="Loading current lead records..."
        />
      </SidebarLayout>
    );
  }

  if (!stats) {
    return (
      <SidebarLayout>
        <div role="alert" className="mx-auto max-w-xl rounded-xl border border-[#e6d9cd] bg-white p-8 text-center shadow-sm">
          <AlertCircle aria-hidden="true" className="mx-auto h-9 w-9 text-[#a64c34]" />
          <h1 className="mt-4 text-xl font-semibold text-[#2d241e]">Overview unavailable</h1>
          <p className="mt-2 text-sm text-[#71665c]">{error}</p>
          {user && !requiresSignIn ? (
            <button
              type="button"
              onClick={() => void loadStats()}
              className="mt-5 rounded-lg bg-[#a64c34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]"
            >
              Try again
            </button>
          ) : (
            <Link href="/login" className="mt-5 inline-flex rounded-lg bg-[#a64c34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#873b29]">Sign in</Link>
          )}
        </div>
      </SidebarLayout>
    );
  }

  const pipelineRows = [
    { label: 'New leads', value: stats.pipeline.new, tone: 'bg-[#c77853]' },
    { label: 'Contacted', value: stats.pipeline.contacted, tone: 'bg-[#bd9958]' },
    { label: 'Applicants', value: stats.pipeline.qualified, tone: 'bg-[#718c80]' },
    { label: 'Converted', value: stats.pipeline.converted, tone: 'bg-[#577a67]' },
  ];
  const scoreRows = [
    { label: 'High score', range: 'Score 80+', value: stats.lifecycle.hot, tone: 'text-[#a64c34] bg-[#f7e9de]' },
    { label: 'Mid score', range: 'Score 60–79', value: stats.lifecycle.warm, tone: 'text-[#8c7139] bg-[#f6efdc]' },
    { label: 'Lower score', range: 'Score below 60', value: stats.lifecycle.cold, tone: 'text-[#527065] bg-[#eaf1e9]' },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-7">
        <div className="premium-page-heading flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kervox-eyebrow">Marketing workspace / Overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2d241e]">Marketing dashboard</h1>
            <p className="mt-2 text-sm text-[#71665c]">
              {user?.firstName ? `Welcome back, ${user.firstName}. ` : ''}
              See current leads, priorities, and next steps in one place.
            </p>
          </div>
          <Link
            href="/marketing/leads"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#a64c34] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]"
          >
            Open leads <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <section aria-label="Lead overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard variant="executive" title="Total contacts" value={stats.totalLeads} subtitle="Current workspace records" icon={<Users className="h-5 w-5 text-[#a64c34]" />} {...metricStyle} />
          <DashboardMetricCard variant="executive" title="New leads" value={stats.pipeline.new} subtitle="Not yet applicants" icon={<UserPlus className="h-5 w-5 text-[#a64c34]" />} {...metricStyle} />
          <DashboardMetricCard variant="executive" title="Applicants" value={stats.pipeline.qualified} subtitle="Application in progress" icon={<ClipboardList className="h-5 w-5 text-[#a64c34]" />} {...metricStyle} />
          <DashboardMetricCard variant="executive" title="Converted" value={stats.pipeline.converted} subtitle={`${stats.conversionRate}% of contacts`} icon={<Target className="h-5 w-5 text-[#a64c34]" />} {...metricStyle} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Lead status</CardTitle>
              <p className="text-sm text-[#71665c]">A current snapshot of contact activity.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {pipelineRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg border border-[#eee5dc] bg-[#fdfbf8] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />
                    <span className="text-sm font-medium text-[#453a32]">{row.label}</span>
                  </div>
                  <span className="tabular-nums text-lg font-semibold text-[#2d241e]">{row.value.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-lg">Recent leads</CardTitle>
                <p className="mt-1 text-sm text-[#71665c]">Latest contact records.</p>
              </div>
              <Link href="/marketing/leads" className="shrink-0 text-sm font-semibold text-[#a64c34] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">View all</Link>
            </CardHeader>
            <CardContent>
              {stats.recentLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e2d5c8] bg-[#fdfbf8] px-5 py-8 text-center">
                  <Users aria-hidden="true" className="mx-auto h-7 w-7 text-[#b9a99b]" />
                  <p className="mt-3 text-sm font-medium text-[#453a32]">No leads yet</p>
                  <p className="mt-1 text-xs text-[#71665c]">New contacts will appear here as they arrive.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#eee5dc]">
                  {stats.recentLeads.map((lead, index) => (
                    <li key={`${lead.email}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#2d241e]">{lead.name}</p>
                        <p className="truncate text-xs text-[#71665c]">{lead.email} · {lead.source}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f4eee7] px-2.5 py-1 text-xs font-medium text-[#675548]">{lead.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <section aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 id="quick-actions-title" className="text-lg font-semibold text-[#2d241e]">Keep work moving</h2>
              <p className="mt-1 text-sm text-[#71665c]">Go directly to the tools your team uses most.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(({ label, description, href, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-h-28 items-start gap-3 rounded-xl border border-[#e5d9cc] bg-white p-4 transition-colors hover:border-[#c9957f] hover:bg-[#fffaf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f7e9de] text-[#a64c34]" aria-hidden="true"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold text-[#2d241e]">{label}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#71665c]">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Lead sources</CardTitle>
              <p className="text-sm text-[#71665c]">Where current contacts originated.</p>
            </CardHeader>
            <CardContent>
              {stats.leadSources.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#e2d5c8] bg-[#fdfbf8] px-5 py-8 text-center text-sm text-[#71665c]">Source information will appear when contacts are recorded.</p>
              ) : (
                <div className="space-y-4">
                  {[...stats.leadSources].sort((a, b) => b.leads - a.leads).map((source) => {
                    const share = stats.totalLeads > 0 ? Math.min(100, (source.leads / stats.totalLeads) * 100) : 0;
                    return (
                      <div key={source.source}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-[#453a32]">{source.source}</span>
                          <span className="tabular-nums text-[#71665c]">{source.leads.toLocaleString()} contacts · {source.conversion}% converted</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f1e8df]" role="meter" aria-label={`${source.source} share of contacts`} aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="h-full rounded-full bg-[#a64c34]" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Lead score distribution</CardTitle>
              <p className="text-sm text-[#71665c]">Based on the scores assigned to current leads.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {scoreRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#eee5dc] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#453a32]">{row.label}</p>
                    <p className="text-xs text-[#71665c]">{row.range}</p>
                  </div>
                  <span className={`min-w-10 rounded-lg px-2.5 py-1 text-center text-sm font-semibold tabular-nums ${row.tone}`}>{row.value.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
