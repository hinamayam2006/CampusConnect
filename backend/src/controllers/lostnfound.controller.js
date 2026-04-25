import LostnFound from '../models/LostnFound.model.js';
import { buildTokenSearchQuery } from '../utils/search.js';
import { logActivity } from '../services/activity.service.js';

export const listLostnFoundItems = async (req, res) => {
  try {
    const {
      status = 'open',
      postType,
      category,
      search,
      page = '1',
      limit = '12',
    } = req.query;

    const q = { status };
    if (postType) q.postType = postType;
    if (category) q.category = category;
    const searchQuery = buildTokenSearchQuery(search, ['title', 'description', 'location', 'category']);
    if (searchQuery) {
      q.$and = searchQuery.$and;
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const lim = Math.min(48, Math.max(1, Number(limit) || 12));
    const skip = (currentPage - 1) * lim;

    const [items, total] = await Promise.all([
      LostnFound.find(q)
        .populate('owner', 'name avatar department year')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      LostnFound.countDocuments(q),
    ]);

    return res.status(200).json({
      success: true,
      data: { items, total, page: currentPage },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createLostnFoundItem = async (req, res) => {
  try {
    const created = await LostnFound.create({ ...req.body, owner: req.user._id });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getLostnFoundItemById = async (req, res) => {
  try {
    const item = await LostnFound.findById(req.params.id).populate('owner', 'name avatar department year');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateLostnFoundItem = async (req, res) => {
  try {
    const item = await LostnFound.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { status, ...rest } = req.body;
    const currentStatus = item.status;
    const nextStatus = status || currentStatus;
    const allowedTransitions = {
      open: ['resolved', 'closed'],
      resolved: ['open', 'closed'],
      closed: ['open'],
    };

    if (
      status &&
      status !== currentStatus &&
      !allowedTransitions[currentStatus]?.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: ${currentStatus} -> ${status}`,
      });
    }

    Object.assign(item, { ...rest, status: nextStatus });

    if (nextStatus === 'resolved' && currentStatus !== 'resolved') {
      item.resolvedAt = new Date();
    }
    if (nextStatus === 'open') {
      item.resolvedAt = null;
    }

    await item.save();

    if (status && status !== currentStatus) {
      const activityType =
        nextStatus === 'resolved'
          ? 'lostnfound_item_resolved'
          : nextStatus === 'open'
            ? 'lostnfound_item_reopened'
            : 'lostnfound_item_closed';
      await logActivity({
        userId: req.user._id,
        type: activityType,
        refModel: 'LostnFound',
        refId: item._id,
        meta: { previousStatus: currentStatus, nextStatus },
      });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLostnFoundItem = async (req, res) => {
  try {
    const item = await LostnFound.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await item.deleteOne();
    return res.status(200).json({ success: true, message: 'Post deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
