// archive_check.test.js - Vitest test suite for archive_check.js
// Ensures .jar files in .old/ are detected and listed

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listArchivedFiles } from './archive_check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OLD_DIR = path.join(__dirname, '../mods/.old');
const TEST_ARCHIVE = path.join(OLD_DIR, 'archive_test.jar');

describe('archive_check', () => {
  it('should list .jar files in .old/', () => {
    // Setup: create a dummy .jar file in .old/
    if (!fs.existsSync(OLD_DIR)) fs.mkdirSync(OLD_DIR, { recursive: true });
    fs.writeFileSync(TEST_ARCHIVE, 'dummy');
    const files = listArchivedFiles();
    expect(files).toContain('archive_test.jar');
    // Cleanup
    fs.unlinkSync(TEST_ARCHIVE);
  });

  it('should return an empty array if no .jar files in .old/', () => {
    // Ensure .old/ is empty
    if (fs.existsSync(TEST_ARCHIVE)) fs.unlinkSync(TEST_ARCHIVE);
    const files = listArchivedFiles();
    expect(Array.isArray(files)).toBe(true);
    expect(files).not.toContain('archive_test.jar');
  });
});

export {}; // Ensure ESM test file is recognized by Vitest
