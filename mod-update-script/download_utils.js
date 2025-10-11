// === Download Utilities ===
import fs from 'fs';
import https from 'https';

/**
 * Fetches JSON from a URL using HTTPS.
 * @param {string} url - The URL to fetch JSON from.
 * @param {object} headers - Optional HTTP headers.
 * @returns {Promise<object>} - The parsed JSON response.
 */
export function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.headers = headers;
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (!data || data.trim() === '') {
            // Empty response, treat as null
            resolve(null);
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          // If not valid JSON, treat as null and log a warning
          console.warn(`Warning: Failed to parse JSON from ${url}: ${e}`);
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Downloads a file from a URL to a destination path, following redirects.
 * @param {string} url - The URL to download from.
 * @param {string} dest - The destination file path.
 * @param {number} [redirects=0] - Internal: number of redirects followed.
 * @returns {Promise<void>} - Resolves when download is complete.
 */
export function downloadFile(url, dest, redirects = 0) {
  const MAX_REDIRECTS = 5;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        if (redirects >= MAX_REDIRECTS) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        const location = response.headers.location;
        if (!location) {
          reject(new Error(`Redirect with no location header for ${url}`));
          return;
        }
        // Clean up file stream
        file.close(() => fs.unlink(dest, () => {
          // Recursively follow redirect
          downloadFile(location, dest, redirects + 1).then(resolve, reject);
        }));
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve();
        });
      });
    }).on('error', (err) => {
      console.error(`Download failed for ${url}: ${err}`);
      fs.unlink(dest, () => reject(err));
    });
  });
}
