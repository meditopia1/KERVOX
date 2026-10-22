import { render, screen } from '@testing-library/react';
import Summer2026FunnelPage from '../page';

jest.mock('@/components/landing-page/OriginalMarketingLandingPage', () => ({
  OriginalMarketingLandingPage: ({ campaignName }: { campaignName: string }) => <div>{campaignName}</div>,
}));

describe('Summer 2026 funnel', () => {
  it('pauses the campaign but directs visitors to the marketplace', () => {
    render(<Summer2026FunnelPage />);
    expect(screen.getByRole('heading', { name: 'We’ll be back soon.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Explore server products' }).getAttribute('href')).toBe('/lp/server-marketplace');
    expect(screen.queryByText('Summer 2026 Infrastructure Funnel')).toBeNull();
  });
});
