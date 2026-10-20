import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

type UpdateSectionItemPayload = {
  title?: string;
  content?: string;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient();
    const body = (await request.json()) as UpdateSectionItemPayload;
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    const { data: updatedItem, error } = await supabase
      .from('policy_section_items')
      .update({
        title: body.title?.trim() || null,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.itemId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating policy section item:', error);
      return NextResponse.json(
        { error: 'Failed to update policy section item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: updatedItem });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update policy section item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('policy_section_items')
      .delete()
      .eq('id', params.itemId);

    if (error) {
      console.error('Error deleting policy section item:', error);
      return NextResponse.json(
        { error: 'Failed to delete policy section item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete policy section item' },
      { status: 500 }
    );
  }
}



