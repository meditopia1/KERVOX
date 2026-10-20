import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAnyRole } from '@/lib/auth-server';
import { buildStarterPolicySections } from '@/lib/policy-section-templates'

export const dynamic = 'force-dynamic'

type NewProductPayload = {
  name?: string
  code?: string
  description?: string
  regime?: 'insurance' | 'medical_scheme'
  status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'archived'
  pricing?: {
    base_premium?: number
    child_premium?: number
    dependant_premium?: number
  }
  benefits?: {
    hospital?: {
      cover_amount?: number | string
      private_room?: boolean
      private_room_limit?: number
    }
    ambulance?: {
      cover_amount?: number | string
      trips_per_year?: number
    }
    additional?: Array<{
      name?: string
      limit?: number | string
    }>
    pmb?: {
      covered?: boolean
      limit?: number | string
    }
  }
  waiting_periods?: {
    general_months?: number
    maternity_months?: number
    pre_existing_months?: number
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseMoney(value: unknown) {
  if (value === 'unlimited' || value === '' || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function monthsToDays(months: unknown) {
  const parsed = Number(months)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }

  return Math.round(parsed * 30)
}

function inferCategory(name: string) {
  const normalized = name.toLowerCase()

  if (normalized.includes('senior')) return 'senior'
  if (normalized.includes('hospital')) return 'hospital'
  if (normalized.includes('executive')) return 'executive'
  if (normalized.includes('platinum')) return 'platinum'
  if (normalized.includes('value plus')) return 'value_plus'
  return 'general'
}

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const supabaseAdmin = createServerSupabaseClient()
    
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .neq('status', 'archived')
      .order('name')

    if (error) throw error

    return NextResponse.json({ 
      products: products || []
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createServerSupabaseClient()
  let createdProductId: string | null = null

  try {
    await requireAnyRole(request, ['admin', 'system_admin']);
    const body = (await request.json()) as NewProductPayload
    const name = body.name?.trim()
    const code = body.code?.trim().toUpperCase()

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Product name and code are required' },
        { status: 400 }
      )
    }

    const slug = slugify(name)
    const monthlyPremium = Number(body.pricing?.base_premium || 0)
    const dependantPremium = Number(body.pricing?.dependant_premium || 0)
    const childPremium = Number(body.pricing?.child_premium || 0)
    const generalWaitingDays = monthsToDays(body.waiting_periods?.general_months)
    const maternityWaitingDays = monthsToDays(body.waiting_periods?.maternity_months)
    const preExistingDays = monthsToDays(body.waiting_periods?.pre_existing_months)

    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .or(`code.eq.${code},slug.eq.${slug}`)
      .maybeSingle()

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with that code or slug already exists' },
        { status: 409 }
      )
    }

    const productInsert = {
      name,
      code,
      slug,
      regime: body.regime || 'insurance',
      description: body.description?.trim() || null,
      status: body.status || 'draft',
      monthly_premium: monthlyPremium,
      cover_amount: parseMoney(body.benefits?.hospital?.cover_amount) || 0,
      category: inferCategory(name),
      price_single: monthlyPremium,
      price_couple: monthlyPremium + dependantPremium,
      price_per_child: childPremium,
      price_range_min: monthlyPremium,
      price_range_max: monthlyPremium + dependantPremium + childPremium * 4,
      age_restriction: 'All ages',
    }

    const { data: createdProduct, error: productError } = await supabaseAdmin
      .from('products')
      .insert(productInsert)
      .select('*')
      .single()

    if (productError) throw productError

    createdProductId = createdProduct.id

    const benefitRows = [
      {
        name: 'Hospital Cover',
        type: 'hospital',
        description: body.benefits?.hospital?.private_room
          ? 'Hospital cover including private room support.'
          : 'Hospital cover.',
        cover_amount: parseMoney(body.benefits?.hospital?.cover_amount),
        waiting_period_days: generalWaitingDays,
        annual_limit: parseMoney(body.benefits?.hospital?.private_room_limit),
        pre_existing_exclusion_days: preExistingDays || null,
      },
      {
        name: 'Ambulance Cover',
        type: 'ambulance',
        description:
          body.benefits?.ambulance?.trips_per_year && body.benefits.ambulance.trips_per_year > 0
            ? `Ambulance cover for up to ${body.benefits.ambulance.trips_per_year} trips per year.`
            : 'Ambulance cover.',
        cover_amount: parseMoney(body.benefits?.ambulance?.cover_amount),
        waiting_period_days: generalWaitingDays,
        annual_limit: null,
        pre_existing_exclusion_days: preExistingDays || null,
      },
      ...(body.benefits?.additional || []).map((benefit) => ({
        name: benefit.name?.trim() || 'Additional Benefit',
        type: slugify(benefit.name || 'additional-benefit').replace(/-/g, '_'),
        description: `${benefit.name || 'Additional benefit'} cover.`,
        cover_amount: parseMoney(benefit.limit),
        waiting_period_days:
          benefit.name?.toLowerCase().includes('maternity') ? maternityWaitingDays : generalWaitingDays,
        annual_limit: null,
        pre_existing_exclusion_days: preExistingDays || null,
      })),
      ...(body.benefits?.pmb?.covered
        ? [
            {
              name: 'PMB Cover',
              type: 'pmb',
              description: 'Prescribed Minimum Benefits cover.',
              cover_amount: parseMoney(body.benefits.pmb.limit),
              waiting_period_days: generalWaitingDays,
              annual_limit: null,
              pre_existing_exclusion_days: preExistingDays || null,
            },
          ]
        : []),
    ].map((benefit) => ({
        product_id: createdProduct.id,
        name: benefit.name,
        type: benefit.type,
        description: benefit.description,
        cover_amount: benefit.cover_amount,
        waiting_period_days: benefit.waiting_period_days,
        annual_limit: benefit.annual_limit,
        pre_existing_exclusion_days: benefit.pre_existing_exclusion_days,
      }))

    if (benefitRows.length > 0) {
      const { error: benefitError } = await supabaseAdmin
        .from('product_benefits')
        .insert(benefitRows)

      if (benefitError) throw benefitError
    }

    const starterSections = buildStarterPolicySections(createdProduct.id)
    if (starterSections.length > 0) {
      const { error: sectionsError } = await supabaseAdmin
        .from('policy_section_items')
        .insert(starterSections)

      if (sectionsError) throw sectionsError
    }

    return NextResponse.json({
      product: createdProduct,
      benefits_created: benefitRows.length,
      sections_created: starterSections.length,
    })
  } catch (error) {
    if (createdProductId) {
      await supabaseAdmin.from('policy_section_items').delete().eq('product_id', createdProductId)
      await supabaseAdmin.from('product_benefits').delete().eq('product_id', createdProductId)
      await supabaseAdmin.from('products').delete().eq('id', createdProductId)
    }

    console.error('Failed to create product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}



