import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createServerSupabaseClient()
    const data = await request.json()
    
    // Check if contact already exists by email OR id_number (both have unique constraints)
    const { data: existingContacts } = await supabaseAdmin
      .from('contacts')
      .select('id, email, id_number')
      .or(`email.eq.${data.email},id_number.eq.${data.idNumber}`)

    let contactId: string

    if (existingContacts && existingContacts.length > 0) {
      // Use the first matching contact
      const existingContact = existingContacts[0]
      
      // Update existing contact with latest information
      const { data: updatedContact, error: updateError } = await supabaseAdmin
        .from('contacts')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          mobile: data.mobile,
          id_number: data.idNumber,
          is_lead: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContact.id)
        .select()
        .single()

      if (updateError) throw updateError
      contactId = updatedContact.id
    } else {
      // Create new contact/lead
      const { data: newContact, error: createError } = await supabaseAdmin
        .from('contacts')
        .insert({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          mobile: data.mobile,
          id_number: data.idNumber,
          is_lead: true,
          source: data.source || 'website_application',
        })
        .select()
        .single()

      if (createError) throw createError
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
      contactId,
      message: 'Lead captured successfully',
    })
  } catch (error) {
    console.error('Lead capture error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to capture lead', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
