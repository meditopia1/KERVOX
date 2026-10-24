/** @jest-environment node */

import { getAuthenticatedMemberId } from '@/lib/member-session';
import { GET as getProfile } from '../profile/route';
import { GET as getClaims } from '../claims/route';
import { GET as getBenefits } from '../benefits/route';
import { POST as submitClaim } from '../claims/submit/route';

jest.mock('@/lib/member-session', () => ({ getAuthenticatedMemberId: jest.fn() }));
jest.mock('@/lib/benefit-validation-server', () => ({ validateWaitingPeriod: jest.fn() }));

const request = (path: string, body?: unknown) => ({
  url: `http://localhost${path}`,
  nextUrl: new URL(`http://localhost${path}`),
  json: async () => body,
}) as any;

describe('member API ownership boundary', () => {
  const session = getAuthenticatedMemberId as jest.Mock;

  beforeEach(() => session.mockReset());

  it('rejects anonymous profile, claims, benefits and claim creation', async () => {
    session.mockResolvedValue(null);
    expect((await getProfile(request('/api/member/profile?id=victim'))).status).toBe(401);
    expect((await getClaims(request('/api/member/claims?member_id=victim'))).status).toBe(401);
    expect((await getBenefits(request('/api/member/benefits?memberId=victim'))).status).toBe(401);
    expect((await submitClaim(request('/api/member/claims/submit', {}))).status).toBe(401);
  });

  it('rejects attempts to select or submit for a different member', async () => {
    session.mockResolvedValue('member-self');
    expect((await getProfile(request('/api/member/profile?id=member-other'))).status).toBe(403);
    expect((await getClaims(request('/api/member/claims?member_id=member-other'))).status).toBe(403);
    expect((await getBenefits(request('/api/member/benefits?memberId=member-other'))).status).toBe(403);
    expect((await submitClaim(request('/api/member/claims/submit', { member_id: 'member-other' }))).status).toBe(403);
  });
});
