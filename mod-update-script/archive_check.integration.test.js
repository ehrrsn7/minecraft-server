import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listArchivedFiles, isArchived } from './archive_check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OLD_DIR = path.join(__dirname, '../mods/.old');
const TEST_ARCHIVE = path.join(OLD_DIR, 'testmod-1.2.3.jar');

describe('archive_check integration', () => {
  it('isArchived should return true if modId and version are present', () => {
    if (!fs.existsSync(OLD_DIR)) fs.mkdirSync(OLD_DIR, { recursive: true });
    fs.writeFileSync(TEST_ARCHIVE, 'dummy');
    expect(isArchived('testmod', '1.2.3')).toBe(true);
    fs.unlinkSync(TEST_ARCHIVE);
  });

  it('isArchived should return false if modId or version are missing', () => {
    if (!fs.existsSync(OLD_DIR)) fs.mkdirSync(OLD_DIR, { recursive: true });
    fs.writeFileSync(TEST_ARCHIVE, 'dummy');
    expect(isArchived('testmod', '9.9.9')).toBe(false);
    expect(isArchived('othermod', '1.2.3')).toBe(false);
    fs.unlinkSync(TEST_ARCHIVE);
  });

  it('isArchived should return false if .old/ is empty', () => {
    if (fs.existsSync(TEST_ARCHIVE)) fs.unlinkSync(TEST_ARCHIVE);
    expect(isArchived('testmod', '1.2.3')).toBe(false);
  });
});
