# Tower Desk Demo Version - README

## 🎉 Welcome to Tower Desk Demo Version 0.9.0-beta

This is a **DEMO VERSION** of the Tower Desk mobile application, designed for internal testing and evaluation purposes.

---

## ⚠️ IMPORTANT: This is a Demo Version

**This version uses MOCK DATA for testing purposes.**

- 📊 All data shown is sample/demo data
- 💾 Any changes you make will NOT persist after closing the app
- 🔐 Test credentials provided below
- 🚀 Production version with real backend coming soon

---

## 📱 Installation Instructions

### Android Installation:

1. **Enable Unknown Sources** (if not already enabled):

   - Go to Settings → Security
   - Enable "Unknown Sources" or "Install Unknown Apps"
   - Select your browser/file manager and allow installations

2. **Download the APK**:

   - Use the download link provided in the email
   - The file will be named: `tower-desk-0.9.0-beta.apk`

3. **Install**:

   - Open the downloaded APK file
   - Tap "Install"
   - Wait for installation to complete
   - Tap "Open" to launch the app

4. **First Launch**:
   - You'll see a welcome screen
   - Notice the "DEMO VERSION" banner
   - Use the test credentials below to log in

---

## 🔐 Test Credentials

### Tenant Account (Property Resident):

```
Email: tenant@demo.com
Password: demo123
```

**What you can test:**

- Submit maintenance requests
- Book amenities
- View notices
- Update profile
- View request history

### Admin Account (Property Manager):

```
Email: admin@demo.com
Password: admin123
```

**What you can test:**

- View all requests
- Manage tenants
- Post notices
- View analytics dashboard
- Manage amenities

---

## ✅ What Works in This Version

### Authentication

- ✅ Login with test credentials
- ✅ Logout functionality
- ✅ Profile viewing

### Tenant Features

- ✅ View and create service requests
- ✅ Amenity booking interface
- ✅ View notices from management
- ✅ Profile management
- ✅ Request status tracking

### UI/UX

- ✅ Complete navigation system
- ✅ Custom icons and branding
- ✅ Responsive layouts
- ✅ Dark mode support (system preference)
- ✅ Smooth animations

---

## ❌ Known Limitations

### Data Persistence

- **Issue**: Data resets when app is closed
- **Why**: No backend connection yet
- **Production Fix**: Real database integration

### Notifications

- **Issue**: No push notifications
- **Why**: Requires backend server
- **Production Fix**: Firebase Cloud Messaging integration

### Registration

- **Issue**: New accounts are local only
- **Why**: No backend connection
- **Production Fix**: Real user registration API

### Real-time Updates

- **Issue**: Changes by other users not visible
- **Why**: No live data synchronization
- **Production Fix**: WebSocket or polling implementation

### Payments

- **Issue**: Payment flows are UI-only
- **Why**: Payment gateway not integrated
- **Production Fix**: Stripe/payment processor integration

---

## 🧪 Testing Scenarios

### Scenario 1: Tenant Journey

1. Login with tenant credentials
2. View home screen with notices
3. Navigate to "Requests" tab
4. Create a new maintenance request
5. View your request in the list
6. Check different request statuses
7. Navigate to profile and update information
8. Logout and close app
9. **Reopen app**: Notice data has reset (expected behavior)

### Scenario 2: UI/UX Evaluation

1. Test all navigation tabs
2. Check touch responsiveness
3. Verify all buttons work
4. Test scroll behaviors
5. Check form validations
6. Evaluate color scheme and readability
7. Test on different screen sizes (if possible)

### Scenario 3: Admin Dashboard (if implemented)

1. Login with admin credentials
2. View dashboard analytics
3. Browse all tenant requests
4. Create a new notice
5. View tenant list
6. Test filtering and sorting

---

## 🐛 How to Report Issues

### What to Report:

1. **UI Issues**: Broken layouts, incorrect colors, alignment problems
2. **UX Issues**: Confusing flows, missing feedback, poor interactions
3. **Bugs**: Crashes, freezes, incorrect behavior
4. **Feature Requests**: Missing functionality you'd like to see

### How to Report:

Please use the **FEEDBACK_TEMPLATE.md** file provided in the documentation package.

Include:

- Screenshot or screen recording
- Steps to reproduce
- Expected vs actual behavior
- Device model and Android version
- Priority level (Critical/High/Medium/Low)

Send reports to: [your-email@company.com]

---

## 📅 Timeline & Next Steps

### Current Phase: Demo Testing (12 days)

**Your Role:**

- Install and explore the app
- Test all major features
- Provide detailed feedback
- Report any issues or suggestions

**Our Role:**

- Monitor feedback daily
- Fix critical bugs immediately
- Plan backend integration
- Prepare for production release

### Next Phase: Backend Integration (Parallel Development)

- Connect to real API endpoints
- Implement data persistence
- Add push notifications
- Integrate payment systems

### Final Phase: Production Release

- Address all testing feedback
- Complete backend integration
- Submit to Google Play Store
- Launch to end users

---

## 🎯 What We Need From You

### Priority 1: Critical Issues

- App crashes
- Cannot login
- Major UI breaks
- Security concerns

### Priority 2: Important Feedback

- Confusing user flows
- Missing features you expected
- Performance issues
- Design improvements

### Priority 3: Nice to Have

- Feature suggestions
- Minor UI tweaks
- Additional functionality ideas

---

## 📞 Support & Contact

### During Testing Period:

- **Email**: [your-email@company.com]
- **Response Time**: Within 4 business hours
- **Critical Issues**: Same day response

### Questions?

- Technical questions about the app
- Clarification on features
- Installation problems
- Testing guidance

We're here to help!

---

## 🔒 Security & Privacy

### Demo Version:

- Data is stored locally on your device only
- No data is sent to external servers
- Test credentials are shared (not secure)
- Do NOT use real personal information

### Production Version:

- End-to-end encryption
- Secure authentication
- Private user data
- GDPR compliant
- Regular security audits

---

## 📱 System Requirements

### Minimum Requirements:

- **OS**: Android 6.0 (Marshmallow) or higher
- **RAM**: 2GB minimum
- **Storage**: 100MB free space
- **Internet**: WiFi or mobile data (for future features)

### Recommended:

- **OS**: Android 10 or higher
- **RAM**: 4GB or more
- **Storage**: 500MB free space
- **Screen**: 5.5" or larger

---

## 🙏 Thank You!

Thank you for participating in the Tower Desk demo testing program. Your feedback is invaluable in helping us create the best possible experience for property managers and residents.

We're excited to hear your thoughts and look forward to delivering the production version soon!

---

**Version**: 0.9.0-beta  
**Build Date**: October 2025  
**Build Type**: Demo (Mock Data)  
**Next Update**: Production version with backend integration

For the latest updates and information, please contact your project manager.
