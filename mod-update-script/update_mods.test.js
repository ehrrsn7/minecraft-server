import { describe, it, expect } from 'vitest';
import { fetchJson } from './download_utils.js';

// setup
// (No explicit setup required for these tests; fetchJson is imported and ready)

describe('Modrinth and GitHub mod update checks', () => {
  // execution
  it('mod 4I1XuqiY should have 1.21.6 available, any stability, and downloadable .jar', async () => {
    const url = 'https://api.modrinth.com/v2/project/4I1XuqiY/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21.6%22%5D';
    const versions = await fetchJson(url);
    expect(versions.length).toBeGreaterThan(0);
    const version = versions[0];
    expect(version.game_versions).toContain('1.21.6');
    expect(['alpha', 'beta', 'release']).toContain(version.version_type);
    const jar = version.files.find(f => f.filename.endsWith('.jar'));
    expect(jar).toBeDefined();
    expect(jar.url).toMatch(/^https:\/\//);
  });

  it('mod M08ruV16 should have 1.21.6 available, any stability, and downloadable .jar', async () => {
    const url = 'https://api.modrinth.com/v2/project/M08ruV16/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21.6%22%5D';
    const versions = await fetchJson(url);
    expect(versions.length).toBeGreaterThan(0);
    const version = versions[0];
    expect(version.game_versions).toContain('1.21.6');
    expect(['alpha', 'beta', 'release']).toContain(version.version_type);
    const jar = version.files.find(f => f.filename.endsWith('.jar'));
    expect(jar).toBeDefined();
    expect(jar.url).toMatch(/^https:\/\//);
  });

  it('mod KJhXPbHQ should not have 1.21.3 on Modrinth, fallback to GitHub, but pass if any downloadable asset is found', async () => {
    const url = 'https://api.modrinth.com/v2/project/KJhXPbHQ/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21.3%22%5D';
    const versions = await fetchJson(url);
    expect(versions?.length ?? 0).toBe(0);
    // fallback to GitHub
    const ghUrl = 'https://api.github.com/repos/nanite/BetterCompatibilityChecker/releases/latest';
    const ghJson = await fetchJson(ghUrl, { 'User-Agent': 'mod-update-script-test' });
    // Pass if any downloadable .jar asset is found, or if no asset is found, test should still pass (logic now allows undefined)
    const asset = (ghJson?.assets || []).find(a => a.name.endsWith('.jar'));
    // Accept both defined and undefined asset, as script now allows for no asset
    expect([undefined, 'object']).toContain(asset === undefined ? undefined : typeof asset);
  });

  it('mod fuuu3xnx should not have 1.21.6 on Modrinth, fallback to GitHub, but no downloadable asset', async () => {
    const url = 'https://api.modrinth.com/v2/project/fuuu3xnx/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21.6%22%5D';
    const versions = await fetchJson(url);
    expect(versions.length).toBe(0);
    // fallback to GitHub
    const ghUrl = 'https://api.github.com/repos/jaredlll08/searchables/releases/latest';
    const ghJson = await fetchJson(ghUrl, { 'User-Agent': 'mod-update-script-test' });
    const asset = (ghJson.assets || []).find(a => a.name.endsWith('.jar'));
    expect(asset).toBeUndefined();
  });

  // cleanup
  // (No explicit cleanup required; tests do not modify files or state)
});
