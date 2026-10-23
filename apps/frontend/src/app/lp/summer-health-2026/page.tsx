import { Hero } from '@/components/landing-page/Hero';
import { WhyThisWorks } from '@/components/landing-page/WhyThisWorks';
import { SingleCoverSlider } from '@/components/landing-page/SingleCoverSlider';
import { WhatMattersMost } from '@/components/landing-page/WhatMattersMost';
import { SpeedProcessConfirmation } from '@/components/landing-page/SpeedProcessConfirmation';
import { PlanComparisonDemoted } from '@/components/landing-page/PlanComparisonDemoted';
import { BottomCTA } from '@/components/landing-page/BottomCTA';
import { Footer } from '@/components/landing-page/Footer';

export const metadata = {
  title: 'Summer Health 2026 | Client showcase',
  description: 'The original Summer Health 2026 client landing page.',
  robots: { index: false, follow: false },
};

/** Restored from the original Summer Health landing-page composition. */
export default function SummerHealth2026Page() {
  return (
    <main className="min-h-screen">
      <Hero />
      <WhyThisWorks />
      <SingleCoverSlider />
      <WhatMattersMost />
      <SpeedProcessConfirmation />
      <PlanComparisonDemoted />
      <BottomCTA />
      <Footer />
    </main>
  );
}
