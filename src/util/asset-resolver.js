'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Resolve asset paths: relative to project dir, absolute, or remote URLs
function resolveAssetPath(assetPath, projectDir) {
  if (!assetPath) return null;

  // Absolute path
  if (path.isAbsolute(assetPath)) {
    return fs.existsSync(assetPath) ? assetPath : null;
  }

  // Remote URL
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }

  // Relative to project dir
  const resolved = path.resolve(projectDir, assetPath);
  return fs.existsSync(resolved) ? resolved : null;
}

// Download a remote URL to a local temp path
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// Convert a file to base64 data URI
function toDataUri(filePath, mimeType) {
  const data = fs.readFileSync(filePath);
  const mime = mimeType || guessMimeType(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.css': 'text/css',
    '.js': 'text/javascript'
  };
  return types[ext] || 'application/octet-stream';
}

module.exports = { resolveAssetPath, downloadFile, toDataUri, guessMimeType };
