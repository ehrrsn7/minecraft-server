import fs from 'fs';
import AdmZip from 'adm-zip';

/**
 * TODO: REPLACE DOWNLOAD LOGIC IN MAIN FUNCTION WITH THESE FUNCTION CALLS
 */

export class InvalidMCVersionFormatError extends Error {
   constructor(message, cause) {
      super(message);
      this.name = 'InvalidMCVersionFormatError';
      if (cause) this.cause = cause;
   }
}

/**
 * Extracts the Fabric-Minecraft-Version from a mod .jar file.
 * @param {string} jarPath - Path to the .jar file.
 * @returns {Promise<string|null>} - The Minecraft version or null if not found.
 */
export async function extractFabricMinecraftVersion(jarPath) {
   try {
      for (const line of await extractManifestContentLines(jarPath)) {
         if (line.startsWith('Fabric-Minecraft-Version:')) {
            return parseFabricMinecraftVersionLine(line);
         }
      }
   } catch (error) {
      // If manifest content is empty or parsing fails, return null
      return null;
   }
}

/**
 * Reads and splits the MANIFEST.MF file from a .jar into lines.
 * @param {string} jarPath - Path to the .jar file.
 * @returns {Promise<string[]|null>} - Array of manifest lines, or null if not found.
 */
async function extractManifestContentLines(jarPath) {
   // open up jar file as zip and extract Manifest Entry content
   const zip = new AdmZip(jarPath);
   const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
   if (!manifestEntry) return null;
   return manifestEntry.getData().toString('utf-8').split('\n');
}

/**
 * Parses the Fabric-Minecraft-Version line to extract the version number.
 * @param {string} line - The line from the manifest file.
 * @returns {string} - The extracted Minecraft version.
 * @throws {InvalidMCVersionFormatError} - If the line is not in the expected format.
 */
function parseFabricMinecraftVersionLine(line) {
   try {
      // Extract the version using a regex pattern
      const versionPattern = /^Fabric-Minecraft-Version:\s*(\S+)/;
      const match = line.match(versionPattern);
      if (!match || !match[1]) {
         throw new InvalidMCVersionFormatError(
            `Version not found after 'Fabric-Minecraft-Version:' in line: ${line}`
         );
      }

      // Get the version and validate it
      const fullVersion = match[1].trim();
      
      // Extract just the base version (1.21.8 from 1.21.8-rc1)
      const baseVersionPattern = /^(1\.\d{1,2}\.\d{1,2})/;
      const baseMatch = fullVersion.match(baseVersionPattern);
      
      if (!baseMatch || !baseMatch[1]) {
         throw new InvalidMCVersionFormatError(
            `Invalid Minecraft version format: ${fullVersion}`
         );
      }
      
      const mcVersion = baseMatch[1];
      // console.log(`Parsed version: '${mcVersion}' from full version: '${fullVersion}'`);
      return mcVersion; // <-- Return the base version without suffixes
   } catch (error) {
      // Return null if InvalidMCVersionFormatError is thrown
      // or if parsing fails
      console.log(`Version parsing error: ${error.message}`);
      return null;
   }
}

/**
 * Validates a mod .jar's Minecraft version and archives if mismatched.
 * @param {string} jarPath - Path to the .jar file.
 * @param {string} targetVersion - The required Minecraft version.
 * @returns {Promise<{valid: boolean, archivedPath?: string, foundVersion?: string}>}
 */
export async function validateOrArchiveModVersion(jarPath, targetVersion) {
   const foundVersion = await extractFabricMinecraftVersion(jarPath);

   // Skip archival
   if (foundVersion === targetVersion) {
      return { valid: true, foundVersion };
   }

   // Find archive dir
   const path = jarPath.split('/');
   const modsDirIdx = path.lastIndexOf('mods');
   if (modsDirIdx === -1) throw new Error('mods directory not found in path');
   const modsDir = path.slice(0, modsDirIdx + 1).join('/');
   const oldDir = modsDir + '/.old';
   if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });

   // move to archive
   const fileName = path[path.length - 1];
   const archivedPath = `${oldDir}/${fileName}`;
   fs.renameSync(jarPath, archivedPath);
   return { valid: false, archivedPath, foundVersion };
}
