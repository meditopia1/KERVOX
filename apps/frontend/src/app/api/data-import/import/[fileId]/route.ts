import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  await requireAnyRole(request, ['admin', 'system_admin']);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/data-import/import/${(await params).fileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import file' },
      { status: 500 }
    );
  }
}
