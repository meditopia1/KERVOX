import { fireEvent, render, screen, within } from '@testing-library/react';
import MemberLayout from '../layout';

const mockRouter = { push: jest.fn() };

jest.mock('next/navigation', () => ({
  usePathname: () => '/member/dashboard',
  useRouter: () => mockRouter,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<'img'>) => <img src={src} alt={alt} {...props} />,
}));

describe('member workspace layout', () => {
  beforeEach(() => {
    mockRouter.push.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem('member_session', 'active');
    window.localStorage.setItem('member_data', JSON.stringify({
      id: 'member-1', member_number: 'KV-001', first_name: 'Alex', last_name: 'Park', email: 'alex@example.com', mobile: '',
    }));
  });

  it('keeps navigation accessible and closes the mobile drawer after selection', async () => {
    const { container } = render(<MemberLayout><div>Member content</div></MemberLayout>);

    expect(await screen.findByText('Member content')).toBeTruthy();
    expect(container.querySelector('.premium-workspace')).toBeTruthy();

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const dashboardLink = within(navigation).getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink.getAttribute('aria-current')).toBe('page');
    expect(within(navigation).getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/member/settings');

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeTruthy();
    fireEvent.click(within(navigation).getByRole('link', { name: 'My Claims' }));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeTruthy();
  });
});
