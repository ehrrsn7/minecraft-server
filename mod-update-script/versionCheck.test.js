import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractFabricMinecraftVersion, validateOrArchiveModVersion } from './versionCheck.js';
import AdmZip from 'adm-zip';

const TEST_DIR = './test_mods';
const MODS_DIR = path.join(TEST_DIR, 'mods');
const OLD_DIR = path.join(MODS_DIR, '.old');
const TEST_JAR = path.join(MODS_DIR, 'testmod.jar');

function createTestJar(mcVersion) {
  const zip = new AdmZip();
  const manifest = `Manifest-Version: 1.0\nFabric-Minecraft-Version: ${mcVersion}\n`;
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifest));
  zip.writeZip(TEST_JAR);
}

describe('versionCheck', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(MODS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('extracts the correct Minecraft version from a .jar', async () => {
    createTestJar('1.21.6');
    const version = await extractFabricMinecraftVersion(TEST_JAR);
    expect(version).toBe('1.21.6');
  });

  it('returns valid=true if version matches', async () => {
    createTestJar('1.21.6');
    const result = await validateOrArchiveModVersion(TEST_JAR, '1.21.6', 'testmod');
    expect(result.valid).toBe(true);
    expect(result.foundVersion).toBe('1.21.6');
    expect(fs.existsSync(TEST_JAR)).toBe(true);
  });

  it('archives the .jar and returns valid=false if version mismatches', async () => {
    createTestJar('1.20.1');
    const result = await validateOrArchiveModVersion(TEST_JAR, '1.21.6', 'testmod');
    expect(result.valid).toBe(false);
    expect(result.foundVersion).toBe('1.20.1');
    expect(fs.existsSync(path.join(OLD_DIR, 'testmod.jar'))).toBe(true);
    expect(fs.existsSync(TEST_JAR)).toBe(false);
  });
});
