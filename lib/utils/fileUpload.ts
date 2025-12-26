// File upload utility for maintenance request attachments

import { APP_CONFIG } from './constants';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl, isCloudinaryConfigured } from '../config/cloudinary';

export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  contentType: string;
}

/**
 * Extract filename from URI
 */
const getFileNameFromUri = (uri: string): string => {
  const parts = uri.split('/');
  const filename = parts[parts.length - 1];
  return filename || `attachment_${Date.now()}.jpg`;
};

/**
 * Get content type from URI/filename
 */
const getContentTypeFromUri = (uri: string): string => {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (lowerUri.endsWith('.png')) {
    return 'image/png';
  } else if (lowerUri.endsWith('.webp')) {
    return 'image/webp';
  } else if (lowerUri.endsWith('.gif')) {
    return 'image/gif';
  }

  // Default to JPEG
  return 'image/jpeg';
};

/**
 * Upload a file to the server
 *
 * @param localUri - Local file URI (e.g., file:///path/to/image.jpg)
 * @param requestId - Optional request ID to associate with the upload
 * @returns Promise with uploaded file details
 *
 * NOTE: This function needs to be configured with your actual file upload endpoint.
 * There are several approaches you can take:
 *
 * 1. Upload to your backend server:
 *    - Create a multipart/form-data upload endpoint on your backend
 *    - Upload the file and receive back the URL
 *
 * 2. Upload to cloud storage (AWS S3, Cloudinary, Azure Blob Storage, etc.):
 *    - Use the respective SDK to upload directly from the mobile app
 *    - Get a signed URL or public URL back
 *
 * 3. Use a dedicated file upload service:
 *    - Services like Uploadcare, Filestack, etc.
 */
export const uploadFile = async (
  localUri: string,
  requestId?: number
): Promise<UploadedFile> => {
  try {
    console.log('[FileUpload] Uploading file:', localUri);

    const fileName = getFileNameFromUri(localUri);
    const contentType = getContentTypeFromUri(localUri);

    // Create FormData for file upload
    const formData = new FormData();

    // Add the file
    // Note: In React Native, we need to pass the file object with specific properties
    const fileObject = {
      uri: localUri,
      type: contentType,
      name: fileName,
    } as any;

    formData.append('file', fileObject);

    if (requestId) {
      formData.append('requestId', requestId.toString());
    }

    // TODO: Replace with your actual file upload endpoint
    // Option 1: Upload to your backend
    const uploadEndpoint = `${APP_CONFIG.api.baseUrl}/upload`; // Replace with your actual endpoint

    // Option 2: Upload to cloud storage (example: AWS S3 presigned URL)
    // const uploadEndpoint = await getPresignedUploadUrl(fileName, contentType);

    console.log('[FileUpload] Uploading to:', uploadEndpoint);

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let the browser set it automatically with the boundary
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const result = await response.json();

    // TODO: Adjust based on your backend response structure
    // Expected response format: { fileUrl: string, fileName?: string }
    const fileUrl = result.fileUrl || result.url || result.data?.url;

    if (!fileUrl) {
      throw new Error('No file URL returned from upload endpoint');
    }

    console.log('[FileUpload] File uploaded successfully:', fileUrl);

    return {
      fileUrl,
      fileName: result.fileName || fileName,
      contentType: result.contentType || contentType,
    };
  } catch (error) {
    console.error('[FileUpload] Upload failed:', error);
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Upload multiple files in parallel
 *
 * @param localUris - Array of local file URIs
 * @param requestId - Optional request ID to associate with the uploads
 * @returns Promise with array of uploaded file details
 */
export const uploadMultipleFiles = async (
  localUris: string[],
  requestId?: number
): Promise<UploadedFile[]> => {
  try {
    console.log(`[FileUpload] Uploading ${localUris.length} files`);

    // Upload all files in parallel
    const uploadPromises = localUris.map((uri) => uploadFile(uri, requestId));
    const results = await Promise.all(uploadPromises);

    console.log(`[FileUpload] Successfully uploaded ${results.length} files`);
    return results;
  } catch (error) {
    console.error('[FileUpload] Failed to upload multiple files:', error);
    throw error;
  }
};

/**
 * TEMPORARY MOCK IMPLEMENTATION
 * Remove this and implement the actual upload logic above
 *
 * This mock function simulates file upload by returning the local URI
 * WARNING: This will NOT work with the backend API - it's only for testing UI flow
 */
export const uploadFileMock = async (
  localUri: string,
  _requestId?: number
): Promise<UploadedFile> => {
  console.warn('[FileUpload] Using MOCK upload - implement actual upload logic!');

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    fileUrl: localUri, // This is wrong - should be a remote URL
    fileName: getFileNameFromUri(localUri),
    contentType: getContentTypeFromUri(localUri),
  };
};

/**
 * Upload file to Cloudinary
 * Uses unsigned upload preset for direct uploads from mobile
 *
 * @param localUri - Local file URI from the device
 * @returns Promise with Cloudinary upload response containing secure_url
 */
export const uploadToCloudinary = async (
  localUri: string
): Promise<UploadedFile> => {
  try {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      throw new Error(
        'Cloudinary not configured. Please update CLOUDINARY_CONFIG in lib/config/cloudinary.ts'
      );
    }

    console.log('[Cloudinary] Starting upload:', localUri);

    const fileName = getFileNameFromUri(localUri);
    const contentType = getContentTypeFromUri(localUri);

    // Determine resource type (image or raw for documents)
    const isImage = contentType.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    // Create FormData for upload
    const formData = new FormData();

    // Add the file
    const fileObject = {
      uri: localUri,
      type: contentType,
      name: fileName,
    } as any;

    formData.append('file', fileObject);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    // Optional: Add folder organization
    // formData.append('folder', 'maintenance_attachments');

    // Optional: Add tags for better organization
    // formData.append('tags', 'maintenance,mobile_upload');

    const uploadUrl = getCloudinaryUploadUrl(resourceType);
    console.log('[Cloudinary] Uploading to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary] Upload failed:', response.status, errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[Cloudinary] Upload successful:', result.secure_url);

    return {
      fileUrl: result.secure_url, // Cloudinary HTTPS URL
      fileName: result.original_filename || fileName,
      contentType: contentType,
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    throw new Error(
      `Failed to upload to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Upload file to server - switches between Cloudinary and mock implementation
 * Set USE_MOCK_UPLOAD to false once Cloudinary is configured
 */
const USE_MOCK_UPLOAD = false; // Changed to false - using Cloudinary now

export const uploadFileToServer = async (
  localUri: string,
  requestId?: number
): Promise<string> => {
  if (USE_MOCK_UPLOAD) {
    console.warn('[FileUpload] Using MOCK upload');
    const result = await uploadFileMock(localUri, requestId);
    return result.fileUrl;
  } else {
    console.log('[FileUpload] Using Cloudinary upload');
    const result = await uploadToCloudinary(localUri);
    return result.fileUrl;
  }
};
