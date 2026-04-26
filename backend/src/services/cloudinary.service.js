import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';



export async function uploadBufferToCloudinary(buffer, folder = 'campusconnect') {
  cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
  // Add this line right here to force a refresh of the config with current ENV values
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  
  console.log('[Cloudinary Debug] Config check:', {
    cloudName: cloud ? 'SET' : 'MISSING',
    apiKey: key ? 'SET' : 'MISSING',
    apiSecret: secret ? 'SET' : 'MISSING',
    folder
  });
  
  if (!cloud || !key || !secret) {
    throw new Error(
      'Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env'
    );
  }
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file buffer');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', use_filename: true, unique_filename: true },
      (err, result) => {
        if (err) {
          console.error('[Cloudinary Error]', {
            message: err.message,
            http_code: err.http_code,
            name: err.name,
            folder,
            cloudName: cloud,
            apiKey: key?.substring(0, 8) + '...',
            fullError: err
          });
          
          // Specific 403 error handling
          if (err.http_code === 403) {
            console.error('[Cloudinary 403] Authentication/Permission Issue - Check:');
            console.error('1. API Key has upload permissions');
            console.error('2. Cloud name is correct');
            console.error('3. API secret is valid');
            console.error('4. Account is not suspended');
            console.error('5. API key is not restricted');
          }
          
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          console.error('[Cloudinary Error] No URL returned:', result);
          reject(new Error('Cloudinary returned no image URL'));
          return;
        }
        console.log('[Cloudinary Success] Upload completed:', result.secure_url);
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function uploadBufferToCloudinaryWithOptions(
  buffer,
  {
    folder = 'campusconnect',
    resourceType = 'image',
  } = {}
) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new Error(
      'Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env'
    );
  }
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file buffer');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error('Cloudinary returned no URL'));
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export function buildDownloadUrl({ publicId, resourceType = 'raw', format, filename }) {
  if (!publicId) return '';

  const safeFilename = filename ? encodeURIComponent(filename) : '';

  return cloudinary.url(publicId, {
    resource_type: resourceType || 'raw',
    secure: true,
    flags: safeFilename ? `attachment:${safeFilename}` : 'attachment',
    ...(format ? { format } : {}),
  });
}
