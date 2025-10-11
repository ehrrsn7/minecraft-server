// === Archive Utilities ===
import fs from 'fs';
import path from 'path';

/**
 * Archives all .jar files in the mods/ directory to the .old directory.
 * Use this to clear the mods folder before a batch update.
 */
export function archiveExistingMods() {
  const MODS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../mods');
  const OLD_DIR = path.join(MODS_DIR, '.old');
  fs.readdirSync(MODS_DIR).forEach(f => {
    if (f.endsWith('.jar')) {
      fs.renameSync(path.join(MODS_DIR, f), path.join(OLD_DIR, f));
    }
  });
}

/**
 * Archives old mod .jar files by moving them to the .old directory.
 * Uses fuzzy matching to determine if a file is an old version of the new mod file if checkSimilarity is true.
 * @param {string} modId - The mod ID (unused, kept for compatibility).
 * @param {string} newFileName - The new file name to keep in mods/.
 * @param {boolean} [checkSimilarity=false] - If true, use similarity check; if false, archive all except new file.
 */
export function archiveExistingModFiles(newFileName) {
  const MODS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../mods');
  const OLD_DIR = path.join(MODS_DIR, '.old');
  const threshold = 0.6; // 60% similarity

  function similarity(a, b) {
    // Simple similarity: ratio of longest common substring to average length
    function lcs(x, y) {
      const m = x.length, n = y.length;
      const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
      let maxLen = 0;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (x[i - 1] === y[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
            if (dp[i][j] > maxLen) maxLen = dp[i][j];
          }
        }
      }
      return maxLen;
    }
    const lcsLen = lcs(a, b);
    return lcsLen / ((a.length + b.length) / 2);
  }

  fs.readdirSync(MODS_DIR).forEach(f => {
    if (f.endsWith('.jar') && f !== newFileName) {
      if (checkSimilarity) {
        const sim = similarity(f, newFileName);
        if (sim >= threshold) {
          fs.renameSync(path.join(MODS_DIR, f), path.join(OLD_DIR, f));
        }
      } else {
        fs.renameSync(path.join(MODS_DIR, f), path.join(OLD_DIR, f));
      }
    }
  });
}

/**
 * Lists all .jar files in the .old archive directory.
 * @returns {string[]} Array of .jar filenames in .old/
 */
export function listArchivedFiles() {
  const OLD_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../mods/.old');
  if (!fs.existsSync(OLD_DIR)) return [];
  return fs.readdirSync(OLD_DIR).filter(f => f.endsWith('.jar'));
}

/**
 * Checks if a given mod version is already archived.
 * @param {string} modId
 * @param {string} version
 * @returns {boolean}
 */
export function isArchived(modId, version) {
  const OLD_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../mods/.old');
  if (!fs.existsSync(OLD_DIR)) return false;
  const files = fs.readdirSync(OLD_DIR);
  return files.some(f => f.startsWith(modId + '-') && f.includes(version) && f.endsWith('.jar'));
}
