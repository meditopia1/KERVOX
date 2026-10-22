import { OriginalMarketingLandingPage } from '@/components/landing-page/OriginalMarketingLandingPage';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ENABLE_SUMMER_2026_FUNNEL } from '@/lib/features';

export const metadata = {
  title: ENABLE_SUMMER_2026_FUNNEL ? 'Summer 2026 Infrastructure Funnel | KERVOX' : 'Campaign temporarily unavailable | KERVOX',
  description: ENABLE_SUMMER_2026_FUNNEL
    ? 'Explore KERVOX server products and send an equipment enquiry.'
    : 'This KERVOX campaign is currently paused. Explore the server marketplace instead.',
  robots: { index: ENABLE_SUMMER_2026_FUNNEL, follow: ENABLE_SUMMER_2026_FUNNEL },
};

/**
 * The campaign retains a stable URL while temporarily paused. It does not
 * depend on the legacy template record used by the marketplace page.
 */
export default function Summer2026FunnelPage() {
  if (!ENABLE_SUMMER_2026_FUNNEL) {
    return (
      <main className="flex min-h-screen flex-col bg-[#f7f5f0] text-[#2b2926]">
        <header className="border-b border-[#e6e0d7] bg-[#fffefa] px-6 py-5 sm:px-10">
          <span className="kervox-public-brand inline-flex items-center"><BrandLogo width={157} height={32} /></span>
        </header>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <span className="rounded-full border border-[#e2cdbd] bg-[#fcf2e9] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#873b29]">Campaign paused</span>
          <h1 className="mt-7 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">We’ll be back soon.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#6d675f]">The Summer 2026 campaign is temporarily unavailable. Explore the KERVOX server marketplace while we prepare what’s next.</p>
          <a href="/lp/server-marketplace" className="mt-9 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#a64c34] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(112,56,35,.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] motion-reduce:transition-none motion-reduce:hover:translate-y-0">Explore server products</a>
        </div>
      </main>
    );
  }
  return <OriginalMarketingLandingPage content={{ template: 'summer-2026' }} campaignName="Summer 2026 Infrastructure Funnel" />;
}
