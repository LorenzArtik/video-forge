'use strict';

const path = require('path');
const { loadProject } = require('../project/loader');
const { renderProject } = require('../render/render-pipeline');
const { checkFfmpeg } = require('../util/ffmpeg');

// Resolution presets
const RESOLUTION_PRESETS = {
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 }
};

// Aspect ratio presets
const ASPECT_PRESETS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
  '4:5': { width: 1080, height: 1350 }
};

async function render(args, flags) {
  checkFfmpeg();

  const dir = args[0] || process.cwd();
  const project = loadProject(dir, flags.config);

  let overrideResolution = null;

  // Handle --resolution flag
  if (flags.resolution) {
    const preset = RESOLUTION_PRESETS[flags.resolution.toLowerCase()];
    if (preset) {
      overrideResolution = preset;
    } else {
      const match = flags.resolution.match(/^(\d+)x(\d+)$/);
      if (match) {
        overrideResolution = { width: parseInt(match[1]), height: parseInt(match[2]) };
      } else {
        throw new Error(`Unknown resolution: ${flags.resolution}. Use 4k/1080p/720p/480p or WIDTHxHEIGHT`);
      }
    }
  }

  // Handle --format flag (aspect ratio)
  let isVertical = false;
  if (flags.format) {
    const preset = ASPECT_PRESETS[flags.format];
    if (preset) {
      overrideResolution = preset;
      isVertical = flags.format === '9:16';
    } else {
      throw new Error(`Unknown format: ${flags.format}. Use 16:9, 9:16, 1:1, 4:3, 4:5`);
    }
  }

  // For vertical format, swap to scenesVertical if available
  if (isVertical && project.scenesVertical && project.scenesVertical.length > 0) {
    // Use vertical scenes but keep narration/audio from main scenes
    console.log(`[vforge] Using vertical scenes (${project.scenesVertical.length} scenes)`);
    for (let i = 0; i < project.scenesVertical.length; i++) {
      const vs = project.scenesVertical[i];
      // Find matching main scene for audio/narration
      const mainScene = project.scenes.find(s => s.id === vs.id) || project.scenes[i];
      if (mainScene) {
        vs.narration = vs.narration || mainScene.narration;
        vs._audioPath = vs._audioPath || mainScene._audioPath;
        vs._audioDuration = vs._audioDuration || mainScene._audioDuration;
        vs._wordCount = vs._wordCount || mainScene._wordCount;
      }
    }
    project.scenes = project.scenesVertical;
  }

  const preset = flags.draft ? 'draft' : (flags.preset || 'medium');
  const skipSubtitles = flags.draft || flags['no-subtitles'];

  const outputPath = flags.output
    ? path.resolve(flags.output)
    : isVertical
      ? path.join(project._dir, 'output', 'video-vertical.mp4')
      : undefined;

  console.log(`[vforge] Rendering "${project.meta?.title || 'Untitled'}"...`);
  const startTime = Date.now();

  const result = await renderProject(project, {
    outputPath,
    preset,
    overrideResolution,
    skipSubtitles,
    onProgress: (pct, msg) => {
      process.stdout.write(`\r[vforge] ${pct}% ${msg}${''.padEnd(20)}`);
    }
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[vforge] Render complete in ${elapsed}s`);
  console.log(`  Output: ${result.outputPath}`);
  console.log(`  Size: ${result.sizeMb} MB`);
  console.log(`  Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Frames: ${result.totalFrames}`);
}

module.exports = render;
