import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedMemberId } from '@/lib/member-session';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const memberId = await getAuthenticatedMemberId(request);
    if (!memberId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    if (searchParams.get('memberId') && searchParams.get('memberId') !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    if (!/^20\d{2}$/.test(year)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

    // Get member's plan
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('plan_id, start_date')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.plan_id) {
      return NextResponse.json(
        { error: 'Member has no plan assigned' },
        { status: 400 }
      );
    }

    // Initialize benefits for this member if not exists
    const { error: initError } = await supabase.rpc('initialize_member_benefits', {
      p_member_id: memberId,
      p_year: parseInt(year)
    });

    if (initError) {
      console.error('Error initializing benefits:', initError);
    }

    // Get benefit usage
    const { data: benefitUsage, error: usageError } = await supabase
      .from('benefit_usage')
      .select('*')
      .eq('member_id', memberId)
      .eq('year', parseInt(year))
      .order('benefit_type');

    if (usageError) {
      throw usageError;
    }

    // Get product benefits for reference
    const { data: productBenefits, error: benefitsError } = await supabase
      .from('product_benefits')
      .select('*')
      .eq('product_id', member.plan_id)
      .order('type');

    if (benefitsError) {
      throw benefitsError;
    }

    // Calculate waiting periods
    const startDate = new Date(member.start_date);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const waitingPeriods = productBenefits.reduce((acc: any, benefit: any) => {
      const waitingDays = benefit.waiting_period_days || 0;
      const preExistingDays = benefit.pre_existing_waiting_days || 0;
      
      acc[benefit.type] = {
        general: {
          completed: daysSinceStart >= waitingDays,
          daysRemaining: Math.max(0, waitingDays - daysSinceStart)
        },
        preExisting: preExistingDays > 0 ? {
          completed: daysSinceStart >= preExistingDays,
          daysRemaining: Math.max(0, preExistingDays - daysSinceStart)
        } : null
      };
      
      return acc;
    }, {});

    // Enrich benefit usage with product benefit details
    const enrichedBenefits = benefitUsage.map((usage: any) => {
      const productBenefit = productBenefits.find((pb: any) => pb.type === usage.benefit_type);
      
      return {
        ...usage,
        name: productBenefit?.name || usage.benefit_type,
        description: productBenefit?.description,
        waiting_period: waitingPeriods[usage.benefit_type]
      };
    });

    return NextResponse.json({
      benefits: enrichedBenefits,
      summary: {
        totalBenefits: enrichedBenefits.length,
        benefitsUsed: enrichedBenefits.filter((b: any) => b.used_count > 0).length,
        benefitsAvailable: enrichedBenefits.filter((b: any) => {
          const wp = waitingPeriods[b.benefit_type];
          return wp?.general?.completed;
        }).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching member benefits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benefits' },
      { status: 500 }
    );
  }
}
