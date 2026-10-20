import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

type BenefitUpdatePayload = {
  description?: string;
  cover_amount?: number | null;
  annual_limit?: number | null;
  waiting_period_days?: number;
  pre_existing_exclusion_days?: number;
  exclusions?: string[];
};

function serializeExclusions(exclusions?: string[]) {
  if (!Array.isArray(exclusions) || exclusions.length === 0) {
    return null;
  }

  return JSON.stringify(exclusions);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { benefitId: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient();
    const body = (await request.json()) as BenefitUpdatePayload;

    const updatePayload = {
      description: body.description?.trim() || null,
      cover_amount: body.cover_amount ?? null,
      annual_limit: body.annual_limit ?? null,
      waiting_period_days: Number(body.waiting_period_days || 0),
      pre_existing_exclusion_days: Number(body.pre_existing_exclusion_days || 0),
      exclusions: serializeExclusions(body.exclusions),
      updated_at: new Date().toISOString(),
    };

    const { data: benefit, error } = await supabase
      .from('product_benefits')
      .update(updatePayload)
      .eq('id', params.benefitId)
      .select('*')
      .single();

    if (error || !benefit) {
      return NextResponse.json(
        { error: 'Failed to update product benefit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ benefit });
  } catch (error) {
    console.error('Error updating product benefit:', error);
    return NextResponse.json(
      { error: 'Failed to update product benefit' },
      { status: 500 }
    );
  }
}


