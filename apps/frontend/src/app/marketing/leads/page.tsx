'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Search, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvailabilityState } from '@/components/ui/availability-state';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  leadScore: number;
  createdDate: string;
};

export default function MarketingLeadsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/marketing/leads');
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Please sign in again.' : 'Could not load leads. Please try again.');
      const data = await response.json();
      if (!Array.isArray(data.leads)) throw new Error('Lead data is unavailable. Please try again.');
      setLeads(data.leads);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadLeads();
  }, [authLoading, user, loadLeads]);

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) =>
      (status === 'all' || lead.status === status) &&
      (!term || [lead.name, lead.email, lead.phone, lead.source].some((value) => value?.toLowerCase().includes(term)))
    );
  }, [leads, query, status]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="premium-page-heading">
          <p className="kervox-eyebrow">Marketing workspace / Growth</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--kv-ink)]">Leads</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--kv-text-muted)]">Review existing contacts and their current pipeline status.</p>
        </header>

        {authLoading || (loading && user) ? (
          <InlinePageLoading title="Leads" description="Opening your contact pipeline" message="Loading current contacts..." />
        ) : !user ? (
          <AvailabilityState eyebrow="Sign-in required" title="Sign in to view leads" description="Your contact pipeline is available after you sign in.">
            <Button asChild><Link href="/login">Sign in</Link></Button>
          </AvailabilityState>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-[var(--kv-line)] bg-[var(--kv-surface)] p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[var(--kv-accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-[var(--kv-ink)]">Leads unavailable</h2>
            <p className="mt-2 text-sm text-[var(--kv-text-muted)]">{error}</p>
            <Button className="mt-5" type="button" onClick={() => void loadLeads()}>Try again</Button>
          </div>
        ) : leads.length === 0 ? (
          <AvailabilityState eyebrow="No contacts yet" title="Your lead list is empty" description="Contacts captured through connected workflows will appear here. Manual lead creation is not available in this workspace yet." />
        ) : (
          <section aria-labelledby="lead-list-heading" className="overflow-hidden rounded-2xl border border-[var(--kv-line)] bg-[var(--kv-surface)] shadow-[0_14px_40px_var(--kv-shadow,rgba(49,37,28,.05))]">
            <div className="flex flex-col gap-4 border-b border-[var(--kv-line)] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div>
                <h2 id="lead-list-heading" className="text-xl font-semibold text-[var(--kv-ink)]">Contact pipeline</h2>
                <p className="mt-1 text-sm text-[var(--kv-text-muted)]">{filteredLeads.length} of {leads.length} contacts shown</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kv-text-muted)]" aria-hidden="true" />
                  <Input aria-label="Search leads" placeholder="Search contacts" className="pl-9 sm:w-60" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
                </div>
                <select aria-label="Filter leads by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-[var(--kv-line)] bg-[var(--kv-surface)] px-3 text-sm text-[var(--kv-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kv-accent)]">
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
            </div>
            {filteredLeads.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Users className="mx-auto h-7 w-7 text-[var(--kv-text-muted)]" aria-hidden="true" />
                <p className="mt-3 font-semibold text-[var(--kv-ink)]">No matching contacts</p>
                <p className="mt-1 text-sm text-[var(--kv-text-muted)]">Try a different search or status.</p>
                <Button type="button" variant="outline" className="mt-5" onClick={() => { setQuery(''); setStatus('all'); setPage(1); }}>Clear filters</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[var(--kv-surface-alt)] text-xs uppercase tracking-wider text-[var(--kv-text-muted)]">
                    <tr><th scope="col" className="px-5 py-3">Contact</th><th scope="col" className="px-5 py-3">Source</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="px-5 py-3 text-right">Score</th><th scope="col" className="px-5 py-3">Created</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kv-line)]">
                    {visibleLeads.map((lead) => (
                      <tr key={lead.id} className="transition-colors hover:bg-[var(--kv-hover)]">
                        <td className="px-5 py-4"><span className="block font-semibold text-[var(--kv-ink)]">{lead.name || 'Unnamed contact'}</span><span className="block text-xs text-[var(--kv-text-muted)]">{lead.email}</span></td>
                        <td className="px-5 py-4 text-[var(--kv-text-muted)]">{lead.source || 'Unknown'}</td>
                        <td className="px-5 py-4"><span className="inline-flex rounded-full border border-[var(--kv-line)] bg-[var(--kv-accent-surface)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--kv-ink)]">{lead.status}</span></td>
                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-[var(--kv-ink)]">{lead.leadScore}</td>
                        <td className="px-5 py-4 text-[var(--kv-text-muted)]">{lead.createdDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredLeads.length > pageSize && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--kv-line)] px-5 py-4 text-sm text-[var(--kv-text-muted)]">
                <span>Page {currentPage} of {pageCount}</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </SidebarLayout>
  );
}
