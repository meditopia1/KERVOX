import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient()
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const name = body.name?.trim()
    const code = body.code?.trim()?.toUpperCase()

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Product name and code are required' },
        { status: 400 }
      )
    }

    const slug = slugify(name)

    const { data: conflictingProduct } = await supabase
      .from('products')
      .select('id')
      .or(`code.eq.${code},slug.eq.${slug}`)
      .neq('id', params.id)
      .maybeSingle()

    if (conflictingProduct) {
      return NextResponse.json(
        { error: 'Another product already uses that code or slug' },
        { status: 409 }
      )
    }

    const updatePayload = {
      name,
      code,
      slug,
      regime: body.regime || 'insurance',
      description: body.description?.trim() || null,
      status: body.status || 'draft',
      category: body.category?.trim() || 'general',
      monthly_premium: Number(body.monthly_premium || 0),
      cover_amount: Number(body.cover_amount || 0),
      price_single: Number(body.price_single || 0),
      price_couple: Number(body.price_couple || 0),
      price_per_child: Number(body.price_per_child || 0),
      price_range_min: Number(body.price_range_min || 0),
      price_range_max: Number(body.price_range_max || 0),
      age_restriction: body.age_restriction?.trim() || 'All ages',
      updated_at: new Date().toISOString(),
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error || !updatedProduct) {
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}


