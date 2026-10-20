import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient, requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

type BenefitType = 'ambulance' | 'hospital';

const AUTHORIZATION_ROLES = [
  'ambulance_operator',
  'africa_assist_authorization',
  'system_admin',
  'admin',
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(request, AUTHORIZATION_ROLES);
    const body = await request.json();
    const benefitType = body.benefitType === 'hospital' ? 'hospital' : 'ambulance';

    if (benefitType === 'hospital' && !user.roles.includes('africa_assist_authorization') && !hasInternalRole(user.roles)) {
      return NextResponse.json({ error: 'Hospital benefit checks are limited to Africa Assist authorization users' }, { status: 403 });
    }

    if (benefitType === 'ambulance' && !user.roles.includes('ambulance_operator') && !hasInternalRole(user.roles)) {
      return NextResponse.json({ error: 'Ambulance benefit checks are limited to ambulance authorization users' }, { status: 403 });
    }

    const memberName = normalize(body.memberName);
    const idNumber = normalize(body.idNumber).replace(/\s+/g, '');
    const memberNumber = normalize(body.memberNumber);
    const cellPhone = normalize(body.cellPhone);

    if (!memberName && !idNumber && !memberNumber && !cellPhone) {
      return NextResponse.json(
        { error: 'Search by member name, ID number, member number, or cell phone number' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleSupabaseClient();
    let query = supabase
      .from('members')
      .select('id, member_number, first_name, last_name, id_number, mobile, phone, status, payment_status, plan_id, plan_name, start_date')
      .limit(10);

    if (memberName) {
      const terms = memberName.split(/\s+/).filter(Boolean);
      query = query.or(terms.map((term) => `first_name.ilike.%${term}%,last_name.ilike.%${term}%`).join(','));
    } else {
      const filters = [
        memberNumber ? `member_number.ilike.%${escapeFilter(memberNumber)}%` : '',
        idNumber ? `id_number.eq.${escapeFilter(idNumber)}` : '',
        cellPhone ? `mobile.ilike.%${escapeFilter(cellPhone)}%` : '',
        cellPhone ? `phone.ilike.%${escapeFilter(cellPhone)}%` : '',
      ].filter(Boolean);

      query = query.or(filters.join(','));
    }

    const { data: candidates, error } = await query;
    if (error) throw error;

    const member = chooseBestMember(candidates || [], { memberName, idNumber, memberNumber, cellPhone });
    if (!member) {
      return NextResponse.json({ member: null, message: 'No matching member found' }, { status: 404 });
    }

    const effectiveStatus = resolveMemberStatus(member);
    const plan = await resolvePlan(supabase, member);
    const benefit = await resolveBenefit(supabase, member, plan?.id || null, benefitType);

    return NextResponse.json({
      member: {
        id: member.id,
        memberName: [member.first_name, member.last_name].filter(Boolean).join(' ').trim(),
        idNumber: member.id_number || '',
        memberNumber: member.member_number || '',
        cellPhone: member.mobile || member.phone || '',
        status: effectiveStatus,
        policyStatus: effectiveStatus,
        planName: member.plan_name || plan?.name || 'No plan assigned',
        waitingPeriods: benefit?.waiting_period_days ? `${benefit.waiting_period_days} days` : 'None recorded',
        currentExclusions: formatExclusions(benefit?.exclusions),
        benefitIncluded: Boolean(benefit),
        benefitLabel: benefitType === 'hospital' ? 'Hospital cover included' : 'Ambulance cover included',
      },
    });
  } catch (error) {
    console.error('Failed to run authorization member lookup:', error);
    return NextResponse.json(
      { error: 'Failed to verify member', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function hasInternalRole(roles: string[]) {
  return roles.includes('system_admin') || roles.includes('admin');
}

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeFilter(value: string) {
  return value.replace(/[(),]/g, '');
}

function chooseBestMember(members: any[], search: { memberName: string; idNumber: string; memberNumber: string; cellPhone: string }) {
  const nameTerms = search.memberName.toLowerCase().split(/\s+/).filter(Boolean);

  return (
    members.find((member) => search.memberNumber && member.member_number?.toLowerCase() === search.memberNumber.toLowerCase()) ||
    members.find((member) => search.idNumber && member.id_number === search.idNumber) ||
    members.find((member) => search.cellPhone && [member.mobile, member.phone].some((phone) => phone?.includes(search.cellPhone))) ||
    members.find((member) => nameTerms.every((term) => `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(term))) ||
    members[0] ||
    null
  );
}

function resolveMemberStatus(member: any) {
  const paymentStatus = typeof member.payment_status === 'string' ? member.payment_status.trim().toLowerCase() : '';
  const memberStatus = typeof member.status === 'string' ? member.status.trim().toLowerCase() : '';

  return paymentStatus === 'active' || (!paymentStatus && memberStatus === 'active') ? 'Active' : 'Suspended';
}

async function resolvePlan(supabase: any, member: any) {
  if (member.plan_id) {
    const { data } = await supabase.from('products').select('id, name').eq('id', member.plan_id).maybeSingle();
    return data;
  }

  if (member.plan_name) {
    const { data } = await supabase.from('products').select('id, name').eq('name', member.plan_name).maybeSingle();
    if (data) return data;

    const { data: products } = await supabase.from('products').select('id, name, description').eq('status', 'published');
    return chooseBestProduct(products || [], member.plan_name);
  }

  return null;
}

async function resolveBenefit(supabase: any, member: any, planId: string | null, benefitType: BenefitType) {
  if (!planId) return null;
  const typeAliases = benefitType === 'ambulance'
    ? ['ambulance', 'emergency']
    : ['hospital', 'hospital_illness', 'accident'];

  const { data: exactBenefit } = await supabase
    .from('product_benefits')
    .select('type, name, waiting_period_days, exclusions')
    .eq('product_id', planId)
    .in('type', typeAliases)
    .limit(1);

  if (exactBenefit?.[0]) return exactBenefit[0];

  const { data: namedBenefits } = await supabase
    .from('product_benefits')
    .select('type, name, waiting_period_days, exclusions')
    .eq('product_id', planId)
    .or(buildBenefitTextFilter(typeAliases))
    .limit(1);

  return namedBenefits?.[0] || null;
}

function chooseBestProduct(products: any[], planName: string) {
  const planKey = normalizePlanName(planName);
  const planTokens = planKey.split(' ').filter(Boolean);

  return (
    products.find((product) => normalizePlanName(product.name) === planKey) ||
    products.find((product) => planTokens.length > 0 && planTokens.every((token) => normalizePlanName(product.name).includes(token))) ||
    products.find((product) => {
      const searchable = normalizePlanName(`${product.name || ''} ${product.description || ''}`);
      return planTokens.filter((token) => searchable.includes(token)).length >= Math.min(2, planTokens.length);
    }) ||
    null
  );
}

function normalizePlanName(value: string) {
  return value
    .toLowerCase()
    .replace(/day1|health|plan/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBenefitTextFilter(terms: string[]) {
  return terms
    .flatMap((term) => [
      `name.ilike.%${term}%`,
      `description.ilike.%${term}%`,
    ])
    .join(',');
}

function formatExclusions(exclusions: unknown) {
  if (Array.isArray(exclusions) && exclusions.length > 0) return exclusions.join(', ');
  if (typeof exclusions === 'string' && exclusions.trim()) return exclusions;
  return 'None recorded';
}
