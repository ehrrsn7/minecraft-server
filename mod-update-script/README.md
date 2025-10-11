# Minecraft Mod Update Script

A robust, modular, and extensible script for managing, updating, and archiving Minecraft mods for your server. Supports Modrinth, GitHub, GitLab, and custom forks, with advanced version and archive management.

---

## Features & Requirements

### 1. Mod Download & Update
- Downloads the latest version of each mod listed in `mods_config.json` to the `mods/` directory.
- Supports Modrinth, GitHub, GitLab, and custom forks.
- Ensures downloaded mods are compatible with the specified Minecraft version.

### 2. Archiving Old Mods
- Archives old `.jar` files from `mods/` to `mods/.old/` when a new version is downloaded.
- Uses fuzzy matching to identify old versions, even if filenames don't follow a strict format.
- `--picky` flag: Only archive files similar to the new file. Otherwise, archive all except the new one.

### 3. Fork Management
- CLI support for adding forks: `add fork <fork_url> [mod_id]`.
- Supports both GitHub and GitLab forks.
- If mod id is not found, matches by slug or fetches from Modrinth.

### 4. Config Management
- Each mod in `mods_config.json` must have: `id`, `name`, `slug`, `latest_stability`, `latest_version`, `source`, `modrinth_project_url`, `modrinth_mod_url`, `fallback_repo`, and `forks`.
- The `slug` field is required and used for matching.

### 5. CLI & Output
- Colorized CLI output for success (green), warnings (yellow), and errors (red).
- Shows which files are archived, downloaded, or skipped.
- Shows fork checks and results.

### 6. Error Handling
- All errors are caught and reported in red.
- Script does not crash on missing/invalid data; logs and continues.

### 7. Extensibility
- Modular, well-documented code with JSDoc and section headers.
- Easy to extend for new sources or archiving strategies.

### 8. Minecraft Version Checking
- Defaults to the latest Minecraft version (fetched from Mojang's API).
- Override with `--mcVersion=1.21.6`.
- Modrinth: Uses API to filter by Minecraft version.
- GitHub/GitLab: Downloads the `.jar`, extracts `META-INF/MANIFEST.MF`, and checks `Fabric-Minecraft-Version`.
- Only accepts mods that match the specified Minecraft version.

### 9. --dry-run and --update-config Flags
- `--dry-run`: Simulates updates, archiving, and downloads without making changes.
- `--update-config`: Only updates config fields, does not download or archive files.

### 10. Version Listing & Comparison
- `list_latest_versions.js`: Lists the latest available versions for all mods using the Modrinth API.
- Compares current versions in config with latest available versions.
- Supports multiple output formats: table (default), JSON, and CSV.
- Filter by source: Modrinth (MR), GitHub (GH), GitLab (GL), or all sources.
- Shows update availability, errors, and version compatibility.

---

## Stretch Requirements / Optional Features
- Batch archiving: Use `archiveExistingMods()` to clear all mods before a batch update.
- Further CLI subcommands for advanced management.
- Additional test coverage and CI integration.
- Support for more mod platforms or custom sources.
- **Robust download improvements:**
  - Retry logic for failed downloads
  - Show download progress in the console
  - Support parallel downloads for multiple mods
  - Add checksum/hash verification after download
  - Allow configurable download directory or temp file usage

---

## Installation & Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm
- unzipper (for Minecraft version detection in .jar files)

### 2. Install Dependencies
```bash
cd /home/ehrrsn7/.var/app/com.mojang.Minecraft/.minecraft/server/mod-update-script
npm install
```

### 3. Usage

#### Update All Mods
```bash
node update_mods.js
```

#### Simulate (Dry Run)
```bash
node update_mods.js --dry-run
```

#### Update Config Only
```bash
node update_mods.js --update-config
```

#### Use Picky Archiving
```bash
node update_mods.js --picky
```

#### Specify Minecraft Version
```bash
node update_mods.js --mcVersion=1.21.6
```

#### Add a Fork
```bash
node update_mods.js add fork <fork_url> [mod_id (optional)]
```

#### List Latest Versions
```bash
# Default table format for all mods
node list_latest_versions.js

# Filter by Modrinth mods only
node list_latest_versions.js --filter=MR

# Output as JSON
node list_latest_versions.js --format=json

# Output as CSV
node list_latest_versions.js --format=csv

# Check against specific Minecraft version
node list_latest_versions.js --mc-version=1.21.6

# Using npm scripts
npm run list-versions
npm run list-versions-json
npm run list-versions-csv
```

- Note: the program will prompt the user for the fork_url if not supplied and 
mod_id if needed.

---

## Configuration
- Edit `mods_config.json` to add, remove, or update mods.
- Each mod entry must include all required fields (see above).

---

## Troubleshooting
- Errors are colorized in red and will not crash the script.
- Check the output for details on what was archived, downloaded, or skipped.
- For advanced debugging, review the code comments and JSDoc.

---

## Contributing
- PRs and issues welcome! Please ensure code is modular and well-documented.

---

## License
MIT
