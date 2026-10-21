import { redirect } from 'next/navigation';
import LegacyMarketplaceRedirect from '../page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

it('redirects the retired campaign URL to the server marketplace', () => {
  LegacyMarketplaceRedirect();
  expect(redirect).toHaveBeenCalledWith('/lp/server-marketplace');
});
