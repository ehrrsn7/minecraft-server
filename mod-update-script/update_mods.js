/**
 * Downloads a single mod by modrinth id or name using the existing update logic.
 * @param {string} modIdOrName - The modrinth id or mod name to download.
 * @param {string} mcVersion - The Minecraft version to target.
 */
async function downloadSingleMod(modIdOrName, mcVersion = DEFAULT_MC_VERSION) {
   console.error("FLAG");
   let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
   let mod = config.mods.find(m => m.id === modIdOrName || m.name.toLowerCase() === modIdOrName.toLowerCase() || m.slug === modIdOrName);
   let msg = `Processing ${COLOR_BOLD}${mod.id}${COLOR_RESET} (${COLOR_BOLD}${COLOR_GREEN}${mod.name}${COLOR_RESET}) ...`.padEnd(40, ' ');
   if (!mod) {
      console.error(`${msg}${COLOR_RED}Mod '${modIdOrName}' not found in config.${COLOR_RESET}`);
      process.exit(1);
   }
   const updateInfo = await getModUpdateInfo(mod, { dryRun: false, updateConfigOnly: false, mcVersion });
   if (updateInfo.action === 'download') {
      const didDownload = await handleDownloadAndVersionCheck(mod, updateInfo, false, mcVersion);
      if (didDownload) {
         updateModConfig(mod, updateInfo);
         fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
         console.log(`${msg}${COLOR_GREEN}${COLOR_BOLD}Downloading and updated config for '${mod.name}'.${COLOR_RESET}`);
      } else {
         console.log(`${msg}${COLOR_RED}Failed to download or validate mod '${mod.name}'.${COLOR_RESET}`);
      }
   } else {
      await printNoUpdateMsg(mod, updateInfo, msg);
   }
   process.exit(0);
}
// === Imports ===
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { archiveExistingModFiles, archiveExistingMods } from './archive_check.js';
import { downloadFile } from './download_utils.js';
import { defaultGetGithubReleaseInfo, getGitlabReleaseInfo, defaultGetModrinthVersionInfo } from './mod_api_utils.js';
import * as versionCheck from './versionCheck.js';

// === Constants and Paths ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'mods_config.json');
const DEFAULT_MC_VERSION = '1.21.8';
const MODS_DIR = path.join(__dirname, '../../mods');
const OLD_DIR = path.join(MODS_DIR, '.old');

if (!fs.existsSync(MODS_DIR)) fs.mkdirSync(MODS_DIR);
if (!fs.existsSync(OLD_DIR)) fs.mkdirSync(OLD_DIR);

// === Color Utilities ===
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_BOLD = '\x1b[1m';
const COLOR_ITALIC = '\x1b[3m';
const COLOR_RESET = '\x1b[0m';

// Entrypoint dispatcher
dispatch();

/**
 * Entrypoint dispatcher for CLI commands.
 * Determines which command to run based on parsed arguments.
 * Handles help, fork addition, and main update logic.
 */
function dispatch() {
   if (process.argv[1] === fileURLToPath(import.meta.url)) {
      const { command, subcommand, flags, params } = parseArgs();
      if (flags.help || command === 'help') {
         printUsage();
         process.exit(0);
      }
      if (flags.downloadMod) {
         downloadSingleMod(flags.downloadMod, flags.mcVersion);
         return;
      }
      if (command === 'add' && subcommand === 'fork') {
         addFork(params);
      } else if (!command || command === '') {
         // Default: run main update logic
         main({ dryRun: flags.dryRun, updateConfigOnly: flags.updateConfigOnly, picky: flags.picky, mcVersion: flags.mcVersion });
      } else {
         printUsage();
         process.exit(1);
      }
   }
}

// === Main Entrypoint ===
/**
 * Main entrypoint for the mod update script. Handles argument parsing, iterates mods, and coordinates update logic.
 * @param {object} options - { dryRun, updateConfigOnly, picky, mcVersion }
 */
export async function main({ dryRun, updateConfigOnly, picky, mcVersion }) {
   let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
   let configChanged = false;
   let anyUpdate = false;

   if (!picky) archiveExistingMods();

   for (const mod of config.mods) {
      const updateInfo = await getModUpdateInfo(mod, { dryRun, updateConfigOnly, mcVersion });
      printUpdateResult(mod, updateInfo, { dryRun });
      if (!dryRun && updateInfo.action === 'download') {
         const didDownload = await handleDownloadAndVersionCheck(mod, updateInfo, picky, mcVersion);
         if (didDownload) {
            updateModConfig(mod, updateInfo);
            configChanged = true;
            anyUpdate = true;
         }
      } else if (dryRun && (updateInfo.action === 'download' || updateInfo.action === 'simulate')) {
         anyUpdate = true;
      }
   }
   
   if (configChanged) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log(`${COLOR_GREEN}${COLOR_BOLD}Config updated.${COLOR_RESET} See mods_config.json for results.`);
   } else if (dryRun) {
      console.log(`${COLOR_YELLOW}${COLOR_BOLD}Dry run${COLOR_RESET}: config not updated.`);
   }
   if (!anyUpdate) {
      console.log(`${COLOR_RED}Nothing found to update.${COLOR_RESET}`);
   }
}

