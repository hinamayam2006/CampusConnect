import User from '../models/User.model.js';
import { sendEmail } from '../utils/email.js';

/**
 * Handle user suspension appeals via email
 * This endpoint would be called by an email service (like SendGrid webhook) 
 * when a user replies to a suspension email
 */

export const handleAppealEmail = async (req, res) => {
  try {
    const { from, subject, text, html, headers } = req.body;
    
    // Extract user email from headers or body
    const userEmail = from || headers?.from;
    
    if (!userEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'User email not found in email data' 
      });
    }

    // Find the suspended user
    const user = await User.findOne({ 
      email: userEmail.toLowerCase().trim(),
      isSuspended: true 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No suspended user found with this email' 
      });
    }

    // Get all admin users
    const admins = await User.find({ role: 'admin' });
    const adminEmails = admins.map(admin => admin.email).filter(Boolean);

    if (adminEmails.length === 0) {
      console.warn('No admin users found to notify about appeal');
      return res.status(500).json({ 
        success: false, 
        message: 'No administrators available to review appeal' 
      });
    }

    // Create appeal notification email for admins
    const appealNotificationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suspension Appeal - CampusConnect</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 30px 40px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">CampConnect</h1>
            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Suspension Appeal Received</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px;">
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 24px; margin-right: 10px;">📧</span>
                <h2 style="margin: 0; color: #92400e; font-size: 20px;">User Appeal Received</h2>
              </div>
              <p style="margin: 10px 0 0; color: #78350f; line-height: 1.6;">
                A suspended user has submitted an appeal for review.
              </p>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">User Information:</h3>
              <div style="background: #f3f4f6; border-radius: 6px; padding: 20px;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Name:</strong></p>
                <p style="margin: 0 0 15px; color: #111827; font-size: 16px;">${user.name}</p>
                
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Email:</strong></p>
                <p style="margin: 0 0 15px; color: #111827; font-size: 16px;">${user.email}</p>
                
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Suspension Reason:</strong></p>
                <p style="margin: 0 0 15px; color: #111827; font-size: 16px;">${user.suspensionReason || 'Not specified'}</p>
                
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Suspended On:</strong></p>
                <p style="margin: 0; color: #111827; font-size: 16px;">${user.suspendedAt ? new Date(user.suspendedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Appeal Message:</h3>
              <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 20px; max-height: 300px; overflow-y: auto;">
                <p style="margin: 0; color: #1e40af; line-height: 1.6; white-space: pre-wrap;">${text || 'No text content provided'}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Recommended Actions:</h3>
              <div style="display: grid; gap: 15px;">
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px;">
                  <p style="margin: 0 0 10px; color: #166534; font-weight: 600;">✅ Review the Appeal</p>
                  <p style="margin: 0; color: #15803d; font-size: 14px;">Log in to admin panel to review the full user history and make a decision.</p>
                </div>
                <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 15px;">
                  <p style="margin: 0 0 10px; color: #854d0e; font-weight: 600;">📧 Respond to User</p>
                  <p style="margin: 0; color: #713f12; font-size: 14px;">Reply directly to this email to communicate with the user about your decision.</p>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px;">
                  <p style="margin: 0 0 10px; color: #475569; font-weight: 600;">⏰ Timeline</p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Please review and respond within 24-48 hours.</p>
                </div>
              </div>
            </div>

            <div style="background: #dc2626; color: white; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-weight: 600; font-size: 16px;">Admin Action Required</p>
              <p style="margin: 10px 0 0; font-size: 14px;">This appeal requires your attention. Please review and take appropriate action.</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
              This is an automated appeal notification from CampusConnect
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} CampusConnect. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send notification to all admins
    const adminPromises = adminEmails.map(adminEmail => 
      sendEmail({
        to: adminEmail,
        subject: `Suspension Appeal: ${user.name} (${user.email})`,
        html: appealNotificationHtml
      }).catch(error => {
        console.error(`Failed to send appeal notification to ${adminEmail}:`, error.message);
      })
    );

    await Promise.allSettled(adminPromises);

    // Also log the appeal for audit purposes
    console.log(`Appeal received from ${user.email} (${user.name})`);

    res.status(200).json({ 
      success: true, 
      message: `Appeal notification sent to ${adminEmails.length} administrators`,
      data: {
        userEmail: user.email,
        userName: user.name,
        notifiedAdmins: adminEmails.length
      }
    });

  } catch (error) {
    console.error('Error handling appeal email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process appeal email' 
    });
  }
};

export const submitAppeal = async (req, res) => {
  try {
    const { email, message } = req.body;

    // H-5 FIX: Suspended users cannot pass the `protect` middleware, so this endpoint
    // is intentionally unauthenticated — we look the user up by email instead.
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Appeal message must be at least 10 characters long.',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Appeal message cannot exceed 5000 characters.',
      });
    }

    // Find user by email and verify they are actually suspended
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Do not reveal whether the account exists — return a success-like response
      return res.status(200).json({
        success: true,
        message:
          'If a suspended account with that email exists, your appeal has been submitted to our administration team. We will review it and respond within 24–48 hours.',
      });
    }

    if (!user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: 'Only suspended accounts can submit an appeal.',
      });
    }

    // Get admin emails
    const admins = await User.find({ role: 'admin' });
    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

    if (adminEmails.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No administrators available. Please try again later.',
      });
    }

    // Build appeal notification HTML
    const sanitizedMessage = String(message)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const appealNotificationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Manual Appeal Submission - CampusConnect</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 30px 40px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">CampusConnect</h1>
            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Manual Appeal Submission</p>
          </div>

          <div style="padding: 40px;">
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px; color: #92400e; font-size: 20px;">User submitted appeal via web form</h2>
              <p style="margin: 0; color: #78350f; line-height: 1.6;">
                A suspended user has submitted an appeal through the web form.
              </p>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">User Details:</h3>
              <div style="background: #f3f4f6; border-radius: 6px; padding: 20px;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Name:</strong> ${user.name}</p>
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Suspension Reason:</strong> ${user.suspensionReason || 'Not specified'}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Appeal Message:</h3>
              <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 20px;">
                <p style="margin: 0; color: #1e40af; line-height: 1.6; white-space: pre-wrap;">${sanitizedMessage}</p>
              </div>
            </div>

            <div style="background: #dc2626; color: white; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-weight: 600; font-size: 16px;">Please review this appeal promptly</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all admins
    await Promise.allSettled(
      adminEmails.map((adminEmail) =>
        sendEmail({
          to: adminEmail,
          subject: `Manual Appeal: ${user.name} (${user.email})`,
          html: appealNotificationHtml,
        })
      )
    );

    console.log(`Appeal submitted for ${user.email} (${user.name})`);

    res.status(200).json({
      success: true,
      message:
        'Your appeal has been submitted to our administration team. We will review it and respond within 24–48 hours.',
    });
  } catch (error) {
    console.error('Error submitting manual appeal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit appeal. Please try again.',
    });
  }
};

