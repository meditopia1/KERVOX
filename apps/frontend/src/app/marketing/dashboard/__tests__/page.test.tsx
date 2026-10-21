import { fireEvent, render, screen } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import MarketingDashboardPage from '../page';

jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('@/components/layout/sidebar-layout', () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));

const liveStats = {
  totalLeads: 2,
  conversionRate: 50,
  pipeline: { new: 1, contacted: 1, qualified: 1, converted: 1 },
  lifecycle: { hot: 1, warm: 0, cold: 1 },
  recentLeads: [{ name: 'Alex Park', email: 'alex@example.com', source: 'web', status: 'New', score: 82 }],
  leadSources: [{ source: 'Web', leads: 2, conversion: 50 }],
};

describe('marketing dashboard', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: { firstName: 'Morgan' } });
    (authFetch as jest.Mock).mockReset();
  });

  it('shows connected lead data without fabricated performance or health-plan metrics', async () => {
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ stats: liveStats }) });

    render(<MarketingDashboardPage />);

    expect(await screen.findByText('Alex Park')).toBeTruthy();
    expect(screen.getByText('Total contacts')).toBeTruthy();
    expect(screen.getByText('50% of contacts')).toBeTruthy();
    expect(screen.queryByText('342%')).toBeNull();
    expect(screen.queryByText('Plan Selected')).toBeNull();
    expect(screen.getByRole('link', { name: /New campaign/ }).getAttribute('href')).toBe('/marketing/campaigns/new');
  });

  it('lets staff retry when dashboard data is unavailable', async () => {
    (authFetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ stats: liveStats }) });

    render(<MarketingDashboardPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Alex Park')).toBeTruthy();
    expect(authFetch).toHaveBeenCalledTimes(2);
  });
});
