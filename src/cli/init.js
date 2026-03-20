'use strict';

const fs = require('fs');
const path = require('path');
const { getTemplate, listTemplates } = require('../templates/index');

const DEFAULT_PROJECT = {
  version: '1.0',
  meta: { title: '', description: '' },
  settings: {
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    aspectRatio: '16:9'
  },
  audio: {
    tts: { provider: 'gemini', voice: 'Kore', language: 'it-IT' },
    backgroundMusic: { src: './assets/music.mp3', volume: 0.08, fadeIn: 2000, fadeOut: 3000 }
  },
  subtitles: {
    enabled: true,
    style: 'word-highlight',
    position: 'bottom',
    fontSize: 24
  },
  scenes: [
    {
      id: 'intro',
      html: './scenes/intro.html',
      narration: '',
      duration: 'auto',
      transition: { type: 'fadeIn', duration: 500 },
      animations: []
    }
  ]
};

const DEFAULT_SCENE_HTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
  <div style="text-align:center;color:#fff;">
    <h1 id="headline" style="font-size:64px;font-weight:700;margin-bottom:16px;opacity:0;">Il tuo titolo</h1>
    <p id="subtitle" style="font-size:28px;opacity:0.8;opacity:0;">Sottotitolo</p>
  </div>
</div>`;

async function init(args, flags) {
  const templateName = flags.template;
  const projectName = args[0] || 'my-video';
  const projectDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    const files = fs.readdirSync(projectDir);
    if (files.length > 0) {
      throw new Error(`Directory "${projectName}" already exists and is not empty`);
    }
  }

  // Get template or use default
  let template;
  if (templateName) {
    template = getTemplate(templateName);
    if (!template) {
      console.error(`Unknown template: "${templateName}". Available templates:`);
      for (const t of listTemplates()) {
        console.error(`  ${t.name.padEnd(20)} ${t.description}`);
      }
      process.exit(1);
    }
    console.log(`[vforge] Using template: ${templateName}`);
  }

  // Create directories
  fs.mkdirSync(path.join(projectDir, 'scenes'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'animations'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'output'), { recursive: true });

  if (template) {
    // Write template project
    const project = template.project;
    project.meta.title = projectName;
    fs.writeFileSync(
      path.join(projectDir, 'project.vforge.json'),
      JSON.stringify(project, null, 2) + '\n'
    );

    // Write template scenes
    for (const scene of template.scenes) {
      fs.writeFileSync(path.join(projectDir, scene.path), scene.html);
    }

    // Write template animations if any
    if (template.animations) {
      for (const anim of template.animations) {
        fs.writeFileSync(path.join(projectDir, anim.path), anim.code);
      }
    }
  } else {
    // Default project
    const project = JSON.parse(JSON.stringify(DEFAULT_PROJECT));
    project.meta.title = projectName;
    fs.writeFileSync(
      path.join(projectDir, 'project.vforge.json'),
      JSON.stringify(project, null, 2) + '\n'
    );
    fs.writeFileSync(path.join(projectDir, 'scenes', 'intro.html'), DEFAULT_SCENE_HTML);
  }

  // .env template
  fs.writeFileSync(path.join(projectDir, '.env'), '# Video Forge\nGEMINI_API_KEY=\n');

  // .gitignore
  fs.writeFileSync(path.join(projectDir, '.gitignore'), 'output/\nnode_modules/\n*.wav\n.env\n');

  console.log(`[vforge] Project created: ${projectDir}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  # Edit scenes in ./scenes/`);
  console.log(`  # Edit project.vforge.json for settings`);
  console.log(`  vforge preview    # Preview in browser`);
  console.log(`  vforge tts        # Generate narration audio`);
  console.log(`  vforge render     # Render to MP4`);
}

module.exports = init;
