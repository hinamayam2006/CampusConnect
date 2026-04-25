import nodemailer from 'nodemailer';

let transporter;
let transporterVerified = false;

/**
 * Cleanly retrieves the email user from environment variables.
 */
function getEmailUser() {
  return String(process.env.EMAIL_USER || '').trim();
}

/**
 * Cleans the Gmail app password by removing any whitespace.
 */
function getEmailPassword() {
  const pass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '';
  return String(pass).replace(/\s+/g, '');
}

/**
 * Checks if the necessary credentials exist.
 */
function hasEmailConfig() {
  return Boolean(getEmailUser() && getEmailPassword());
}

/**
 * Singleton pattern to get or create the Nodemailer transporter.
 */
function getTransporter() {
  if (!hasEmailConfig()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL/TLS
      auth: {
        user: getEmailUser(),
        pass: getEmailPassword(),
      },
    });
  }

  return transporter;
}

/**
 * Verifies the connection once to avoid overhead on every email sent.
 */
async function verifyTransporter(mailer) {
  if (!mailer || transporterVerified) return;

  try {
    await mailer.verify();
    transporterVerified = true;
    console.log('✅ Email service verified and ready.');
  } catch (err) {
    throw new Error(
      `Email transport verification failed. Check credentials in .env. Original error: ${err.message}`
    );
  }
}

/**
 * Public check to see if email features should be enabled in the UI/Logic.
 */
export function isEmailConfigured() {
  return hasEmailConfig();
}

function renderLinkButton(url, label) {
  return `<p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#1f6feb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a></p>`;
}

/**
 * Core function to send emails. Handles both raw text and HTML notifications.
 */
export async function sendEmail({ to, subject, text, html, recipientName }) {
  const mailer = getTransporter();
  
  if (!mailer) {
    console.warn('⚠️ Email sending skipped: Credentials not configured.');
    return { skipped: true };
  }

  await verifyTransporter(mailer);

  const fromAddress = String(process.env.EMAIL_FROM || getEmailUser()).trim();
  const defaultSubject = 'CampusConnect Notification';
  
  // Logic for body generation: uses provided text, or generates a default if recipientName exists
  const finalBody = text || (recipientName ? `Hi ${recipientName},\n\nYou have a new notification from CampusConnect.` : '');

  try {
    const info = await mailer.sendMail({
      from: `"CampusConnect" <${fromAddress}>`,
      to,
      subject: subject || defaultSubject,
      text: finalBody,
      html: html || (finalBody ? finalBody.replace(/\n/g, '<br>') : undefined), // Basic auto-HTML fallback
    });

    return { skipped: false, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Helper for notification-specific triggers.
 */
export async function sendNotificationEmail({ to, recipientName, message }) {
  return await sendEmail({
    to,
    recipientName,
    text: message,
    subject: 'New CampusConnect Notification'
  });
}

export async function sendVerificationEmail({ to, name, token }) {
  const clientUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const url = `${clientUrl}/verify-email/${token}`;
  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>Welcome to CampusConnect. Please verify your email to activate your account.</p>
    ${renderLinkButton(url, 'Verify Email')}
    <p>If the button does not work, copy this link:</p>
    <p>${url}</p>
  `;

  return await sendEmail({
    to,
    subject: 'Verify your CampusConnect account',
    html,
    text: `Verify your CampusConnect account: ${url}`,
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const clientUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const url = `${clientUrl}/reset-password/${token}`;
  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>You requested a password reset for your CampusConnect account.</p>
    ${renderLinkButton(url, 'Reset Password')}
    <p>If the button does not work, copy this link:</p>
    <p>${url}</p>
    <p>This link will expire in 1 hour.</p>
  `;

  return await sendEmail({
    to,
    subject: 'Reset your CampusConnect password',
    html,
    text: `Reset your CampusConnect password: ${url}`,
  });
}

export async function sendRideRequestEmail({ to, requesterName, rideRoute }) {
  return await sendEmail({
    to,
    subject: 'New Ride Request on CampusConnect',
    text: `${requesterName || 'A student'} requested your ride${rideRoute ? ` for ${rideRoute}` : ''}.`,
    html: `<p>${requesterName || 'A student'} requested your ride${rideRoute ? ` for <strong>${rideRoute}</strong>` : ''}.</p>`,
  });
}

export async function sendTutoringRequestEmail({ to, studentName, sessionTitle, date, time }) {
  return await sendEmail({
    to,
    subject: 'New Tutoring Session Request',
    text: `${studentName || 'A student'} requested tutoring for ${sessionTitle}. ${date || ''} ${time || ''}`.trim(),
    html: `
      <p>Dear Tutor,</p>
      <p>You have received a new session request from a student.</p>
      <p><strong>Student Name:</strong> ${studentName}</p>
      <p><strong>Session Title:</strong> ${sessionTitle}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p>Please log in to your dashboard to review and approve or reject this request.</p>
    `,
  });
}

export async function sendTutoringApprovalEmail({ to, studentName, sessionTitle, date, time }) {
  return await sendEmail({
    to,
    subject: 'Your Session Request Has Been Approved',
    text: `Hi ${studentName || 'Student'}, your tutoring request for ${sessionTitle} was approved. ${date || ''} ${time || ''}`.trim(),
    html: `
      <p>Dear ${studentName},</p>
      <p>Your session request has been approved by the tutor.</p>
      <p><strong>Session Title:</strong> ${sessionTitle}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p>Please be available at the scheduled time.</p>
    `,
  });
}