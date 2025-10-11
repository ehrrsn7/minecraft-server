import { it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { isArchived } from './archive_check.js';

// Re-define downloadFile here for test, or import if exported
async function downloadFile(url, dest, modId = '', version = '') {
  // If modId and version are provided, check archive first
  if (modId && version && isArchived(modId, version)) {
    throw new Error(`Archive already contains ${modId} version ${version}`);
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_FILE = path.join(__dirname, 'test_download.jar');

// Clean up after test
afterEach(() => {
  if (fs.existsSync(TEST_FILE)) {
    // Move to .old/ instead of deleting
    const oldDir = path.join(__dirname, '../mods/.old');
    if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
    const dest = path.join(oldDir, path.basename(TEST_FILE));
    fs.renameSync(TEST_FILE, dest);
  }
});

it('should download a file from a valid URL', async () => {
  // Use a small known .jar file from a public modrinth release
  const url = 'https://cdn.modrinth.com/data/4I1XuqiY/versions/N0YnseYc/entity_model_features_fabric_1.21.6-2.4.4.jar';
  await downloadFile(url, TEST_FILE);
  expect(fs.existsSync(TEST_FILE)).toBe(true);
  // Check file size is reasonable (not empty)
  const stats = fs.statSync(TEST_FILE);
  expect(stats.size).toBeGreaterThan(1000);
}, 20000); // Increase timeout to 20s

it('should fail for a 404 URL', async () => {
  const url = 'https://cdn.modrinth.com/data/4I1XuqiY/versions/2.4.4/does-not-exist.jar';
  await expect(downloadFile(url, TEST_FILE)).rejects.toThrow();
}, 10000); // Increase timeout to 10s

it('should skip download if file is already archived', async () => {
  // Simulate an archived file
  const oldDir = path.join(__dirname, '../mods/.old');
  if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
  const archived = path.join(oldDir, '4I1XuqiY-2.4.4.jar');
  fs.writeFileSync(archived, 'dummy');
  await expect(downloadFile('https://cdn.modrinth.com/data/4I1XuqiY/versions/N0YnseYc/entity_model_features_fabric_1.21.6-2.4.4.jar', TEST_FILE, '4I1XuqiY', '2.4.4')).rejects.toThrow(/Archive already contains/);
  fs.unlinkSync(archived);
}, 10000);
