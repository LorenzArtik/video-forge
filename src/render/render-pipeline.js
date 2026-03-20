'use strict';

const path = require('path');
const fs = require('fs');
const { createScenePage, closeBrowser, screenshotPage, applyDomUpdates } = require('../scene/scene-renderer');
const { AnimationAPI } = require('../scene/animation-api');
const { executeSceneAnimations, executeCustomAnimation } = require('../scene/animation-engine');
const { injectOverlay, updateOverlay } = require('./compositor');
const { createEncoder, writeFrame, finalize } = require('./encoder');
const { mixAudio } = require('../audio/audio-mixer');
const { calculateSentenceTimings, getSubtitleAt } = require('../audio/subtitle-sync');
const { checkFfmpeg } = require('../util/ffmpeg');

/**
 * Render a complete project to MP4.
 *
 * @param {object} project - Loaded and validated project object
 * @param {object} options
 * @param {string} options.outputPath - Output file path (default: output/video.mp4)
 * @param {string} options.preset - Encoding preset: 'draft' | 'medium' | 'high'
 * @param {object} options.overrideResolution - { width, height } override
 * @param {boolean} options.skipSubtitles - Skip subtitle rendering
 * @param {function} options.onProgress - Progress callback(percent, message)
 */
async function renderProject(project, options = {}) {
  const {
    preset = 'medium',
    overrideResolution,
    skipSubtitles = false,
    onProgress = () => {}
  } = options;

  // Check ffmpeg
  const ff = checkFfmpeg();
  console.log(`[vforge] ffmpeg: ${ff.path} (${ff.version})`);

  const width = overrideResolution?.width || project.settings.resolution.width;
  const height = overrideResolution?.height || project.settings.resolution.height;
  const fps = project.settings.fps || 30;

  const outputDir = path.join(project._dir, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = options.outputPath || path.join(outputDir, 'video.mp4');

  console.log(`[vforge] Rendering ${project.scenes.length} scene(s) at ${width}x${height} ${fps}fps`);

  // ── Phase 1: Calculate scene timings ──
  onProgress(5, 'Calculating timings...');
  const scenePlans = [];
  let totalDurationMs = 0;

  for (const scene of project.scenes) {
    const narrationMs = (scene._audioDuration || 0) * 1000;
    let animationMs = 0;

    // Estimate animation duration from declared animations
    if (scene.animations) {
      for (const anim of scene.animations) {
        if (anim.type === 'wait') {
          if (anim.until && anim.until.startsWith('narration:')) {
            const fraction = parseFloat(anim.until.split(':')[1]);
            animationMs = Math.max(animationMs, narrationMs * fraction);
          } else {
            animationMs += anim.ms || 500;
          }
        } else {
          animationMs += anim.duration || 800;
        }
      }
    }

    const sceneDuration = scene.duration === 'auto' || !scene.duration
      ? Math.max(narrationMs, animationMs, 2000) + 500 // +500ms padding
      : scene.duration;

    const transitionMs = scene.transition?.duration || 0;

    scenePlans.push({
      scene,
      startMs: totalDurationMs,
      durationMs: sceneDuration,
      transitionMs,
      narrationMs,
      sentenceTimings: scene.narration
        ? calculateSentenceTimings(scene.narration, narrationMs)
        : []
    });

    totalDurationMs += sceneDuration;
  }

  const totalFrames = Math.ceil(totalDurationMs / 1000 * fps);
  console.log(`[vforge] Total: ${(totalDurationMs / 1000).toFixed(1)}s, ${totalFrames} frames`);

  // ── Phase 2: Mix audio ──
  onProgress(10, 'Mixing audio...');
  const audioOutputPath = path.join(outputDir, 'mixed_audio.wav');
  const narrations = scenePlans
    .filter(p => p.scene._audioPath)
    .map(p => ({
      path: p.scene._audioPath,
      startMs: p.startMs,
      durationMs: p.narrationMs
    }));

  let hasAudio = false;
  if (narrations.length > 0 || project.audio?.backgroundMusic?._path) {
    try {
      await mixAudio({
        narrations,
        musicPath: project.audio?.backgroundMusic?._path,
        musicVolume: project.audio?.backgroundMusic?.volume ?? 0.08,
        fadeIn: project.audio?.backgroundMusic?.fadeIn ?? 2000,
        fadeOut: project.audio?.backgroundMusic?.fadeOut ?? 3000,
        totalDurationMs,
        outputPath: audioOutputPath
      });
      hasAudio = true;
    } catch (e) {
      console.warn(`[vforge] Audio mixing failed: ${e.message}`);
    }
  }

  // ── Phase 3: Render frames ──
  onProgress(15, 'Starting frame rendering...');

  const encoder = createEncoder({
    width, height, fps,
    audioPath: hasAudio ? audioOutputPath : null,
    outputPath,
    preset
  });

  let currentSceneIdx = -1;
  let currentPage = null;
  let currentVf = null;

  try {
    for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
      const timeMs = (frameNum / fps) * 1000;

      // Find which scene we're in
      const planIdx = scenePlans.findIndex(p =>
        timeMs >= p.startMs && timeMs < p.startMs + p.durationMs
      );
      if (planIdx === -1) continue; // past end, shouldn't happen

      const plan = scenePlans[planIdx];
      const sceneTimeMs = timeMs - plan.startMs;

      // Load new scene if needed
      if (planIdx !== currentSceneIdx) {
        currentSceneIdx = planIdx;
        if (currentPage) await currentPage.close();

        console.log(`[vforge] Scene "${plan.scene.id}" (${planIdx + 1}/${scenePlans.length})`);

        currentPage = await createScenePage(plan.scene._htmlContent, {
          width, height,
          projectDir: project._dir
        });

        // Inject overlay
        await injectOverlay(currentPage, {
          subtitleStyle: project.subtitles || {}
        });

        // Create animation API
        currentVf = new AnimationAPI(currentPage, {
          width, height,
          narrationDuration: plan.narrationMs
        });

        // Pre-execute all animations to build the timeline
        if (plan.scene.customAnimation && plan.scene._customAnimPath) {
          await executeCustomAnimation(plan.scene._customAnimPath, currentVf);
        } else if (plan.scene.animations) {
          await executeSceneAnimations(plan.scene.animations, currentVf);
        }
      }

      // Get animation state at this time
      const state = currentVf.getStateAt(sceneTimeMs);

      // Apply DOM updates
      if (state.domUpdates.length > 0) {
        await applyDomUpdates(currentPage, state.domUpdates);
      }

      // Subtitle data
      let subtitleData = null;
      if (!skipSubtitles && project.subtitles?.enabled && plan.sentenceTimings.length > 0) {
        subtitleData = getSubtitleAt(plan.sentenceTimings, sceneTimeMs);
      }

      // Update overlay (cursor, highlights, subtitles)
      await updateOverlay(currentPage, state, subtitleData);

      // Screenshot
      const frame = await screenshotPage(currentPage);
      await writeFrame(encoder, frame);

      // Progress
      if (frameNum % (fps * 2) === 0) { // every 2 seconds of video
        const pct = Math.round(15 + (frameNum / totalFrames) * 80);
        onProgress(pct, `Frame ${frameNum}/${totalFrames}`);
      }
    }
  } finally {
    if (currentPage) await currentPage.close();
    await closeBrowser();
  }

  // ── Phase 4: Finalize encoding ──
  onProgress(95, 'Finalizing MP4...');
  await finalize(encoder);

  // Clean up temp audio
  if (hasAudio && fs.existsSync(audioOutputPath)) {
    fs.unlinkSync(audioOutputPath);
  }

  const stats = fs.statSync(outputPath);
  const sizeMb = (stats.size / 1048576).toFixed(1);
  console.log(`[vforge] Done: ${outputPath} (${sizeMb} MB)`);

  onProgress(100, 'Complete');
  return { outputPath, sizeMb: parseFloat(sizeMb), totalDurationMs, totalFrames };
}

module.exports = { renderProject };
