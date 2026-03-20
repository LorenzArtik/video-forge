'use strict';

const { loadProject, saveProject } = require('../project/loader');
const { generateProjectTTS } = require('../audio/tts');

async function tts(args, flags) {
  const dir = args[0] || process.cwd();
  const project = loadProject(dir, flags.config);

  const scenesWithNarration = project.scenes.filter(s => s.narration);
  if (scenesWithNarration.length === 0) {
    console.log('[vforge] No scenes with narration text found.');
    return;
  }

  console.log(`[vforge] Generating TTS for ${scenesWithNarration.length} scene(s)...`);

  await generateProjectTTS(project);

  // Report results
  let totalDuration = 0;
  for (const scene of project.scenes) {
    if (scene._audioDuration) {
      console.log(`  ${scene.id}: ${scene._audioDuration.toFixed(1)}s`);
      totalDuration += scene._audioDuration;
    }
  }
  console.log(`[vforge] Total narration: ${totalDuration.toFixed(1)}s`);
}

module.exports = tts;
