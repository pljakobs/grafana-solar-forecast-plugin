#!/bin/bash

# Solar Forecast Plugin Deployment Script
# This script builds the plugin, deploys it to Grafana, and verifies it loaded correctly

set -e  # Exit on any error

# Configuration
GRAFANA_HOST="grafana.fritz.box"
PLUGIN_NAME="solar-forecast-datasource"
LOCAL_DIST_DIR="/home/pjakobs/devel/grafana-plugin/dist"
REMOTE_PLUGIN_DIR="/var/lib/grafana/plugins/${PLUGIN_NAME}"
TEMP_DIR="/tmp/solar-forecast-plugin-deploy"

echo "/-------------------------------------------------------\\"
echo "!                                                       !"
echo "! Solar Forecast Grafana Plugin Deployment Script       !"
echo "!            🔨 Building plugin...                      !"
echo "!                                                       !"
echo "\\-------------------------------------------------------/"

# Build frontend
echo "🖥️ Building frontend..."
npm run build

# Copy plugin.json and other required files to dist (webpack doesn't copy these)
echo "📋 Copying plugin metadata files..."
cp plugin.json dist/
# Don't copy MANIFEST.txt as it causes signature validation issues with placeholder hashes
# [ -f MANIFEST.txt ] && cp MANIFEST.txt dist/ 
[ -d img ] && cp -r img dist/ || echo "   No img directory found"

# Remove any existing MANIFEST.txt from dist to prevent signature issues
rm -f dist/MANIFEST.txt

echo "📦 Copying files to remote server..."
# Clean up any existing temp directory
ssh ${GRAFANA_HOST} "rm -rf ${TEMP_DIR} && mkdir -p ${TEMP_DIR}"

