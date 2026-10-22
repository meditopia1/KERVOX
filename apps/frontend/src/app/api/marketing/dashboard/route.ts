import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createServerSupabaseClient()
    // The overview is derived from contacts only. Avoid reading unrelated
    // application and member records (and their sensitive columns).
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('first_name,last_name,email,source,is_lead,is_applicant,is_member,last_contacted_at,lead_score,created_at')

    if (contactsError) throw contactsError

    // Calculate stats
    const rows = contacts || []
    const totalLeads = rows.length
    
    // Lead pipeline
    const newLeads = rows.filter(c => c.is_lead && !c.is_applicant).length
    const contacted = rows.filter(c => c.last_contacted_at).length
    const qualified = rows.filter(c => c.is_applicant).length
    const converted = rows.filter(c => c.is_member).length

    // Lifecycle stages (based on lead score)
    const hotLeads = rows.filter(c => c.is_lead && (c.lead_score || 0) >= 80).length
    const warmLeads = rows.filter(c => c.is_lead && (c.lead_score || 0) >= 60 && (c.lead_score || 0) < 80).length
    const coldLeads = rows.filter(c => c.is_lead && (c.lead_score || 0) < 60).length

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0.0'

    // Recent leads (last 5)
    const recentLeads = [...rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(contact => ({
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email,
        source: contact.source || 'web',
        status: contact.is_member ? 'Converted' : contact.is_applicant ? 'Qualified' : contact.last_contacted_at ? 'Contacted' : 'New',
        score: contact.lead_score || 0,
      }))

    // Lead sources
    const sources = rows.reduce((acc: any, contact) => {
      const source = contact.source || 'unknown'
      if (!acc[source]) {
        acc[source] = { count: 0, converted: 0 }
      }
      acc[source].count++
      if (contact.is_member) {
        acc[source].converted++
      }
      return acc
    }, {})

    const leadSources = Object.entries(sources).map(([source, data]: [string, any]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      leads: data.count,
      conversion: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
    }))

    const stats = {
      totalLeads,
      activeCampaigns: 0, // TODO: Implement campaigns table
      conversionRate: parseFloat(conversionRate),
      referrals: 0, // TODO: Implement referrals tracking
      pipeline: {
        new: newLeads,
        contacted,
        qualified,
        converted,
      },
      lifecycle: {
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
      },
      recentLeads,
      leadSources,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Failed to fetch marketing dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
