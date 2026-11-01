import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

const cloudName = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
const apiSecret = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;
const cloudinaryUrl = env.CLOUDINARY_URL || process.env.CLOUDINARY_URL;

let isConfigured = false;

if (cloudinaryUrl) {
  cloudinary.config();
  isConfigured = true;
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  isConfigured = true;
}

export function isCloudinaryEnabled() {
  return isConfigured;
}

/**
 * Upload a document (image, PDF, etc.) to Cloudinary.
 * @param {string} filePath - Absolute path to local file
 * @param {object} options - Optional Cloudinary upload options
 * @returns {Promise<{url: string, publicId: string, bytes: number, format: string, resourceType: string}>}
 */
export async function uploadDocument(filePath, options = {}) {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'sevavoice/documents',
    resource_type: 'auto',
    use_filename: false,
    unique_filename: true,
    ...options,
  });

  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
    resourceType: result.resource_type,
  };
}

/**
 * Delete a document from Cloudinary by public ID.
 * @param {string} publicId
 * @param {string} [resourceType]
 */
export async function deleteDocument(publicId, resourceType = 'image') {
  if (!isConfigured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    // If resource_type differed (e.g. raw instead of image), retry with raw
    if (resourceType !== 'raw') {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch {
        // Silently ignore cleanup errors
      }
    }
  }
}

export { cloudinary };
