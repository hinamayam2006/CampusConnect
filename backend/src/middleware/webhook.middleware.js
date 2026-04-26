import crypto from 'crypto';

/**
 * Verify webhook signature from email service (e.g., SendGrid)
 * Expects X-Twilio-Email-Event-Webhook-Signature header and X-Twilio-Email-Event-Webhook-Timestamp
 * Prevents replay attacks and unauthorized webhook calls
 */
export const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-twilio-email-event-webhook-signature'];
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];
  const apiKey = process.env.SENDGRID_WEBHOOK_KEY || '';

  // If no webhook key configured, reject webhook
  if (!apiKey) {
    console.warn('SENDGRID_WEBHOOK_KEY not configured; rejecting webhook');
    return res.status(401).json({ success: false, message: 'Webhook authentication failed' });
  }

  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, message: 'Missing webhook signature or timestamp' });
  }

  // Prevent replay attacks — timestamp must be within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - requestTime) > 300) {
    console.warn(`Webhook timestamp out of range: ${requestTime} vs ${currentTime}`);
    return res.status(401).json({ success: false, message: 'Webhook timestamp expired' });
  }

  // Reconstruct and verify HMAC signature
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signatureString = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(signatureString)
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.warn('Invalid webhook signature');
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  next();
};
