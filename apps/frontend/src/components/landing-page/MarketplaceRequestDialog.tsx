'use client';

import { FormEvent, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2, X } from 'lucide-react';

type ProductSelection = { name: string; category: string; condition: 'new' | 'refurbished'; quantity: number };

export function MarketplaceRequestDialog({ mode, product, onClose }: {
  mode: 'buy' | 'sell' | null;
  product: ProductSelection;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    setBusy(false);
    setError('');
    setReference('');
  }, [mode, product.name]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode || busy) return;
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') || '').trim();
    const message = String(form.get('details') || '').trim();
    const payload = {
      requestType: mode,
      fullName: String(form.get('fullName') || ''),
      email: String(form.get('email') || ''),
      company: String(form.get('company') || ''),
      productName: mode === 'buy' ? product.name : String(form.get('productName') || ''),
      category: mode === 'buy' ? product.category : String(form.get('category') || ''),
      condition: mode === 'buy' ? product.condition : String(form.get('condition') || ''),
      quantity: mode === 'buy' ? product.quantity : Number(form.get('quantity')),
      details: [phone ? `Phone: ${phone}` : '', message].filter(Boolean).join('\n'),
      website: String(form.get('website') || ''),
    };
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/public/marketplace-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save your request.');
      setReference(result.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={mode !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
              <Dialog.Overlay asChild>
                <motion.div className="fixed inset-0 z-50 bg-[#211c19]/65 backdrop-blur-sm" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reducedMotion ? 0 : .24 }}
                  className="fixed inset-x-4 top-4 z-[51] mx-auto max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[#d8c8b9] bg-[#fffdf9] p-6 shadow-[0_32px_100px_rgba(30,22,15,.28)] sm:top-[8vh] sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#a64c34]">KERVOX Marketplace</p>
                      <Dialog.Title className="mt-2 text-2xl font-semibold tracking-tight text-[#2b2926]">{mode === 'buy' ? `Request ${product.name}` : 'List your equipment'}</Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm leading-6 text-[#70675e]">{mode === 'buy' ? 'Tell us where to reach you. Your request will be saved for follow-up; no order is placed.' : 'Tell us what you have available. Your listing request will be saved for review; it will not publish automatically.'}</Dialog.Description>
                    </div>
                    <Dialog.Close disabled={busy} aria-label="Close form" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e2d6ca] text-[#615950] hover:bg-[#f5eee7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a64c34]"><X className="h-4 w-4" /></Dialog.Close>
                  </div>

                  {reference ? (
                    <div className="mt-8 rounded-xl border border-[#c6decf] bg-[#f2faf4] p-6" role="status">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dcefe1] text-[#24744b]"><Check className="h-6 w-6" /></span>
                      <h3 className="mt-4 text-xl font-semibold">Request received</h3>
                      <p className="mt-2 text-sm leading-6 text-[#526457]">We saved your {mode === 'buy' ? 'product inquiry' : 'listing request'}. Keep this reference for your records: <span className="font-mono font-semibold break-all">{reference}</span>.</p>
                      <button type="button" onClick={onClose} className="mt-5 rounded-lg bg-[#a64c34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#873b29]">Done</button>
                    </div>
                  ) : (
                    <form onSubmit={submit} className="mt-7 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Your name" name="fullName" required autoComplete="name" />
                        <Field label="Work email" name="email" type="email" required autoComplete="email" />
                      </div>
                      <Field label="Company (optional)" name="company" autoComplete="organization" />
                      {mode === 'buy' && <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" maxLength={40} />}
                      {mode === 'buy' ? (
                        <div className="rounded-xl border border-[#e7d9cd] bg-[#f8f3ed] px-4 py-3 text-sm text-[#524940]">
                          <span className="font-semibold">{product.name}</span> · {product.category} · {product.condition} · {product.quantity} {product.quantity === 1 ? 'unit' : 'units'}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Equipment name" name="productName" required maxLength={160} />
                          <Field label="Category" name="category" required maxLength={120} />
                          <label className="block text-sm font-semibold text-[#39352f]">Condition
                            <select name="condition" required className="mt-2 min-h-11 w-full rounded-lg border border-[#d9cec2] bg-white px-3 text-sm font-normal focus:border-[#a64c34] focus:outline-none focus:ring-2 focus:ring-[#a64c34]/20"><option value="new">New</option><option value="refurbished">Refurbished</option><option value="used">Used</option></select>
                          </label>
                          <Field label="Quantity" name="quantity" type="number" required min={1} max={99} defaultValue="1" />
                        </div>
                      )}
                      <label className="block text-sm font-semibold text-[#39352f]">Details (optional)
                        <textarea name="details" maxLength={1800} rows={3} placeholder={mode === 'buy' ? 'Tell us about your requirements or timeline' : 'Specs, age, location, or other useful details'} className="mt-2 w-full rounded-lg border border-[#d9cec2] bg-white px-3 py-3 text-sm font-normal placeholder:text-[#9c9186] focus:border-[#a64c34] focus:outline-none focus:ring-2 focus:ring-[#a64c34]/20" />
                      </label>
                      <div className="absolute -left-[10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                      {error && <p role="alert" className="rounded-lg border border-[#f1c9bd] bg-[#fff2ed] px-4 py-3 text-sm text-[#9b3b2b]">{error}</p>}
                      <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a64c34] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(166,76,52,.2)] transition-all hover:-translate-y-0.5 hover:bg-[#873b29] disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none">
                        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving request…</> : <>Submit {mode === 'buy' ? 'inquiry' : 'listing request'} <ArrowRight className="h-4 w-4" /></>}
                      </button>
                    </form>
                  )}
                </motion.div>
              </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, name, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <label className="block text-sm font-semibold text-[#39352f]">{label}<input name={name} type={type} {...props} className="mt-2 min-h-11 w-full rounded-lg border border-[#d9cec2] bg-white px-3 text-sm font-normal focus:border-[#a64c34] focus:outline-none focus:ring-2 focus:ring-[#a64c34]/20" /></label>;
}
