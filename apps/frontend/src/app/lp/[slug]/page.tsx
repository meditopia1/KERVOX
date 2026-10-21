'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Boxes, CheckCircle, Cloud, LockKeyhole, Network, Server, Workflow } from 'lucide-react';
import { OriginalMarketingLandingPage } from '@/components/landing-page/OriginalMarketingLandingPage';
import { isOriginalMarketingLandingContent } from '@/lib/marketing-landing-page';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  template: string;
  content: unknown;
  status: string;
}

const legacyHealthCopy = /day\s*1|health|medical|patient|clinic|wellness|insurance|claim|hospital|cover|policy|benefit/i;
const legacyMarketplaceSlug = 'summer-health-2026';
const marketplaceSlug = 'server-marketplace';

function getBrandedLandingCopy(page: Pick<LandingPage, 'title' | 'description'>) {
  return {
    title: page.title && !legacyHealthCopy.test(page.title) ? page.title : 'Your operations, connected.',
    description: page.description && !legacyHealthCopy.test(page.description)
      ? page.description
      : 'Bring your teams, workflows, and customer operations into one clear, connected workspace.',
  };
}

function getLandingPageCta(content: unknown) {
  const pageContent = content && typeof content === 'object' && !Array.isArray(content)
    ? content as Record<string, unknown>
    : {};
  const cta = pageContent.cta && typeof pageContent.cta === 'object' && !Array.isArray(pageContent.cta)
    ? pageContent.cta as Record<string, unknown>
    : {};
  return {
    label: typeof cta.label === 'string' && cta.label.trim() && !legacyHealthCopy.test(cta.label)
      ? cta.label
      : 'Enter your workspace',
    href: cta.href === '/' ? '/' : '/login',
  };
}

const pillars = [
  { icon: Server, title: 'One operational home', description: 'Keep the work that matters in a structured workspace with a clear view of what needs attention.' },
  { icon: Network, title: 'Connected by design', description: 'Move between teams and workflows with context intact, so every handoff is easier to follow.' },
  { icon: LockKeyhole, title: 'Confidence at every step', description: 'Give people a dependable place to manage their day with clear states and purposeful actions.' },
];