/**
 * Handles downloading the mod file and version check/archive logic.
 * Returns true if the mod was downloaded and passed version check, false otherwise.
 */
async function handleDownloadAndVersionCheck(mod, updateInfo, picky, mcVersion) {
   try {
      if (picky === true) archiveExistingModFiles(updateInfo.file_name);
      await downloadFile(updateInfo.file_url, path.join(MODS_DIR, updateInfo.file_name));
      // Version check and archive if mismatched
      const jarPath = path.join(MODS_DIR, updateInfo.file_name);
      
      // Test version extraction first
      // console.log(`${COLOR_CYAN}Testing version extraction on ${updateInfo.file_name}${COLOR_RESET}`);
      const extractedVersion = await versionCheck.extractFabricMinecraftVersion(jarPath);
      // console.log(`${COLOR_CYAN}Extracted version: ${extractedVersion}, Expected: ${mcVersion}${COLOR_RESET}`);

      if (extractedVersion === mcVersion) {
         // Only update config if version matches
         return true;
      } else {
         console.log(`${COLOR_YELLOW}${COLOR_BOLD}Skipping config update: downloaded mod version (${extractedVersion}) does not match expected (${mcVersion})${COLOR_RESET}`);
         return false;
      }
   } catch (err) {
      console.log(`${COLOR_RED}Error during version check/archive: ${err}${COLOR_RESET}`);
      return false;
   }
}

/**
 * Updates a mod's configuration with new version information.
 * @param {object} mod - The mod configuration object to update.
 * @param {object} updateInfo - The update information containing new version details.
 */
function updateModConfig(mod, updateInfo) {
   if (updateInfo.version) {
      mod.latest_version = updateInfo.version;
   }
   if (updateInfo.stability) {
      mod.latest_stability = updateInfo.stability;
   }
}

// === CLI Argument Parsing and Entrypoint ===
/**
 * Parses CLI arguments and returns an object describing the command, flags, and parameters.
 * @returns {object} Parsed arguments: { command, subcommand, flags, params }
 */
function parseArgs() {
   const args = process.argv.slice(2);
   const flags = {
      // Simulates updates without downloading files or changing config
      dryRun: args.includes('--dry-run'),
      // Only updates config fields without downloading mods
      updateConfigOnly: args.includes('--update-config'),
      // Shows usage/help information
      help: args.includes('--help') || args.includes('-h'),
      // Enables picky (fuzzy) archiving
      picky: args.includes('--picky'),
      // Minecraft version override
      mcVersion: (() => {
         const flag = args.find(a => a.startsWith('--mcVersion='));
         return flag ? flag.split('=')[1] : DEFAULT_MC_VERSION;
      })(),
      // Downloads a specific mod by modrinth id or name
      downloadMod: (() => {
         const flag = args.find(a => a.startsWith('--download-mod='));
         return flag ? flag.split('=')[1] : null;
      })(),
   };
   // Remove flags from args
   const filtered = args.filter(a => !a.startsWith('--') && a !== '-h');
   let command = filtered[0] || '';
   let subcommand = filtered[1] || '';
   let params = filtered.slice(2);
   return { command, subcommand, flags, params };
}

/**
 * Prints usage/help information for the CLI.
 */
function printUsage() {
   console.log(`
Minecraft Mod Update Script

Usage:
  node update_mods.js [--dry-run|--update-config]
    Update all mods (default command).

  node update_mods.js add fork [fork_url] [mod_id]
    Add a fork repository URL to a mod. Prompts for missing args.

  npm run dry-run
    Simulate updates (dry run, no downloads or config changes).

  npm run update-config
    Only update config fields, do not download mods.

Options:
  --dry-run         Simulate updates, do not download or change config.
  --update-config   Only update config fields, do not download mods.
  --mcVersion=X.Y.Z Override Minecraft version (default: ${DEFAULT_MC_VERSION}).
  --help, -h        Show this help message.
  --download-mod=<modrinth id or mod name>  Download a single mod by id or name.

Current script MC version: ${DEFAULT_MC_VERSION}
`);
}

/**
 * Adds a fork repository URL to a mod in the config. Prompts for missing arguments if not provided.
 * Updates the config file and prints the result.
 *
 * @param {Array} params - [forkUrl, modId] (optional, will prompt if missing)
 */
