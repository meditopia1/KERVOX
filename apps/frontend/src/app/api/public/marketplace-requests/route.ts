import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const categories = ['Rack server', 'Network equipment', 'Storage system', 'Infrastructure bundle'] as const;
const productNames = ['Product 1', 'Product 2', 'Product 3', 'Product 4'] as const;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length <= maxLength ? text : null;
}

export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Send a JSON request.' }, { status: 415 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request');

    // An invisible form field catches basic automated submissions.
    if (input.website) return NextResponse.json({ error: 'Unable to submit this request.' }, { status: 400 });

    const requestType = input.requestType;
    const fullName = cleanText(input.fullName, 120);
    const email = cleanText(input.email, 254)?.toLowerCase();
    const company = cleanText(input.company ?? '', 120);
    const productName = cleanText(input.productName, 160);
    const category = cleanText(input.category, 120);
    const condition = input.condition;
    const quantity = input.quantity;
    const details = cleanText(input.details ?? '', 2000);

    if ((requestType !== 'buy' && requestType !== 'sell') || !fullName || fullName.length < 2 ||
      !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !productName || productName.length < 2 ||
      !category || category.length < 2 || company === null || details === null ||
      !Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99 ||
      !['new', 'refurbished', 'used'].includes(String(condition))) {
      return NextResponse.json({ error: 'Please check the required fields and try again.' }, { status: 400 });
    }

    if (requestType === 'buy') {
      const index = productNames.indexOf(productName as typeof productNames[number]);
      if (index < 0 || category !== categories[index] || condition === 'used') {
        return NextResponse.json({ error: 'Please select a valid product.' }, { status: 400 });
      }
    }

    const { data, error } = await createServerSupabaseClient()
      .from('marketplace_requests')
      .insert({
        request_type: requestType,
        full_name: fullName,
        email,
        company: company || null,
        product_name: productName,
        category,
        item_condition: condition,
        quantity,
        details: details || null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Marketplace request insert failed:', error);
      return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 503 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Invalid request')) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    console.error('Marketplace request failed:', error);
    return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 503 });
  }
}
