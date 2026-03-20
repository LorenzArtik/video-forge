'use strict';

const path = require('path');
const fs = require('fs');
const { spawnFfmpeg } = require('../util/ffmpeg');

/**
 * Mix narration audio files with background music using ffmpeg filter_complex.
 *
 * @param {object} options
 * @param {Array<{path: string, startMs: number, durationMs: number}>} options.narrations - Narration clips with timing
 * @param {string} options.musicPath - Path to background music file
 * @param {number} options.musicVolume - Music volume 0..1 (default 0.08)
 * @param {number} options.fadeIn - Music fade-in ms (default 2000)
 * @param {number} options.fadeOut - Music fade-out ms (default 3000)
 * @param {number} options.totalDurationMs - Total video duration in ms
 * @param {string} options.outputPath - Output WAV path
 * @returns {Promise<string>} Output path
 */
function mixAudio(options) {
  const {
    narrations = [],
    musicPath,
    musicVolume = 0.08,
    fadeIn = 2000,
    fadeOut = 3000,
    totalDurationMs,
    outputPath
  } = options;

  return new Promise((resolve, reject) => {
    const totalSec = totalDurationMs / 1000;
    const args = [];
    const inputs = [];
    let filterParts = [];
    let inputIndex = 0;

    // Add narration inputs with delay
    for (const narr of narrations) {
      args.push('-i', narr.path);
      const delaySec = narr.startMs / 1000;
      filterParts.push(`[${inputIndex}]adelay=${narr.startMs}|${narr.startMs}[narr${inputIndex}]`);
      inputs.push(`[narr${inputIndex}]`);
      inputIndex++;
    }

    // Add music input if present
    if (musicPath && fs.existsSync(musicPath)) {
      args.push('-i', musicPath);
      const fadeOutStart = Math.max(0, totalSec - fadeOut / 1000);
      filterParts.push(
        `[${inputIndex}]aloop=loop=-1:size=2e+09,atrim=0:${totalSec},` +
        `volume=${musicVolume},` +
        `afade=t=in:st=0:d=${fadeIn / 1000},` +
        `afade=t=out:st=${fadeOutStart}:d=${fadeOut / 1000}[music]`
      );
      inputs.push('[music]');
      inputIndex++;
    }

    if (inputs.length === 0) {
      // Generate silence
      args.push(
        '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono:d=${totalSec}`,
        '-t', String(totalSec),
        '-y', outputPath
      );
    } else if (inputs.length === 1 && !musicPath) {
      // Single narration, no mix needed
      const narr = narrations[0];
      if (narr.startMs === 0) {
        // Just copy
        fs.copyFileSync(narr.path, outputPath);
        return resolve(outputPath);
      }
      args.push(
        '-filter_complex', filterParts.join(';') + `;${inputs[0]}apad=whole_dur=${totalSec}[out]`,
        '-map', '[out]',
        '-ar', '24000', '-ac', '1',
        '-y', outputPath
      );
    } else {
      // Mix all inputs together
      const mixInputs = inputs.join('');
      filterParts.push(`${mixInputs}amix=inputs=${inputs.length}:duration=longest:normalize=0,apad=whole_dur=${totalSec}[out]`);
      args.push(
        '-filter_complex', filterParts.join(';'),
        '-map', '[out]',
        '-ar', '24000', '-ac', '1',
        '-y', outputPath
      );
    }

    console.log(`[vforge:mixer] Mixing ${narrations.length} narration(s)${musicPath ? ' + music' : ''} -> ${path.basename(outputPath)}`);

    const proc = spawnFfmpeg(args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`ffmpeg mix failed (code ${code}): ${stderr.slice(-500)}`));
      } else {
        resolve(outputPath);
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Concatenate multiple WAV files sequentially with optional gaps.
 */
function concatAudio(files, outputPath) {
  return new Promise((resolve, reject) => {
    if (files.length === 0) return reject(new Error('No files to concatenate'));
    if (files.length === 1) {
      fs.copyFileSync(files[0], outputPath);
      return resolve(outputPath);
    }

    const args = [];
    for (const f of files) args.push('-i', f);
    args.push(
      '-filter_complex', `concat=n=${files.length}:v=0:a=1[out]`,
      '-map', '[out]',
      '-y', outputPath
    );

    const proc = spawnFfmpeg(args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg concat failed: ${stderr.slice(-300)}`));
      else resolve(outputPath);
    });
    proc.on('error', reject);
  });
}

module.exports = { mixAudio, concatAudio };
