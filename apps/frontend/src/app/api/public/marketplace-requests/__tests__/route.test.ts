/** @jest-environment node */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { POST } from '../route';

jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

const valid = {
  requestType: 'buy', fullName: 'Alex Rivera', email: 'alex@example.com',
  company: 'Example Co', productName: 'Product 2', category: 'Network equipment',
  condition: 'refurbished', quantity: 2, details: 'Please send specifications.', website: '',
};

function request(body: unknown) {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any;
}

describe('POST /api/public/marketplace-requests', () => {
  const client = createServerSupabaseClient as jest.Mock;
  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid products and bot submissions before writing', async () => {
    expect((await POST(request({ ...valid, productName: 'Health plan' }))).status).toBe(400);
    expect((await POST(request({ ...valid, website: 'spam.example' }))).status).toBe(400);
    expect(client).not.toHaveBeenCalled();
  });

  it('stores validated buyer inquiries', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'request-1' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    client.mockReturnValue({ from: jest.fn().mockReturnValue({ insert }) });

    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'request-1' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      request_type: 'buy', product_name: 'Product 2', item_condition: 'refurbished', quantity: 2,
    }));
  });

  it('stores seller listing requests without publishing a product', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'request-2' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    client.mockReturnValue({ from: jest.fn().mockReturnValue({ insert }) });
    const response = await POST(request({ ...valid, requestType: 'sell', productName: 'Dell R740', category: 'Rack server', condition: 'used' }));
    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ request_type: 'sell', product_name: 'Dell R740', item_condition: 'used' }));
  });
});
