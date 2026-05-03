#!/bin/bash

# WhisperHub Pro - APK Build Setup Script
# This script automates the setup and building process

set -e

echo "======================================"
echo "WhisperHub Pro - APK Build Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

if ! command -v java &> /dev/null; then
    echo -e "${RED}✗ Java not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java: $(java -version 2>&1 | head -n 1)${NC}"

if ! command -v android &> /dev/null; then
    echo -e "${YELLOW}⚠ Android SDK not in PATH${NC}"
    echo "  Set ANDROID_HOME and update PATH:"
    echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "  export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/tools/bin"
fi

# Install dependencies
echo -e "${YELLOW}[2/5] Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build web app
echo -e "${YELLOW}[3/5] Building web app...${NC}"
npm run build
echo -e "${GREEN}✓ Web app built to dist/${NC}"

# Initialize Capacitor Android
echo -e "${YELLOW}[4/5] Setting up Capacitor Android project...${NC}"
if [ ! -d "android" ]; then
    npx cap add android
    echo -e "${GREEN}✓ Android project created${NC}"
else
    echo -e "${GREEN}✓ Android project already exists${NC}"
fi

# Sync web app to Android
echo -e "${YELLOW}[5/5] Syncing web app to Android...${NC}"
npx cap sync android
echo -e "${GREEN}✓ Web app synced${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "Setup Complete!"
echo "=====================================${NC}"
echo ""
echo "Next steps:"
echo "1. Open Android project:"
echo "   npx cap open android"
echo ""
echo "2. Build APK in Android Studio:"
echo "   - Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "3. Or build from command line:"
echo "   npm run build:apk"
echo ""
echo "APK will be generated at:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
