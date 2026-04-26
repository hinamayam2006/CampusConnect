import moderationService from '../services/moderation.service.js';
import Report from '../models/Report.model.js';

export const submitReport = async (req, res) => {
  try {
    const { targetModel, targetId, reason, comment } = req.body;
    
    // Validate required fields
    if (!targetModel || !targetId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target model, target ID, and reason are required' 
      });
    }
    
    // Check if user already reported this content
    const existingReport = await Report.findOne({
      targetModel,
      targetId,
      reportedBy: req.user._id
    });
    
    if (existingReport) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reported this content' 
      });
    }
    
    // Process the report
    const result = await moderationService.processReport({
      targetModel,
      targetId,
      reportedBy: req.user._id,
      reason,
      comment: comment?.trim() || ''
    });
    
    res.status(200).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        reportId: result.report._id,
        autoAction: result.autoAction,
        reportCount: result.reportCount,
        threshold: result.threshold,
        wasAutoActioned: result.wasAutoActioned,
        sensitivity: result.report.sensitivity
      }
    });
    
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to submit report' 
    });
  }
};

export const getModerationQueue = async (req, res) => {
  try {
    const { priority = 'all', page = 1, limit = 20 } = req.query;
    
    const queue = await moderationService.getModerationQueue(
      priority, 
      Number(page), 
      Number(limit)
    );
    
    res.status(200).json({
      success: true,
      data: queue
    });
    
  } catch (error) {
    console.error('Moderation queue error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch moderation queue' 
    });
  }
};

export const adminReviewReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, adminNote } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action is required' 
      });
    }
    
    const result = await moderationService.adminReviewContent(
      reportId,
      action,
      adminNote || '',
      req.user._id
    );
    
    res.status(200).json({
      success: true,
      message: `Content ${action}d successfully`,
      data: result
    });
    
  } catch (error) {
    console.error('Admin review error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to review content' 
    });
  }
};

export const getReportReasons = async (req, res) => {
  try {
    const { targetModel } = req.query;
    
    if (!targetModel) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target model is required' 
      });
    }
    
    const config = Report.getSensitivityConfig(targetModel);
    const reasons = Report.getReasonsForSensitivity(config.sensitivity);
    
    // Format reasons for frontend
    const formattedReasons = reasons.map(reason => ({
      value: reason,
      label: reason.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));
    
    res.status(200).json({
      success: true,
      data: {
        sensitivity: config.sensitivity,
        threshold: config.threshold,
        reasons: formattedReasons
      }
    });
    
  } catch (error) {
    console.error('Get report reasons error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch report reasons' 
    });
  }
};

export const getContentReports = async (req, res) => {
  try {
    const { targetModel, targetId } = req.params;
    
    const reports = await Report.find({
      targetModel,
      targetId,
      status: { $in: ['pending', 'reviewed'] }
    })
    .populate('reportedBy', 'name email')
    .populate('adminReviewedBy', 'name email')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        items: reports,
        total: reports.length
      }
    });
    
  } catch (error) {
    console.error('Get content reports error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch content reports' 
    });
  }
};
