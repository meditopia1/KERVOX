'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpRight, BarChart3, Copy, Eye, FileText, LayoutTemplate, Loader2, Pencil, Plus, Search, TrendingUp, Users } from 'lucide-react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LandingPageEditor } from '@/components/marketing/landing-page-editor';
import { MarketplaceRequestsPanel } from '@/components/marketing/MarketplaceRequestsPanel';
import { authFetch } from '@/lib/auth-fetch';
import {
  brandedLandingPageDescription,
  brandedLandingPageName,
  isOriginalMarketingLandingContent,
  type MarketingLandingPage,
} from '@/lib/marketing-landing-page';

type PageFilter = 'all' | 'active' | 'draft';
const filters: { value: PageFilter; label: string }[] = [
  { value: 'all', label: 'All pages' },
  { value: 'active', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];
const marketplaceName = 'KERVOX Server Marketplace';
const marketplaceDescription = 'Browse server products and connect with buyers or sellers.';
const publicSlugFor = (page: MarketingLandingPage) =>
  isOriginalMarketingLandingContent(page.content) && page.slug === 'summer-health-2026'
    ? 'server-marketplace'
    : page.slug;

function SummaryMetric({ label, value, note, icon: Icon }: {
  label: string;
  value: string;
  note: string;
  icon: typeof FileText;
}) {
  return (
    <div className="rounded-xl border border-[#e6e0d7] bg-[#fffefa] p-5 shadow-[0_8px_24px_rgba(49,37,28,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#6d675f]">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#ead9cb] bg-[#faf0e9] text-[#a64c34]">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[#2b2926] tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-[#81796e]">{note}</p>
    </div>
  );
}

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] = useState<MarketingLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PageFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [editorPage, setEditorPage] = useState<MarketingLandingPage | null>(null);

  const fetchLandingPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/marketing/landing-pages');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch landing pages (${response.status})`);
      }
      setLandingPages(await response.json());
    } catch (cause) {
      console.error('Fetch error:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to load landing pages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLandingPages(); }, [fetchLandingPages]);

  const visiblePages = useMemo(() => landingPages.filter((page) => {
    if (filter !== 'all' && page.status !== filter) return false;
    const search = query.trim().toLowerCase();
    if (!search) return true;
    const isMarketplace = isOriginalMarketingLandingContent(page.content);
    return [isMarketplace ? marketplaceName : page.name, publicSlugFor(page), isMarketplace ? marketplaceDescription : page.description]
      .some((part) => part?.toLowerCase().includes(search));
  }), [landingPages, filter, query]);

  function openEditor(mode: 'create' | 'edit' | 'clone', page: MarketingLandingPage | null = null) {
    setEditorMode(mode);
    setEditorPage(page);
    setEditorOpen(true);
    setNotice(null);
  }

  function handleSaved(savedPage: MarketingLandingPage) {
    setLandingPages((current) => current.some((page) => page.id === savedPage.id)
      ? current.map((page) => page.id === savedPage.id ? savedPage : page)
      : [savedPage, ...current]);
    const savedName = isOriginalMarketingLandingContent(savedPage.content) ? marketplaceName : savedPage.name;
    setNotice(savedPage.status === 'active'
      ? `“${savedName}” is published at /lp/${publicSlugFor(savedPage)}.`
      : `“${savedName}” was saved as a draft.`);
  }

  const originalLandingPage = landingPages.find((page) =>
    page.status === 'active' && isOriginalMarketingLandingContent(page.content));
  function openOriginalLandingPage() {
    if (!originalLandingPage) {
      setNotice('The original landing page is unavailable. You can create a custom page instead.');
      return;
    }
    window.location.assign(`/lp/${encodeURIComponent(publicSlugFor(originalLandingPage))}`);
  }

  const measuredPages = landingPages.filter((page) => page.stats != null);
  const totalVisits = landingPages.reduce((sum, page) => sum + (page.stats?.visits || 0), 0);
  const totalLeads = landingPages.reduce((sum, page) => sum + (page.stats?.leads || 0), 0);
  const avgConversion = measuredPages.length
    ? measuredPages.reduce((sum, page) => sum + (page.stats?.conversionRate || 0), 0) / measuredPages.length
    : 0;
  const activeCount = landingPages.filter((page) => page.status === 'active').length;
  const hasAnalytics = measuredPages.length > 0;

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-[1500px] space-y-7">
        <header className="premium-page-heading flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="kervox-eyebrow">Marketing workspace / Pages</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2b2926] sm:text-[2.1rem]">Landing pages &amp; funnels</h1>
            <p className="mt-2 text-sm leading-6 text-[#6d675f]">Keep every campaign page organized, published, and ready to share.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled title="The funnel builder is not available yet"><LayoutTemplate className="mr-2 h-4 w-4" aria-hidden="true" />New Funnel</Button>
            <Button variant="outline" onClick={() => openEditor('create')}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Create custom page</Button>
            <Button onClick={openOriginalLandingPage} title="Open the original landing page" disabled={loading}><ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />New Landing Page</Button>
          </div>
        </header>

        {notice && <p role="status" className="rounded-xl border border-[#e2cdbd] bg-[#fcf2e9] px-4 py-3 text-sm font-medium text-[#783d2d]">{notice}</p>}

        {loading ? (
          <div role="status" className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-[#e6e0d7] bg-[#fffefa] text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#a64c34] motion-reduce:animate-none" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-[#6d675f]">Loading landing pages...</p>
          </div>
        ) : error ? (
          <div role="alert" className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-[#e6e0d7] bg-[#fffefa] px-6 text-center">
            <AlertCircle className="h-9 w-9 text-[#a64c34]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Pages unavailable</h2>
            <p className="mt-2 max-w-md text-sm text-[#6d675f]">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={() => void fetchLandingPages()} variant="outline">Retry</Button>
              <Button onClick={() => { window.location.href = '/login'; }}>Go to Login</Button>
            </div>
          </div>
        ) : (
          <>
            <section aria-label="Page overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric label="Total pages" value={String(landingPages.length)} note={`${activeCount} published`} icon={FileText} />
              <SummaryMetric label="Total visits" value={hasAnalytics ? totalVisits.toLocaleString() : '—'} note={hasAnalytics ? 'Recorded visits' : 'Analytics not connected'} icon={Eye} />
              <SummaryMetric label="Total leads" value={hasAnalytics ? totalLeads.toLocaleString() : '—'} note={hasAnalytics ? 'Recorded leads' : 'Analytics not connected'} icon={Users} />
              <SummaryMetric label="Avg. conversion" value={hasAnalytics ? `${avgConversion.toFixed(1)}%` : '—'} note={hasAnalytics ? 'Average reported rate' : 'Analytics not connected'} icon={TrendingUp} />
            </section>

            <section aria-labelledby="pages-heading" className="overflow-hidden rounded-xl border border-[#e6e0d7] bg-[#fffefa] shadow-[0_10px_32px_rgba(49,37,28,0.035)]">
              <div className="flex flex-col gap-4 border-b border-[#eae3da] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 id="pages-heading" className="text-lg font-semibold text-[#2b2926]">Your landing pages</h2>
                  <p className="mt-1 text-sm text-[#81796e]">{landingPages.length} page{landingPages.length === 1 ? '' : 's'} in this workspace</p>
                </div>
                <div className="relative w-full lg:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#81796e]" aria-hidden="true" />
                  <Input aria-label="Search landing pages" placeholder="Search pages or URLs" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
                </div>
              </div>
              <div role="group" aria-label="Filter landing pages" className="flex flex-wrap gap-2 border-b border-[#eee8df] px-5 py-3 sm:px-6">
                {filters.map((item) => (
                  <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] ${filter === item.value ? 'bg-[#f4e5da] text-[#873b29]' : 'text-[#6d675f] hover:bg-[#f4f0e9] hover:text-[#2b2926]'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              {landingPages.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#e8d7ca] bg-[#fbf0e8] text-[#a64c34]"><LayoutTemplate className="h-7 w-7" aria-hidden="true" /></span>
                  <h3 className="mt-5 text-lg font-semibold">A place for every campaign</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#6d675f]">Create a custom page to give your next campaign a focused destination.</p>
                  <Button className="mt-6" onClick={() => openEditor('create')}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Create your first page</Button>
                </div>
              ) : visiblePages.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <Search className="mx-auto h-7 w-7 text-[#b8a99a]" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-semibold">No matching pages</h3>
                  <p className="mt-1 text-sm text-[#6d675f]">Try another search or choose a different filter.</p>
                  <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className="mt-4 text-sm font-semibold text-[#873b29] underline-offset-4 hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="divide-y divide-[#eee8df]">
                  {visiblePages.map((page) => {
                    const isOriginal = isOriginalMarketingLandingContent(page.content);
                    return (
                      <article key={page.id} className="px-5 py-5 transition-colors hover:bg-[#fcfaf6] sm:px-6">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="min-w-0 truncate text-base font-semibold text-[#2b2926] sm:text-lg">{isOriginal ? marketplaceName : brandedLandingPageName(page.name)}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${page.status === 'active' ? 'bg-[#e8f1e7] text-[#3f6650]' : 'bg-[#f1ede7] text-[#74695e]'}`}>{page.status === 'active' ? 'Published' : 'Draft'}</span>
                              {isOriginal && <span className="rounded-full border border-[#e5d4c6] bg-[#fbf1e8] px-2.5 py-1 text-[11px] font-medium text-[#8b583d]">Marketplace</span>}
                            </div>
                            <p className="mt-1.5 break-all text-xs font-medium text-[#a64c34]">/lp/{publicSlugFor(page)}</p>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d675f]">{isOriginal ? marketplaceDescription : brandedLandingPageDescription(page.description)}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#81796e]">
                              <span>Created {new Date(page.created_at).toLocaleDateString()}</span>
                              <span>Template: {isOriginal ? 'Server marketplace' : brandedLandingPageName(page.template)}</span>
                              {page.stats && <span>{page.stats.visits.toLocaleString()} visits · {page.stats.leads.toLocaleString()} leads · {page.stats.conversionRate.toFixed(1)}% conversion</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button size="sm" variant="outline" disabled={page.status !== 'active'} title={page.status === 'active' ? 'Open public page' : 'Publish this page before opening it'} onClick={() => window.open(`/lp/${publicSlugFor(page)}`, '_blank', 'noopener,noreferrer')}><ArrowUpRight className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />View</Button>
                            <Button size="sm" variant="outline" onClick={() => openEditor('edit', page)}><Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit</Button>
                            <Button size="sm" variant="outline" disabled title="Analytics are not connected yet"><BarChart3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Analytics</Button>
                            <Button size="sm" variant="outline" disabled={isOriginal} title={isOriginal ? 'This original campaign template cannot be cloned here' : 'Clone this page'} onClick={() => openEditor('clone', page)}><Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Clone</Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            <MarketplaceRequestsPanel />
          </>
        )}
      </div>
      <LandingPageEditor open={editorOpen} mode={editorMode} page={editorPage} onOpenChange={setEditorOpen} onSaved={handleSaved} />
    </SidebarLayout>
  );
}
