import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { parseLandingPageInput } from '@/lib/marketing-landing-page'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: pages, error } = await supabase
      .from('landing_pages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(pages || [])
  } catch (error) {
    console.error('Error fetching landing pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch landing pages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (!user.roles.some((role) => ['marketing_manager', 'admin', 'system_admin'].includes(role))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const parsed = parseLandingPageInput(await request.json().catch(() => null))
  if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { name, slug, title, description, ctaLabel, ctaHref, status } = parsed.value
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('landing_pages')
      .insert({
        name,
        slug,
        title,
        description,
        template: 'kervox',
        content: { template: 'kervox', sections: [], cta: { label: ctaLabel, href: ctaHref } },
        status,
        metadata: { seo: { title, description } },
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That page URL is already in use. Choose another slug.' }, { status: 409 })
      }
      console.error('Error creating landing page:', error)
      return NextResponse.json({ error: 'Unable to create landing page.' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating landing page:', error)
    return NextResponse.json({ error: 'Unable to create landing page.' }, { status: 500 })
  }
}
