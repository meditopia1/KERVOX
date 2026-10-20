import { requireAnyRole } from '@/lib/auth-server';
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RuleRow = {
  id: string
  productId: string
  productBenefitId: string
  benefitName: string
  name: string
  type: string
  product: string
  version: string
  status: 'active' | 'draft'
  source: string
  description: string | null
  coverAmount: number | null
  annualLimit: number | null
  waitingPeriodDays: number
  preExistingExclusionDays: number
  exclusions: string[]
}

function normalizeExclusions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
    }
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export async function GET(request: NextRequest) {
  await requireAnyRole(request, ['admin', 'system_admin']);
  try {
    const supabaseAdmin = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const productFilter = searchParams.get('product')?.trim() || ''
    const page = Math.max(Number(searchParams.get('page') || '1') || 1, 1)
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || '10') || 10, 1), 50)

    const [{ data: products, error: productsError }, { data: benefits, error: benefitsError }] =
      await Promise.all([
        supabaseAdmin.from('products').select('id,name,status'),
        supabaseAdmin
          .from('product_benefits')
          .select(
            'id,product_id,name,type,description,cover_amount,annual_limit,waiting_period_days,pre_existing_exclusion_days,pre_existing_waiting_days,exclusions,updated_at,created_at'
          ),
      ])

    if (productsError) throw productsError
    if (benefitsError) throw benefitsError

    const productById = new Map((products || []).map((product) => [product.id, product]))
    const rules: RuleRow[] = []

    for (const benefit of benefits || []) {
      const product = productById.get(benefit.product_id)
      const productName = product?.name || 'Unknown Product'
      const versionDate = benefit.updated_at || benefit.created_at
      const version = versionDate ? `v${new Date(versionDate).toISOString().slice(0, 10)}` : 'v1'
      const status = product?.status === 'draft' ? 'draft' : 'active'
      const normalizedExclusions = normalizeExclusions(benefit.exclusions)

      if (benefit.cover_amount !== null || benefit.annual_limit !== null) {
        rules.push({
          id: `${benefit.id}-limit`,
          productId: benefit.product_id,
          productBenefitId: benefit.id,
          benefitName: benefit.name,
          name: `${benefit.name} Limit`,
          type: 'limit',
          product: productName,
          version,
          status,
          source: 'product_benefits',
          description: benefit.description || null,
          coverAmount: benefit.cover_amount,
          annualLimit: benefit.annual_limit,
          waitingPeriodDays: benefit.waiting_period_days || 0,
          preExistingExclusionDays: benefit.pre_existing_exclusion_days || benefit.pre_existing_waiting_days || 0,
          exclusions: normalizedExclusions,
        })
      }

      if ((benefit.waiting_period_days || 0) > 0) {
        rules.push({
          id: `${benefit.id}-waiting`,
          productId: benefit.product_id,
          productBenefitId: benefit.id,
          benefitName: benefit.name,
          name: `${benefit.name} Waiting Period`,
          type: 'waiting_period',
          product: productName,
          version,
          status,
          source: 'product_benefits',
          description: benefit.description || null,
          coverAmount: benefit.cover_amount,
          annualLimit: benefit.annual_limit,
          waitingPeriodDays: benefit.waiting_period_days || 0,
          preExistingExclusionDays: benefit.pre_existing_exclusion_days || benefit.pre_existing_waiting_days || 0,
          exclusions: normalizedExclusions,
        })
      }

      if ((benefit.pre_existing_exclusion_days || benefit.pre_existing_waiting_days || 0) > 0) {
        rules.push({
          id: `${benefit.id}-preexisting`,
          productId: benefit.product_id,
          productBenefitId: benefit.id,
          benefitName: benefit.name,
          name: `${benefit.name} Pre-existing Exclusion`,
          type: 'exclusion',
          product: productName,
          version,
          status,
          source: 'product_benefits',
          description: benefit.description || null,
          coverAmount: benefit.cover_amount,
          annualLimit: benefit.annual_limit,
          waitingPeriodDays: benefit.waiting_period_days || 0,
          preExistingExclusionDays: benefit.pre_existing_exclusion_days || benefit.pre_existing_waiting_days || 0,
          exclusions: normalizedExclusions,
        })
      }

      if (normalizedExclusions.length > 0) {
        rules.push({
          id: `${benefit.id}-exclusions`,
          productId: benefit.product_id,
          productBenefitId: benefit.id,
          benefitName: benefit.name,
          name: `${benefit.name} Exclusions`,
          type: 'exclusion',
          product: productName,
          version,
          status,
          source: 'product_benefits',
          description: benefit.description || null,
          coverAmount: benefit.cover_amount,
          annualLimit: benefit.annual_limit,
          waitingPeriodDays: benefit.waiting_period_days || 0,
          preExistingExclusionDays: benefit.pre_existing_exclusion_days || benefit.pre_existing_waiting_days || 0,
          exclusions: normalizedExclusions,
        })
      }
    }

    const stats = {
      totalRules: rules.length,
      active: rules.filter((rule) => rule.status === 'active').length,
      draft: rules.filter((rule) => rule.status === 'draft').length,
      types: new Set(rules.map((rule) => rule.type)).size,
    }

    const productOptions = Array.from(
      new Set(
        rules
          .map((rule) => rule.product)
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))

    const filteredRules = rules.filter((rule) => {
      const matchesSearch =
        search === '' ||
        rule.name.toLowerCase().includes(search) ||
        rule.id.toLowerCase().includes(search) ||
        rule.product.toLowerCase().includes(search)

      const matchesProduct = productFilter === '' || rule.product === productFilter
      return matchesSearch && matchesProduct
    })

    const totalFiltered = filteredRules.length
    const totalPages = Math.max(Math.ceil(totalFiltered / pageSize), 1)
    const currentPage = Math.min(page, totalPages)
    const startIndex = (currentPage - 1) * pageSize
    const paginatedRules = filteredRules.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      rules: paginatedRules,
      stats,
      productOptions,
      pagination: {
        page: currentPage,
        pageSize,
        totalFiltered,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Failed to fetch rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}
