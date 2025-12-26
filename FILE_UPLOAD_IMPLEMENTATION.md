# File Upload Implementation Guide

## Current Status

The file upload functionality is currently using a **MOCK implementation** for testing purposes. The actual file upload to the backend is not yet functional.

## What's Working

✅ UI for selecting photos and documents
✅ Permission handling for photo library
✅ File picker integration
✅ Attachment metadata sent to backend
✅ Comment API integration

## What Needs Implementation

❌ Actual file upload to server/cloud storage
❌ Backend `/upload` endpoint (returns 404)

## How to Implement Real File Upload

### Option 1: Backend Upload Endpoint (Recommended)

Create a file upload endpoint on your backend server:

**Backend Endpoint:** `POST /api/upload`

**Expected Request:**
```
Content-Type: multipart/form-data

file: (binary file data)
requestId: (optional) number
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://your-server.com/uploads/file-name.jpg",
    "fileName": "file-name.jpg"
  }
}
```

**Implementation Steps:**

1. Create the endpoint in your backend
2. In `lib/utils/fileUpload.ts`, change:
   ```typescript
   const USE_MOCK_UPLOAD = true;  // Change to false
   ```
3. Update the upload endpoint URL:
   ```typescript
   const uploadEndpoint = `${APP_CONFIG.api.baseUrl}/upload`;
   ```
4. Test the upload functionality

### Option 2: Cloud Storage (AWS S3, Cloudinary, Azure)

If you prefer to use cloud storage:

#### Using AWS S3

1. Install AWS SDK:
   ```bash
   npm install aws-sdk
   ```

2. Update `lib/utils/fileUpload.ts`:
   ```typescript
   import AWS from 'aws-sdk';

   const s3 = new AWS.S3({
     accessKeyId: 'YOUR_ACCESS_KEY',
     secretAccessKey: 'YOUR_SECRET_KEY',
     region: 'YOUR_REGION'
   });

   export const uploadFile = async (localUri: string) => {
     const fileName = getFileNameFromUri(localUri);
     const response = await fetch(localUri);
     const blob = await response.blob();

     const params = {
       Bucket: 'YOUR_BUCKET_NAME',
       Key: fileName,
       Body: blob,
       ContentType: getContentTypeFromUri(localUri),
     };

     const result = await s3.upload(params).promise();
     return {
       fileUrl: result.Location,
       fileName: fileName,
       contentType: params.ContentType,
     };
   };
   ```

#### Using Cloudinary

1. Install Cloudinary:
   ```bash
   npm install cloudinary-react-native
   ```

2. Follow Cloudinary's React Native upload guide

### Option 3: Base64 Upload (For Small Files Only)

For small files, you can send base64-encoded data directly to your backend:

1. Create endpoint: `POST /api/MaintenanceRequest/uploadAttachment`

2. Update upload function:
   ```typescript
   export const uploadFile = async (localUri: string) => {
     const base64 = await FileSystem.readAsStringAsync(localUri, {
       encoding: FileSystem.EncodingType.Base64,
     });

     const response = await fetch(`${APP_CONFIG.api.baseUrl}/MaintenanceRequest/uploadAttachment`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         base64Data: base64,
         fileName: getFileNameFromUri(localUri),
         contentType: getContentTypeFromUri(localUri),
       }),
     });

     const result = await response.json();
     return result.data.fileUrl;
   };
   ```

## Current Mock Behavior

The mock implementation:
- Simulates a 500ms delay
- Returns the local file URI (not a remote URL)
- **WARNING**: This will not work with the backend API
- The backend will receive a `file://` URI instead of an `https://` URL

## Testing

To test with the mock implementation:
1. The UI will work correctly
2. File selection works
3. The attachment metadata will be sent to the backend
4. However, the `fileUrl` will be a local path, not a remote URL

To test with real implementation:
1. Implement one of the options above
2. Change `USE_MOCK_UPLOAD = false` in `lib/utils/fileUpload.ts`
3. Test uploading a photo
4. Verify the attachment appears in the maintenance request
5. Verify the file is accessible via the returned URL

## Backend Requirements

Your backend needs to:
1. Accept multipart/form-data uploads
2. Store the file (filesystem, S3, etc.)
3. Return the publicly accessible URL
4. Handle file validation (size, type)
5. Implement security (authentication, file scanning)

## Security Considerations

- Validate file types on the backend
- Limit file sizes (recommend max 10MB)
- Scan for malware
- Use signed URLs for private files
- Implement rate limiting
- Authenticate upload requests

## Next Steps

1. ⚠️ **Decide on upload strategy** (backend endpoint vs cloud storage)
2. Implement the chosen solution
3. Update `USE_MOCK_UPLOAD` flag
4. Test thoroughly with different file types
5. Monitor upload errors and performance

## Support

If you need help implementing the upload:
- Backend endpoint: Coordinate with your backend team
- Cloud storage: Refer to the respective SDK documentation
- Questions: Check the official Expo documentation for file uploads
