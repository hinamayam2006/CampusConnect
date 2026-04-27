import mongoose from 'mongoose';
import Report from '../models/Report.model.js';
import Note from '../models/Note.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import Borrowing from '../models/Borrowing.model.js';
import User from '../models/User.model.js';
import { logActivity } from './activity.service.js';
import { pushNotification } from './notification.service.js';

class ModerationService {
  // Get content model based on targetModel
  getContentModel(targetModel) {
    const models = {
      'Note': Note,
      'Listing': Listing,
      'Ride': Ride,
      'Borrowing': Borrowing,
      'User': User
    };
    return models[targetModel];
  }

  // Process a new report and handle auto-moderation
  async processReport(reportData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Get sensitivity config
      const config = Report.getSensitivityConfig(reportData.targetModel);
      const { sensitivity, threshold } = config;
      
      // Create the report
      const report = await Report.create([{
        ...reportData,
        sensitivity,
        threshold
      }], { session });
      
      const createdReport = report[0];
      
      // Check existing reports for this content
      const existingReports = await Report.find({
        targetModel: reportData.targetModel,
        targetId: reportData.targetId,
        status: { $in: ['pending', 'reviewed'] }
      }).session(session);
      
      const reportCount = existingReports.length;
      const autoAction = Report.getAutoAction(reportCount, sensitivity, reportData.targetModel);
      
      // Apply auto-action if needed
      if (autoAction) {
        await this.applyAutoAction(
          reportData.targetModel,
          reportData.targetId,
          autoAction,
          reportCount,
          session
        );
        
        // Update report with auto-action
        createdReport.autoActionTaken = autoAction;
        createdReport.autoActionAt = new Date();
        await createdReport.save({ session });
      }
      
      await session.commitTransaction();
      
      // Send notifications (outside transaction)
      await this.sendModerationNotifications(createdReport, autoAction, reportCount);
      
      return {
        report: createdReport,
        autoAction,
        reportCount,
        threshold,
        wasAutoActioned: !!autoAction
      };
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Apply auto-moderation actions
  async applyAutoAction(targetModel, targetId, action, reportCount, session) {
    const Model = this.getContentModel(targetModel);
    if (!Model) return;
    
    switch (action) {
      case 'shadow_banned':
        // Shadow ban = flag immediately for most severe cases
        await this.flagContent(targetModel, Model, targetId, session);
        break;
      case 'flagged':
        await this.flagContent(targetModel, Model, targetId, session);
        break;
      case 'warning_badge':
        // Just increment reportCount, status stays active
        await this.incrementReportCount(targetModel, Model, targetId, session);
        break;
      case 'hidden':
        // Hidden = remove content entirely
        await this.removeContent(targetModel, Model, targetId, session);
        break;
    }
  }

  // Flag content for admin review
  async flagContent(targetModel, Model, targetId, session) {
    if (targetModel === 'User') {
      await Model.findByIdAndUpdate(
        targetId,
        {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason: 'Account auto-flagged due to moderation reports',
        },
        { session }
      );
      return;
    }

    await Model.findByIdAndUpdate(targetId, {
      status: 'flagged',
      autoFlaggedAt: new Date()
    }, { session });
  }

  // Increment report count without changing status
  async incrementReportCount(targetModel, Model, targetId, session) {
    if (targetModel === 'User') {
      return;
    }

    await Model.findByIdAndUpdate(targetId, {
      $inc: { reportCount: 1 }
    }, { session });
  }

  // Remove content entirely
  async removeContent(targetModel, Model, targetId, session) {
    if (targetModel === 'User') {
      await Model.findByIdAndUpdate(
        targetId,
        {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason: 'Account removed due to moderation review',
        },
        { session }
      );
      return;
    }

    await Model.findByIdAndUpdate(targetId, {
      status: 'removed'
    }, { session });
  }

  // Send notifications based on moderation actions
  async sendModerationNotifications(report, autoAction, reportCount) {
    const { targetModel, targetId, reportedBy, reason } = report;
    
    // Get content owner
    const Model = this.getContentModel(targetModel);
    if (!Model) return;

    let contentQuery = Model.findById(targetId);
    if (targetModel === 'Note') {
      contentQuery = contentQuery.populate('uploadedBy');
    } else if (targetModel === 'Listing') {
      contentQuery = contentQuery.populate('seller');
    } else if (targetModel === 'Ride') {
      contentQuery = contentQuery.populate('driver');
    } else if (targetModel === 'Borrowing') {
      contentQuery = contentQuery.populate('owner');
    }
    
    const content = await contentQuery;
    
    if (!content) return;

    // Priority notifications for admins
    if (autoAction === 'shadow_banned') {
      await this.sendPriorityAlert(report, content, 'PRIORITY 1 - Immediate Action Required');
    } else if (autoAction === 'flagged' || autoAction === 'hidden') {
      await this.sendPriorityAlert(report, content, 'PRIORITY 2 - Admin Review Required');
    }

    const contentOwner =
      targetModel === 'User'
        ? content
        : (content.uploadedBy || content.seller || content.driver || content.owner);
    if (!contentOwner) return;
    
    // Notify content owner (unless they're the reporter)
    if (String(contentOwner._id) !== String(reportedBy)) {
      await this.notifyContentOwner(contentOwner, content, report, autoAction, reportCount);
    }
  }

  // Send priority alerts to admins
  async sendPriorityAlert(report, content, priority) {
    try {
      // Notify each admin user individually
      const admins = await User.find({ role: 'admin' }).select('_id');
      const notificationData = {
        type: 'moderation_priority',
        message: `${priority}: ${report.targetModel} reported for ${report.reason}`,
        link: `/admin/moderation/${report.targetModel.toLowerCase()}/${report.targetId}`,
        meta: {
          reportId: report._id,
          targetModel: report.targetModel,
          targetId: report.targetId,
          reason: report.reason,
          autoAction: report.autoActionTaken
        }
      };
      
      await Promise.allSettled(
        admins.map(admin => pushNotification(admin._id, notificationData))
      );
    } catch (error) {
      console.warn('Failed to send admin notification:', error.message);
    }
  }

  // Notify content owner
  async notifyContentOwner(owner, content, report, autoAction, reportCount) {
    try {
      let message = `Your ${report.targetModel.toLowerCase()} has been reported.`;
      
      if (autoAction === 'shadow_banned') {
        message = `Your ${report.targetModel.toLowerCase()} has been temporarily removed due to safety concerns.`;
      } else if (autoAction === 'flagged' || autoAction === 'hidden') {
        message = `Your ${report.targetModel.toLowerCase()} has been flagged for admin review.`;
      } else if (autoAction === 'warning_badge') {
        message = `Your ${report.targetModel.toLowerCase()} has received ${reportCount} reports and now shows a warning badge.`;
      }
      
      await pushNotification(owner._id, {
        type: 'content_reported',
        message,
        link: `/help/moderation`,
        meta: {
          targetModel: report.targetModel,
          targetId: report.targetId,
          reason: report.reason,
          reportCount
        }
      });
    } catch (error) {
      console.warn('Failed to notify content owner:', error.message);
    }
  }

  // Admin review actions
  async adminReviewContent(reportId, adminAction, adminNote, adminId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const report = await Report.findById(reportId).session(session);
      if (!report) throw new Error('Report not found');
      if (['resolved', 'dismissed'].includes(report.status)) {
        throw new Error('This report has already been processed.');
      }
      
      // Update report status based on action
      if (adminAction === 'dismiss') {
        report.status = 'dismissed';
      } else if (adminAction === 'no_action') {
        report.status = 'reviewed'; // Can stay in queue for further action
      } else {
        report.status = 'resolved';
      }
      
      report.adminReviewedBy = adminId;
      report.adminReviewedAt = new Date();
      report.adminAction = adminAction;
      report.adminNote = adminNote;
      await report.save({ session });
      
      // Bulk update all other pending reports for this exact target
      await Report.updateMany(
        {
          targetModel: report.targetModel,
          targetId: report.targetId,
          status: { $in: ['pending', 'reviewed'] },
          _id: { $ne: report._id }
        },
        {
          $set: {
            status: report.status,
            adminReviewedBy: adminId,
            adminReviewedAt: new Date(),
            adminAction: adminAction,
            adminNote: adminNote ? `Bulk resolved with parent report: ${adminNote}` : 'Bulk resolved with parent report'
          }
        },
        { session }
      );
      
      // Apply admin action
      const Model = this.getContentModel(report.targetModel);
      
      // Get target name for audit log
      const targetObj = await Model.findById(report.targetId).session(session);
      const targetName = targetObj ? (targetObj.title || targetObj.name || (targetObj.originName ? `${targetObj.originName} to ${targetObj.destinationName}` : 'Unknown Item')) : 'Unknown Item';
      
      await this.applyAdminAction(report.targetModel, Model, report.targetId, adminAction, adminNote, adminId, session);
      
      // Log activity
      await logActivity({
        userId: adminId,
        type: `admin_moderation_${adminAction}`,
        refModel: report.targetModel,
        refId: report.targetId,
        meta: {
          reportId: report._id,
          reason: report.reason,
          targetName,
          adminNote
        }
      });
      
      await session.commitTransaction();
      
      return { success: true, action: adminAction };
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Apply admin-specific actions
  async applyAdminAction(targetModel, Model, targetId, action, adminNote, adminId, session) {
    if (!Model) return;

    switch (action) {
      case 'shadow_ban':
        if (targetModel === 'User') {
          await Model.findByIdAndUpdate(
            targetId,
            {
              isSuspended: true,
              suspendedAt: new Date(),
              suspendedBy: adminId,
              suspensionReason: adminNote || 'Account suspended by moderation admin review',
            },
            { session }
          );
        } else {
          await Model.findByIdAndUpdate(
            targetId,
            {
              status: 'flagged',
              autoFlaggedAt: new Date(),
              adminReviewedAt: new Date(),
              adminReviewedBy: adminId,
            },
            { session }
          );
        }
        break;
      case 'remove_content':
        if (targetModel === 'User') {
          await Model.findByIdAndUpdate(
            targetId,
            {
              isSuspended: true,
              suspendedAt: new Date(),
              suspendedBy: adminId,
              suspensionReason: adminNote || 'Account removed by moderation admin review',
            },
            { session }
          );
        } else {
          await Model.findByIdAndUpdate(
            targetId,
            {
              status: 'removed',
              adminReviewedAt: new Date(),
              adminReviewedBy: adminId,
            },
            { session }
          );
        }
        break;
      case 'warn_user':
        if (targetModel === 'User') {
          await pushNotification(targetId, {
            type: 'moderation_warning',
            message: adminNote || 'Your account received a moderation warning.',
            link: '/help/moderation',
          });
        }
        break;
      case 'dismiss':
        if (targetModel !== 'User') {
          await Model.findByIdAndUpdate(
            targetId,
            {
              adminReviewedAt: new Date(),
              adminReviewedBy: adminId,
            },
            { session }
          );
        }
        break;
      case 'no_action':
        // Keep current status but mark as reviewed
        if (targetModel !== 'User') {
          await Model.findByIdAndUpdate(
            targetId,
            {
              adminReviewedAt: new Date(),
              adminReviewedBy: adminId,
            },
            { session }
          );
        }
        break;
    }
  }

  // Get moderation queue for admins
  async getModerationQueue(priority = 'all', page = 1, limit = 20) {
    const query = { status: { $in: ['pending', 'reviewed'] } };
    
    if (priority === 'critical') {
      query.sensitivity = 'high';
      query.autoActionTaken = 'shadow_banned';
    } else if (priority === 'high') {
      query.sensitivity = { $in: ['high', 'medium'] };
      query.autoActionTaken = { $in: ['flagged', 'hidden'] };
    } else if (priority === 'medium') {
      query.sensitivity = 'low';
      query.autoActionTaken = 'warning_badge';
    }
    
    const reports = await Report.find(query)
      .populate('reportedBy', 'name email')
      .populate('adminReviewedBy', 'name email')
      .populate('targetId', 'title name originName destinationName course subject')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Report.countDocuments(query);
    
    return {
      items: reports,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export default new ModerationService();
