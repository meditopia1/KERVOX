import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createServerSupabaseClient()
    const data = await request.json()
    
    console.log('📝 Application submission started for:', data.email)
    
    // Generate application number
    const appNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    
    // Ensure monthlyPrice is a number
    if (data.monthlyPrice && typeof data.monthlyPrice === 'string') {
      data.monthlyPrice = parseFloat(data.monthlyPrice)
    }
    
    // Lookup broker_id if brokerCode is provided
    let brokerId: string | undefined
    if (data.brokerCode) {
      const { data: broker } = await supabaseAdmin
        .from('brokers')
        .select('id')
        .eq('code', data.brokerCode)
        .single()
      
      if (broker) {
        brokerId = broker.id
      }
    }
    
    // Handle proof of address - store first document in main field
    let proofOfAddressUrl = data.proofOfAddressUrl
    if (Array.isArray(data.proofOfAddressUrls) && data.proofOfAddressUrls.length > 0) {
      proofOfAddressUrl = data.proofOfAddressUrls[0]
    }
    
    // Ensure debitOrderDay is a number
    if (data.debitOrderDay && typeof data.debitOrderDay === 'string') {
      data.debitOrderDay = parseInt(data.debitOrderDay)
    }
    
    // Find or create the contact record that satisfies the applications.contact_id constraint.
    console.log('🔍 Looking up contact by email/id number:', data.email, data.idNumber)
    const { data: matchingContacts, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id, email, id_number')
      .or(`email.eq.${data.email},id_number.eq.${data.idNumber}`)

    if (contactError) {
      console.error('❌ Contact lookup error:', contactError)
      throw contactError
    }

    let contactId = matchingContacts?.[0]?.id || null

    if (!contactId) {
      console.log('🆕 No matching contact found, creating one for the application...')
      const { data: newContact, error: createContactError } = await supabaseAdmin
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
        .select('id')
        .single()

      if (createContactError) {
        console.error('❌ Failed to create contact for application:', createContactError)
        throw createContactError
      }

      contactId = newContact.id
    }

    console.log('✅ Contact resolved for application:', contactId)

    // Create application record
    console.log('📄 Creating application record...')
    const applicationData = {
      contact_id: contactId,
      application_number: appNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      id_number: data.idNumber,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      mobile: data.mobile,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2,
      city: data.city,
      postal_code: data.postalCode,
      id_document_url: data.idDocumentUrl,
      proof_of_address_url: proofOfAddressUrl,
      selfie_url: data.selfieUrl,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      branch_code: data.branchCode,
      account_holder_name: data.accountHolderName,
      debit_order_day: data.debitOrderDay,
      collection_method: data.collection_method || 'individual_debit_order',
      medical_history: data.medicalHistory,
      voice_recording_url: data.voiceRecordingUrl,
      signature_url: data.signatureUrl,
      terms_accepted_at: new Date().toISOString(),
      terms_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      terms_user_agent: request.headers.get('user-agent') || 'unknown',
      marketing_consent: data.marketingConsent || false,
      marketing_consent_date: data.marketingConsentDate,
      email_consent: data.emailConsent || false,
      sms_consent: data.smsConsent || false,
      phone_consent: data.phoneConsent || false,
      plan_name: data.planName,
      plan_config: data.planConfig,
      monthly_price: data.monthlyPrice,
      broker_id: brokerId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }
    
    console.log('📋 Application data prepared:', {
      appNumber,
      contactId,
      email: data.email,
      planName: data.planName,
    })
    
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert(applicationData)
      .select()
      .single()

    if (appError) {
      console.error('❌ Application insert error:', appError)
      throw appError
    }
    
    console.log('✅ Application created:', application.id)

    if (contactId) {
      const { error: contactUpdateError } = await supabaseAdmin
        .from('contacts')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          mobile: data.mobile,
          id_number: data.idNumber,
          is_lead: true,
          is_applicant: true,
          marketing_consent: data.marketingConsent || false,
          marketing_consent_date: data.marketingConsentDate,
          email_consent: data.emailConsent || false,
          sms_consent: data.smsConsent || false,
          phone_consent: data.phoneConsent || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)

      if (contactUpdateError) {
        console.error('⚠️ Failed to sync contact consent/state:', contactUpdateError)
      }
    }

    // Step 3: Insert dependants if any
    if (data.dependents && data.dependents.length > 0) {
      const dependentsData = data.dependents.map((dep: any) => ({
        application_id: application.id,
        first_name: dep.firstName,
        last_name: dep.lastName,
        id_number: dep.idNumber,
        date_of_birth: dep.dateOfBirth,
        gender: dep.gender,
        relationship: dep.relationship,
        id_document_url: dep.idDocumentUrl,
        birth_certificate_url: dep.birthCertificateUrl,
      }))

      const { error: depsError } = await supabaseAdmin
        .from('application_dependents')
        .insert(dependentsData)

      if (depsError) throw depsError
    }

    // Step 4: Log contact interaction
    const { error: interactionError } = await supabaseAdmin
      .from('contact_interactions')
      .insert({
        contact_id: contactId,
        interaction_type: 'application_submitted',
        interaction_date: new Date().toISOString(),
        notes: `Application ${appNumber} submitted`,
        metadata: {
          application_id: application.id,
          application_number: appNumber,
          plan_id: data.planId,
          plan_name: data.planName,
        },
      })

    if (interactionError) {
      console.error('⚠️ Failed to log interaction (non-critical):', interactionError)
      // Don't throw - this is non-critical
    }

    console.log('✅ Application submission complete:', appNumber)
    return NextResponse.json({
      success: true,
      applicationNumber: appNumber,
      applicationId: application.id,
      contactId,
    })
  } catch (error) {
    console.error('Application submission error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    return NextResponse.json(
      { 
        error: 'Failed to submit application', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
