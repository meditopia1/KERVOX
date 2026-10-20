import { fireEvent, render, screen, within } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '../sidebar-layout';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
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
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com', roles: ['member'] },
      loading: false,
      logout: jest.fn(),
    });
  });

  it('places the K monogram beside the expand control in the collapsed rail', () => {
    const { container } = render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    const icon = container.querySelector('img[src="/kervox-k.svg"]');
    expect(icon).toBeInTheDocument();
    expect(icon?.closest('a')).toHaveClass('lg:flex', 'lg:translate-x-[3px]');
    expect(icon?.closest('div')).toHaveClass('h-16', 'lg:translate-x-[3px]', 'lg:justify-center', 'lg:gap-px', 'lg:px-[3px]');
    expect(icon?.closest('div')).not.toHaveClass('lg:flex-col');
    const expandButton = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(icon?.closest('a')?.nextElementSibling).toBe(expandButton);
    expect(expandButton).toHaveClass('h-6', 'w-6', 'lg:translate-x-[3px]');
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    // The mobile drawer still displays the full wordmark and navigation text.
    expect(container.querySelector('img[src="/kervox-logo.svg"]')?.closest('a')).toHaveClass('lg:hidden');
    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByText('Dashboard')).toHaveClass('lg:hidden');
  });
});
