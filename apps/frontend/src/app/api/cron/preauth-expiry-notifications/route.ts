import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotification } from '@/lib/notifications';

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

/**
 * Pre-Authorization Expiry Notification Cron Job
 * 
 * Runs daily to notify members about pre-authorizations expiring in 7 days
 * 
 * Schedule: Daily at 9:00 AM
 * 
 * Usage:
 * - Set up cron job in hosting platform (Vercel, AWS, etc.)
 * - Or call manually: GET /api/cron/preauth-expiry-notifications
 * - Requires CRON_SECRET environment variable for authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔔 Starting pre-authorization expiry notification job...');

    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const targetDate = sevenDaysFromNow.toISOString().split('T')[0];

    console.log(`📅 Looking for pre-auths expiring on: ${targetDate}`);

    // Find pre-authorizations expiring in 7 days
    const { data: expiringPreauths, error } = await supabaseAdmin
      .from('pre_authorizations')
      .select(`
        *,
        members:member_id (
          id,
          first_name,
          last_name,
          email,
          mobile,
          email_consent,
          sms_consent
        )
      `)
      .eq('status', 'approved')
      .eq('used', false)
      .eq('valid_until', targetDate);

    if (error) {
      console.error('❌ Error fetching expiring pre-auths:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expiring pre-authorizations' },
        { status: 500 }
      );
    }

    if (!expiringPreauths || expiringPreauths.length === 0) {
      console.log('✅ No pre-authorizations expiring in 7 days');
      return NextResponse.json({
        success: true,
        message: 'No pre-authorizations expiring in 7 days',
        count: 0
      });
    }

    console.log(`📧 Found ${expiringPreauths.length} pre-auth(s) expiring in 7 days`);

    // Send notifications
    let successCount = 0;
    let errorCount = 0;

    for (const preauth of expiringPreauths) {
      try {
        const member = preauth.members;

        if (!member) {
          console.error(`❌ Member not found for pre-auth ${preauth.preauth_number}`);
          errorCount++;
          continue;
        }

        const recipient = {
          email: member.email,
          mobile: member.mobile,
          firstName: member.first_name,
          lastName: member.last_name
        };

        const preferences = {
          emailConsent: member.email_consent !== false,
          smsConsent: member.sms_consent !== false
        };

        await sendNotification(
          'preauth_expiring',
          recipient,
          {
            preauthNumber: preauth.preauth_number,
            validUntil: preauth.valid_until,
            daysRemaining: 7
          },
          preferences
        );

        console.log(`✅ Notification sent for pre-auth ${preauth.preauth_number}`);
        successCount++;

      } catch (notificationError) {
        console.error(`❌ Error sending notification for pre-auth ${preauth.preauth_number}:`, notificationError);
        errorCount++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Pre-auth expiry notification job complete');
    console.log(`   Total: ${expiringPreauths.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json({
      success: true,
      message: 'Pre-authorization expiry notifications sent',
      total: expiringPreauths.length,
      sent: successCount,
      errors: errorCount
    });

  } catch (error: any) {
    console.error('❌ Error in pre-auth expiry notification job:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
