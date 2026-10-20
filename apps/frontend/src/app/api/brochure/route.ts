import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Brochures are currently unavailable' }, { status: 404 });
}
