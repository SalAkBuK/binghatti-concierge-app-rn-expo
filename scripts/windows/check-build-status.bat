@echo off
echo.
echo ================================================
echo   Tower Desk - Build Status Checker
echo ================================================
echo.

REM Check if release APK exists
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo [SUCCESS] Release APK found!
    echo.
    echo Location: android\app\build\outputs\apk\release\app-release.apk
    echo.

    REM Get file size
    for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do (
        set size=%%~zA
    )

    REM Convert bytes to MB
    set /a sizeMB=size/1048576
    echo APK Size: %sizeMB% MB
    echo.

    REM Copy to Desktop with versioned name
    set OUTPUT_NAME=TowerDesk-v1.0.0-release.apk
    copy "android\app\build\outputs\apk\release\app-release.apk" "%USERPROFILE%\Desktop\%OUTPUT_NAME%"
    echo.
    echo [COPIED] APK copied to Desktop as: %OUTPUT_NAME%
    echo.
    echo You can now share this APK via WhatsApp, Drive, email, etc.
    echo.
) else (
    echo [BUILDING] Release APK not found yet...
    echo.
    echo Build is still in progress. Please wait.
    echo.
    echo Check android\app\build\outputs\apk\release\ for the APK when build completes.
    echo.
)

echo ================================================
echo.
pause
