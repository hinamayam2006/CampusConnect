import path from 'path';
import {
  uploadBufferToCloudinary,
  uploadBufferToCloudinaryWithOptions,
  buildDownloadUrl,
} from '../services/cloudinary.service.js';

function sanitizeFileName(name) {
  return String(name || '')
    .replace(/[\\/]/g, '')
    .trim();
}

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

export const uploadNotesFile = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: 'File required' });
    }

    const mimetype = String(req.file.mimetype || '').toLowerCase();
    const isImage = mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    const result = await uploadBufferToCloudinaryWithOptions(req.file.buffer, {
      folder: 'campusconnect/notes',
      resourceType,
    });

    const fileUrl = result.secure_url;
    const previewImageUrl = isImage ? result.secure_url : '';

    const rawName = sanitizeFileName(req.file.originalname) || sanitizeFileName(result.original_filename);
    const format = result.format || '';
    const hasExt = rawName && path.extname(rawName);
    const downloadFileName = rawName
      ? (hasExt ? rawName : format ? `${rawName}.${format}` : rawName)
      : format ? `note.${format}` : 'note';

    const downloadUrl = buildDownloadUrl({
      publicId: result.public_id,
      resourceType: result.resource_type,
      format,
      filename: downloadFileName,
    });

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        previewImageUrl,
        downloadUrl,
        publicId: result.public_id,
        resourceType: result.resource_type,
        fileFormat: format,
        fileName: downloadFileName,
        fileType: req.file.mimetype || '',
        fileSize: result.bytes || req.file.size || 0,
        downloadFileName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
};