export default function LandingPageView() {
  const params = useParams();
  const slug = params.slug as string;
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLandingPage() {
      try {
        const lookupSlug = slug === marketplaceSlug ? legacyMarketplaceSlug : slug;
        let response = await fetch(`/api/public/landing-pages/${lookupSlug}`);
        // Keep both URLs working if the stored slug is renamed later.
        if (!response.ok && (slug === marketplaceSlug || slug === legacyMarketplaceSlug)) {
          const fallbackSlug = lookupSlug === marketplaceSlug ? legacyMarketplaceSlug : marketplaceSlug;
          response = await fetch(`/api/public/landing-pages/${fallbackSlug}`);
        }
        if (!response.ok) throw new Error('Landing page not found');
        const data: LandingPage = await response.json();
        setLandingPage(data);
        document.title = isOriginalMarketingLandingContent(data.content)
          ? 'KERVOX Server Marketplace | Server products'
          : `${getBrandedLandingCopy(data).title} | KERVOX`;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Landing page not found');
      } finally {
        setLoading(false);
      }
    }
    fetchLandingPage();
  }, [slug]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f8fbff] text-[#52657d]" role="status">Opening KERVOX...</main>;
  if (error || !landingPage) return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fbff] px-6 text-center">
      <div><span className="kervox-eyebrow">KERVOX</span><h1 className="mt-4 text-4xl font-bold text-[#06152d]">Page not found</h1>
        <p className="mt-3 text-[#52657d]">{error || 'The page you are looking for is unavailable.'}</p>
        <Link href="/" className="mt-6 inline-flex font-semibold text-[#2563eb] hover:underline">Return to KERVOX</Link>
      </div>
    </main>
  );

  if (isOriginalMarketingLandingContent(landingPage.content)) {
    return <OriginalMarketingLandingPage content={landingPage.content} />;
  }

  const copy = getBrandedLandingCopy(landingPage);
  const cta = getLandingPageCta(landingPage.content);
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#2b2926]">
      <header className="relative z-10 border-b border-[#e6e0d7] bg-[#fffefa]/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="text-xl font-bold tracking-[0.2em] sm:text-2xl" aria-label="KERVOX home">KERVOX</Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-lg border border-[#d8cec2] bg-[#fffefa] px-5 py-2.5 text-sm font-semibold text-[#2b2926] transition hover:border-[#c9b4a5] hover:bg-[#f8f2eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">Log in <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#e6e0d7] bg-[#f7f5f0]">
        <div className="absolute inset-0 -z-10 bg-[url('/kervox-server-hero.png')] bg-cover bg-[72%_center] opacity-75" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fffefa] via-[#fffefa]/95 to-[#fffefa]/30" aria-hidden="true" />
        <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-20 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">The connected server for your business</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">{copy.title}</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#6d675f] sm:text-xl">{copy.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href={cta.href} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#a64c34] px-6 font-semibold text-white shadow-[0_8px_20px_rgba(166,76,52,0.16)] transition hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">{cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <span className="text-sm font-medium text-[#873b29]">One server. One connected workspace.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10" aria-labelledby="capabilities-heading">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">Built for connected operations</p>
          <h2 id="capabilities-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A clearer way to run the work behind your business.</h2>
          <p className="mt-4 text-[#6d675f]">From the first handoff to the final update, bring people and processes into focus.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-xl border border-[#e6e0d7] bg-[#fffefa] p-7 shadow-[0_10px_28px_rgba(49,37,28,0.04)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#ead9cb] bg-[#f7eae3] text-[#a64c34]"><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 leading-relaxed text-[#6d675f]">{description}</p>
          </article>
        ))}</div>
      </section>

      <section className="border-y border-[#e6e0d7] bg-[#f7f5f0] px-6 py-20 lg:px-10" aria-labelledby="flow-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">One connected workspace</p>
            <h2 id="flow-heading" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">See the whole operation. Move with confidence.</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-[#6d675f]">KERVOX gives each team a consistent place to see work, take action, and keep the next step visible.</p>
            <ul className="mt-8 space-y-4">{['Clear views across teams', 'Structured workflows and handoffs', 'A reliable home for day-to-day operations'].map((item) => (
              <li key={item} className="flex items-center gap-3 font-medium"><CheckCircle className="h-5 w-5 shrink-0 text-[#a64c34]" aria-hidden="true" />{item}</li>
            ))}</ul>
          </div>
          <div className="rounded-2xl border border-[#e2d6c9] bg-[#fffefa] p-6 shadow-[0_16px_40px_rgba(49,37,28,0.07)] sm:p-8" aria-label="Connected operations illustration">
            <div className="grid gap-3 sm:grid-cols-2">{[{ icon: Cloud, title: 'Infrastructure' }, { icon: Boxes, title: 'Teams' }, { icon: Workflow, title: 'Workflows' }, { icon: Network, title: 'Visibility' }].map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-3 rounded-lg border border-[#e9e1d6] bg-[#fbf8f3] p-4"><Icon className="h-5 w-5 text-[#a64c34]" aria-hidden="true" /><span className="font-semibold">{title}</span></div>
            ))}</div>
            <div className="mx-auto mt-6 flex h-16 max-w-xs items-center justify-center rounded-xl bg-[#2b2926] text-lg font-bold tracking-[0.18em] text-white">KERVOX</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="rounded-2xl bg-[#2b2926] px-7 py-12 text-center text-white shadow-[0_20px_50px_rgba(43,41,38,0.12)] sm:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9aa8e]">Ready when you are</p>
        <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Bring your operations together.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[#e1d9d0]">Open the KERVOX workspace and pick up where your team left off.</p>
        <Link href="/login" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#a64c34] px-6 font-semibold text-white transition hover:bg-[#b45d42] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Log in to KERVOX <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div></section>
      <footer className="border-t border-[#e6e0d7] px-6 py-8 text-center text-sm text-[#6d675f]">
        <p>© {new Date().getFullYear()} KERVOX. Your operations, connected.</p>
        <Link href="/apply" className="mt-3 inline-flex font-medium text-[#873b29] hover:underline">Continue an existing application</Link>
      </footer>
    </main>
  );
}
