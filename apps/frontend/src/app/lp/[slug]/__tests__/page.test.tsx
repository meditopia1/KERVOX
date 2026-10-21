import { render, screen } from '@testing-library/react';
import { useParams } from 'next/navigation';
import LandingPageView from '../page';

jest.mock('next/navigation', () => ({ useParams: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('@/components/landing-page/OriginalMarketingLandingPage', () => ({
  OriginalMarketingLandingPage: () => <div data-testid="original-page">Original campaign page</div>,
}));

const originalFetch = global.fetch;

describe('public landing page design boundary', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('continues to render the original campaign component for the summer page', async () => {
    (useParams as jest.Mock).mockReturnValue({ slug: 'summer-health-2026' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'original',
        name: 'Original campaign',
        slug: 'summer-health-2026',
        title: 'Original campaign',
        description: 'Original campaign content',
        template: 'original',
        content: { sections: [{ type: 'plan-slider' }] },
        status: 'active',
      }),
    });

    render(<LandingPageView />);

    expect(await screen.findByTestId('original-page')).toBeTruthy();
    expect(screen.queryByText('Built for connected operations')).toBeNull();
    expect(document.title).toBe('KERVOX Server Marketplace | Server products');
  });

  it('opens the marketplace at the new public URL without an extra failed request', async () => {
    (useParams as jest.Mock).mockReturnValue({ slug: 'server-marketplace' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'original',
        name: 'Summer Health Promo 2026',
        slug: 'summer-health-2026',
        title: 'Old title',
        description: 'Old description',
        template: 'original',
        content: { sections: [{ type: 'plan-slider' }] },
        status: 'active',
      }),
    });

    render(<LandingPageView />);

    expect(await screen.findByTestId('original-page')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/public/landing-pages/summer-health-2026');
  });

  it('uses the refreshed public design for custom landing pages', async () => {
    (useParams as jest.Mock).mockReturnValue({ slug: 'connected-operations' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'custom',
        name: 'Connected operations',
        slug: 'connected-operations',
        title: 'Your operations, connected.',
        description: 'One operational workspace.',
        template: 'kervox',
        content: { cta: { label: 'Enter your workspace', href: '/login' } },
        status: 'active',
      }),
    });

    render(<LandingPageView />);

    expect(await screen.findByRole('heading', { name: 'Your operations, connected.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Enter your workspace/ }).getAttribute('href')).toBe('/login');
    expect(screen.queryByTestId('original-page')).toBeNull();
  });
});
