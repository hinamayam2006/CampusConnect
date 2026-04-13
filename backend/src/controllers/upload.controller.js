import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'Image file required' });
    }
    const url = await uploadBufferToCloudinary(req.file.buffer, 'campusconnect/listings');
    res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
};
