@echo off
echo.
echo ================================================
echo   Tower Desk - FAST APK Build Script
echo ================================================
echo.

echo [1/3] Stopping any running Gradle daemons...
cd android
call gradlew --stop
echo.

echo [2/3] Building release APK with optimizations...
echo       - ARM architectures only (arm64-v8a, armeabi-v7a)
echo       - Parallel builds enabled
echo       - Build cache enabled
echo       - Incremental Kotlin compilation
echo.
echo This should take 10-15 minutes...
echo.

REM Use assembleRelease with no cache rebuild (faster for subsequent builds)
call gradlew assembleRelease --parallel --build-cache --configure-on-demand

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Check the logs above for details.
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Build complete! Copying APK to Desktop...
echo.

if exist "app\build\outputs\apk\release\app-release.apk" (
    set OUTPUT_NAME=TowerDesk-v1.0.0-release.apk
    copy "app\build\outputs\apk\release\app-release.apk" "%USERPROFILE%\Desktop\%OUTPUT_NAME%"

    echo.
    echo ================================================
    echo   SUCCESS! APK is ready to share
    echo ================================================
    echo.
    echo APK Location: %USERPROFILE%\Desktop\%OUTPUT_NAME%
    echo.
    echo You can now share this file via:
    echo   - WhatsApp
    echo   - Google Drive
    echo   - Email
    echo   - USB transfer
    echo.
    echo ================================================
    echo.
) else (
    echo [ERROR] APK not found! Build may have failed.
    echo.
)

pause
