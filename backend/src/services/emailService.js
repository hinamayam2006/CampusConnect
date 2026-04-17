import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function send({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EmailService] Skipped – EMAIL_USER / EMAIL_PASS not set');
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: `"Tutoring Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });

  console.log(`[EmailService] Sent to ${to}: "${subject}" (${info.messageId})`);
  return { skipped: false, messageId: info.messageId };
}

// ── FUNCTION 1: sendSessionRequestEmail ──────────────────────────────
export async function sendSessionRequestEmail({ tutorEmail, studentName, sessionTitle, date, time }) {
  const subject = 'New Tutoring Session Request';

  const html = `
<p>Dear Tutor,</p>

<p>You have received a new session request from a student.</p>

<p><strong>Student Name:</strong> ${studentName}</p>
<p><strong>Session Title:</strong> ${sessionTitle}</p>
<p><strong>Date:</strong> ${date}</p>
<p><strong>Time:</strong> ${time}</p>

<p>Please log in to your dashboard to review and approve or reject this request.</p>

<p>Regards,<br/>
Tutoring Platform Team</p>
`;

  try {
    return await send({ to: tutorEmail, subject, html });
  } catch (err) {
    console.error('[EmailService] sendSessionRequestEmail failed:', err.message);
    return { skipped: false, error: err.message };
  }
}

// ── FUNCTION 2: sendApprovalEmail ────────────────────────────────────
export async function sendApprovalEmail({ studentEmail, studentName, sessionTitle, date, time }) {
  const subject = 'Your Session Request Has Been Approved';

  const html = `
<p>Dear ${studentName},</p>

<p>Your session request has been approved by the tutor.</p>

<p><strong>Session Title:</strong> ${sessionTitle}</p>
<p><strong>Date:</strong> ${date}</p>
<p><strong>Time:</strong> ${time}</p>

<p>Please be available at the scheduled time.</p>

<p>Regards,<br/>
Tutoring Platform Team</p>
`;

  try {
    return await send({ to: studentEmail, subject, html });
  } catch (err) {
    console.error('[EmailService] sendApprovalEmail failed:', err.message);
    return { skipped: false, error: err.message };
  }
}
