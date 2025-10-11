# Minecraft Server

A Fabric-based Minecraft server with automated mod management and version control.

## Current Configuration

- **Minecraft Version:** 1.21.6
- **Fabric Loader:** 0.16.14  
- **Java Version:** 24
- **Server Port:** 25565

## Server Management

### Starting/Stopping the Server

```bash
# Start server
sudo systemctl start minecraft

# Stop server  
sudo systemctl stop minecraft

# Check status
sudo systemctl status minecraft

# View logs
sudo journalctl -u minecraft --follow
```

### Manual Server Control

```bash
# Start manually
./start.sh

# The server runs with system Java 24 and 8GB RAM allocation
```

## Mod Management

This server includes an automated mod update system in the `mod-update-script/` directory.

### Updating Mods

```bash
cd mod-update-script/

# Preview what would be updated (dry run)
node update_mods.js --dry-run

# Update all mods
node update_mods.js

# Update only config without downloading
node update_mods.js --update-config
```

### Organizing Old Mods

```bash
cd mod-update-script/

# Sort archived mods by Minecraft version
node sort_into_groups.js
```

The script automatically organizes old mods in `mods/.old/` into version-specific folders (e.g., `1.21.5/`, `1.21.6/`).

## Server Upgrades

### Upgrading Minecraft/Fabric Versions

For server version upgrades, see the detailed guide in:

**📁 [`install-fabric/README.md`](install-fabric/README.md)**

This guide covers:
- Upgrading Minecraft versions
- Updating Fabric Loader
- Java version requirements
- Handling mod compatibility issues

### Quick Upgrade Summary

**Automated Upgrade:**
```bash
# Run the upgrade script (recommended)
./install-fabric/upgrade-server.sh [minecraft_version] [fabric_loader_version]

# Example: Upgrade to Minecraft 1.21.7 with latest Fabric
./install-fabric/upgrade-server.sh 1.21.7 0.16.15
```

**Manual Upgrade:**
1. Stop server: `sudo systemctl stop minecraft`
2. Use Fabric installer: `java -jar install-fabric/fabric-installer.jar server -mcversion [VERSION] -loader [LOADER_VERSION] -downloadMinecraft`
3. Test startup: `./start.sh`
4. Handle mod conflicts if needed
5. Start server: `sudo systemctl start minecraft`

## Directory Structure

```
├── install-fabric/          # Server upgrade tools and documentation
├── mod-update-script/       # Automated mod management
├── mods/                    # Active mods
│   └── .old/               # Archived mods organized by version
├── config/                 # Mod configuration files
├── worlds/                 # World data
├── start.sh               # Server startup script
└── server.properties      # Server configuration
```

## Configuration Files

- **`server.properties`** - Main server settings
- **`start.sh`** - Server startup script with system Java 24 and 8GB memory allocation
- **`/etc/systemd/system/minecraft.service`** - systemd service configuration
- **`mod-update-script/mods_config.json`** - Mod update configuration

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check logs: `sudo journalctl -u minecraft`
   - Verify Java version: `java -version`
   - Test manual startup: `./start.sh`

2. **Mod compatibility errors**
   - Check Minecraft version requirements in logs
   - Move problematic mods to `mods/.old/`
   - Update mods with the mod update script

3. **Performance issues**
   - Adjust memory allocation in `start.sh`
   - Review C2ME and Lithium configurations in `config/`

### Useful Commands

```bash
# Check active mods
ls mods/*.jar | wc -l

# View mod update script help
cd mod-update-script && node update_mods.js --help

# Check Java version being used
java -version

# Monitor server performance  
htop
```

## Recent Changes

- **2025-06-28:** Upgraded from Minecraft 1.21.5 to 1.21.6, Fabric Loader 0.16.13 to 0.16.14, Java 21 to 24
- Organized mod archive system by version
- Implemented automated mod update workflow

## Resources

- [Fabric Documentation](https://fabricmc.net/use/server/)
- [Modrinth](https://modrinth.com/) - Mod repository
- [Server Admin Guide](install-fabric/README.md)
