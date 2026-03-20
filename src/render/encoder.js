'use strict';

const { spawnFfmpeg } = require('../util/ffmpeg');
const path = require('path');

/**
 * Create an ffmpeg encoder process that accepts PNG frames on stdin
 * and produces an MP4 file.
 *
 * @param {object} options
 * @param {number} options.width - Frame width
 * @param {number} options.height - Frame height
 * @param {number} options.fps - Frames per second
 * @param {string} options.audioPath - Path to mixed audio WAV (optional)
 * @param {string} options.outputPath - Output MP4 path
 * @param {string} options.preset - Encoding preset: 'draft' | 'medium' | 'high'
 * @returns {{ process, stdin, promise }}
 */
function createEncoder(options) {
  const {
    width,
    height,
    fps = 30,
    audioPath,
    outputPath,
    preset = 'medium'
  } = options;

  const presets = {
    draft: { crf: '28', preset: 'ultrafast' },
    medium: { crf: '20', preset: 'medium' },
    high: { crf: '16', preset: 'slow' }
  };
  const enc = presets[preset] || presets.medium;

  const args = [
    // Input: PNG frames from stdin
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', 'pipe:0'
  ];

  // Audio input
  if (audioPath) {
    args.push('-i', audioPath);
  }

  args.push(
    // Video codec
    '-c:v', 'libx264',
    '-preset', enc.preset,
    '-crf', enc.crf,
    '-pix_fmt', 'yuv420p',
    // Scale to even dimensions (required by x264)
    '-vf', `scale=trunc(iw/2)*2:trunc(ih/2)*2`
  );

  if (audioPath) {
    args.push(
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest'
    );
  }

  args.push(
    '-movflags', '+faststart',
    '-y',
    outputPath
  );

  const proc = spawnFfmpeg(args, {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stderr = '';
  proc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  const promise = new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg encoding failed (code ${code}): ${stderr.slice(-500)}`));
      } else {
        resolve(outputPath);
      }
    });
    proc.on('error', reject);
  });

  return {
    process: proc,
    stdin: proc.stdin,
    promise,
    getStderr: () => stderr
  };
}

/**
 * Write a PNG frame buffer to the encoder stdin.
 */
function writeFrame(encoder, pngBuffer) {
  return new Promise((resolve, reject) => {
    const ok = encoder.stdin.write(pngBuffer, (err) => {
      if (err) reject(err);
      else resolve();
    });
    if (!ok) {
      encoder.stdin.once('drain', resolve);
    }
  });
}

/**
 * Finalize encoding - close stdin and wait for ffmpeg to finish.
 */
async function finalize(encoder) {
  encoder.stdin.end();
  return encoder.promise;
}

module.exports = { createEncoder, writeFrame, finalize };
