// sort the mods found in ../mods/.old into grouped folders based on their minecraft version

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLD_MODS_DIR = path.join(__dirname, '../mods/.old');

// Color utilities for console output
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_RESET = '\x1b[0m';

/**
 * Extracts Minecraft version from a jar file's manifest
 * @param {string} jarPath - Path to the jar file
 * @returns {string|null} - Minecraft version or null if not found
 */
function getMinecraftVersionFromJar(jarPath) {
    try {
        const zip = new AdmZip(jarPath);
        const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
        
        if (manifestEntry) {
            const manifestContent = manifestEntry.getData().toString('utf8');
            const lines = manifestContent.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('Fabric-Minecraft-Version:')) {
                    const version = line.split(':')[1].trim();
                    return version;
                }
            }
        }
        
        // Try fabric.mod.json as fallback
        const fabricModEntry = zip.getEntry('fabric.mod.json');
        if (fabricModEntry) {
            const fabricModContent = fabricModEntry.getData().toString('utf8');
            const fabricMod = JSON.parse(fabricModContent);
            
            if (fabricMod.depends && fabricMod.depends.minecraft) {
                // Handle version ranges like ">=1.21.0" or "1.21.x"
                const mcVersion = fabricMod.depends.minecraft;
                const match = mcVersion.match(/(\d+\.\d+(?:\.\d+)?)/);
                if (match) {
                    return match[1];
                }
            }
        }
        
        return null;
    } catch (error) {
        console.log(`${COLOR_YELLOW}Warning: Could not read ${path.basename(jarPath)}: ${error.message}${COLOR_RESET}`);
        return null;
    }
}

/**
 * Attempts to guess Minecraft version from filename patterns
 * @param {string} filename - The jar filename
 * @returns {string|null} - Guessed version or null
 */
function guessVersionFromFilename(filename) {
    // Common patterns in mod filenames
    const patterns = [
        /mc(\d+\.\d+(?:\.\d+)?)/i,           // mc1.21.6
        /(\d+\.\d+(?:\.\d+)?)\+/,            // 1.21.6+
        /-(\d+\.\d+(?:\.\d+)?)-/,            // -1.21.6-
        /fabric[_-](\d+\.\d+(?:\.\d+)?)/i,   // fabric_1.21.6
        /for[_-]mc(\d+\.\d+(?:\.\d+)?)/i,    // for-mc1.21.6
    ];
    
    for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * Creates a directory if it doesn't exist
 * @param {string} dirPath - Directory path to create
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`${COLOR_GREEN}Created directory: ${path.basename(dirPath)}${COLOR_RESET}`);
    }
}

/**
 * Main function to sort mods by version
 */
function sortModsByVersion() {
    console.log(`${COLOR_CYAN}Starting mod sorting process...${COLOR_RESET}`);
    
    if (!fs.existsSync(OLD_MODS_DIR)) {
        console.log(`${COLOR_RED}Error: ${OLD_MODS_DIR} does not exist${COLOR_RESET}`);
        return;
    }
    
    const files = fs.readdirSync(OLD_MODS_DIR);
    const jarFiles = files.filter(file => file.endsWith('.jar') && fs.statSync(path.join(OLD_MODS_DIR, file)).isFile());
    
    if (jarFiles.length === 0) {
        console.log(`${COLOR_YELLOW}No jar files found in ${OLD_MODS_DIR}${COLOR_RESET}`);
        return;
    }
    
    console.log(`${COLOR_CYAN}Found ${jarFiles.length} jar files to process${COLOR_RESET}`);
    
    const stats = {
        moved: 0,
        failed: 0,
        skipped: 0
    };
    
    for (const jarFile of jarFiles) {
        const jarPath = path.join(OLD_MODS_DIR, jarFile);
        
        // Try to get version from manifest first
        let version = getMinecraftVersionFromJar(jarPath);
        
        // If manifest didn't work, try filename patterns
        if (!version) {
            version = guessVersionFromFilename(jarFile);
        }
        
        if (version) {
            const versionDir = path.join(OLD_MODS_DIR, version);
            const targetPath = path.join(versionDir, jarFile);
            
            // Check if target already exists
            if (fs.existsSync(targetPath)) {
                console.log(`${COLOR_YELLOW}Skipped ${jarFile} (already exists in ${version}/)${COLOR_RESET}`);
                stats.skipped++;
                continue;
            }
            
            try {
                ensureDir(versionDir);
                fs.renameSync(jarPath, targetPath);
                console.log(`${COLOR_GREEN}Moved ${jarFile} → ${version}/${COLOR_RESET}`);
                stats.moved++;
            } catch (error) {
                console.log(`${COLOR_RED}Failed to move ${jarFile}: ${error.message}${COLOR_RESET}`);
                stats.failed++;
            }
        } else {
            console.log(`${COLOR_YELLOW}Could not determine version for ${jarFile} (leaving in place)${COLOR_RESET}`);
            stats.failed++;
        }
    }
    
    console.log(`\n${COLOR_CYAN}Summary:${COLOR_RESET}`);
    console.log(`${COLOR_GREEN}Moved: ${stats.moved}${COLOR_RESET}`);
    console.log(`${COLOR_YELLOW}Skipped: ${stats.skipped}${COLOR_RESET}`);
    console.log(`${COLOR_RED}Failed: ${stats.failed}${COLOR_RESET}`);
}

// Run the script if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    sortModsByVersion();
}

export { sortModsByVersion, getMinecraftVersionFromJar };