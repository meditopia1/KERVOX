import { render, screen } from '@testing-library/react';
import OnboardingLayout from '../../layout';
import OnboardingSettingsPage from '../page';
import { AppearanceProvider } from '@/contexts/appearance-context';

jest.mock('next/navigation', () => ({
  usePathname: () => '/onboarding/settings',
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'onboarding-1', roles: ['onboarding'] }, logout: jest.fn() }),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: async () => ({ count: 0 }) }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: jest.fn(),
  },
}));

it('keeps onboarding settings in its own workspace and marks the link active', () => {
  render(
    <AppearanceProvider>
      <OnboardingLayout><OnboardingSettingsPage /></OnboardingLayout>
    </AppearanceProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Appearance settings' })).toBeTruthy();
  const link = screen.getByRole('link', { name: 'Settings' });
  expect(link.getAttribute('href')).toBe('/onboarding/settings');
  expect(link.getAttribute('aria-current')).toBe('page');
});
