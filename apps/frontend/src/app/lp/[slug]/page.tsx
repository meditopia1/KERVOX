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
        const response = await fetch(`/api/public/landing-pages/${slug}`);
        if (!response.ok) throw new Error('Landing page not found');
        const data: LandingPage = await response.json();
        setLandingPage(data);
        document.title = isOriginalMarketingLandingContent(data.content)
          ? data.title
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
    <main className="min-h-screen bg-white text-[#06152d]">
      <header className="relative z-10 border-b border-[#dce8f7] bg-white/95">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="text-xl font-bold tracking-[0.2em] sm:text-2xl" aria-label="KERVOX home">KERVOX</Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">Log in <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#dce8f7] bg-[#f8fbff]">
        <div className="absolute inset-0 -z-10 bg-[url('/kervox-server-hero.png')] bg-cover bg-[72%_center] opacity-90" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/95 to-white/30" aria-hidden="true" />
        <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-20 lg:px-10">
          <div className="max-w-2xl">
            <p className="kervox-eyebrow">The connected server for your business</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{copy.title}</h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#52657d] sm:text-xl">{copy.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href={cta.href} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#2563eb] px-6 font-semibold text-white transition hover:bg-[#1d4ed8]">{cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <span className="text-sm font-medium text-[#1d4ed8]">One server. One connected workspace.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10" aria-labelledby="capabilities-heading">
        <div className="max-w-2xl"><p className="kervox-eyebrow">Built for connected operations</p>
          <h2 id="capabilities-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">A clearer way to run the work behind your business.</h2>
          <p className="mt-4 text-[#52657d]">From the first handoff to the final update, bring people and processes into focus.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-xl border border-[#dce8f7] bg-white p-7 shadow-[0_2px_12px_rgba(6,21,45,0.04)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563eb]"><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 leading-relaxed text-[#52657d]">{description}</p>
          </article>
        ))}</div>
      </section>

      <section className="border-y border-[#dce8f7] bg-[#f8fbff] px-6 py-20 lg:px-10" aria-labelledby="flow-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div><p className="kervox-eyebrow">One connected workspace</p>
            <h2 id="flow-heading" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">See the whole operation. Move with confidence.</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-[#52657d]">KERVOX gives each team a consistent place to see work, take action, and keep the next step visible.</p>
            <ul className="mt-8 space-y-4">{['Clear views across teams', 'Structured workflows and handoffs', 'A reliable home for day-to-day operations'].map((item) => (
              <li key={item} className="flex items-center gap-3 font-medium"><CheckCircle className="h-5 w-5 shrink-0 text-[#2563eb]" aria-hidden="true" />{item}</li>
            ))}</ul>
          </div>
          <div className="rounded-2xl border border-[#c9dcf5] bg-white p-6 shadow-[0_12px_38px_rgba(37,99,235,0.07)] sm:p-8" aria-label="Connected operations illustration">
            <div className="grid gap-3 sm:grid-cols-2">{[{ icon: Cloud, title: 'Infrastructure' }, { icon: Boxes, title: 'Teams' }, { icon: Workflow, title: 'Workflows' }, { icon: Network, title: 'Visibility' }].map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-3 rounded-lg border border-[#dce8f7] bg-[#f8fbff] p-4"><Icon className="h-5 w-5 text-[#2563eb]" aria-hidden="true" /><span className="font-semibold">{title}</span></div>
            ))}</div>
            <div className="mx-auto mt-6 flex h-16 max-w-xs items-center justify-center rounded-xl bg-[#06152d] text-lg font-bold tracking-[0.18em] text-white">KERVOX</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="rounded-2xl bg-[#06152d] px-7 py-12 text-center text-white sm:px-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93c5fd]">Ready when you are</p>
        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Bring your operations together.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[#c9dcf5]">Open the KERVOX workspace and pick up where your team left off.</p>
        <Link href="/login" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#2563eb] px-6 font-semibold text-white transition hover:bg-[#1d4ed8]">Log in to KERVOX <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div></section>
      <footer className="border-t border-[#dce8f7] px-6 py-8 text-center text-sm text-[#52657d]">
        <p>© {new Date().getFullYear()} KERVOX. Your operations, connected.</p>
        <Link href="/apply" className="mt-3 inline-flex font-medium text-[#1d4ed8] hover:underline">Continue an existing application</Link>
      </footer>
    </main>
  );
}
