import { OriginalMarketingLandingPage } from '@/components/landing-page/OriginalMarketingLandingPage';

export const metadata = {
  title: 'KER01 | Server equipment enquiries | KERVOX',
  description: 'Explore server equipment, request a tailored quote, or submit equipment for listing with KERVOX.',
};

export default function Ker01Page() {
  return <OriginalMarketingLandingPage content={{ template: 'ker01' }} campaignName="KER01" variant="funnel" />;
}
