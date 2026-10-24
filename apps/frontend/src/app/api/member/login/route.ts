import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { setMemberSession } from '@/lib/member-session';
import { enforcePublicRateLimit, readBoundedJson, RequestBodyError } from '@/lib/public-api-guard';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const limited = await enforcePublicRateLimit(request, 'member_login', 15, 1000);
    if (limited) return limited;
    const body = await readBoundedJson(request, 4096);
    const { email, pin } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!/^[^\s@%]+@[^\s@%]+\.[^\s@%]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 254 || typeof pin !== 'string' || !pin || pin.length > 64) {
      return NextResponse.json(
        { error: 'Email and PIN are required' },
        { status: 400 }
      );
    }

    // Find member by email
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select('id, member_number, first_name, last_name, email, pin_hash, status, locked_until, failed_login_attempts')
      .eq('email', normalizedEmail)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: 'Invalid email or PIN' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (member.locked_until && new Date(member.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Invalid email or PIN' },
        { status: 401 }
      );
    }

    // Verify PIN
    let pinValid = false;
    if (member.pin_hash) {
      // Use bcrypt for hashed PINs
      pinValid = await bcrypt.compare(pin, member.pin_hash);
    }

    if (!pinValid) {
      const { error: attemptError } = await supabaseAdmin.rpc('record_member_login_failure', {
        p_member_id: member.id,
      });
      if (attemptError) {
        console.error('Failed to record member login failure:', attemptError);
        return NextResponse.json({ error: 'Login unavailable' }, { status: 503 });
      }

      return NextResponse.json(
        { error: 'Invalid email or PIN' },
        { status: 401 }
      );
    }

    // Check if member is active
    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Invalid email or PIN' },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await supabaseAdmin
      .from('members')
      .update({
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', member.id);

    const memberData = {
      id: member.id,
      member_number: member.member_number,
      first_name: member.first_name,
      last_name: member.last_name,
    };

    const response = NextResponse.json({
      success: true,
      member: memberData,
      message: 'Login successful'
    });
    response.headers.set('Cache-Control', 'no-store');
    setMemberSession(response, member);
    return response;

  } catch (error: any) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error in member login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
