import Booking from '../models/Booking.model.js';
import User from '../models/User.model.js';
import { sendEmail } from '../utils/email.js';

// Send reminders for upcoming tutoring sessions
export const sendSessionReminders = async () => {
  try {
    console.log('Checking for upcoming session reminders...');
    
    // Find sessions scheduled in the next 2 hours
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);
    
    const upcomingSessions = await Booking.find({
      scheduledAt: {
        $gte: fifteenMinutesFromNow,
        $lte: twoHoursFromNow
      },
      status: 'confirmed',
      reminderSent: { $ne: true }
    })
    .populate('student', 'name email')
    .populate('tutor', 'name email')
    .populate('tutorProfile', 'hourlyRate isFree');

    console.log(`Found ${upcomingSessions.length} upcoming sessions to remind`);

    for (const session of upcomingSessions) {
      try {
        // Send reminder to student
        await sendEmail({
          to: session.student.email,
          subject: `Reminder: Tutoring Session in ${Math.round((session.scheduledAt - new Date()) / (1000 * 60))} minutes`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1A1A1A;">Session Reminder</h2>
              <p>Hi ${session.student.name},</p>
              <p>This is a friendly reminder about your upcoming tutoring session:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2563EB;">Session Details</h3>
                <p><strong>Tutor:</strong> ${session.tutor.name}</p>
                <p><strong>Course:</strong> ${session.course}</p>
                <p><strong>Time:</strong> ${session.scheduledAt.toLocaleString()}</p>
                <p><strong>Duration:</strong> ${session.durationMinutes} minutes</p>
                ${!session.tutorProfile.isFree ? `<p><strong>Cost:</strong> PKR ${session.tutorProfile.hourlyRate}/hour</p>` : ''}
              </div>
              
              <p>Please be ready a few minutes before the session starts.</p>
              <p>Best regards,<br>CampusConnect Team</p>
            </div>
          `
        });

        // Send reminder to tutor
        await sendEmail({
          to: session.tutor.email,
          subject: `Reminder: Tutoring Session in ${Math.round((session.scheduledAt - new Date()) / (1000 * 60))} minutes`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1A1A1A;">Session Reminder</h2>
              <p>Hi ${session.tutor.name},</p>
              <p>This is a friendly reminder about your upcoming tutoring session:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2563EB;">Session Details</h3>
                <p><strong>Student:</strong> ${session.student.name}</p>
                <p><strong>Course:</strong> ${session.course}</p>
                <p><strong>Time:</strong> ${session.scheduledAt.toLocaleString()}</p>
                <p><strong>Duration:</strong> ${session.durationMinutes} minutes</p>
                <p><strong>Student Message:</strong> ${session.studentMessage || 'No message provided'}</p>
              </div>
              
              <p>Please be ready a few minutes before the session starts.</p>
              <p>Best regards,<br>CampusConnect Team</p>
            </div>
          `
        });

        // Mark reminder as sent
        session.reminderSent = true;
        await session.save();
        
        console.log(`Reminder sent for session ${session._id}`);
      } catch (error) {
        console.error(`Failed to send reminder for session ${session._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in sendSessionReminders:', error);
  }
};

// Check for sessions that need completion prompts
export const checkSessionCompletion = async () => {
  try {
    console.log('Checking for sessions that need completion prompts...');
    
    // Find sessions that ended in the last 30 minutes and weren't marked as completed
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const completedSessions = await Booking.find({
      scheduledAt: { $lte: fiveMinutesAgo },
      status: 'confirmed',
      completionPromptSent: { $ne: true }
    })
    .populate('tutor', 'name email')
    .populate('student', 'name email')
    .populate('tutorProfile', 'hourlyRate isFree');

    console.log(`Found ${completedSessions.length} sessions that may need completion`);

    for (const session of completedSessions) {
      try {
        // Send completion prompt to tutor
        await sendEmail({
          to: session.tutor.email,
          subject: 'Action Required: Mark Session as Completed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1A1A1A;">Session Completion</h2>
              <p>Hi ${session.tutor.name},</p>
              <p>Your tutoring session appears to have ended. Please confirm if it was completed:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2563EB;">Session Details</h3>
                <p><strong>Student:</strong> ${session.student.name}</p>
                <p><strong>Course:</strong> ${session.course}</p>
                <p><strong>Time:</strong> ${session.scheduledAt.toLocaleString()}</p>
                <p><strong>Duration:</strong> ${session.durationMinutes} minutes</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard/tutor" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
                  Mark as Completed
                </a>
                <a href="${process.env.FRONTEND_URL}/dashboard/tutor" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
                  Mark as No-Show
                </a>
              </div>
              
              <p>Please update the session status in your tutor dashboard.</p>
              <p>Best regards,<br>CampusConnect Team</p>
            </div>
          `
        });

        // Mark prompt as sent
        session.completionPromptSent = true;
        await session.save();
        
        console.log(`Completion prompt sent for session ${session._id}`);
      } catch (error) {
        console.error(`Failed to send completion prompt for session ${session._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in checkSessionCompletion:', error);
  }
};
