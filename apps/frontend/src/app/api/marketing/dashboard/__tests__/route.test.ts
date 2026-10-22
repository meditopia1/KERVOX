/** @jest-environment node */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { GET } from '../route';

jest.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: jest.fn() }));

it('builds the overview from contacts without querying unrelated records', async () => {
  const contacts = [{
    first_name: 'Alex', last_name: 'Park', email: 'alex@example.com', source: 'web',
    is_lead: true, is_applicant: false, is_member: false, last_contacted_at: null,
    lead_score: 82, created_at: '2026-10-22T00:00:00Z',
  }];
  const select = jest.fn().mockResolvedValue({ data: contacts, error: null });
  const from = jest.fn().mockReturnValue({ select });
  (createServerSupabaseClient as jest.Mock).mockReturnValue({ from });

  const response = await GET({} as any);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(from).toHaveBeenCalledTimes(1);
  expect(from).toHaveBeenCalledWith('contacts');
  expect(select.mock.calls[0][0]).not.toBe('*');
  expect(body.stats.totalLeads).toBe(1);
  expect(body.stats.recentLeads[0].name).toBe('Alex Park');
});
