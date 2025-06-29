# Fabric Server Installation Guide

This directory contains tools and documentation for upgrading the Minecraft server to newer versions with Fabric Loader.

## Overview

This guide documents the process used to upgrade from Minecraft 1.21.5 to 1.21.6 with Fabric Loader on June 28, 2025.

## Prerequisites

- Java 22+ (for optimal mod compatibility)
- Fabric Installer (included: `fabric-installer.jar`)
- Server backup (recommended)

## Installation Process

### Quick Upgrade (Recommended)

Use the provided upgrade script for an automated process:

```bash
./upgrade-server.sh [minecraft_version] [fabric_loader_version]

# Examples:
./upgrade-server.sh 1.21.7 0.16.15
./upgrade-server.sh 1.22.0  # Uses default Fabric loader version
```

The script will:
1. Stop the server
2. Run the Fabric installer  
3. Test the startup
4. Provide next steps

### Manual Installation Process

### 1. Stop the Server

```bash
sudo systemctl stop minecraft
```

### 2. Download Fabric Installer (if not present)

```bash
wget -O fabric-installer.jar https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.3/fabric-installer-1.0.3.jar
```

### 3. Install Fabric with Minecraft Version

```bash
java -jar fabric-installer.jar server -mcversion 1.21.6 -loader 0.16.14 -downloadMinecraft
```

**Important Parameters:**
- `-mcversion`: Target Minecraft version (e.g., 1.21.6)
- `-loader`: Fabric Loader version (check [Fabric API](https://meta.fabricmc.net/v2/versions/loader) for latest)
- `-downloadMinecraft`: Automatically downloads the Minecraft server jar

### 4. Update Java Version (if needed)

If mods require Java 22+, download the latest version of openjdk from this site: [`OpenJDK 24 | (https://jdk.java.net/24/)`](https://jdk.java.net/24/)

If needed, replace `24` with another version.

Then, install Java system-wide:

```bash
# Extract the tar file
sudo tar -xzf openjdk-*-linux-x64_bin.tar.gz -C /tmp || { echo "ERROR: unable to extract openjdk. Aborting."; exit 1; }
sudo rm openjdk-*-linux-x64_bin.tar.gz

# Find the new install directory name and save it for later

# Extract the JDK directory name
JDK_NAME=$(ls /tmp | grep '^jdk' | head -n1)
JDK_TMP="/tmp/$JDK_NAME"

# Reconstruct the full path
echo "Extracted JDK directory to temporary folder: $JDK_TMP"

# Find existing java installations folder
JAVA_INSTALLS_DIR=$(dirname $(dirname $(readlink -f $(which java)))) || JAVA_INSTALLS_DIR="/usr/lib/jvm"

# Require sudo
sudo echo "sudo access confirmed" || { echo "ERROR: sudo privileges required. Aborting."; exit 1; }

# Move JDK to system location
sudo mv $JDK_TMP $JAVA_INSTALLS_DIR

# Set up system alternatives to make Java 24 default
sudo update-alternatives --install /usr/bin/java java $JAVA_INSTALLS_DIR/$JDK_NAME/bin/java 100
sudo update-alternatives --config java  # Select Java 24

# Verify system Java version
java -version
```

***start.sh***
```sh
# Update start.sh to use system Java
java -Xmx8G -jar fabric-server-launch.jar nogui;
```

### 5. Test Server Startup

```bash
./start.sh
```

Look for:
- ✅ Correct Minecraft and Fabric Loader versions in logs
- ✅ Mods loading without major errors
- ✅ Server reaching "Done!" state

### 6. Handle Mod Incompatibilities

If mods fail to load:

1. **Check error messages** for specific mod conflicts
2. **Move problematic mods** to `mods/.old/[version]/` temporarily
3. **Test startup** again
4. **Update or replace** incompatible mods as needed

### 7. Start with systemd

```bash
sudo systemctl start minecraft
```

## Files Modified During Installation

- `fabric-server-launch.jar` - Updated Fabric launcher
- `server.jar` - New Minecraft server jar
- `start.sh` - Updated to use system Java instead of local installation
- `libraries/` - Updated Fabric libraries
- `versions/` - New Minecraft version files
- **System Java** - Installed Java 24 system-wide via update-alternatives

## Version History

| Date       | Minecraft | Fabric loader | Java  | Notes                                         |
|------------|-----------|---------------|-------|-----------------------------------------------|
| 2025-06-28 | `1.21.6`  | `0.16.14`     | `24`  | Upgraded from `1.21.5`, upgraded to `java 24` |

## Troubleshooting

### Common Issues

1. **Mod Version Conflicts**
   - Error: `requires version X.X.X of 'Minecraft'`
   - Solution: Update mods or temporarily remove incompatible ones

2. **Java Version Requirements**
   - Error: `requires version XX or later of 'OpenJDK'`
   - Solution: Install/use newer Java version

3. **Fabric Loader Version**
   - Error: `requires version X.X.XX or later of mod 'Fabric Loader'`
   - Solution: Use newer Fabric Loader version in installer command

### Useful Commands

```bash
# Check available Minecraft versions
curl -s https://meta.fabricmc.net/v2/versions/game | head -10

# Check available Fabric Loader versions  
curl -s https://meta.fabricmc.net/v2/versions/loader | head -5

# Test Java version
java -version

# Run the server for a set amount of time to verify that it loads correctly
timeout 20 ./start.sh

# Check server logs
sudo journalctl -u minecraft --follow
```

## References

- [Fabric Server Installation](https://fabricmc.net/use/server/)
- [Fabric API Versions](https://meta.fabricmc.net/v2/versions)
- [Modrinth](https://modrinth.com/) - For mod updates
