#!/bin/bash

# Build and Deploy Guide for WhisperHub Pro APK
# This script provides comprehensive build instructions

cat << 'EOF'

╔════════════════════════════════════════════════════════════════╗
║       WhisperHub Pro - Android APK Build Guide               ║
║         Autonomous Sales Agent for Tech Teams                 ║
╚════════════════════════════════════════════════════════════════╝

OVERVIEW
========
This guide covers building a complete Android APK of WhisperHub Pro
with autonomous sales agent capabilities.

SYSTEM REQUIREMENTS
===================
✓ Node.js 18+ and npm/bun
✓ Java Development Kit (JDK) 11 or higher
✓ Android SDK (API 24+)
✓ Android NDK (optional)
✓ 4GB+ RAM, 10GB+ disk space
✓ macOS, Linux, or Windows (WSL2)

INSTALLATION STEPS
==================

1. INSTALL PREREQUISITES
------------------------

   macOS:
   $ brew install node@18 openjdk@11

   Ubuntu/Debian:
   $ sudo apt-get update
   $ sudo apt-get install nodejs npm openjdk-11-jdk

   Windows (WSL2):
   $ apt-get install nodejs npm openjdk-11-jdk

   Install Android SDK:
   - Download Android Studio from https://developer.android.com/studio
   - Or use: $ brew install android-sdk (macOS)

2. CONFIGURE ENVIRONMENT
------------------------

   Set environment variables:
   
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export JAVA_HOME=$(/usr/libexec/java_home -v11)

   Add to ~/.bashrc or ~/.zshrc to make permanent:
   
   echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc

3. SETUP PROJECT
----------------

   Navigate to project:
   $ cd /home/tjms/Downloads/whisper-hub-pro-main

   Install dependencies:
   $ npm install
   
   Or with bun:
   $ bun install

4. DEPLOY DATABASE
------------------

   Deploy Supabase migrations:
   $ supabase migration up

   Deploy edge functions:
   $ supabase functions deploy lead-score
   $ supabase functions deploy auto-followup
   $ supabase functions deploy sales-analytics

5. BUILD WEB APP
----------------

   $ npm run build

   This creates:
   - dist/          (web app files)
   - dist/index.html
   - dist/client.js
   - dist/styles.css

6. INITIALIZE CAPACITOR
-----------------------

   Add Android platform:
   $ npm run cap:add:android

   This creates:
   - android/       (Android project)
   - android/app/   (app module)
   - capacitor.config.ts

7. SYNC TO ANDROID
------------------

   $ npm run cap:sync

   Or manually:
   $ npx cap sync android

8. BUILD APK OPTIONS
====================

   OPTION A: Using Terminal
   ========================
   Debug APK (fastest):
   $ npm run build:apk

   Output: android/app/build/outputs/apk/debug/app-debug.apk

   Release APK (signed):
   $ npm run build:apk:release
   
   (Requires keystore setup, see below)

   OPTION B: Using Android Studio
   ===============================
   $ npm run cap:open
   
   Or manually:
   $ npx cap open android

   In Android Studio:
   1. Click "Build" menu
   2. Select "Build Bundle(s) / APK(s)"
   3. Click "Build APK(s)"
   4. Wait for build to complete
   5. APK location: android/app/build/outputs/apk/debug/app-debug.apk

9. GENERATE SIGNED RELEASE APK
==============================

   Create keystore (one-time):
   $ keytool -genkey -v -keystore android/app/release-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias release

   When prompted, enter:
   - Password (remember this!)
   - Key password (can be same as above)
   - Your name, organization, city, state, country

   Build signed APK:
   $ export KEYSTORE_PASSWORD="your-password"
   $ export KEY_PASSWORD="your-password"
   $ npm run build:apk:release

   Output: android/app/build/outputs/apk/release/app-release.apk

10. TEST THE APK
================

    Using Android Emulator:
    $ emulator -avd Pixel_4_API_31 &

    Install APK:
    $ adb install android/app/build/outputs/apk/debug/app-debug.apk

    Using Physical Device:
    1. Enable USB Debugging:
       - Settings > About phone > Tap Build Number 7 times
       - Settings > Developer Options > USB Debugging (enable)
    2. Connect via USB
    3. Run: $ adb devices
    4. Install: $ adb install app-debug.apk
    5. Open app to test

11. TROUBLESHOOTING
===================

    Error: "ANDROID_HOME not set"
    Fix: export ANDROID_HOME=$HOME/Android/Sdk

    Error: "No Java found"
    Fix: export JAVA_HOME=$(/usr/libexec/java_home -v11)

    Error: "Gradle build failed"
    Fix: 
    $ cd android
    $ ./gradlew clean
    $ ./gradlew build

    Error: "App crashes immediately"
    Fix: Check logcat
    $ adb logcat -s "Capacitor" -s "myapp"
    
    Error: "Can't connect to API"
    Fix: Update your Supabase URL in src/integrations/supabase/client.ts

    Missing Permissions:
    Check android/app/src/AndroidManifest.xml for required permissions:
    - INTERNET
    - VIBRATE
    - CAMERA (for future QR scanning)
    - READ_CONTACTS (for lead import)

12. DISTRIBUTION
================

    To Google Play Store:
    1. Create Google Play Developer Account ($25 one-time)
    2. Create new app project
    3. Generate signed release APK
    4. Upload to Play Store Console
    5. Add store listing and screenshots
    6. Submit for review

    Direct APK Distribution:
    1. Host app-release.apk on your server
    2. Users can download and install directly
    3. Or use Firebase App Distribution for testing:
       - firebase-cli appdistribution:distribute app-release.apk

13. CONTINUOUS BUILD (CI/CD)
=============================

    Using GitHub Actions:
    
    Create .github/workflows/android-build.yml:
    
    name: Build Android APK
    on: [push]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v2
          - name: Setup Java
            uses: actions/setup-java@v2
            with:
              java-version: '11'
          - name: Install dependencies
            run: npm install
          - name: Build web
            run: npm run build
          - name: Setup Android
            uses: android-actions/setup-android@v2
          - name: Build APK
            run: npm run build:apk

14. NEXT STEPS
==============

    After APK is built:
    ✓ Test on physical device
    ✓ Collect user feedback
    ✓ Push updates via Supabase edge functions
    ✓ Monitor usage with Firebase Analytics
    ✓ Deploy to Play Store

═══════════════════════════════════════════════════════════════════

For questions or issues:
- Check Android logs: adb logcat
- Review Gradle output in android/build.log
- Consult Capacitor docs: capacitorjs.com/docs/android
- See project README: AGENT_UPGRADE_README.md

Good luck building your autonomous sales agent! 🚀

═══════════════════════════════════════════════════════════════════

EOF
