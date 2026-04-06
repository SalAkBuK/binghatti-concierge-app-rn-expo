# Cloudinary Upload Setup Guide

## Overview

Your app is now configured to upload files (images and documents) directly to Cloudinary from the mobile app. This guide will help you complete the setup.

## ✅ What's Already Done

- ✅ Cloudinary upload function implemented
- ✅ Support for images (JPEG, PNG, GIF, WebP)
- ✅ Support for documents (PDF, DOC, DOCX, etc.)
- ✅ Error handling and logging
- ✅ Automatic resource type detection (image vs raw)
- ✅ Integration with maintenance request attachments

## 📋 Setup Steps

### Step 1: Create Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account (or use existing account)
3. Verify your email
4. Log in to the Cloudinary Console

### Step 2: Get Your Cloud Name

1. In the Cloudinary Dashboard (https://cloudinary.com/console)
2. You'll see your **Cloud name** at the top
3. Example: `dxample123` or `my-company-name`
4. **Copy this value** - you'll need it in Step 4

### Step 3: Create Upload Preset

1. Go to **Settings** → **Upload** (or visit https://cloudinary.com/console/settings/upload)
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure the preset:

   **Basic Settings:**
   - **Preset name**: `mobile_app_uploads` (or any name you prefer)
   - **Signing Mode**: **Unsigned** ⚠️ IMPORTANT
   - **Upload mode**: Upload

   **Folder & Access:**
   - **Folder**: `maintenance_attachments` (optional, helps organize files)
   - **Access mode**: `public` (files will be publicly accessible via URL)

   **Optional (Recommended):**
   - **Allowed formats**: jpg, png, gif, pdf, doc, docx (limits file types)
   - **Max file size**: 10 MB (prevents huge uploads)
   - **Auto-tagging**: Enable if you want automatic object detection

5. Click **Save**
6. **Copy the preset name** - you'll need it in Step 4

### Step 4: Update Configuration File

1. Open `lib/config/cloudinary.ts`
2. Replace the placeholder values:

```typescript
export const CLOUDINARY_CONFIG = {
  cloudName: 'dxample123', // ← Replace with YOUR cloud name
  uploadPreset: 'mobile_app_uploads', // ← Replace with YOUR preset name
  apiUrl: 'https://api.cloudinary.com/v1_1', // Don't change this
};
```

Example:
```typescript
export const CLOUDINARY_CONFIG = {
  cloudName: 'mycompany',
  uploadPreset: 'mobile_maintenance_uploads',
  apiUrl: 'https://api.cloudinary.com/v1_1',
};
```

### Step 5: Test the Upload

1. **Rebuild the app**:
   ```bash
   npm start -- --clear
   ```

2. **Test the flow**:
   - Open the app
   - Go to Building Employee portal
   - Open a maintenance job
   - Tap "Upload Photo or Document"
   - Select an image
   - Check the console logs for success:
   ```
   [Cloudinary] Upload successful: https://res.cloudinary.com/...
   ```

3. **Verify in Cloudinary**:
   - Go to **Media Library** in Cloudinary Dashboard
   - You should see the uploaded file
   - Click on it to see the URL

## 🎯 How It Works

### Upload Flow

```
1. User selects file in app
   ↓
2. App uploads to Cloudinary API
   - URL: https://api.cloudinary.com/v1_1/{cloudName}/image/upload
   - Method: POST (multipart/form-data)
   - Body: file + upload_preset
   ↓
3. Cloudinary processes and stores file
   ↓
4. Cloudinary returns secure_url
   - Example: https://res.cloudinary.com/mycloud/image/upload/v123/file.jpg
   ↓
5. App saves attachment metadata to backend
   - Calls: POST /api/MaintenanceRequest/attachment
   - Body: { fileUrl, fileName, contentType }
   ↓
6. Backend stores attachment record
   ✅ Complete!
```

### File Types Supported

**Images** (uploaded as `image` resource type):
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**Documents** (uploaded as `raw` resource type):
- PDF (.pdf)
- Word (.doc, .docx)
- Any other file type

## 🔒 Security Best Practices

### Current Setup (Unsigned Upload)
- ✅ Easy to implement
- ✅ No server-side code needed
- ⚠️ Anyone with the preset name can upload
- ⚠️ Limited control over uploads

### Production Recommendations

1. **Set Upload Restrictions** in the preset:
   - Max file size (e.g., 10 MB)
   - Allowed formats only
   - Max dimensions for images

2. **Enable Upload Preset Security**:
   - In Cloudinary, go to Settings → Security
   - Enable "Restrict unsigned uploads to selected presets"
   - Only allow your specific preset

3. **Consider Signed Uploads** (for higher security):
   - Requires backend to generate signatures
   - Full control over who can upload
   - See: https://cloudinary.com/documentation/upload_images#signed_upload

4. **Monitor Usage**:
   - Check Cloudinary dashboard regularly
   - Set up usage alerts
   - Delete old/unused files

5. **Use Folders** for organization:
   ```typescript
   formData.append('folder', 'maintenance_attachments');
   ```

## 📊 Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Files**: Unlimited

For production with high usage, consider upgrading to a paid plan.

## 🐛 Troubleshooting

### Error: "Cloudinary not configured"

**Problem**: Configuration file still has placeholder values

**Solution**:
1. Open `lib/config/cloudinary.ts`
2. Replace `YOUR_CLOUD_NAME` and `YOUR_UPLOAD_PRESET` with actual values
3. Restart the app

---

### Error: "Upload preset not found"

**Problem**: Preset name doesn't match or preset doesn't exist

**Solution**:
1. Go to Cloudinary → Settings → Upload
2. Verify the preset exists
3. Copy the exact preset name
4. Update `lib/config/cloudinary.ts`

---

### Error: "Unsigned uploads are disabled"

**Problem**: Upload preset is set to "Signed" mode

**Solution**:
1. Go to Cloudinary → Settings → Upload
2. Edit the upload preset
3. Change **Signing Mode** to **Unsigned**
4. Save

---

### Error: "Invalid upload preset"

**Problem**: Preset might be for a different resource type

**Solution**:
1. Make sure the preset allows both images and raw files
2. Or create separate presets for images and documents

---

### Upload succeeds but file not visible

**Problem**: Access mode might be set to "authenticated"

**Solution**:
1. Edit the upload preset
2. Set **Access mode** to **public**
3. Re-upload the file

## 📱 Optional Enhancements

### Add Upload Progress

```typescript
// In uploadToCloudinary function
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (event) => {
  if (event.lengthComputable) {
    const progress = (event.loaded / event.total) * 100;
    console.log(`Upload progress: ${progress}%`);
    // Update UI with progress
  }
};
```

### Add Tags for Organization

```typescript
// In uploadToCloudinary function
formData.append('tags', 'maintenance,mobile_upload,urgent');
```

### Add Custom Metadata

```typescript
formData.append('context', `requestId=${requestId}`);
```

### Image Optimization

Cloudinary automatically optimizes images. You can customize:

```typescript
// Add transformation parameters
formData.append('quality', 'auto:good');
formData.append('format', 'auto');
```

## 🔗 Useful Links

- **Cloudinary Console**: https://cloudinary.com/console
- **Upload Documentation**: https://cloudinary.com/documentation/upload_images
- **Upload Presets**: https://cloudinary.com/documentation/upload_presets
- **Unsigned Upload**: https://cloudinary.com/documentation/upload_images#unsigned_upload
- **Media Library**: https://cloudinary.com/console/media_library

## ✅ Verification Checklist

Before going to production, verify:

- [ ] Cloud name is correctly set in config
- [ ] Upload preset is correctly set in config
- [ ] Upload preset is set to "Unsigned" mode
- [ ] Test image upload works
- [ ] Test document upload works
- [ ] Files appear in Cloudinary Media Library
- [ ] Attachment URLs are saved to backend
- [ ] File size limits are appropriate
- [ ] Allowed file formats are restricted
- [ ] Security settings reviewed
- [ ] Usage monitoring is set up

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your Cloudinary credentials
3. Test upload directly in Cloudinary console
4. Review this guide's troubleshooting section
5. Check Cloudinary documentation: https://cloudinary.com/documentation

---

**Setup completed! Once you update the configuration, file uploads will work automatically.** 🎉
