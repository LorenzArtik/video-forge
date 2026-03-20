'use strict';

const fs = require('fs');
const path = require('path');
const init = require('./init');
const render = require('./render');
const preview = require('./preview');
const tts = require('./tts');

// Load .env file from cwd if present
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const COMMANDS = {
  init: { fn: init, desc: 'Scaffold a new Video Forge project' },
  render: { fn: render, desc: 'Render project to MP4' },
  preview: { fn: preview, desc: 'Preview project in browser' },
  tts: { fn: tts, desc: 'Generate TTS audio for all scenes' },
  validate: { fn: validateCmd, desc: 'Validate project file' },
  help: { fn: showHelp, desc: 'Show this help message' }
};

function showHelp() {
  console.log('\nvforge - Video Forge CLI\n');
  console.log('Usage: vforge <command> [options]\n');
  console.log('Commands:');
  for (const [name, cmd] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(12)} ${cmd.desc}`);
  }
  console.log('\nExamples:');
  console.log('  vforge init my-project');
  console.log('  vforge init --template social-reel my-project');
  console.log('  vforge tts');
  console.log('  vforge preview');
  console.log('  vforge render');
  console.log('  vforge render --preset draft');
  console.log('  vforge render --format 9:16');
  console.log('  vforge render --resolution 720p');
  console.log('');
}

async function validateCmd(args) {
  const { loadProject } = require('../project/loader');
  const dir = args[0] || process.cwd();
  try {
    const project = loadProject(dir);
    console.log(`[vforge] Project valid: "${project.meta?.title || 'Untitled'}"`);
    console.log(`  Scenes: ${project.scenes.length}`);
    console.log(`  Resolution: ${project.settings.resolution.width}x${project.settings.resolution.height}`);
    console.log(`  FPS: ${project.settings.fps}`);
    for (const scene of project.scenes) {
      const hasNarr = scene.narration ? 'narration' : '';
      const hasAnim = scene.animations?.length ? `${scene.animations.length} animations` : '';
      const hasCust = scene.customAnimation ? 'custom JS' : '';
      const features = [hasNarr, hasAnim, hasCust].filter(Boolean).join(', ');
      console.log(`  - ${scene.id}: ${features || 'static'}`);
    }
  } catch (e) {
    console.error(`[vforge] ${e.message}`);
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(argv[i]);
    }
  }
  return { args, flags };
}

async function run(argv) {
  loadEnv();
  const { args, flags } = parseArgs(argv);
  const commandName = args[0] || 'help';
  const command = COMMANDS[commandName];

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    await command.fn(args.slice(1), flags);
  } catch (e) {
    console.error(`[vforge] Error: ${e.message}`);
    if (flags.verbose) console.error(e.stack);
    process.exit(1);
  }
}

module.exports = { run, parseArgs };
