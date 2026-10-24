import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { enforcePublicRateLimit, readBoundedJson, RequestBodyError } from '@/lib/public-api-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const limited = await enforcePublicRateLimit(request, 'application', 8, 300)
    if (limited) return limited
    const supabaseAdmin = createServerSupabaseClient()
    const data = await readBoundedJson(request, 256 * 1024)
    
    // This public request is not proof that the sender owns the supplied email
    // or identity number. Keep the submitted application separate from the
    // master contact record until staff verify ownership.
    
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
    
    const contactId: string | null = null

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

    // Public applications must not overwrite an existing contact's identity
    // or consent based only on an unverified email or ID number. The consent
    // supplied here remains attached to the new application record.

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

    console.log('✅ Application submission complete:', appNumber)
    return NextResponse.json({
      success: true,
      applicationNumber: appNumber,
      applicationId: application.id,
    })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Application submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
