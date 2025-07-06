#!/bin/bash

# Solar Forecast Plugin Release Builder
# This script builds and packages the plugin for release

set -e

PLUGIN_NAME="solar-forecast-datasource"
VERSION=$(node -p "require('./package.json').version")
ARCHIVE_NAME="${PLUGIN_NAME}-v${VERSION}"

echo "🌞 Building Solar Forecast Plugin v${VERSION}"
echo "================================================"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ release/ *.zip *.tar.gz

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests and linting
echo "🧪 Running tests..."
npm test

echo "🔍 Running linting..."
npm run lint

echo "✅ Type checking..."
npm run typecheck

# Build the plugin
echo "🔨 Building plugin..."
npm run build

# Verify build output
echo "🔍 Verifying build output..."
if [ ! -f "dist/module.js" ]; then
    echo "❌ Build failed: module.js not found"
    exit 1
fi

if [ ! -f "dist/plugin.json" ]; then
    echo "❌ Build failed: plugin.json not found"
    exit 1
fi

echo "✅ Build verification passed"

# Create release directory
echo "📂 Creating release structure..."
mkdir -p "release/${PLUGIN_NAME}"

# Copy built files
echo "📋 Copying built files..."
cp -r dist/* "release/${PLUGIN_NAME}/"

# Copy documentation and metadata
echo "📚 Copying documentation..."
cp README-RELEASE.md "release/${PLUGIN_NAME}/README.md"
cp LICENSE "release/${PLUGIN_NAME}/"
cp CHANGELOG.md "release/${PLUGIN_NAME}/"

# Ensure plugin.json is in the right place
if [ ! -f "release/${PLUGIN_NAME}/plugin.json" ]; then
    cp plugin.json "release/${PLUGIN_NAME}/"
fi

# Create archives
echo "📦 Creating release archives..."
cd release

# Create ZIP archive
zip -r "../${ARCHIVE_NAME}.zip" "${PLUGIN_NAME}/"
echo "✅ Created ${ARCHIVE_NAME}.zip"

# Create tarball
tar -czf "../${ARCHIVE_NAME}.tar.gz" "${PLUGIN_NAME}/"
echo "✅ Created ${ARCHIVE_NAME}.tar.gz"

cd ..

# Display package contents
echo "📋 Package contents:"
echo "==================="
unzip -l "${ARCHIVE_NAME}.zip"

# Calculate checksums
echo "🔐 Calculating checksums..."
if command -v sha256sum &> /dev/null; then
    sha256sum "${ARCHIVE_NAME}.zip" > "${ARCHIVE_NAME}.zip.sha256"
    sha256sum "${ARCHIVE_NAME}.tar.gz" > "${ARCHIVE_NAME}.tar.gz.sha256"
    echo "✅ SHA256 checksums created"
elif command -v shasum &> /dev/null; then
    shasum -a 256 "${ARCHIVE_NAME}.zip" > "${ARCHIVE_NAME}.zip.sha256"
    shasum -a 256 "${ARCHIVE_NAME}.tar.gz" > "${ARCHIVE_NAME}.tar.gz.sha256"
    echo "✅ SHA256 checksums created"
else
    echo "⚠️  SHA256 utility not found, skipping checksums"
fi

# Final validation
echo "✅ Validating release package..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
unzip -q "${OLDPWD}/${ARCHIVE_NAME}.zip"

if [ ! -f "${PLUGIN_NAME}/module.js" ]; then
    echo "❌ Validation failed: module.js missing from package"
    exit 1
fi

if [ ! -f "${PLUGIN_NAME}/plugin.json" ]; then
    echo "❌ Validation failed: plugin.json missing from package"
    exit 1
fi

if [ ! -f "${PLUGIN_NAME}/README.md" ]; then
    echo "❌ Validation failed: README.md missing from package"
    exit 1
fi

if [ ! -f "${PLUGIN_NAME}/LICENSE" ]; then
    echo "❌ Validation failed: LICENSE missing from package"
    exit 1
fi

cd "$OLDPWD"
rm -rf "$TEMP_DIR"

echo "✅ Package validation passed"

# Show final summary
echo ""
echo "🎉 Release build complete!"
echo "=========================="
echo "Plugin: ${PLUGIN_NAME}"
echo "Version: ${VERSION}"
echo "Archives:"
echo "  - ${ARCHIVE_NAME}.zip"
echo "  - ${ARCHIVE_NAME}.tar.gz"

if [ -f "${ARCHIVE_NAME}.zip.sha256" ]; then
    echo "Checksums:"
    echo "  - ${ARCHIVE_NAME}.zip.sha256"
    echo "  - ${ARCHIVE_NAME}.tar.gz.sha256"
fi

echo ""
echo "📋 Installation Instructions:"
echo "1. Download one of the archives above"
echo "2. Extract to your Grafana plugins directory:"
echo "   sudo unzip ${ARCHIVE_NAME}.zip -d /var/lib/grafana/plugins/"
echo "3. Set permissions:"
echo "   sudo chown -R grafana:grafana /var/lib/grafana/plugins/${PLUGIN_NAME}"
echo "4. Add to grafana.ini:"
echo "   [plugins]"
echo "   allow_loading_unsigned_plugins = ${PLUGIN_NAME}"
echo "5. Restart Grafana"
echo ""
echo "🌞 Ready for release!"
