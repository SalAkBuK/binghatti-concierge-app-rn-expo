# Google Play Store 14-Day Closed Testing Submission Guide

## 🎯 Understanding Google's 14-Day Rule

### **What Changed (2023-2024):**

Google Play now **requires** all new apps to:

- ✅ Be in **Closed Testing** for minimum **14 consecutive days**
- ✅ Have at least **20 active testers**
- ✅ Receive sufficient testing before production release

**This is why your client needs 12-14 days of testing!**

---

## 📱 What You Need to Provide: AAB (App Bundle)

### **Build Command:**

```bash
npm run build:production
```

This creates an **AAB file** (NOT APK) which is required for Play Store.

---

## 📋 Pre-Submission Checklist

### 1. **Version Management** ✅

- Updated to `1.0.0` in `app.json`
- Demo badge kept (client knows about mock data)
- Version appropriate for Closed Testing

### 2. **Build the AAB**

```bash
# Make sure git changes are committed
git add .
git commit -m "chore: prepare for Play Store Closed Testing v1.0.0"

# Build AAB for Play Store
npm run build:production
```

### 3. **Wait for Build**

- Build time: 5-170 minutes (depending on queue)
- Download AAB from EAS build page
- File format: `*.aab` (NOT `*.apk`)

---

## 📤 What Your Client Does with the AAB

### **Step 1: Upload to Play Console**

