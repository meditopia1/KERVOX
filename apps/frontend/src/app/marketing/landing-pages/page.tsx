'use client';

import { useState, useEffect } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LandingPageEditor } from '@/components/marketing/landing-page-editor';
import { authFetch } from '@/lib/auth-fetch';
import {
  brandedLandingPageDescription,
  brandedLandingPageName,
  isOriginalMarketingLandingContent,
  type MarketingLandingPage,
} from '@/lib/marketing-landing-page';
import { 
  Layout, 
  Eye, 
  Users, 
  TrendingUp,
  Edit,
  Copy,
  Play,
  Pause,
  BarChart3,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] = useState<MarketingLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [editorPage, setEditorPage] = useState<MarketingLandingPage | null>(null);

  useEffect(() => {
    fetchLandingPages();
  }, []);

  async function fetchLandingPages() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch('/api/marketing/landing-pages');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch landing pages (${response.status})`);
      }

      const data = await response.json();
      
      setLandingPages(data);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
    setNotice(savedPage.status === 'active'
      ? `“${savedPage.name}” is published at /lp/${savedPage.slug}.`
      : `“${savedPage.name}” was saved as a draft.`);
  }

  const totalVisits = landingPages.reduce((sum, p) => sum + (p.stats?.visits || 0), 0);
  const totalLeads = landingPages.reduce((sum, p) => sum + (p.stats?.leads || 0), 0);
  const measuredPages = landingPages.filter((page) => page.stats != null);
  const avgConversion = measuredPages.length > 0
    ? measuredPages.reduce((sum, p) => sum + (p.stats?.conversionRate || 0), 0) / measuredPages.length
    : 0;
  const hasAnalytics = measuredPages.length > 0;
  const originalLandingPage = landingPages.find((page) =>
    page.status === 'active' && isOriginalMarketingLandingContent(page.content));

  function openOriginalLandingPage() {
    if (!originalLandingPage) {
      setNotice('The original landing page is unavailable. You can create a custom page instead.');
      return;
    }

    window.location.assign(`/lp/${encodeURIComponent(originalLandingPage.slug)}`);
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading landing pages...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2 font-semibold">Error: {error}</p>
            <p className="text-gray-600 mb-4 text-sm">
              {error.includes('Failed to fetch') || error.includes('401') 
                ? 'You need to be logged in as a marketing user to view landing pages.' 
                : 'Unable to load landing pages.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchLandingPages} variant="outline">Retry</Button>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="kervox-eyebrow">Marketing workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-[#06152d]">Landing pages & funnels</h1>
            <p className="mt-1 text-[#52657d]">Manage your KERVOX campaigns and connected operations pages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled title="The funnel builder is not available yet">
              <Layout className="w-4 h-4 mr-2" />
              New Funnel
            </Button>
            <Button variant="outline" onClick={() => openEditor('create')}>
              Create custom page
            </Button>
            <Button onClick={openOriginalLandingPage} title="Open the original landing page">
              <Layout className="w-4 h-4 mr-2" />
              New Landing Page
            </Button>
          </div>
        </div>

        {notice && <p role="status" className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">{notice}</p>}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pages</p>
                  <p className="text-3xl font-bold mt-1">{landingPages.length}</p>
                  <p className="text-xs text-gray-500 mt-1">{landingPages.filter(p => p.status === 'active').length} active</p>
                </div>
                <Layout className="w-9 h-9 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Visits</p>
                  <p className="text-3xl font-bold mt-1">{hasAnalytics ? totalVisits.toLocaleString() : '—'}</p>
                  <p className="text-xs text-[#52657d] mt-1">{hasAnalytics ? 'Recorded visits' : 'Analytics not connected'}</p>
                </div>
                <Eye className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-3xl font-bold mt-1">{hasAnalytics ? totalLeads.toLocaleString() : '—'}</p>
                  <p className="text-xs text-[#52657d] mt-1">{hasAnalytics ? 'Recorded leads' : 'Analytics not connected'}</p>
                </div>
                <Users className="w-9 h-9 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Conversion</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600">{hasAnalytics ? `${avgConversion.toFixed(1)}%` : '—'}</p>
                  <p className="text-xs text-[#52657d] mt-1">{hasAnalytics ? 'Average of reported rates' : 'Analytics not connected'}</p>
                </div>
                <TrendingUp className="w-9 h-9 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Landing Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Landing Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {landingPages.length === 0 ? (
              <div className="text-center py-12">
                <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No landing pages yet</p>
                <Button onClick={() => openEditor('create')}>
                  <Layout className="w-4 h-4 mr-2" />
                  Create Your First Landing Page
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {landingPages.map((page) => (
                  <div key={page.id} className="rounded-lg border border-[#dce8f7] p-4 transition-colors hover:bg-[#f8fbff]">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-[#06152d]">{isOriginalMarketingLandingContent(page.content) ? page.name : brandedLandingPageName(page.name)}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            page.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {page.status === 'active' ? <Play className="w-3 h-3 inline mr-1" /> : <Pause className="w-3 h-3 inline mr-1" />}
                            {page.status.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {brandedLandingPageName(page.template)}
                          </span>
                        </div>
                        <p className="text-sm text-[#52657d] mb-1">Public landing page</p>
                        <p className="text-xs text-[#52657d]">{isOriginalMarketingLandingContent(page.content) ? page.description : brandedLandingPageDescription(page.description)}</p>
                      </div>
                    </div>

                    {page.stats && (
                      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600">Visits</p>
                          <p className="text-lg font-bold">{page.stats.visits.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-[#f1f7ff] rounded">
                          <p className="text-xs text-gray-600">Leads</p>
                          <p className="text-lg font-bold text-blue-600">{page.stats.leads.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-[#f1f7ff] rounded">
                          <p className="text-xs text-gray-600">Conv. Rate</p>
                          <p className="text-lg font-bold text-blue-600">{page.stats.conversionRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                      <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={page.status !== 'active'}
                          title={page.status === 'active' ? 'Open public page' : 'Publish this page before opening it'}
                          onClick={() => window.open(`/lp/${page.slug}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditor('edit', page)}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" disabled title="Analytics are not connected yet">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Analytics
                        </Button>
                        <Button size="sm" variant="outline" disabled={isOriginalMarketingLandingContent(page.content)} title={isOriginalMarketingLandingContent(page.content) ? 'This original campaign template cannot be cloned here' : 'Clone this page'} onClick={() => openEditor('clone', page)}>
                          <Copy className="w-3 h-3 mr-1" />
                          Clone
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <LandingPageEditor
        open={editorOpen}
        mode={editorMode}
        page={editorPage}
        onOpenChange={setEditorOpen}
        onSaved={handleSaved}
      />
    </SidebarLayout>
  );
}
