import { fireEvent, render, screen } from '@testing-library/react';
import { authFetch } from '@/lib/auth-fetch';
import LandingPagesPage from '../page';

jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('@/components/layout/sidebar-layout', () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/components/marketing/landing-page-editor', () => ({
  LandingPageEditor: ({ open, mode }: { open: boolean; mode: string }) =>
    open ? <div data-testid="page-editor">{mode} page editor</div> : null,
}));

const pages = [
  {
    id: 'original',
    name: 'Original campaign',
    slug: 'summer-health-2026',
    title: 'Original',
    description: 'Original campaign content',
    template: 'original',
    content: { sections: [{ type: 'plan-slider' }] },
    status: 'active',
    created_at: '2026-01-13T00:00:00Z',
    updated_at: '2026-01-13T00:00:00Z',
  },
  {
    id: 'custom',
    name: 'Connected operations',
    slug: 'connected-operations',
    title: 'Your operations, connected.',
    description: 'One operational workspace.',
    template: 'kervox',
    content: {},
    status: 'draft',
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
  },
];

describe('marketing landing pages workspace', () => {
  beforeEach(() => {
    (authFetch as jest.Mock).mockReset();
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => pages });
  });

  it('shows the legacy record as the server marketplace without changing its saved data', async () => {
    render(<LandingPagesPage />);
    expect(await screen.findByText('KERVOX Server Marketplace')).toBeTruthy();
    expect(screen.getByText('Connected operations')).toBeTruthy();
    expect(screen.getByText('/lp/server-marketplace')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Landing Page' })).toBeTruthy();
    expect(screen.getByText('Marketplace')).toBeTruthy();
    expect(screen.queryByText('Original campaign')).toBeNull();
    expect(authFetch).toHaveBeenCalledWith('/api/marketing/landing-pages');
  });

  it('filters pages and opens the custom editor without changing the original page', async () => {
    render(<LandingPagesPage />);
    expect(await screen.findByText('KERVOX Server Marketplace')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Drafts' }));
    expect(screen.queryByText('KERVOX Server Marketplace')).toBeNull();
    expect(screen.getByText('Connected operations')).toBeTruthy();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search landing pages' }), { target: { value: 'missing' } });
    expect(screen.getByText('No matching pages')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('KERVOX Server Marketplace')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Create custom page' }));
    expect(screen.getByTestId('page-editor').textContent).toBe('create page editor');
  });
});
