# 📋 Quick Reference - Build & Delivery

## 🚀 Build Commands

### APK (Direct Installation - Testing)

```bash
npm run build:preview
# or
npx eas build --platform android --profile preview
```

**Use for**: Immediate testing, sideloading, pre-Play Store validation

### AAB (Play Store - Production)

```bash
npm run build:production
# or
npx eas build --platform android --profile production
```

**Use for**: Play Store upload (Internal Testing, Production)

> ⚠️ **Important**: Google Play Store REQUIRES AAB format (not APK)

---

1. APK file (from EAS download)
2. DEMO_VERSION_README.md
3. INSTALLATION_GUIDE.md
4. FEATURE_COMPARISON.md
5. FEEDBACK_TEMPLATE.md

## 🔐 Test Credentials

```
Tenant: tenant@demo.com / demo123
Admin: admin@demo.com / admin123
```

## ✅ Pre-Build Checklist

- [ ] Version is 0.9.0 in app.json
- [ ] Demo badge visible on login
- [ ] Test credentials work
- [ ] All tabs accessible
- [ ] No critical errors

## 📧 Email Subject

`Tower Desk Demo APK v0.9.0-beta - Ready for Testing`

## 📱 Post-Build Testing

1. Download APK from EAS
2. Install on Android device
3. Test login with credentials
4. Verify all tabs work
5. Test create request flow
6. Check demo badge visible

## ⏱️ Timeline

- Demo Testing: 12 days
- Backend Integration: Parallel
- Production Release: After approval

## 🐛 Priority Levels

- **Critical**: Same day response
- **High**: 1-2 days
- **Medium**: 3-5 days
- **Low**: Backlog

## 📞 Support Info

- Email: [your-email]
- Response: Within 4 hours
- Hours: [your-hours]

## ⚠️ Known Limitations

- ❌ Data doesn't persist
- ❌ No push notifications
- ❌ No real payments
- ❌ No backend connection

## 🎯 Focus Testing On

- ✅ UI/UX design
- ✅ Navigation flow
- ✅ User experience
- ✅ Feature workflows

## 📊 Current Version

**Version**: 0.9.0-beta  
**Build Type**: Preview (Demo)  
**Data Source**: Mock Data  
**Status**: Ready for Delivery

---

**For full details, see: BUILD_AND_DELIVER.md**
