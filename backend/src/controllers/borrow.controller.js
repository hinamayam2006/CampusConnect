import Borrowing from '../models/Borrowing.model.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    if (search && String(search).trim()) {
      const safe = escapeRegex(String(search).trim());
      q.$or = [
        { title: new RegExp(safe, 'i') },
        { description: new RegExp(safe, 'i') },
        { category: new RegExp(safe, 'i') },
      ];
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
