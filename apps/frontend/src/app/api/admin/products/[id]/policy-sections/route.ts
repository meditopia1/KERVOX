import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

type SectionItemPayload = {
  sectionType?: string;
  title?: string;
  content?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient();

    const { data: sectionItems, error } = await supabase
      .from('policy_section_items')
      .select('*')
      .eq('product_id', (await params).id)
      .order('section_type')
      .order('display_order');

    if (error) {
      console.error('Error fetching policy sections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch policy sections' },
        { status: 500 }
      );
    }

    // Group items by section_type
    const sections: any = {};
    sectionItems?.forEach((item: any) => {
      if (!sections[item.section_type]) {
        sections[item.section_type] = [];
      }
      sections[item.section_type].push(item);
    });

    return NextResponse.json({
      sections,
      definitions: [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch policy sections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient();
    const body = (await request.json()) as SectionItemPayload;
    const sectionType = body.sectionType?.trim();
    const title = body.title?.trim() || null;
    const content = body.content?.trim();

    if (!sectionType || !content) {
      return NextResponse.json(
        { error: 'sectionType and content are required' },
        { status: 400 }
      );
    }

    const { data: lastItem } = await supabase
      .from('policy_section_items')
      .select('display_order')
      .eq('product_id', (await params).id)
      .eq('section_type', sectionType)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextDisplayOrder = (lastItem?.display_order || 0) + 1;

    const { data: createdItem, error } = await supabase
      .from('policy_section_items')
      .insert({
        product_id: (await params).id,
        section_type: sectionType,
        title,
        content,
        display_order: nextDisplayOrder,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating policy section item:', error);
      return NextResponse.json(
        { error: 'Failed to create policy section item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: createdItem });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create policy section item' },
      { status: 500 }
    );
  }
}




