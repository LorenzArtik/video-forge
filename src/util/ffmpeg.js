'use strict';

const { execSync, spawn } = require('child_process');

let cachedPath = null;
let cachedVersion = null;

function findFfmpeg() {
  if (cachedPath) return cachedPath;
  try {
    cachedPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
    return cachedPath;
  } catch {
    return null;
  }
}

function getFfmpegVersion() {
  if (cachedVersion) return cachedVersion;
  const ffmpegPath = findFfmpeg();
  if (!ffmpegPath) return null;
  try {
    const out = execSync(`${ffmpegPath} -version`, { encoding: 'utf-8' });
    const match = out.match(/ffmpeg version (\S+)/);
    cachedVersion = match ? match[1] : 'unknown';
    return cachedVersion;
  } catch {
    return null;
  }
}

function checkFfmpeg() {
  const ffmpegPath = findFfmpeg();
  if (!ffmpegPath) {
    throw new Error(
      'ffmpeg not found. Install it with: brew install ffmpeg'
    );
  }
  return { path: ffmpegPath, version: getFfmpegVersion() };
}

function spawnFfmpeg(args, options = {}) {
  const ffmpegPath = findFfmpeg();
  if (!ffmpegPath) throw new Error('ffmpeg not found');
  return spawn(ffmpegPath, args, { stdio: options.stdio || 'pipe', ...options });
}

module.exports = { findFfmpeg, getFfmpegVersion, checkFfmpeg, spawnFfmpeg };
