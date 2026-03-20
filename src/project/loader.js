'use strict';

const fs = require('fs');
const path = require('path');
const { validate } = require('./schema');

const PROJECT_FILE = 'project.vforge.json';

function findProjectFile(dir, configFile) {
  if (configFile) {
    const candidate = path.resolve(dir || process.cwd(), configFile);
    if (fs.existsSync(candidate)) return candidate;
    // Try adding .vforge.json suffix
    const withSuffix = path.resolve(dir || process.cwd(), configFile + '.vforge.json');
    if (fs.existsSync(withSuffix)) return withSuffix;
    return null;
  }
  const candidate = path.resolve(dir || process.cwd(), PROJECT_FILE);
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

function loadProject(dir, configFile) {
  const projectPath = findProjectFile(dir, configFile);
  if (!projectPath) {
    throw new Error(`No ${PROJECT_FILE} found in ${path.resolve(dir || process.cwd())}`);
  }

  const raw = fs.readFileSync(projectPath, 'utf-8');
  let project;
  try {
    project = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${PROJECT_FILE}: ${e.message}`);
  }

  const { valid, errors } = validate(project);
  if (!valid) {
    throw new Error(`Invalid project:\n  - ${errors.join('\n  - ')}`);
  }

  const projectDir = path.dirname(projectPath);

  // Resolve relative paths in scenes (and scenesVertical if present)
  const allSceneSets = [project.scenes];
  if (project.scenesVertical) allSceneSets.push(project.scenesVertical);
  for (const sceneSet of allSceneSets) {
  for (const scene of sceneSet) {
    scene._htmlPath = path.resolve(projectDir, scene.html);
    if (!fs.existsSync(scene._htmlPath)) {
      throw new Error(`Scene "${scene.id}": HTML file not found: ${scene.html}`);
    }
    scene._htmlContent = fs.readFileSync(scene._htmlPath, 'utf-8');

    // Auto-detect pre-generated TTS audio
    const audioPath = path.join(projectDir, 'audio', `${scene.id}.wav`);
    if (fs.existsSync(audioPath)) {
      scene._audioPath = audioPath;
      // Read WAV duration from header
      const wavBuf = fs.readFileSync(audioPath);
      if (wavBuf.length >= 44) {
        const sampleRate = wavBuf.readUInt32LE(24);
        const bitsPerSample = wavBuf.readUInt16LE(34);
        const numChannels = wavBuf.readUInt16LE(22);
        const dataSize = wavBuf.readUInt32LE(40);
        scene._audioDuration = dataSize / (sampleRate * numChannels * (bitsPerSample / 8));
      }
    }

    if (scene.customAnimation) {
      scene._customAnimPath = path.resolve(projectDir, scene.customAnimation);
      if (!fs.existsSync(scene._customAnimPath)) {
        throw new Error(`Scene "${scene.id}": custom animation not found: ${scene.customAnimation}`);
      }
    }
  }
  } // end allSceneSets loop

  // Resolve audio paths
  if (project.audio?.backgroundMusic?.src) {
    const musicPath = path.resolve(projectDir, project.audio.backgroundMusic.src);
    if (!fs.existsSync(musicPath)) {
      console.warn(`[vforge] Warning: background music not found: ${project.audio.backgroundMusic.src}`);
    }
    project.audio.backgroundMusic._path = musicPath;
  }

  project._dir = projectDir;
  project._path = projectPath;

  return project;
}

function saveProject(project, dir) {
  const projectDir = dir || project._dir || process.cwd();
  const projectPath = path.join(projectDir, PROJECT_FILE);

  // Strip internal fields before saving
  const clean = JSON.parse(JSON.stringify(project));
  delete clean._dir;
  delete clean._path;
  if (clean.scenes) {
    for (const scene of clean.scenes) {
      delete scene._htmlPath;
      delete scene._htmlContent;
      delete scene._customAnimPath;
      delete scene._audioDuration;
      delete scene._audioPath;
      delete scene._wordTimings;
    }
  }
  if (clean.audio?.backgroundMusic) {
    delete clean.audio.backgroundMusic._path;
  }

  fs.writeFileSync(projectPath, JSON.stringify(clean, null, 2) + '\n');
  return projectPath;
}

module.exports = { loadProject, saveProject, PROJECT_FILE, findProjectFile };
