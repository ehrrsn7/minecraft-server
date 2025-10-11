// test_fork_logic.test.js
import { describe, it, expect, vi } from 'vitest';

// Use fake forks for deterministic test
const forks = [
  'https://github.com/fake/fork1', // no release
  'https://github.com/fake/fork2', // has a .jar release
  'https://github.com/fake/fork3'  // has a .jar release
];

// Mock isArchived to always return false
vi.mock('./archive_check.js', () => ({
  isArchived: () => false
}));

// Mock getGithubReleaseInfo to simulate fork releases
const mockReleases = {
  'https://github.com/fake/fork1': null, // no release
  'https://github.com/fake/fork2': {
    tag_name: 'v2.0.0',
    prerelease: false,
    assets: [{ name: 'mod-fork2.jar', browser_download_url: 'https://example.com/fork2.jar' }]
  },
  'https://github.com/fake/fork3': {
    tag_name: 'v3.0.0',
    prerelease: false,
    assets: [{ name: 'mod-fork3.jar', browser_download_url: 'https://example.com/fork3.jar' }]
  }
};

vi.mock('./update_mods.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getGithubReleaseInfo: async (repo) => mockReleases[repo] || null
  };
});

describe('Fork update logic', () => {
  it('should pick the first fork with a valid .jar release', async () => {
    const { getModUpdateInfo } = await import('./update_mods.js');
    const mod = {
      id: 'testmod',
      forks
    };
    // Mock getModrinthVersionInfo to always return { found: false }
    const getModrinthVersionInfo = async () => ({ found: false });
    const info = await getModUpdateInfo(mod, {
      dryRun: true,
      updateConfigOnly: false,
      getGithubReleaseInfo: async (repo) => mockReleases[repo] || null,
      isArchived: () => false,
      getModrinthVersionInfo
    });
    expect(info.source).toBe('FORK');
    expect(info.fork_url).toBe('https://github.com/fake/fork2');
    expect(info.version).toBe('v2.0.0');
    expect(info.file_name).toBe('mod-fork2.jar');
  });
});