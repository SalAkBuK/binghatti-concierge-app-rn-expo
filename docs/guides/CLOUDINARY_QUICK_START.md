# Cloudinary Quick Start - 5 Minutes Setup

## What You Need

1. **Cloudinary Cloud Name** (from your dashboard)
2. **Upload Preset Name** (create one with "Unsigned" mode)

## Quick Setup (3 Steps)

### 1️⃣ Create Upload Preset in Cloudinary

Go to: https://cloudinary.com/console/settings/upload

```
Click "Add upload preset"

Settings:
✓ Preset name: mobile_app_uploads
✓ Signing Mode: Unsigned ← IMPORTANT!
✓ Folder: maintenance_attachments (optional)
✓ Access mode: public

Click Save
```

### 2️⃣ Update Configuration

Open: `lib/config/cloudinary.ts`

```typescript
export const CLOUDINARY_CONFIG = {
  cloudName: 'YOUR_CLOUD_NAME',      // ← Paste your cloud name here
  uploadPreset: 'mobile_app_uploads', // ← Paste your preset name here
  apiUrl: 'https://api.cloudinary.com/v1_1',
};
```

### 3️⃣ Test

```bash
npm start -- --clear
```

Open app → Building Employee → Open a job → Upload Photo → Done! ✅

## Verification

After upload, you should see:
```
✅ Console: [Cloudinary] Upload successful: https://res.cloudinary.com/...
✅ Alert: "Attachment uploaded successfully"
✅ Cloudinary Dashboard: File appears in Media Library
```

## Troubleshooting

**Error: "Cloudinary not configured"**
→ You forgot to update `lib/config/cloudinary.ts`

**Error: "Upload preset not found"**
→ Preset name doesn't match. Check Cloudinary dashboard.

**Error: "Unsigned uploads disabled"**
→ Preset is set to "Signed". Change to "Unsigned" in Cloudinary.

## Need More Details?

See `CLOUDINARY_SETUP.md` for full documentation.

---

**That's it! Your app is now uploading to Cloudinary.** 🎉
