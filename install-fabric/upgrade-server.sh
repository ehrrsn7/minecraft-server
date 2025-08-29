#!/bin/bash
# Fabric Server Upgrade Script
# Usage: ./upgrade-server.sh [minecraft_version] [fabric_loader_version]

set -e

MINECRAFT_VERSION=${1:-"1.21.6"}
FABRIC_LOADER_VERSION=${2:-"0.16.14"}

echo "🚀 Starting Fabric Server Upgrade"
echo "📦 Minecraft: $MINECRAFT_VERSION"
echo "🧶 Fabric Loader: $FABRIC_LOADER_VERSION"
echo ""

# Stop server
echo "⏹️  Stopping server..."
sudo systemctl stop minecraft

# Wait for server to stop
sleep 3

# Run Fabric installer
echo "📥 Installing Fabric..."
java -jar install-fabric/fabric-installer.jar server \
    -mcversion "$MINECRAFT_VERSION" \
    -loader "$FABRIC_LOADER_VERSION" \
    -downloadMinecraft

echo ""
echo "✅ Installation complete!"
echo ""
echo "🧪 Testing server startup..."
timeout 20 ./start.sh || {
    echo "❌ Server startup failed. Please check the logs above."
    exit 1
}

echo ""
echo "🎯 Next steps:"
echo "1. Check logs above for any mod compatibility issues"
echo "2. If issues found, move problematic mods to mods/.old/"
echo "3. Start server: sudo systemctl start minecraft"
echo "4. Monitor logs: sudo journalctl -u minecraft --follow"
