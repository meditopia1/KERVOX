'use client';

import { useEffect, useState, type FormEvent } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth-fetch';
import {
  brandedLandingPageDescription,
  brandedLandingPageName,
  brandedLandingPageTitle,
  isOriginalMarketingLandingContent,
  slugifyLandingPageName,
  type LandingPageInput,
  type MarketingLandingPage,
} from '@/lib/marketing-landing-page';

type EditorMode = 'create' | 'edit' | 'clone';

interface LandingPageEditorProps {
  open: boolean;
  mode: EditorMode;
  page: MarketingLandingPage | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (page: MarketingLandingPage) => void;
}

const emptyForm: LandingPageInput = {
  name: '',
  slug: '',
  title: '',
  description: '',
  ctaLabel: 'Enter your workspace',
  ctaHref: '/login',
  status: 'draft',
};

function initialForm(mode: EditorMode, page: MarketingLandingPage | null): LandingPageInput {
  if (!page || mode === 'create') return emptyForm;

  const content = page.content && typeof page.content === 'object' && !Array.isArray(page.content)
    ? page.content as Record<string, unknown>
    : {};
  const cta = content.cta && typeof content.cta === 'object' && !Array.isArray(content.cta)
    ? content.cta as Record<string, unknown>
    : {};
  const isOriginal = isOriginalMarketingLandingContent(page.content);
  const name = (isOriginal ? page.name : brandedLandingPageName(page.name)) + (mode === 'clone' ? ' copy' : '');

  return {
    name,
    slug: mode === 'clone' ? slugifyLandingPageName(name) : page.slug,
    title: isOriginal ? page.title : brandedLandingPageTitle(page.title || ''),
    description: isOriginal ? page.description : brandedLandingPageDescription(page.description || ''),
    ctaLabel: typeof cta.label === 'string' && cta.label.trim() ? cta.label : 'Enter your workspace',
    ctaHref: cta.href === '/' ? '/' : '/login',
    status: mode === 'clone' ? 'draft' : page.status === 'active' ? 'active' : 'draft',
  };
}

export function LandingPageEditor({ open, mode, page, onOpenChange, onSaved }: LandingPageEditorProps) {
  const [form, setForm] = useState<LandingPageInput>(emptyForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(mode, page));
    setSlugEdited(mode === 'edit');
    setSaveError(null);
  }, [open, mode, page]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);

    try {
      const isEditing = mode === 'edit' && page;
      const response = await authFetch(
        isEditing ? `/api/marketing/landing-pages/${page.id}` : '/api/marketing/landing-pages',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save this landing page.');
      onSaved(result as MarketingLandingPage);
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this landing page.');
    } finally {
      setSaving(false);
    }
  }

  const heading = mode === 'edit' ? 'Edit landing page' : mode === 'clone' ? 'Clone landing page' : 'New landing page';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06152d]/55" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#dce8f7] bg-white shadow-[0_20px_60px_rgba(6,21,45,0.2)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-[#dce8f7] px-6 py-5 sm:px-8">
            <div>
              <p className="kervox-eyebrow">Marketing workspace</p>
              <DialogPrimitive.Title className="mt-2 text-2xl font-bold text-[#06152d]">{heading}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-[#52657d]">
                Set the page message, public URL, and publishing state.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-lg p-2 text-[#52657d] hover:bg-[#f1f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]" aria-label="Close editor" disabled={saving}>
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="landing-page-name" className="mb-2 block text-sm font-semibold text-[#06152d]">Page name</label>
                <Input id="landing-page-name" required maxLength={255} autoFocus value={form.name} placeholder="Connected operations" onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({ ...current, name, slug: slugEdited ? current.slug : slugifyLandingPageName(name) }));
                }} />
                <p className="mt-1 text-xs text-[#718096]">For your marketing workspace.</p>
              </div>
              <div>
                <label htmlFor="landing-page-slug" className="mb-2 block text-sm font-semibold text-[#06152d]">Page URL</label>
                <Input id="landing-page-slug" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} placeholder="connected-operations" onChange={(event) => {
                  setSlugEdited(true);
                  setForm((current) => ({ ...current, slug: slugifyLandingPageName(event.target.value) }));
                }} />
                <p className="mt-1 break-all text-xs text-[#718096]">/lp/{form.slug || 'your-page-url'}</p>
              </div>
            </div>

            <div>
              <label htmlFor="landing-page-title" className="mb-2 block text-sm font-semibold text-[#06152d]">Headline</label>
              <Input id="landing-page-title" required maxLength={500} value={form.title} placeholder="Your operations, connected." onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="landing-page-description" className="mb-2 block text-sm font-semibold text-[#06152d]">Supporting message</label>
              <Textarea id="landing-page-description" required maxLength={1000} rows={3} value={form.description} placeholder="Bring your teams, workflows, and systems into one operational view." onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="landing-page-cta" className="mb-2 block text-sm font-semibold text-[#06152d]">Primary button text</label>
                <Input id="landing-page-cta" required maxLength={80} value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="landing-page-destination" className="mb-2 block text-sm font-semibold text-[#06152d]">Button destination</label>
                <select id="landing-page-destination" className="h-10 w-full rounded-lg border border-[#dce8f7] bg-white px-3 text-sm text-[#06152d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]" value={form.ctaHref} onChange={(event) => setForm((current) => ({ ...current, ctaHref: event.target.value as LandingPageInput['ctaHref'] }))}>
                  <option value="/login">Log in to KERVOX</option>
                  <option value="/">KERVOX home</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="landing-page-status" className="mb-2 block text-sm font-semibold text-[#06152d]">Visibility</label>
              <select id="landing-page-status" className="h-10 w-full rounded-lg border border-[#dce8f7] bg-white px-3 text-sm text-[#06152d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LandingPageInput['status'] }))}>
                <option value="draft">Draft — visible only in this workspace</option>
                <option value="active">Published — public at the page URL</option>
              </select>
            </div>

            {saveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p>}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#dce8f7] pt-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {mode === 'edit' ? 'Save changes' : form.status === 'active' ? 'Create & publish' : 'Create draft'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
