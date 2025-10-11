#!/usr/bin/env node

/**
 * Script to list the latest versions of all mods in mods_config.json using the Modrinth API
 * 
 * Usage:
 *   node list_latest_versions.js [--mc-version=1.21.8] [--format=table|json|csv] [--filter=MR|GH|GL]
 * 
 * Options:
 *   --mc-version=X.Y.Z   Minecraft version to check against (default: 1.21.8)
 *   --format=FORMAT      Output format: table (default), json, or csv
 *   --filter=SOURCE      Filter by source: MR (Modrinth), GH (GitHub), GL (GitLab), or ALL (default)
 *   --help, -h           Show this help message
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getModrinthVersionInfo, getGithubReleaseInfo, getGitlabReleaseInfo } from './mod_api_utils.js';

// === Constants ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'mods_config.json');
const DEFAULT_MC_VERSION = '1.21.8';

// Color constants for pretty output
const COLOR_GREEN = '\x1b[32m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_BLUE = '\x1b[34m';
const COLOR_MAGENTA = '\x1b[35m';
const COLOR_BOLD = '\x1b[1m';
const COLOR_RESET = '\x1b[0m';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  const flags = {
    help: args.includes('--help') || args.includes('-h'),
    mcVersion: (() => {
      const flag = args.find(a => a.startsWith('--mc-version='));
      return flag ? flag.split('=')[1] : DEFAULT_MC_VERSION;
    })(),
    format: (() => {
      const flag = args.find(a => a.startsWith('--format='));
      const format = flag ? flag.split('=')[1].toLowerCase() : 'table';
      return ['table', 'json', 'csv'].includes(format) ? format : 'table';
    })(),
    filter: (() => {
      const flag = args.find(a => a.startsWith('--filter='));
      const filter = flag ? flag.split('=')[1].toUpperCase() : 'ALL';
      return ['MR', 'GH', 'GL', 'ALL'].includes(filter) ? filter : 'ALL';
    })()
  };
  
  return flags;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
${COLOR_BOLD}Minecraft Mod Latest Versions Checker${COLOR_RESET}

${COLOR_BOLD}Usage:${COLOR_RESET}
  node list_latest_versions.js [options]

${COLOR_BOLD}Options:${COLOR_RESET}
  --mc-version=X.Y.Z   Minecraft version to check against (default: ${DEFAULT_MC_VERSION})
  --format=FORMAT      Output format: table (default), json, or csv
  --filter=SOURCE      Filter by source: MR (Modrinth), GH (GitHub), GL (GitLab), or ALL (default)
  --help, -h           Show this help message

${COLOR_BOLD}Examples:${COLOR_RESET}
  node list_latest_versions.js
  node list_latest_versions.js --mc-version=1.21.6 --format=json
  node list_latest_versions.js --filter=MR --format=csv
  node list_latest_versions.js --format=table --filter=GH
`);
}

/**
 * Fetch version info for a single mod
 */
async function fetchModVersionInfo(mod, mcVersion) {
  let versionInfo = {
    id: mod.id,
    name: mod.name,
    source: mod.source,
    slug: mod.slug || '',
    current_version: mod.latest_version || 'Unknown',
    current_stability: mod.latest_stability || 'Unknown',
    latest_version: null,
    latest_stability: null,
    update_available: false,
    error: null
  };

  try {
    if (mod.source === 'MR' || mod.source === 'MODRINTH') {
      const modrinthInfo = await getModrinthVersionInfo(mod.id, mcVersion);
      if (modrinthInfo.found) {
        versionInfo.latest_version = modrinthInfo.latest_version;
        versionInfo.latest_stability = modrinthInfo.latest_stability;
        versionInfo.update_available = modrinthInfo.latest_version !== mod.latest_version;
      } else {
        versionInfo.error = 'No compatible version found';
      }
    } else if (mod.source === 'GH' || mod.source === 'GITHUB') {
      if (mod.fallback_repo) {
        const githubInfo = await getGithubReleaseInfo(mod.fallback_repo);
        if (githubInfo && githubInfo.tag_name) {
          versionInfo.latest_version = githubInfo.tag_name;
          versionInfo.latest_stability = githubInfo.prerelease ? 'beta' : 'release';
          versionInfo.update_available = versionInfo.latest_version !== mod.latest_version;
        } else {
          versionInfo.error = 'No GitHub release found';
        }
      } else {
        versionInfo.error = 'No GitHub repo URL available';
      }
    } else if (mod.source === 'GL' || mod.source === 'GITLAB') {
      if (mod.fallback_repo) {
        const gitlabInfo = await getGitlabReleaseInfo(mod.fallback_repo);
        if (gitlabInfo && gitlabInfo.tag_name) {
          versionInfo.latest_version = gitlabInfo.tag_name;
          versionInfo.latest_stability = gitlabInfo.prerelease ? 'beta' : 'release';
          versionInfo.update_available = versionInfo.latest_version !== mod.latest_version;
        } else {
          versionInfo.error = 'No GitLab release found';
        }
      } else {
        versionInfo.error = 'No GitLab repo URL available';
      }
    } else {
      versionInfo.error = `Unsupported source: ${mod.source}`;
    }
  } catch (error) {
    versionInfo.error = error.message;
  }

  return versionInfo;
}

