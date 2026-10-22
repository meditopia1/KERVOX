import { fireEvent, render, screen, within } from '@testing-library/react';
import { SidebarLayout } from '../sidebar-layout';
import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({ usePathname: jest.fn(), useRouter: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }));

describe('workspace sidebar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'member-1', email: 'member@example.com', firstName: 'Jordan', lastName: 'Doe', roles: ['member'], permissions: [] },
      loading: false,
      isAuthenticated: true,
      logout: jest.fn(),
    });
  });

  it('keeps member navigation on routes that exist', () => {
    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'My Claims' }).getAttribute('href')).toBe('/member/claims');
    expect(within(navigation).getByRole('link', { name: 'My Policies' }).getAttribute('href')).toBe('/policies');
    expect(within(navigation).getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/settings');
    expect(screen.getByText('Workspace content')).toBeTruthy();
  });

  it('marks the current route and keeps the collapse control accessible', () => {
    (usePathname as jest.Mock).mockReturnValue('/member/claims');
    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'My Claims' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  });

  it('provides mobile navigation controls and account context', () => {
    render(<SidebarLayout><div>Workspace content</div></SidebarLayout>);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeTruthy();
    expect(screen.getByText('Jordan Doe')).toBeTruthy();
    expect(screen.getByText('member@example.com')).toBeTruthy();
  });
});
