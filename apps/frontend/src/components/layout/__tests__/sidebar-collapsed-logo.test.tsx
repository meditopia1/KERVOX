import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import { usePathname } from 'next/navigation';
import { SidebarPreferenceProvider, SIDEBAR_COLLAPSED_STORAGE_KEY } from '@/contexts/sidebar-preference-context';
import { SidebarLayout } from '../sidebar-layout';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<'img'>) => <img src={src} alt={alt} {...props} />,
}));

jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));

describe('collapsed sidebar branding', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (authFetch as jest.Mock).mockReset();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com', roles: ['member'] },
      loading: false,
      logout: jest.fn(),
    });
  });

  it.each([
    'system_admin', 'operations_manager', 'broker', 'claims', 'claims_assessor',
    'finance_manager', 'marketing_manager', 'compliance_officer', 'provider',
    'call_centre_agent', 'ambulance_operator', 'africa_assist_authorization',
  ])('provides Settings to the %s account', (role) => {
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ applications: [], newGopCount: 0 }) });
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com', roles: [role] },
      loading: false,
      logout: jest.fn(),
    });

    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);

    const settingsLink = within(screen.getByRole('navigation', { name: 'Primary navigation' }))
      .getByRole('link', { name: 'Settings' });
    expect(settingsLink.getAttribute('href')).toBe('/settings');
  });

  it('keeps the desktop sidebar collapsed when a page remounts after navigation', () => {
    const { rerender } = render(
      <SidebarPreferenceProvider>
        <SidebarLayout><div>First page</div></SidebarLayout>
      </SidebarPreferenceProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();

    rerender(<SidebarPreferenceProvider><div>Changing pages</div></SidebarPreferenceProvider>);
    rerender(
      <SidebarPreferenceProvider>
        <SidebarLayout><div>Second page</div></SidebarLayout>
      </SidebarPreferenceProvider>,
    );

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
  });

  it('restores the collapsed preference after a full page remount', async () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');

    render(
      <SidebarPreferenceProvider>
        <SidebarLayout><div>Workspace content</div></SidebarLayout>
      </SidebarPreferenceProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  });

  it('uses the same warm shell on the marketing Landing Pages route', () => {
    (usePathname as jest.Mock).mockReturnValue('/marketing/landing-pages');
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'marketing-1', email: 'marketing@example.com', roles: ['marketing'] },
      loading: false,
      logout: jest.fn(),
    });

    const { container } = render(<SidebarLayout><div>Landing page workspace</div></SidebarLayout>);

    expect(container.firstElementChild).toHaveClass('premium-workspace');
    expect(screen.getByRole('navigation', { name: 'Primary navigation' }).closest('aside')).toHaveAttribute('data-workspace-sidebar');
  });

  it('shows immediate feedback when a sidebar link starts navigation', () => {
    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);

    const claimsLink = within(screen.getByRole('navigation', { name: 'Primary navigation' }))
      .getByRole('link', { name: 'My Claims' });
    fireEvent.click(claimsLink);

    expect(claimsLink.getAttribute('aria-busy')).toBe('true');
    expect(claimsLink.querySelector('.animate-spin')).toBeTruthy();
  });

  it('places the K monogram beside the expand control in the collapsed rail', () => {
    const { container } = render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    const icon = container.querySelector('[data-kervox-brand="monogram"]');
    expect(icon).toBeInTheDocument();
    expect(icon?.closest('a')).toHaveClass('lg:flex', 'lg:translate-x-[3px]');
    expect(icon?.closest('div')).toHaveClass('h-16', 'lg:translate-x-[2px]', 'lg:justify-center', 'lg:gap-px', 'lg:px-[3px]');
    expect(icon?.closest('div')).not.toHaveClass('lg:flex-col');
    const expandButton = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(icon?.closest('a')?.nextElementSibling).toBe(expandButton);
    expect(expandButton).toHaveClass('h-6', 'w-6', 'lg:translate-x-[3px]');
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    // The mobile drawer still displays the full wordmark and navigation text.
    expect(container.querySelector('[data-kervox-brand="wordmark"]')?.closest('a')).toHaveClass('lg:hidden');
    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByText('Dashboard')).toHaveClass('lg:hidden');
  });

  it('does not show zero counts as stray text in the collapsed rail', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com', roles: ['system_admin'] },
      loading: false,
      logout: jest.fn(),
    });
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ applications: [], newGopCount: 0 }) });

    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).queryByText('0')).toBeNull();
  });

  it('keeps a large count inside the collapsed rail', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com', roles: ['system_admin'] },
      loading: false,
      logout: jest.fn(),
    });
    (authFetch as jest.Mock).mockImplementation(async (path: string) => ({
      ok: true,
      json: async () => path === '/api/admin/applications'
        ? { applications: Array.from({ length: 101 }, () => ({ status: 'submitted' })) }
        : { newGopCount: 0 },
    }));

    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    const badge = await waitFor(() => screen.getByTitle('101 new member applications'));
    expect(badge.textContent).toBe('99+');
    expect(badge.classList.contains('right-0')).toBe(true);
    expect(badge.classList.contains('-right-1')).toBe(false);
  });
});
