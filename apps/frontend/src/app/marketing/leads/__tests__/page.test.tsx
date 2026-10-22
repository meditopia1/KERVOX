import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import MarketingLeadsPage from '../page';

jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/layout/sidebar-layout', () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockLeads = [
  { id: 'lead-1', name: 'Alex Rivera', email: 'alex@example.com', phone: '123', source: 'marketplace', status: 'new', leadScore: 70, createdDate: '10/22/2026' },
  { id: 'lead-2', name: 'Sam Lee', email: 'sam@example.com', phone: '456', source: 'website', status: 'converted', leadScore: 90, createdDate: '10/21/2026' },
];

describe('marketing leads workspace', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'marketing-user' }, loading: false });
    (authFetch as jest.Mock).mockReset();
    (authFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ leads: mockLeads }) });
  });

  it('renders live contacts from the existing leads endpoint', async () => {
    render(<MarketingLeadsPage />);
    expect(await screen.findByText('Alex Rivera')).toBeTruthy();
    expect(screen.getByText('Sam Lee')).toBeTruthy();
    expect(authFetch).toHaveBeenCalledWith('/api/marketing/leads');
    expect(screen.queryByRole('button', { name: 'Capture New Lead' })).toBeNull();
  });

  it('filters contacts without changing the source data', async () => {
    render(<MarketingLeadsPage />);
    expect(await screen.findByText('Alex Rivera')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search leads' }), { target: { value: 'sam' } });
    expect(screen.queryByText('Alex Rivera')).toBeNull();
    expect(screen.getByText('Sam Lee')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter leads by status' }), { target: { value: 'new' } });
    expect(screen.getByText('No matching contacts')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Alex Rivera')).toBeTruthy();
  });

  it('offers a retry after a failed load', async () => {
    (authFetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ leads: mockLeads }) });
    render(<MarketingLeadsPage />);
    expect(await screen.findByText('Leads unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Alex Rivera')).toBeTruthy());
  });
});
