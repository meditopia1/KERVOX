/** @jest-environment node */

import type { NextRequest } from 'next/server';

function queryReturning(result: { data: unknown; error: null }) {
  type MockQuery = {
    select: () => MockQuery;
    eq: () => MockQuery;
    maybeSingle: () => Promise<typeof result>;
    then: (resolve: (value: typeof result) => unknown) => Promise<unknown>;
  };
  const query: MockQuery = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('provider eligibility response', () => {
  afterEach(() => jest.resetModules());

  it('does not return unused raw benefit rows or cross-provider claims', async () => {
    const member = {
      id: 'member-1', member_number: 'DAY10000001', first_name: 'Test', last_name: 'Member',
      id_number: '9001010000000', date_of_birth: '1990-01-01', status: 'active',
      payment_status: 'active', plan_name: 'Plan', monthly_premium: 0,
      start_date: '2020-01-01', email: 'member@example.invalid', mobile: '0000000000',
    };
    const from = jest.fn((table: string) => {
      if (table === 'members') return queryReturning({ data: member, error: null });
      if (table === 'member_dependants') return queryReturning({
        data: [{ first_name: 'Test', last_name: 'Dependant', id_number: '1000000000000', relationship: 'child', status: 'active' }],
        error: null,
      });
      if (table === 'benefit_usage') return queryReturning({ data: [], error: null });
      throw new Error(`Unexpected table: ${table}`);
    });

    jest.doMock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ from })) }));
    jest.doMock('@/lib/auth-server', () => ({
      getAuthenticatedUser: jest.fn().mockResolvedValue({ user: { isProvider: true, providerId: 'provider-1' } }),
    }));
    const { POST } = await import('../route');

    const response = await POST({ json: async () => ({ member_number: member.member_number }) } as unknown as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.eligible).toBe(true);
    expect(body.member.recent_claims).toBeUndefined();
    expect(body.member.benefit_usage).toBeUndefined();
    expect(body.member.broker_code).toBeUndefined();
    expect(body.member.dependants).toEqual([{
      name: 'Test Dependant', idNumber: '1000000000000', relationship: 'child', status: 'active',
    }]);
    expect(from).not.toHaveBeenCalledWith('claims');
  });
});
