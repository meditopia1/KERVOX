import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: error || 'Authentication required' }, { status: 401 });
    }

    if (!user.isProvider) {
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
    }

    return NextResponse.json({ provider: user });
  } catch (error: any) {
    console.error('Error loading provider profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load provider profile' },
      { status: 500 }
    );
  }
}
