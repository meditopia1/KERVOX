import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { signApplicationFiles } from '@/lib/private-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!user.roles.some(role => ['onboarding', 'admin', 'system_admin', 'operations_manager'].includes(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await createServerSupabaseClient()
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (error) throw error
    const applications = await Promise.all((data || []).map(signApplicationFiles))
    return NextResponse.json({ applications }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to fetch onboarding applications:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}