/**
 * Format output as a table
 */
function formatAsTable(modVersions) {
  console.log(`\n${COLOR_BOLD}${COLOR_CYAN}Mod Version Status Report${COLOR_RESET}`);
  console.log(`${COLOR_BOLD}${'─'.repeat(120)}${COLOR_RESET}`);
  
  // Header
  const header = `${COLOR_BOLD}${'Name'.padEnd(35)} ${'Source'.padEnd(8)} ${'Current'.padEnd(20)} ${'Latest'.padEnd(20)} ${'Status'.padEnd(15)} ${'Error'.padEnd(20)}${COLOR_RESET}`;
  console.log(header);
  console.log(`${COLOR_BOLD}${'─'.repeat(120)}${COLOR_RESET}`);
  
  // Rows
  modVersions.forEach(mod => {
    const name = (mod.name || 'Unknown').substring(0, 34).padEnd(35);
    const source = (mod.source || '').padEnd(8);
    const current = (mod.current_version || 'Unknown').substring(0, 19).padEnd(20);
    const latest = (mod.latest_version || 'Unknown').substring(0, 19).padEnd(20);
    
    let status, statusColor;
    if (mod.error) {
      status = 'ERROR';
      statusColor = COLOR_RED;
    } else if (mod.update_available) {
      status = 'UPDATE AVAILABLE';
      statusColor = COLOR_YELLOW;
    } else {
      status = 'UP TO DATE';
      statusColor = COLOR_GREEN;
    }
    
    const statusFormatted = `${statusColor}${status.padEnd(15)}${COLOR_RESET}`;
    const error = (mod.error || '').substring(0, 19).padEnd(20);
    
    console.log(`${name} ${source} ${current} ${latest} ${statusFormatted} ${error}`);
  });
  
  console.log(`${COLOR_BOLD}${'─'.repeat(120)}${COLOR_RESET}`);
  
  // Summary
  const total = modVersions.length;
  const errors = modVersions.filter(m => m.error).length;
  const updates = modVersions.filter(m => m.update_available && !m.error).length;
  const upToDate = total - errors - updates;
  
  console.log(`\n${COLOR_BOLD}Summary:${COLOR_RESET}`);
  console.log(`  Total mods: ${COLOR_CYAN}${total}${COLOR_RESET}`);
  console.log(`  Up to date: ${COLOR_GREEN}${upToDate}${COLOR_RESET}`);
  console.log(`  Updates available: ${COLOR_YELLOW}${updates}${COLOR_RESET}`);
  console.log(`  Errors: ${COLOR_RED}${errors}${COLOR_RESET}\n`);
}

/**
 * Format output as JSON
 */
