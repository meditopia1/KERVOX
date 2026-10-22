import { redirect } from 'next/navigation';
import LegacyMarketplaceRedirect from '../page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

it('redirects the retired campaign URL to the restored Summer 2026 funnel', () => {
  LegacyMarketplaceRedirect();
  expect(redirect).toHaveBeenCalledWith('/lp/summer-2026');
});