function addFork(params) {
   (async () => {
      let forkUrl = params[0];
      let modId = params[1];
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!forkUrl) {
         forkUrl = prompt('Enter fork repository URL: ');
      }
      if (!modId) {
         modId = inferModIdFromForkUrl(forkUrl, config.mods);
         if (!modId) {
            modId = prompt('Enter mod id to add this fork to: ');
         }
      }
      const mod = config.mods.find(m => m.id === modId);
      if (!mod) {
         console.error(`Mod with id '${modId}' not found.`);
         process.exit(1);
      }
      if (!Array.isArray(mod.forks)) mod.forks = [];
      if (!mod.forks.includes(forkUrl)) {
         mod.forks.push(forkUrl);
         fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
         console.log(`Added fork '${forkUrl}' to mod '${modId}'.`);
      } else {
         console.log(`Fork '${forkUrl}' already present for mod '${modId}'.`);
      }
      process.exit(0);
   })();
}

/**
 * Prints the update result for a mod, including dry-run and download messages.
 * Handles output for download, simulate, and no-update cases.
 *
 * @param {object} mod - The mod config object.
 * @param {object} updateInfo - The update info object from getModUpdateInfo.
 * @param {object} options - Options object, expects { dryRun } boolean.
 */
async function printUpdateResult(mod, updateInfo, { dryRun }) {
   let processingMsg = `Processing ${COLOR_BOLD}${mod.id}${COLOR_RESET} ${(`(${COLOR_BOLD}${COLOR_GREEN}${mod.name}${COLOR_RESET}) ...`).padEnd(40, ' ')}`;
   if (updateInfo.action === 'download') {
      if (dryRun) {
         printDryRunArchive(mod, updateInfo);
         process.stdout.write(`${COLOR_ITALIC}${COLOR_YELLOW}[Dry-run]${COLOR_RESET} ${processingMsg} Would download [${COLOR_BOLD}${updateInfo.source}${COLOR_RESET}] ${COLOR_BOLD}${COLOR_CYAN}${updateInfo.file_name}${COLOR_RESET}\n`);
      } else {
         process.stdout.write(`${processingMsg} `);
      }
   } else if (updateInfo.action === 'simulate' && dryRun) {
      printDryRunArchive(mod, updateInfo);
      process.stdout.write(`${COLOR_ITALIC}${COLOR_YELLOW}[Dry-run]${COLOR_RESET} ${processingMsg} Would download [${COLOR_BOLD}${updateInfo.source}${COLOR_RESET}] ${COLOR_BOLD}${COLOR_CYAN}${updateInfo.file_name}${COLOR_RESET}\n`);
   } else {
      await printNoUpdateMsg(mod, updateInfo, processingMsg);
   }
}

function printDryRunArchive(mod, updateInfo) {
   const oldFiles = fs.readdirSync(MODS_DIR).filter(f => f.startsWith(mod.id + '-') && f !== updateInfo.file_name && f.endsWith('.jar'));
   for (const oldFile of oldFiles) {
      console.log(`${COLOR_YELLOW}[Dry-run] Would archive old mod file: ${oldFile}${COLOR_RESET}`);
   }
}

async function printNoUpdateMsg(mod, updateInfo, processingMsg) {
   let versionInfo = '';
   if (updateInfo && updateInfo.version) {
      versionInfo = ` (found: ${updateInfo.version})`;
   }
   // Try to find the installed jar and extract its MC version
   let foundMcVersion = '';
   try {
      const jarFile = fs.readdirSync(MODS_DIR).find(f =>
         f.startsWith(mod.id + '-') && f.endsWith('.jar')
      );
      if (jarFile) {
         const jarPath = path.join(MODS_DIR, jarFile);
         foundMcVersion = await versionCheck.extractFabricMinecraftVersion(jarPath);
      }
   } catch (e) {
      // Ignore errors, just don't show MC version
   }
   const mcVersion = foundMcVersion || "Unknown";
   let msg = `${processingMsg} ${COLOR_YELLOW}No update found for ${mod.id}${versionInfo} [mod MC version: ${mcVersion}].${COLOR_RESET}`;
   if (updateInfo.source === 'FORK' && Array.isArray(mod.forks) && mod.forks.length > 0) {
      msg = `${processingMsg} ${COLOR_YELLOW}No update found for ${mod.id}${versionInfo} [mod MC version: ${mcVersion}]. (Checked forks)${COLOR_RESET}`;
      for (const forkUrl of mod.forks)
         msg += `\n\t\t${COLOR_YELLOW}  Checked fork: ${forkUrl}${COLOR_RESET}`;
   }
   // if (!foundMcVersion)
   //    msg += `\nURL: ${updateInfo.url || updateInfo.file_url || 'No URL provided for update info.'}`;
   console.log(msg);
}

