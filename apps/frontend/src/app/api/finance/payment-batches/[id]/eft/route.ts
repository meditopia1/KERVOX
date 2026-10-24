import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireAnyRole } from '@/lib/auth-server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAnyRole(request, ['finance_manager', 'admin', 'system_admin']);
    const supabase = createServerSupabaseClient();
    const { data: batch, error } = await supabase.from('payment_batches')
      .select('batch_number, eft_file_url, eft_file_generated')
      .eq('id', (await params).id).maybeSingle();
    if (error || !batch || !batch.eft_file_generated) {
      return NextResponse.json({ error: 'EFT file not found' }, { status: 404 });
    }
    const safeName = String(batch.batch_number || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (!safeName || safeName !== batch.batch_number) {
      return NextResponse.json({ error: 'EFT file not found' }, { status: 404 });
    }
    const path = `batches/${safeName}.txt`;
    const { data: file, error: downloadError } = await supabase.storage.from('eft-files').download(path);
    if (downloadError || !file) {
      return NextResponse.json({ error: 'EFT file unavailable' }, { status: 404 });
    }
    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.txt"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('EFT download error:', error);
    return NextResponse.json({ error: 'EFT file unavailable' }, { status: 403 });
  }
}
