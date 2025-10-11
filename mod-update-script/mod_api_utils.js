// === Modrinth and GitHub API Utilities ===
import { fetchJson } from './download_utils.js';
import { isArchived } from './archive_check.js';

const MC_VERSION = '1.21.9';

/**
 * Fetches the latest Modrinth version info for a mod, and its slug, project name, and source_url.
 * @param {string} id - The Modrinth project ID.
 * @param {string} mcVersion - The Minecraft version string.
 * @returns {Promise<object>} Modrinth version info, including slug, project_name, source_url, and found flag.
 */
export async function getModrinthVersionInfo(id, mcVersion) {
  const url = `https://api.modrinth.com/v2/project/${id}/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%22${mcVersion}%22%5D`;
  const versions = await fetchJson(url);
  let slug = '';
  let project_name = '';
  let source_url = '';
  try {
    const projectInfo = await fetchJson(`https://api.modrinth.com/v2/project/${id}`);
    slug = projectInfo.slug || '';
    project_name = projectInfo.title || '';
    source_url = projectInfo.source_url || projectInfo.repository || '';
  } catch {}
  if (Array.isArray(versions) && versions.length > 0) {
    const versionObj = versions[0];
    const files = versionObj.files.filter(f => f.filename.endsWith('.jar'));
    if (files.length > 0) {
      return {
        file_url: files[0].url,
        file_name: files[0].filename,
        latest_version: versionObj.version_number,
        latest_stability: versionObj.version_type,
        slug,
        project_name,
        source_url,
        found: true
      };
    }
  }
  return { found: false, slug, project_name, source_url };
}

/**
 * Fetches the latest GitHub release info for a repo.
 * @param {string} repo - The GitHub repository URL.
 * @returns {Promise<object|null>} GitHub release object formatted like Modrinth response or null
 */
export async function getGithubReleaseInfo(repo) {
  if (!repo) {
    // Handle missing repo gracefully
    return null;
  }
  const api_url = repo.replace('github.com', 'api.github.com/repos') + '/releases/latest';
  try {
    const release = await fetchJson(api_url, { 'User-Agent': 'mod-update-script' });
    if (release && release.assets && release.assets.length > 0) {
      // Find the first .jar asset
      const jarAsset = release.assets.find(asset => asset.name.endsWith('.jar'));
      if (jarAsset) {
        return {
          file_url: jarAsset.browser_download_url,
          file_name: jarAsset.name,
          latest_version: release.tag_name,
          latest_stability: release.prerelease ? 'beta' : 'release',
          found: true
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// === GitLab Release Info Fetching ===
/**
 * Fetches the latest release asset (jar) from a GitLab repo URL.
 * Supports both releases and latest tag with assets.
 * @param {string} repoUrl - The GitLab repo URL (e.g. https://gitlab.com/user/repo)
 * @returns {Promise<object|null>} - { tag_name, prerelease, assets: [{ name, url }] } or null
 */
export async function getGitlabReleaseInfo(repoUrl) {
  try {
    // Extract namespace/project from URL
    const match = repoUrl.match(/gitlab.com\/(.+?)(?:\.git)?$/);
    if (!match) console.log("null");
    if (!match) return null;
    const projectPath = encodeURIComponent(match[1]);
    const fetch = (await import('node-fetch')).default;
    // Try releases first
    let res = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/releases`);
    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases) && releases.length > 0) {
        const rel = releases[0];
        // Find .jar asset
        const asset = (rel.assets && rel.assets.links) ? rel.assets.links.find(a => a.name.endsWith('.jar') || a.url.endsWith('.jar')) : null;
        if (asset) {
          return {
            tag_name: rel.tag_name,
            prerelease: false, // GitLab doesn't have prerelease flag
            assets: [{ name: asset.name, browser_download_url: asset.url }]
          };
        }
      }
      // If releases is an array but empty or no asset found, continue to tags fallback
    }
    // Fallback: try tags with assets
    res = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}/repository/tags`);
    if (res.ok) {
      const tags = await res.json();
      for (const tag of tags) {
        let links = undefined;
        if (tag.release && tag.release.assets && tag.release.assets.links) {
          links = tag.release.assets.links;
        } else if (tag.assets && tag.assets.links) {
          links = tag.assets.links;
        }
        if (links) {
          const asset = links.find(a =>
            a && typeof a.name === 'string' && typeof a.url === 'string' &&
            (a.name.endsWith('.jar') || a.url.endsWith('.jar'))
          );
          if (asset && typeof tag.name === 'string' && tag.name.length > 0) {
            return {
              tag_name: tag.name,
              prerelease: false,
              assets: [{ name: asset.name, browser_download_url: asset.url }]
            };
          }
        }
      }
    }
    return null;
  } catch (err) {
    // Print error in red
    console.error(`\x1b[31m[GitLab] Error fetching release info: ${err.message}\x1b[0m`);
    return null;
  }
}

/**
 * Default implementation for getting the latest GitHub release info.
 * @param {string} repo
 * @returns {Promise<object|null>}
 */
export async function defaultGetGithubReleaseInfo(repo) {
  return getGithubReleaseInfo(repo);
}

/**
 * Default implementation for checking if a mod version is archived.
 * @param {string} id
 * @param {string} version
 * @returns {boolean}
 */
export function defaultIsArchived(id, version) {
  return isArchived(id, version);
}

/**
 * Default implementation for getting the latest Modrinth version info.
 * @param {string} id
 * @param {string} mcVersion
 * @returns {Promise<object>}
 */
export async function defaultGetModrinthVersionInfo(id, mcVersion) {
  return getModrinthVersionInfo(id, mcVersion);
}