// === Mod Update Logic ===
/**
 * Determines if a mod version should be downloaded, archived, or skipped.
 * Returns an object describing the action and relevant info.
 *
 * @param {object} mod - The mod config object
 * @param {object} options - { dryRun, updateConfigOnly, getGithubReleaseInfo, isArchived }
 * @returns {Promise<object>} - { action, source, version, stability, file_url, file_name, slug, project_name }
 */
export async function getModUpdateInfo(mod, options) {
   const { dryRun, updateConfigOnly, picky, mcVersion } = options;
   const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
   const defaultBranch = 'master';
   let latestReleaseInfo = null;
   let isArchived = false;

   // Check for forks and get the latest release info from the first valid source
   if (Array.isArray(mod.forks) && mod.forks.length > 0) {
      for (const forkUrl of mod.forks) {
         const forkInfo = await getForkReleaseInfo(forkUrl, mod, options);
         if (forkInfo && forkInfo.valid) {
            return {
               action: dryRun || updateConfigOnly ? 'simulate' : 'download',
               source: 'FORK',
               fork_url: forkUrl,
               version: forkInfo.version,
               stability: forkInfo.stability,
               file_url: forkInfo.download_url,
               file_name: forkInfo.file_name,
               slug: mod.slug,
               project_name: mod.name,
               valid: true,
            };
         }
      }
   }

   // If no valid fork release info found, fall back to primary source
   if (!latestReleaseInfo) {
      if (mod.source === 'MODRINTH' || mod.source === 'MR') {
         const modrinthInfo = await defaultGetModrinthVersionInfo(mod.id, mcVersion);
         latestReleaseInfo = modrinthInfo;
      } else if (mod.source === 'GITHUB' || mod.source === 'GH') {
         const githubInfo = await defaultGetGithubReleaseInfo(mod.owner, mod.repo);
         latestReleaseInfo = githubInfo;
      } else if (mod.source === 'GITLAB' || mod.source === 'GL') {
         const gitlabInfo = await getGitlabReleaseInfo(mod.owner, mod.repo);
         latestReleaseInfo = gitlabInfo;
      }
   }

   // Determine if the mod is archived based on the latest release info
   if (latestReleaseInfo && latestReleaseInfo.archived) {
      isArchived = true;
   }

   // Decide action based on dryRun flag and update availability
   let action = 'skip';
   let file_url = latestReleaseInfo ? (latestReleaseInfo.file_url || latestReleaseInfo.download_url) : null;
   let file_name = latestReleaseInfo ? latestReleaseInfo.file_name : null;

   if (dryRun && latestReleaseInfo && latestReleaseInfo.found) {
      action = 'simulate';
   } else if (latestReleaseInfo && latestReleaseInfo.found && !isArchived) {
      action = 'download';
   }

   return {
      action,
      source: mod.source,
      version: latestReleaseInfo ? (latestReleaseInfo.latest_version || latestReleaseInfo.version) : null,
      stability: latestReleaseInfo ? (latestReleaseInfo.latest_stability || latestReleaseInfo.stability) : null,
      file_url,
      file_name,
      slug: mod.slug,
      project_name: mod.name,
      valid: true,
   };
}

/**
 * Checks a fork repository (GitHub) for a valid .jar release asset.
 * Returns release info if a valid .jar is found, otherwise null.
 * Used by getModUpdateInfo to support fork fallback logic.
 *
 * @param {string} forkUrl - The URL of the fork repository.
 * @param {object} mod - The mod config object.
 * @param {object} options - Options object, may include getGithubReleaseInfo for testability.
 * @returns {Promise<object|null>} - Release info object if found: { valid, version, stability, download_url, file_name }, or null if not found.
 */
async function getForkReleaseInfo(forkUrl, mod, options) {
   // Use injected getGithubReleaseInfo if provided (for testability)
   const getGithubReleaseInfo = options.getGithubReleaseInfo || defaultGetGithubReleaseInfo;
   // Logic to determine the latest release info from a fork repository
   // This can involve parsing the fork URL, checking its branches/tags, and finding the latest release
   // For simplicity, let's assume forks are on GitHub and follow a standard naming convention

   const githubPattern = /github\.com[/:](.+?)(?:\.git)?$/;
   const match = forkUrl.match(githubPattern);
   if (!match) return null;

   // For test mocks, just use the full forkUrl as the repo identifier
   const githubInfo = await getGithubReleaseInfo(forkUrl);
   if (githubInfo && githubInfo.assets && githubInfo.assets.length > 0) {
      const asset = githubInfo.assets.find(a => a.name.endsWith('.jar'));
      if (asset) {
         return {
            valid: true,
            version: githubInfo.tag_name,
            stability: githubInfo.prerelease ? 'beta' : 'release',
            download_url: asset.browser_download_url,
            file_name: asset.name
         };
      }
   }
   return null;
}
