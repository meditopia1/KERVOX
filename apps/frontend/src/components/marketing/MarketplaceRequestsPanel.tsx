'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Inbox, RefreshCw } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { LoadingPanel } from '@/components/layout/page-loading';

type MarketplaceRequest = {
  id: string;
  request_type: 'buy' | 'sell';
  full_name: string;
  email: string;
  company: string | null;
  product_name: string;
  category: string;
  item_condition: string;
  quantity: number;
  details: string | null;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
};

export function MarketplaceRequestsPanel() {
  const [items, setItems] = useState<MarketplaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/marketing/marketplace-requests');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load requests.');
      setItems(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: MarketplaceRequest['status']) {
    setUpdating(id);
    setError('');
    try {
      const response = await authFetch('/api/marketing/marketplace-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update request.');
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update request.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <section aria-labelledby="marketplace-requests-heading" className="overflow-hidden rounded-xl border border-[#e6e0d7] bg-[#fffefa] shadow-[0_10px_32px_rgba(49,37,28,.035)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eae3da] px-5 py-5 sm:px-6">
        <div>
          <h2 id="marketplace-requests-heading" className="flex items-center gap-2 text-lg font-semibold text-[#2b2926]"><Inbox className="h-5 w-5 text-[#a64c34]" /> Marketplace requests</h2>
          <p className="mt-1 text-sm text-[#81796e]">Buyer inquiries and seller listings saved from the public page.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#ded4ca] px-3 text-sm font-semibold text-[#554d45] hover:bg-[#f8f3ed] disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
      {error && <p role="alert" className="m-5 rounded-lg border border-[#efc9ba] bg-[#fff2ed] px-4 py-3 text-sm text-[#923e2c]">{error}</p>}
      {loading ? <LoadingPanel message="Loading marketplace requests..." /> : items.length === 0 ? <p className="px-6 py-10 text-sm text-[#81796e]">No marketplace requests yet.</p> : (
        <div className="divide-y divide-[#eee8df]">
          {items.map((item) => (
            <article key={item.id} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${item.request_type === 'buy' ? 'bg-[#f4e5da] text-[#873b29]' : 'bg-[#eee8dc] text-[#5e503e]'}`}>{item.request_type === 'buy' ? 'Buyer' : 'Seller'}</span>
                  <h3 className="font-semibold text-[#2b2926]">{item.product_name}</h3>
                  <span className="text-xs text-[#81796e]">{item.quantity} {item.quantity === 1 ? 'unit' : 'units'} · {item.item_condition}</span>
                </div>
                <p className="mt-2 text-sm text-[#554d45]">{item.full_name}{item.company ? ` · ${item.company}` : ''}</p>
                <a className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#a64c34] underline-offset-4 hover:underline" href={`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(`KERVOX ${item.request_type === 'buy' ? 'product inquiry' : 'listing request'}: ${item.product_name}`)}`}>{item.email} <ArrowUpRight className="h-3.5 w-3.5" /></a>
                {item.details && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#70675e]">{item.details}</p>}
                <p className="mt-2 text-xs text-[#9a8d80]">{new Date(item.created_at).toLocaleString()} · {item.category} · Ref {item.id.slice(0, 8)}</p>
              </div>
              <label className="text-xs font-semibold text-[#6d675f]">Status
                <select value={item.status} disabled={updating === item.id} onChange={(event) => void updateStatus(item.id, event.target.value as MarketplaceRequest['status'])} className="mt-1 block min-h-10 rounded-lg border border-[#ded4ca] bg-white px-3 text-sm text-[#39352f] focus:outline-none focus:ring-2 focus:ring-[#a64c34]/40 disabled:opacity-50">
                  <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
