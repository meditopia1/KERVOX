import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { enforcePublicRateLimit, readBoundedJson, RequestBodyError } from '@/lib/public-api-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const limited = await enforcePublicRateLimit(request, 'lead', 20, 600)
    if (limited) return limited
    const supabaseAdmin = createServerSupabaseClient()
    const data = await readBoundedJson(request, 32 * 1024)
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
    const idNumber = typeof data.idNumber === 'string' ? data.idNumber.trim() : ''
    if (!email || !idNumber || !data.firstName || !data.lastName || !data.mobile ||
        email.length > 254 || idNumber.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid lead details' }, { status: 400 })
    }

    // Use filtered comparisons, not a caller-interpolated PostgREST expression.
    const { data: byEmail } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    const { data: byId } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('id_number', idNumber)
      .maybeSingle()

    let contactId: string | null = null

    if (!byEmail && !byId) {
      // Create new contact/lead
      const { data: newContact, error: createError } = await supabaseAdmin
        .from('contacts')
        .insert({
          first_name: data.firstName,
          last_name: data.lastName,
          email,
          mobile: data.mobile,
          id_number: idNumber,
          is_lead: true,
          source: data.source || 'website_application',
        })
        .select()
        .single()

      if (createError || !newContact) throw createError || new Error('Contact creation failed')
      contactId = newContact.id

      // Log interaction for new lead
      await supabaseAdmin
        .from('contact_interactions')
        .insert({
          contact_id: contactId,
          interaction_type: 'application_started',
          interaction_date: new Date().toISOString(),
          notes: 'Started application - completed Step 1 (Personal Information)',
          metadata: {
            step: 1,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown',
          },
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
    })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Lead capture error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to capture lead',
      },
      { status: 500 }
    )
  }
}
