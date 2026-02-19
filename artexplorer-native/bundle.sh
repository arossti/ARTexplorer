#!/bin/bash
# Build and bundle ARTexplorer as a macOS .app
#
# Usage:
#   ./bundle.sh          Build release and create .app bundle
#   ./bundle.sh --run    Build, bundle, then launch the app
#   ./bundle.sh --open   Build, bundle, then reveal in Finder

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="ARTexplorer"
BUNDLE_ID="ca.openbuilding.artexplorer"
APP_DIR="$SCRIPT_DIR/target/${APP_NAME}.app"
CONTENTS="$APP_DIR/Contents"

echo "=== Building release binary ==="
cargo build --release --manifest-path "$SCRIPT_DIR/Cargo.toml"

echo "=== Creating app bundle ==="
mkdir -p "$CONTENTS/MacOS"
mkdir -p "$CONTENTS/Resources"

# Copy binary
cp "$SCRIPT_DIR/target/release/artexplorer-native" "$CONTENTS/MacOS/$APP_NAME"

# Copy icon (generate if missing)
if [ ! -f "$SCRIPT_DIR/AppIcon.icns" ]; then
    echo "  Generating icon..."
    python3 "$SCRIPT_DIR/gen-icon.py"
fi
cp "$SCRIPT_DIR/AppIcon.icns" "$CONTENTS/Resources/AppIcon.icns"

# Write Info.plist
cat > "$CONTENTS/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ARTexplorer</string>
    <key>CFBundleDisplayName</key>
    <string>ARTexplorer</string>
    <key>CFBundleIdentifier</key>
    <string>ca.openbuilding.artexplorer</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>ARTexplorer</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
PLIST

echo "=== Bundle created ==="
echo "  $APP_DIR"
echo ""
echo "Launch with:  open \"$APP_DIR\""
echo "  — or —      $CONTENTS/MacOS/$APP_NAME"

# Handle flags
case "${1:-}" in
    --run)
        echo ""
        echo "=== Launching ==="
        open "$APP_DIR"
        ;;
    --open)
        echo ""
        echo "=== Revealing in Finder ==="
        open -R "$APP_DIR"
        ;;
esac
