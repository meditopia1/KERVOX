import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { parseLandingPageInput } from '@/lib/marketing-landing-page'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!user.roles.some((role) => ['marketing_manager', 'admin', 'system_admin'].includes(role))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return NextResponse.json({ error: 'Invalid landing-page ID.' }, { status: 400 })
  }

  const parsed = parseLandingPageInput(await request.json().catch(() => null))
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { name, slug, title, description, ctaLabel, ctaHref, status } = parsed.value
  try {
    const supabase = createServerSupabaseClient()
    const { data: existing, error: readError } = await supabase
      .from('landing_pages')
      .select('content, metadata')
      .eq('id', params.id)
      .maybeSingle()

    if (readError) throw readError
    if (!existing) return NextResponse.json({ error: 'Landing page not found.' }, { status: 404 })

    const content = asRecord(existing.content)
    const metadata = asRecord(existing.metadata)
    const { data, error } = await supabase
      .from('landing_pages')
      .update({
        name,
        slug,
        title,
        description,
        template: 'kervox',
        content: { ...content, template: 'kervox', cta: { label: ctaLabel, href: ctaHref } },
        status,
        metadata: { ...metadata, seo: { ...asRecord(metadata.seo), title, description } },
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That page URL is already in use. Choose another slug.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating landing page:', error)
    return NextResponse.json({ error: 'Unable to update landing page.' }, { status: 500 })
  }
}
