import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { authFetch } from '@/lib/auth-fetch';
import ClaimsHistoryPage from '../page';

jest.mock('@/contexts/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/layout/sidebar-layout', () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('provider claims history feedback', () => {
  it('shows a retry instead of empty statistics when the live request fails', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'provider-1' }, loading: false, isAuthenticated: true });
    (authFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ claims: [], stats: null }) });

    render(<ClaimsHistoryPage />);
    expect(await screen.findByText('Claims history unavailable')).toBeTruthy();
    expect(screen.queryByText('Total Claims')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText('Claims history unavailable')).toBeNull());
    expect(authFetch).toHaveBeenCalledTimes(2);
  });
});
