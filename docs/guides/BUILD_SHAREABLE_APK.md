# Build Shareable Release APK

This guide shows you how to build a standalone release APK that you can share via WhatsApp, Drive, email, etc.

## Quick Build Command

```bash
# Clean previous builds and build release APK
cd android && ./gradlew clean assembleRelease
```

## Step-by-Step Instructions

### 1. Clean Previous Builds (Optional but Recommended)
```bash
cd android
./gradlew clean
```

### 2. Build Release APK
```bash
./gradlew assembleRelease
```

This will:
- Build only ARM architectures (arm64-v8a, armeabi-v7a) - **faster build!**
- Create a release APK signed with debug keystore (for testing)
- Enable code minification and optimization
- Output APK ready to install on devices

### 3. Find Your APK

After successful build, find your APK at:
```
android/app/build/outputs/apk/release/app-release.apk
```

**Full Path:**
```
C:\CodeFier\binghatti-concierge-app-rn-expo\android\app\build\outputs\apk\release\app-release.apk
```

### 4. Share the APK

You can now:
- ✅ Share via WhatsApp
- ✅ Upload to Google Drive / Dropbox
- ✅ Send via email
- ✅ Install directly on Android devices
- ✅ Test on multiple devices

## Build Time

With the ABI optimization (ARM only):
- **Expected build time:** ~15-25 minutes
- **APK size:** ~40-60 MB (depending on assets)

## Important Notes

### Current Signing Configuration

⚠️ **Debug Keystore Used for Release**

The current configuration uses the debug keystore for release builds (line 121 in build.gradle):
```gradle
signingConfig signingConfigs.debug
```

**This is fine for:**
- ✅ Internal testing
- ✅ Sharing with team members
- ✅ QA testing
- ✅ Demo purposes

**Not suitable for:**
- ❌ Google Play Store release
- ❌ Production distribution

### For Production/Play Store Release

When ready for production, you'll need to:

1. **Generate a production keystore:**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore towerdesk-release.keystore -alias towerdesk -keyalg RSA -keysize 2048 -validity 10000
```

2. **Update build.gradle with release signing config:**
```gradle
signingConfigs {
    debug { ... }
    release {
        storeFile file('towerdesk-release.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'towerdesk'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release  // Change this line
        ...
    }
}
```

3. **Store keystore safely** - You'll need it for all future updates!

## Troubleshooting

### Build Fails

**Clean and retry:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

**Check Node modules:**
```bash
cd ..
npm install
cd android
./gradlew assembleRelease
```

### Can't Install APK on Device

**Enable "Install from Unknown Sources":**
1. Go to device Settings
2. Security & Privacy
3. Enable "Install Unknown Apps" for your file manager/browser

### APK Size Too Large

Current optimizations:
- ✅ Building only ARM ABIs (not x86/x86_64)
- ✅ Code minification enabled
- ✅ PNG optimization enabled

Further optimizations available in `gradle.properties`:
```properties
android.enableShrinkResourcesInReleaseBuilds=true
android.enableMinifyInReleaseBuilds=true
```

## Quick Reference Commands

```bash
# From project root

# Build release APK
cd android && ./gradlew assembleRelease

# Clean and build
cd android && ./gradlew clean assembleRelease

# Check build outputs
dir android\app\build\outputs\apk\release

# Copy APK to Desktop (Windows)
copy android\app\build\outputs\apk\release\app-release.apk %USERPROFILE%\Desktop\TowerDesk.apk
```

## Build Variants

The project supports multiple build variants:

```bash
# Release build (what you want for sharing)
./gradlew assembleRelease

# Debug build (for development)
./gradlew assembleDebug

# Clean all builds
./gradlew clean

# List all available tasks
./gradlew tasks
```

## Version Information

Current app version (from build.gradle):
- **Version Code:** 1
- **Version Name:** 1.0.0
- **Package:** com.codefier.towerdesk

To update version for new releases, edit `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1.0"  // Update version string
    ...
}
```

## What's Included

The APK includes:
- ✅ Full Tower Desk application
- ✅ All screens (Tenant, Management, Admin, Super Admin portals)
- ✅ All assets and images
- ✅ Hermes JavaScript engine (optimized)
- ✅ Native modules (Expo, React Native, etc.)
- ✅ ARM64 and ARMv7 binaries

The APK will work on:
- ✅ All modern Android phones (ARM-based)
- ✅ Android 5.0 (API 21) and above
- ✅ Both 32-bit and 64-bit ARM devices

## Next Steps After Building

1. **Test the APK:**
   - Install on your device
   - Test all features
   - Check login/logout
   - Verify all portals work

2. **Share with team:**
   - Upload to shared drive
   - Share download link
   - Include version number in filename

3. **Collect feedback:**
   - Test on different devices
   - Note any issues
   - Iterate and rebuild as needed

## Need Help?

If build fails, check:
1. Node modules are installed (`npm install`)
2. Android SDK is properly configured
3. JDK 17 is installed
4. Gradle version is compatible
5. Check build logs for specific errors
