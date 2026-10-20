/**
 * Notifications System
 * Handles email and SMS notifications for claims, pre-authorizations, and other events
 */

export interface NotificationRecipient {
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SMSNotification {
  to: string; // Mobile number
  message: string;
}

export type NotificationType = 
  | 'claim_submitted'
  | 'claim_approved'
  | 'claim_rejected'
  | 'claim_pended'
  | 'preauth_submitted'
  | 'preauth_approved'
  | 'preauth_rejected'
  | 'preauth_expiring'
  | 'upgrade_verified'
  | 'upgrade_approved'
  | 'dependant_approved';

/**
 * Send email notification
 * In production, this would integrate with SendGrid, AWS SES, or similar
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('📧 Email notification:');
    console.log(`   To: ${notification.to}`);
    console.log(`   Subject: ${notification.subject}`);
    console.log(`   Body: ${notification.text || notification.html.substring(0, 100)}...`);
    
    // For now, just log the notification
    // In production, replace with actual email service call:
    // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email: notification.to }] }],
    //     from: { email: 'noreply@kervox.cloud', name: 'KERVOX' },
    //     subject: notification.subject,
    //     content: [{ type: 'text/html', value: notification.html }]
    //   })
    // });
    
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Send SMS notification
 * In production, this would integrate with Twilio, AWS SNS, or similar
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('📱 SMS notification:');
    console.log(`   To: ${notification.to}`);
    console.log(`   Message: ${notification.message}`);
    
    // For now, just log the notification
    // In production, replace with actual SMS service call:
    // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/ACCOUNT_SID/Messages.json', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
    //     'Content-Type': 'application/x-www-form-urlencoded'
    //   },
    //   body: new URLSearchParams({
    //     To: notification.to,
    //     From: process.env.TWILIO_PHONE_NUMBER!,
    //     Body: notification.message
    //   })
    // });
    
    return true;
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return false;
  }
}

/**
 * Send notification (email and/or SMS based on recipient preferences)
 */
export async function sendNotification(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: any,
  preferences?: {
    emailConsent?: boolean;
    smsConsent?: boolean;
  }
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const results = {
    emailSent: false,
    smsSent: false
  };

  // Send email if recipient has email and consent
  if (recipient.email && preferences?.emailConsent !== false) {
    const emailContent = generateEmailContent(type, recipient, data);
    if (emailContent) {
      results.emailSent = await sendEmail(emailContent);
    }
  }

  // Send SMS if recipient has mobile and consent
  if (recipient.mobile && preferences?.smsConsent !== false) {
    const smsContent = generateSMSContent(type, recipient, data);
    if (smsContent) {
      results.smsSent = await sendSMS(smsContent);
    }
  }

  return results;
}

/**
 * Generate email content based on notification type
 */
function generateEmailContent(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: any
): EmailNotification | null {
  const firstName = recipient.firstName || 'Member';
  
  switch (type) {
    case 'claim_submitted':
      return {
        to: recipient.email!,
        subject: `Claim Submitted - ${data.claimNumber}`,
        html: `
          <h2>Claim Submitted Successfully</h2>
          <p>Dear ${firstName},</p>
          <p>Your claim has been submitted successfully and is being processed.</p>
          <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
          <p><strong>Service Date:</strong> ${data.serviceDate}</p>
          <p><strong>Claimed Amount:</strong> R${data.claimedAmount.toLocaleString()}</p>
          <p>You will receive a notification once your claim has been processed.</p>
          <p>Best regards,<br>KERVOX Claims Team</p>
        `,
        text: `Claim Submitted - ${data.claimNumber}. Claimed Amount: R${data.claimedAmount}. You will be notified once processed.`
      };

    case 'claim_approved':
      return {
        to: recipient.email!,
        subject: `Claim Approved - ${data.claimNumber}`,
        html: `
          <h2>Claim Approved</h2>
          <p>Dear ${firstName},</p>
          <p>Great news! Your claim has been approved.</p>
          <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
          <p><strong>Claimed Amount:</strong> R${data.claimedAmount.toLocaleString()}</p>
          <p><strong>Approved Amount:</strong> R${data.approvedAmount.toLocaleString()}</p>
          ${data.memberResponsibility > 0 ? `<p><strong>Your Responsibility:</strong> R${data.memberResponsibility.toLocaleString()}</p>` : ''}
          <p>Payment will be processed within 7 business days.</p>
          <p>Best regards,<br>KERVOX Claims Team</p>
        `,
        text: `Claim ${data.claimNumber} approved for R${data.approvedAmount}. Payment within 7 days.`
      };

    case 'claim_rejected':
      return {
        to: recipient.email!,
        subject: `Claim Rejected - ${data.claimNumber}`,
        html: `
          <h2>Claim Rejected</h2>
          <p>Dear ${firstName},</p>
          <p>Unfortunately, your claim has been rejected.</p>
          <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
          <p><strong>Rejection Reason:</strong> ${data.rejectionReason}</p>
          <p>If you believe this decision is incorrect, you may appeal by contacting our claims department at claims@kervox.cloud or calling 0800 123 456.</p>
          <p>Best regards,<br>KERVOX Claims Team</p>
        `,
        text: `Claim ${data.claimNumber} rejected. Reason: ${data.rejectionReason}. Contact claims@kervox.cloud to appeal.`
      };

    case 'claim_pended':
      return {
        to: recipient.email!,
        subject: `Claim Pending - ${data.claimNumber}`,
        html: `
          <h2>Claim Pending Additional Information</h2>
          <p>Dear ${firstName},</p>
          <p>Your claim requires additional information before we can process it.</p>
          <p><strong>Claim Number:</strong> ${data.claimNumber}</p>
          <p><strong>Reason:</strong> ${data.pendedReason}</p>
          ${data.additionalInfoRequested ? `<p><strong>Required Information:</strong> ${data.additionalInfoRequested}</p>` : ''}
          <p>Please contact our claims department at claims@kervox.cloud or call 0800 123 456 to provide the required information.</p>
          <p>Best regards,<br>KERVOX Claims Team</p>
        `,
        text: `Claim ${data.claimNumber} pending. Reason: ${data.pendedReason}. Contact claims@kervox.cloud.`
      };

    case 'preauth_submitted':
      return {
        to: recipient.email!,
        subject: `Pre-Authorization Submitted - ${data.preauthNumber}`,
        html: `
          <h2>Pre-Authorization Request Submitted</h2>
          <p>Dear ${firstName},</p>
          <p>Your pre-authorization request has been submitted successfully.</p>
          <p><strong>Pre-Auth Number:</strong> ${data.preauthNumber}</p>
          <p><strong>Service Date:</strong> ${data.serviceDate}</p>
          <p><strong>Estimated Cost:</strong> R${data.estimatedCost.toLocaleString()}</p>
          <p>You will receive a notification once your request has been reviewed.</p>
          <p>Best regards,<br>KERVOX Pre-Authorization Team</p>
        `,
        text: `Pre-authorization ${data.preauthNumber} submitted. Estimated cost: R${data.estimatedCost}. You will be notified once reviewed.`
      };

    case 'preauth_approved':
      return {
        to: recipient.email!,
        subject: `Pre-Authorization Approved - ${data.preauthNumber}`,
        html: `
          <h2>Pre-Authorization Approved</h2>
          <p>Dear ${firstName},</p>
          <p>Your pre-authorization request has been approved.</p>
          <p><strong>Pre-Auth Number:</strong> ${data.preauthNumber}</p>
          <p><strong>Approved Amount:</strong> R${data.approvedAmount.toLocaleString()}</p>
          <p><strong>Valid Until:</strong> ${data.validUntil}</p>
          <p>Please use this pre-authorization number when submitting your claim.</p>
          <p>Best regards,<br>KERVOX Pre-Authorization Team</p>
        `,
        text: `Pre-authorization ${data.preauthNumber} approved for R${data.approvedAmount}. Valid until ${data.validUntil}.`
      };

    case 'preauth_rejected':
      return {
        to: recipient.email!,
        subject: `Pre-Authorization Rejected - ${data.preauthNumber}`,
        html: `
          <h2>Pre-Authorization Rejected</h2>
          <p>Dear ${firstName},</p>
          <p>Unfortunately, your pre-authorization request has been rejected.</p>
          <p><strong>Pre-Auth Number:</strong> ${data.preauthNumber}</p>
          <p><strong>Rejection Reason:</strong> ${data.rejectionReason}</p>
          <p>If you believe this decision is incorrect, you may appeal by contacting our pre-authorization team at preauth@kervox.cloud or calling 0800 123 456.</p>
          <p>Best regards,<br>KERVOX Pre-Authorization Team</p>
        `,
        text: `Pre-authorization ${data.preauthNumber} rejected. Reason: ${data.rejectionReason}. Contact preauth@kervox.cloud to appeal.`
      };

    case 'preauth_expiring':
      return {
        to: recipient.email!,
        subject: `Pre-Authorization Expiring Soon - ${data.preauthNumber}`,
        html: `
          <h2>Pre-Authorization Expiring Soon</h2>
          <p>Dear ${firstName},</p>
          <p>Your pre-authorization is expiring soon.</p>
          <p><strong>Pre-Auth Number:</strong> ${data.preauthNumber}</p>
          <p><strong>Expires On:</strong> ${data.validUntil}</p>
          <p><strong>Days Remaining:</strong> ${data.daysRemaining}</p>
          <p>Please submit your claim before the expiry date or request a new pre-authorization.</p>
          <p>Best regards,<br>KERVOX Pre-Authorization Team</p>
        `,
        text: `Pre-authorization ${data.preauthNumber} expires on ${data.validUntil} (${data.daysRemaining} days remaining).`
      };

    case 'upgrade_approved':
      return {
        to: recipient.email!,
        subject: `Plan Upgrade Approved`,
        html: `
          <h2>Plan Upgrade Approved</h2>
          <p>Dear ${firstName},</p>
          <p>Your plan upgrade has been approved!</p>
          <p><strong>Previous Plan:</strong> ${data.currentPlan}</p>
          <p><strong>New Plan:</strong> ${data.upgradedPlan}</p>
          <p><strong>New Monthly Premium:</strong> R${data.newPremium.toLocaleString()}</p>
          <p>Your new plan is now active and you can start enjoying your enhanced benefits.</p>
          <p>Best regards,<br>KERVOX Member Services</p>
        `,
        text: `Plan upgrade approved! New plan: ${data.upgradedPlan} at R${data.newPremium}/month.`
      };

    case 'dependant_approved':
      return {
        to: recipient.email!,
        subject: `Dependant Added Successfully`,
        html: `
          <h2>Dependant Added to Your Plan</h2>
          <p>Dear ${firstName},</p>
          <p>Your dependant has been added to your plan successfully.</p>
          <p><strong>Dependant Name:</strong> ${data.dependantName}</p>
          <p><strong>Relationship:</strong> ${data.relationship}</p>
          <p><strong>New Monthly Premium:</strong> R${data.newPremium.toLocaleString()}</p>
          <p>Your dependant is now covered under your plan.</p>
          <p>Best regards,<br>KERVOX Member Services</p>
        `,
        text: `Dependant ${data.dependantName} added to your plan. New premium: R${data.newPremium}/month.`
      };

    default:
      return null;
  }
}

/**
 * Generate SMS content based on notification type
 */
function generateSMSContent(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: any
): SMSNotification | null {
  const firstName = recipient.firstName || 'Member';
  
  switch (type) {
    case 'claim_submitted':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Claim ${data.claimNumber} submitted successfully. Amount: R${data.claimedAmount}. You will be notified once processed.`
      };

    case 'claim_approved':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Claim ${data.claimNumber} APPROVED for R${data.approvedAmount}. Payment within 7 days.`
      };

    case 'claim_rejected':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Claim ${data.claimNumber} REJECTED. Reason: ${data.rejectionReason}. Call 0800 123 456 to appeal.`
      };

    case 'claim_pended':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Claim ${data.claimNumber} PENDING. ${data.pendedReason}. Call 0800 123 456 for details.`
      };

