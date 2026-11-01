#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/macos/build/Lumen.app"
BIN="$ROOT/macos/.build/release/Lumen"

if [[ "$(uname -m)" != "arm64" ]]; then
    echo "The Lumen macOS app currently supports Apple Silicon Macs." >&2
    exit 1
fi
command -v swift >/dev/null || { echo "Install Xcode Command Line Tools to build Lumen." >&2; exit 1; }
command -v m1ddc >/dev/null || { echo "Install the DDC/CI backend first: brew install m1ddc" >&2; exit 1; }

cd "$ROOT/macos"
swift build -c release
mkdir -p "$APP/Contents/MacOS"
cp "$BIN" "$APP/Contents/MacOS/Lumen"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Lumen</string>
<key>CFBundleIdentifier</key><string>com.sailxx.lumen</string>
<key>CFBundleName</key><string>Lumen</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSUIElement</key><true/>
<key>MinimumOSVersion</key><string>13.0</string>
</dict></plist>
PLIST
echo "Built $APP"