1. Log in to [Google Play Console](https://play.google.com/console)
2. Select the app (or create new app)
3. Go to **Testing → Closed Testing**
4. Click **Create new release**
5. Upload your AAB file
6. Fill in release notes

### **Step 2: Configure Testing**

1. Create a **tester list** with 20+ email addresses
2. Add testers to Closed Testing track
3. Testers must have Google accounts
4. Google will email them an opt-in link

### **Step 3: Submit for Review**

1. Review app details
2. Submit for Google review
3. Wait for approval (usually 1-3 days)
4. Once approved, testing period begins

### **Step 4: 14-Day Testing Period**

- Testers download from Play Store (using their opt-in link)
- Minimum 14 consecutive days required
- At least 20 testers must be added
- Collect feedback during this period

### **Step 5: Production Promotion**

- After 14 days + sufficient testing
- Can promote to Production track
- Additional review may be required

---

## ⚠️ Important Notes About Mock Data

### **What to Communicate to Client:**

Your app currently uses **mock data** (no backend connection). For the Closed Testing:

**✅ This is ACCEPTABLE for Closed Testing because:**

- Purpose is to test UI/UX, navigation, and workflows
- Google's 14-day rule is about gathering user feedback
- Backend can be integrated during or after testing
- You can push updates during testing period

**📝 Important Disclosures:**

1. **Release Notes** should mention:

   > "This version uses mock data for testing purposes. Backend integration is in progress. Testers should focus on UI/UX, navigation, and feature workflows."

2. **Tester Instructions** should include:

   - Test credentials (tenant@demo.com / demo123)
   - Known limitation: data resets on app close
   - Focus areas: UI, navigation, user experience

3. **App Description** (for internal testing only):
   > "Internal testing version with mock data. Real backend integration will be completed during the testing period."

---

## 🔄 Can You Update During Testing?

**YES!** You can push updates during the 14-day period:

### **To Push Updates:**

1. Fix bugs or integrate backend
2. Build new AAB with incremented version
3. Upload to same Closed Testing track
4. Existing testers get automatic update

### **Version Sequence Example:**

- Day 1: Upload `1.0.0` (mock data)
- Day 5: Upload `1.0.1` (bug fixes)
- Day 10: Upload `1.1.0` (backend integrated)
- Day 14: Promote `1.1.0` to Production

The 14-day timer **does NOT reset** when you upload updates to the same track.

---

## 📊 Timeline Breakdown

### **Your Client's 14-Day Plan:**

| Day            | Activity                       | Status                    |
| -------------- | ------------------------------ | ------------------------- |
| **Day 0**      | Upload AAB to Closed Testing   | You deliver AAB           |
| **Days 1-3**   | Google reviews submission      | Waiting for approval      |
| **Day 3**      | Approved - Testing begins      | 14-day counter starts     |
| **Days 3-7**   | Testers install and test UI/UX | Mock data feedback        |
| **Days 7-10**  | Backend integration (parallel) | You work on API           |
| **Day 10**     | Upload v1.1.0 with backend     | Update to Closed Testing  |
| **Days 10-17** | Test with real backend         | Full testing              |
| **Day 17**     | 14 days complete               | Can promote to Production |
| **Days 17-18** | Final review and promotion     | Client submits            |
| **Day 19+**    | Production release             | Live to users!            |

---

## 🎯 What You Deliver to Client

### **Package Contents:**

1. **AAB File** (from EAS build)

   - Download link from expo.dev
   - File: `tower-desk-1.0.0.aab`

2. **Play Store Release Notes**

   ```
   Version 1.0.0 - Closed Testing Release

   This is a closed testing version for UI/UX evaluation.

   Features:
   - Complete tenant portal interface
   - Service request management
   - Amenity booking system
   - Profile management
   - Notifications and notices

   Testing Notes:
   - Uses mock data for demonstration
   - Test credentials: tenant@demo.com / demo123
   - Data resets on app close (expected behavior)
   - Backend integration in progress

   Focus Areas:
   - Navigation and user flows
   - UI design and responsiveness
   - Feature completeness
   - User experience feedback
   ```

3. **Tester Instructions Document**

   - Installation via Play Store
   - Test credentials
   - What to test
   - Known limitations
   - Feedback process

4. **Technical Documentation**
   - DEMO_VERSION_README.md
   - FEATURE_COMPARISON.md
   - BACKEND_INTEGRATION_SCREEN_STATUS.md

---

## ✅ Build Steps (Right Now)

### **1. Commit Current Changes:**

```bash
git add .
git commit -m "chore: update to v1.0.0 for Play Store Closed Testing"
```

### **2. Build AAB:**

```bash
npm run build:production
```

### **3. Monitor Build:**

```bash
npm run build:list
```

Or visit: https://expo.dev/accounts/[your-account]/projects/tower-desk/builds

### **4. Download AAB:**

Once build completes, download the `.aab` file (NOT `.apk`)

### **5. Deliver to Client:**

- AAB file + download link
- Release notes (above)
- Tester instructions
- Technical documentation

---

## 🔐 Play Console Requirements

Your client will need:

### **1. App Information:**

- App name: Tower Desk
- Package name: `com.codefier.towerdesk` (from your app.json)
- Category: Productivity / Business
- Content rating questionnaire
- Privacy policy URL (required)

### **2. Closed Testing Setup:**

- Email list of 20+ testers
- Testing track name (e.g., "Internal Testing")
- Release notes for testers
- Tester feedback email

### **3. Store Listing (Required Even for Closed Testing):**

- Short description (80 chars)
- Full description (4000 chars)
- App icon (512x512 PNG)
- Screenshots (at least 2, up to 8)
- Feature graphic (1024x500)

**Note:** These are required even for Closed Testing, but can be placeholder content.

---

## 🐛 Mock Data vs Production Clarification

### **For Google Review:**

Google reviewers understand that Closed Testing may include:

- ✅ Mock/test data
- ✅ Backend integration in progress
- ✅ Features under development

As long as:

- ✅ App doesn't crash
- ✅ Core navigation works
- ✅ No policy violations (privacy, content, etc.)
- ✅ Test credentials are provided in review notes

### **Your Case:**

- **Current state**: Mock data, functional UI
- **Google's view**: Acceptable for Closed Testing
- **Your plan**: Integrate backend during testing period
- **Result**: Valid approach, commonly used

---

## 📞 Communication with Client

### **Email Template:**

```
Subject: Tower Desk AAB Ready for Play Store Closed Testing (14-Day Requirement)

Hi [Client Name],

Perfect timing! I understand you need the app for Google Play's 14-day Closed Testing requirement.

**What I'm Delivering:**
- AAB file (required format for Play Store)
- Version 1.0.0
- Ready for Closed Testing track upload

**About the 14-Day Requirement:**
Google now requires all apps to be in Closed Testing for minimum 14 consecutive days with 20+ testers before production release. This is why you need the 12-14 day timeline.

**Current App Status:**
- ✅ Complete UI/UX implementation
- ✅ All tenant features functional
- ⚠️ Currently uses mock data (backend integration in progress)

**Testing Approach:**
1. Days 1-3: Google reviews your submission
2. Days 3-10: Testers validate UI/UX with mock data
3. Days 10-14: I integrate backend (can push update)
4. Day 14+: Can promote to Production with real backend

**What You Need to Do:**
1. Upload AAB to Play Console → Closed Testing
2. Add 20+ testers with Google accounts
3. Fill in store listing details
4. Submit for review
5. Wait for approval (~1-3 days)
6. Testing period begins (14 days)

**What's Included:**
- AAB file: [download link]
- Release notes for testers
- Test credentials: tenant@demo.com / demo123
- Technical documentation

**Mock Data Disclosure:**
The app currently uses mock data for testing. This is normal and acceptable for Closed Testing. The release notes clearly state this, and I'll integrate the real backend during the testing period.

Ready to proceed?

Best regards,
[Your Name]
```

---

## ✅ Summary

| Question                       | Answer                                   |
| ------------------------------ | ---------------------------------------- |
| **What format?**               | AAB (NOT APK)                            |
| **Which build?**               | `npm run build:production`               |
| **Why 14 days?**               | Google's mandatory Closed Testing period |
| **Mock data OK?**              | Yes, acceptable for Closed Testing       |
| **Can update during testing?** | Yes, upload new versions anytime         |
| **When integrate backend?**    | During or after testing period           |

---

**Your Next Command:**

```bash
npm run build:production
```

Then deliver the AAB file to your client with the documentation above! 🚀