    case 'preauth_approved':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Pre-auth ${data.preauthNumber} APPROVED for R${data.approvedAmount}. Valid until ${data.validUntil}.`
      };

    case 'preauth_rejected':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Pre-auth ${data.preauthNumber} REJECTED. ${data.rejectionReason}. Call 0800 123 456.`
      };

    case 'preauth_expiring':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Pre-auth ${data.preauthNumber} expires in ${data.daysRemaining} days (${data.validUntil}). Submit claim soon.`
      };

    case 'upgrade_approved':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Plan upgrade approved! New plan: ${data.upgradedPlan} at R${data.newPremium}/month.`
      };

    case 'dependant_approved':
      return {
        to: recipient.mobile!,
        message: `KERVOX: Dependant ${data.dependantName} added. New premium: R${data.newPremium}/month.`
      };

    default:
      return null;
  }
}

/**
 * Format mobile number for SMS (ensure it starts with country code)
 */
export function formatMobileNumber(mobile: string): string {
  // Remove spaces and special characters
  let cleaned = mobile.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0, replace with +27 (South Africa)
  if (cleaned.startsWith('0')) {
    cleaned = '+27' + cleaned.substring(1);
  }
  
  // If doesn't start with +, add +27
  if (!cleaned.startsWith('+')) {
    cleaned = '+27' + cleaned;
  }
  
  return cleaned;
}
