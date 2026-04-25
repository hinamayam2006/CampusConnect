import Borrowing from '../models/Borrowing.model.js';
import { buildTokenSearchQuery } from '../utils/search.js';
import { logActivity } from '../services/activity.service.js';

export const listBorrowItems = async (req, res) => {
  try {
    const {
      status = 'available',
      category,
      search,
      page = '1',
      limit = '12',
    } = req.query;

    const q = { status };
    if (category) q.category = category;
    const searchQuery = buildTokenSearchQuery(search, ['title', 'description', 'category']);
    if (searchQuery) {
      q.$and = searchQuery.$and;
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const lim = Math.min(48, Math.max(1, Number(limit) || 12));
    const skip = (currentPage - 1) * lim;

    const [items, total] = await Promise.all([
      Borrowing.find(q)
        .populate('owner', 'name avatar department year')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Borrowing.countDocuments(q),
    ]);

    return res.status(200).json({
      success: true,
      data: { items, total, page: currentPage },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getBorrowItemById = async (req, res) => {
  try {
    const item = await Borrowing.findById(req.params.id).populate(
      'owner',
      'name avatar department year'
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createBorrowItem = async (req, res) => {
  try {
    const created = await Borrowing.create({ ...req.body, owner: req.user._id });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyBorrowItems = async (req, res) => {
  try {
    const items = await Borrowing.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('owner', 'name avatar department year');

    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBorrowItem = async (req, res) => {
  try {
    const item = await Borrowing.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found or unauthorized' });
    }

    const { status, dueAt, returnedAt, borrower, ...rest } = req.body;

    if (typeof status !== 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Use dedicated lifecycle actions to change borrowing status.',
      });
    }

    Object.assign(item, {
      ...rest,
      ...(typeof dueAt !== 'undefined' ? { dueAt } : {}),
      ...(typeof returnedAt !== 'undefined' ? { returnedAt } : {}),
      ...(typeof borrower !== 'undefined' ? { borrower } : {}),
    });
    await item.save();

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markBorrowed = async (req, res) => {
  try {
    const item = await Borrowing.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found or unauthorized' });
    }

    if (!['available', 'requested'].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark item as borrowed from ${item.status} state.`,
      });
    }

    const borrowerId = req.body?.borrower || item.borrower;
    if (!borrowerId) {
      return res.status(400).json({
        success: false,
        message: 'Borrower is required to mark item as borrowed.',
      });
    }

    item.status = 'borrowed';
    item.borrower = borrowerId;
    item.returnedAt = null;
    if (typeof req.body?.dueAt !== 'undefined') {
      item.dueAt = req.body.dueAt;
    }

    await item.save();
    await logActivity({
      userId: req.user._id,
      type: 'borrow_item_borrowed',
      refModel: 'Borrowing',
      refId: item._id,
      meta: { borrower: item.borrower, dueAt: item.dueAt },
    });

    return res.status(200).json({
      success: true,
      message: 'Item marked as borrowed.',
      data: item,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markReturned = async (req, res) => {
  try {
    const item = await Borrowing.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const isOwner = String(item.owner) === String(req.user._id);
    const isBorrower = item.borrower && String(item.borrower) === String(req.user._id);
    if (!isOwner && !isBorrower) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (item.status !== 'borrowed') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark item as returned from ${item.status} state.`,
      });
    }

    item.status = 'returned';
    item.returnedAt = new Date();
    await item.save();

    await logActivity({
      userId: req.user._id,
      type: 'borrow_item_returned',
      refModel: 'Borrowing',
      refId: item._id,
      meta: { owner: item.owner, borrower: item.borrower, returnedAt: item.returnedAt },
    });

    return res.status(200).json({
      success: true,
      message: 'Item marked as returned.',
      data: item,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBorrowItem = async (req, res) => {
  try {
    const item = await Borrowing.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found or unauthorized' });
    }

    return res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
