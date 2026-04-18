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