function formatAsJson(modVersions) {
  const summary = {
    total: modVersions.length,
    upToDate: modVersions.filter(m => !m.update_available && !m.error).length,
    updatesAvailable: modVersions.filter(m => m.update_available && !m.error).length,
    errors: modVersions.filter(m => m.error).length
  };
  
  const output = {
    summary,
    mods: modVersions
  };
  
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Format output as CSV
 */
function formatAsCsv(modVersions) {
  console.log('Name,ID,Source,Slug,Current Version,Current Stability,Latest Version,Latest Stability,Update Available,Error');
  
  modVersions.forEach(mod => {
    const row = [
      `"${(mod.name || '').replace(/"/g, '""')}"`,
      `"${(mod.id || '').replace(/"/g, '""')}"`,
      `"${(mod.source || '').replace(/"/g, '""')}"`,
      `"${(mod.slug || '').replace(/"/g, '""')}"`,
      `"${(mod.current_version || '').replace(/"/g, '""')}"`,
      `"${(mod.current_stability || '').replace(/"/g, '""')}"`,
      `"${(mod.latest_version || '').replace(/"/g, '""')}"`,
      `"${(mod.latest_stability || '').replace(/"/g, '""')}"`,
      mod.update_available ? 'true' : 'false',
      `"${(mod.error || '').replace(/"/g, '""')}"`
    ];
    console.log(row.join(','));
  });
}

/**
 * Main function
 */
async function main() {
  const flags = parseArgs();
  
  if (flags.help) {
    printUsage();
    process.exit(0);
  }
  
  // Check if config file exists
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(`${COLOR_RED}Error: Config file not found at ${CONFIG_FILE}${COLOR_RESET}`);
    process.exit(1);
  }
  
  // Load configuration
  let config;
  try {
    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(configContent);
  } catch (error) {
    console.error(`${COLOR_RED}Error reading config file: ${error.message}${COLOR_RESET}`);
    process.exit(1);
  }
  
  if (!config.mods || !Array.isArray(config.mods)) {
    console.error(`${COLOR_RED}Error: Invalid config file format. Expected 'mods' array.${COLOR_RESET}`);
    process.exit(1);
  }
  
  // Filter mods by source if specified
  let modsToCheck = config.mods;
  if (flags.filter !== 'ALL') {
    modsToCheck = config.mods.filter(mod => {
      const source = (mod.source || '').toUpperCase();
      return source === flags.filter || 
             (flags.filter === 'MR' && source === 'MODRINTH') ||
             (flags.filter === 'GH' && source === 'GITHUB') ||
             (flags.filter === 'GL' && source === 'GITLAB');
    });
  }
  
  if (modsToCheck.length === 0) {
    console.log(`${COLOR_YELLOW}No mods found matching the specified criteria.${COLOR_RESET}`);
    process.exit(0);
  }
  
  // Show progress for table format
  if (flags.format === 'table') {
    console.log(`${COLOR_CYAN}Checking ${modsToCheck.length} mods for Minecraft ${flags.mcVersion}...${COLOR_RESET}`);
    console.log(`${COLOR_CYAN}This may take a few moments...${COLOR_RESET}`);
  }
  
  // Fetch version info for all mods (with some parallelism but not too much to avoid rate limiting)
  const modVersions = [];
  const batchSize = 5; // Process 5 mods at a time to avoid overwhelming APIs
  
  for (let i = 0; i < modsToCheck.length; i += batchSize) {
    const batch = modsToCheck.slice(i, i + batchSize);
    const batchPromises = batch.map(mod => fetchModVersionInfo(mod, flags.mcVersion));
    const batchResults = await Promise.all(batchPromises);
    modVersions.push(...batchResults);
    
    // Show progress for table format
    if (flags.format === 'table') {
      const progress = Math.min(i + batchSize, modsToCheck.length);
      process.stderr.write(`\r${COLOR_CYAN}Progress: ${progress}/${modsToCheck.length}${COLOR_RESET}`);
    }
  }
  
  if (flags.format === 'table') {
    process.stderr.write('\r' + ' '.repeat(30) + '\r'); // Clear progress line
  }
  
  // Format and display results
  switch (flags.format) {
    case 'json':
      formatAsJson(modVersions);
      break;
    case 'csv':
      formatAsCsv(modVersions);
      break;
    case 'table':
    default:
      formatAsTable(modVersions);
      break;
  }
}

// Run the script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`${COLOR_RED}Fatal error: ${error.message}${COLOR_RESET}`);
    process.exit(1);
  });
}

export { main, fetchModVersionInfo, parseArgs };