# Copy built frontend files to temp directory
scp -r ${LOCAL_DIST_DIR}/* ${GRAFANA_HOST}:${TEMP_DIR}/

# Note: Plugin is frontend-only, no Go compilation needed

echo "🚀 Deploying plugin to Grafana..."
ssh ${GRAFANA_HOST} << EOF
# Frontend-only plugin - no Go backend compilation needed
echo "⚙️ Deploying frontend-only plugin..."

# Stop Grafana first to avoid file locks
sudo systemctl stop grafana-server

# Ensure plugin directory exists
sudo mkdir -p ${REMOTE_PLUGIN_DIR}

# Remove old plugin files completely
sudo rm -rf ${REMOTE_PLUGIN_DIR}/*

# Copy new files directly to plugin root
sudo cp -r ${TEMP_DIR}/* ${REMOTE_PLUGIN_DIR}/

# Remove any nested dist directories that could confuse plugin discovery
sudo rm -rf ${REMOTE_PLUGIN_DIR}/dist

# Remove any MANIFEST.txt files that could cause signature validation issues
sudo rm -f ${REMOTE_PLUGIN_DIR}/MANIFEST.txt

# Set correct ownership
sudo chown -R grafana:grafana ${REMOTE_PLUGIN_DIR}

# Set correct permissions to match working plugins
sudo chmod 750 ${REMOTE_PLUGIN_DIR}
sudo find ${REMOTE_PLUGIN_DIR} -type f -exec sudo chmod 640 {} \;
sudo find ${REMOTE_PLUGIN_DIR} -type d -exec sudo chmod 750 {} \;

# Clean up temp directory
rm -rf ${TEMP_DIR}

# Start Grafana
sudo systemctl start grafana-server
EOF

echo "⏳ Waiting for Grafana to start..."
sleep 8

echo "🔍 Checking if plugin loaded successfully..."

# Check the logs for plugin registration
PLUGIN_LOADED=$(ssh ${GRAFANA_HOST} "sudo journalctl -u grafana-server --since '1 minute ago' | grep -i 'solar-forecast.*registered' || echo 'NOT_FOUND'")

if [[ "$PLUGIN_LOADED" == "NOT_FOUND" ]]; then
    echo "⚠️  Plugin registration not found in logs, checking for errors..."
    
    # Check for plugin discovery
    PLUGIN_DISCOVERY=$(ssh ${GRAFANA_HOST} "sudo journalctl -u grafana-server --since '1 minute ago' | grep -i 'Loading plugin.*solar-forecast' || echo 'NOT_FOUND'")
    if [[ "$PLUGIN_DISCOVERY" != "NOT_FOUND" ]]; then
        echo "📂 Plugin discovery found:"
        echo "$PLUGIN_DISCOVERY"
    else
        echo "❌ Plugin not found during discovery phase"
    fi
    
    # Check for plugin validation errors
    PLUGIN_VALIDATION=$(ssh ${GRAFANA_HOST} "sudo journalctl -u grafana-server --since '1 minute ago' | grep -i 'solar-forecast.*validation\|solar-forecast.*error\|solar-forecast.*failed' || echo 'NOT_FOUND'")
    if [[ "$PLUGIN_VALIDATION" != "NOT_FOUND" ]]; then
        echo "⚠️  Plugin validation issues found:"
        echo "$PLUGIN_VALIDATION"
    fi
    
    # Check for signature validation
    PLUGIN_SIGNATURE=$(ssh ${GRAFANA_HOST} "sudo journalctl -u grafana-server --since '1 minute ago' | grep -i 'solar-forecast.*signature\|solar-forecast.*unsigned' || echo 'NOT_FOUND'")
    if [[ "$PLUGIN_SIGNATURE" != "NOT_FOUND" ]]; then
        echo "🔐 Plugin signature info:"
        echo "$PLUGIN_SIGNATURE"
    fi
    
    # Check general plugin errors
    GENERAL_ERRORS=$(ssh ${GRAFANA_HOST} "sudo journalctl -u grafana-server --since '1 minute ago' | grep -i 'plugin.*error\|failed to load' || echo 'NOT_FOUND'")
    if [[ "$GENERAL_ERRORS" != "NOT_FOUND" ]]; then
        echo "⚠️  General plugin errors found:"
        echo "$GENERAL_ERRORS"
    else
        echo "ℹ️  No plugin-related errors found in logs"
    fi
else
    echo "✅ Plugin registration found in logs:"
    echo "$PLUGIN_LOADED"
fi

# Additional check: Look for plugin in the plugin list endpoint (if accessible)
echo ""
echo "🔍 Verifying plugin is available in Grafana..."

echo "📊 Plugin deployment status:"
ssh ${GRAFANA_HOST} << EOF
# Check if plugin files exist in the correct location
if sudo [ -f "${REMOTE_PLUGIN_DIR}/plugin.json" ]; then
    echo "✅ Plugin files deployed successfully"
    echo "   📁 Plugin directory: ${REMOTE_PLUGIN_DIR}"
    echo "   📄 Main files:"
    sudo ls -la ${REMOTE_PLUGIN_DIR}/ | grep -E "(plugin\.json|module\.js|\.d\.ts)" || echo "   Main files not found"
    echo "   📄 Total files: \$(sudo ls -1 ${REMOTE_PLUGIN_DIR}/ | wc -l)"
else
    echo "❌ Plugin files not found!"
    echo "   Directory contents:"
    sudo ls -la ${REMOTE_PLUGIN_DIR}/ || echo "Directory does not exist"
fi

# Check Grafana service status
if systemctl is-active --quiet grafana-server; then
    echo "✅ Grafana is running"
else
    echo "❌ Grafana is not running!"
    sudo systemctl status grafana-server --no-pager -l
fi

# Check plugin.json content
if sudo [ -f "${REMOTE_PLUGIN_DIR}/plugin.json" ]; then
    echo "📋 Plugin configuration:"
    echo "   ID: \$(sudo grep -o '"id":[[:space:]]*"[^"]*"' ${REMOTE_PLUGIN_DIR}/plugin.json | cut -d'"' -f4)"
    echo "   Name: \$(sudo grep -o '"name":[[:space:]]*"[^"]*"' ${REMOTE_PLUGIN_DIR}/plugin.json | cut -d'"' -f4)"
    echo "   Type: \$(sudo grep -o '"type":[[:space:]]*"[^"]*"' ${REMOTE_PLUGIN_DIR}/plugin.json | cut -d'"' -f4)"
fi

# Check if plugin is in allow_loading_unsigned_plugins
echo ""
echo "🔐 Checking Grafana configuration for unsigned plugins..."
UNSIGNED_PLUGINS=\$(sudo grep -o 'allow_loading_unsigned_plugins[[:space:]]*=[[:space:]]*.*' /etc/grafana/grafana.ini || echo "NOT_FOUND")
if [[ "\$UNSIGNED_PLUGINS" != "NOT_FOUND" ]]; then
    echo "   \$UNSIGNED_PLUGINS"
    if echo "\$UNSIGNED_PLUGINS" | grep -q "solar-forecast-datasource"; then
        echo "   ✅ solar-forecast-datasource is in allowed unsigned plugins"
    else
        echo "   ⚠️  solar-forecast-datasource NOT in allowed unsigned plugins list"
    fi
else
    echo "   ❌ allow_loading_unsigned_plugins setting not found"
fi

# Check plugin directory permissions
echo ""
echo "📂 Plugin directory permissions:"
sudo ls -ld ${REMOTE_PLUGIN_DIR}
echo "   Main files permissions:"
sudo ls -l ${REMOTE_PLUGIN_DIR}/plugin.json ${REMOTE_PLUGIN_DIR}/module.js 2>/dev/null || echo "   ❌ Main files not found"
EOF

echo ""
echo "🕵️ Final plugin loading verification..."
ssh ${GRAFANA_HOST} << 'VERIFICATION_EOF'
# Wait a bit more for plugin loading to complete
sleep 3

# Check recent logs for our plugin specifically
echo "🔍 Searching logs for solar-forecast plugin activity..."
sudo journalctl -u grafana-server --since '2 minutes ago' | grep -i solar-forecast | tail -10 || echo "   ❌ No solar-forecast activity found in logs"

# Check if Grafana's plugin scanner found our plugin
echo ""
echo "🔍 Checking plugin discovery logs..."
sudo journalctl -u grafana-server --since '2 minutes ago' | grep -i "Loading plugin.*${REMOTE_PLUGIN_DIR}" || echo "   ❌ Plugin directory not found in discovery logs"

# Look for plugin loading completion
echo ""
echo "🔍 Checking plugin loading completion..."
PLUGIN_LOADED_COUNT=$(sudo journalctl -u grafana-server --since '2 minutes ago' | grep -i "Plugin registered" | wc -l)
echo "   📊 Total plugins registered in last 2 minutes: $PLUGIN_LOADED_COUNT"

if [ "$PLUGIN_LOADED_COUNT" -gt 0 ]; then
    echo "   📝 Recently registered plugins:"
    sudo journalctl -u grafana-server --since '2 minutes ago' | grep -i "Plugin registered" | sed 's/.*pluginId=\([^ ]*\).*/     - \1/' | sort | uniq
    
    if sudo journalctl -u grafana-server --since '2 minutes ago' | grep -i "Plugin registered" | grep -q "solar-forecast-datasource"; then
        echo "   ✅ solar-forecast-datasource successfully registered!"
    else
        echo "   ❌ solar-forecast-datasource NOT in registered plugins list"
    fi
else
    echo "   ❌ No plugins were registered during startup"
fi
VERIFICATION_EOF

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Open Grafana at http://${GRAFANA_HOST}:3000"
echo "2. Go to Configuration > Data Sources"
echo "3. Look for 'Solar Forecast' in the list"
echo "4. Check browser console for plugin loading messages"
echo ""
echo "To check detailed logs:"
echo "  ssh ${GRAFANA_HOST} 'sudo journalctl -u grafana-server -f'"
