import nodemailer from 'nodemailer';
import { createServiceRoleClient } from '../supabase/service-role';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendActivationCodeEmail(
  to: string,
  activationCode: string,
  tariffName: string,
  periodMonths: number
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Gift Activation Code - ${tariffName}`;
  const body = `
    <h1>Congratulations!</h1>
    <p>Your gift application for <strong>${tariffName}</strong> has been approved.</p>
    <p>Your activation code: <strong style="font-size: 1.2em; color: #4F46E5;">${activationCode}</strong></p>
    <p>This code will activate the tariff for <strong>${periodMonths} month${periodMonths > 1 ? 's' : ''}</strong>.</p>
    <p>To activate, visit the activation page and enter this code.</p>
    <p>This code can only be used once.</p>
    <hr />
    <p style="color: #666;">Thank you for using our service!</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html: body,
    });

    // Log successful email
    const supabase = createServiceRoleClient();
    await supabase.from('email_log').insert({
      recipient: to,
      subject,
      body,
      status: 'sent',
    });

    return { success: true };
  } catch (error: any) {
    // Log failed email
    const supabase = createServiceRoleClient();
    await supabase.from('email_log').insert({
      recipient: to,
      subject,
      body,
      status: 'failed',
      error_message: error.message,
    });

    return { success: false, error: error.message };
  }
}

export function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += '-';
  }
  return code;
}