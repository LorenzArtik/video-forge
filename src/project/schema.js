'use strict';

// JSON Schema for project.vforge.json validation
const PROJECT_SCHEMA = {
  type: 'object',
  required: ['version', 'settings', 'scenes'],
  properties: {
    version: { type: 'string', enum: ['1.0'] },
    meta: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' }
      }
    },
    settings: {
      type: 'object',
      required: ['resolution', 'fps'],
      properties: {
        resolution: {
          type: 'object',
          required: ['width', 'height'],
          properties: {
            width: { type: 'number', minimum: 1 },
            height: { type: 'number', minimum: 1 }
          }
        },
        fps: { type: 'number', minimum: 1, maximum: 120 },
        aspectRatio: { type: 'string' }
      }
    },
    audio: {
      type: 'object',
      properties: {
        tts: {
          type: 'object',
          properties: {
            provider: { type: 'string', enum: ['gemini'] },
            voice: { type: 'string' },
            language: { type: 'string' }
          }
        },
        backgroundMusic: {
          type: 'object',
          properties: {
            src: { type: 'string' },
            volume: { type: 'number', minimum: 0, maximum: 1 },
            fadeIn: { type: 'number', minimum: 0 },
            fadeOut: { type: 'number', minimum: 0 }
          }
        }
      }
    },
    subtitles: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        style: { type: 'string', enum: ['word-highlight', 'sentence', 'none'] },
        position: { type: 'string', enum: ['top', 'center', 'bottom'] },
        fontSize: { type: 'number', minimum: 8, maximum: 120 }
      }
    },
    scenes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'html'],
        properties: {
          id: { type: 'string' },
          html: { type: 'string' },
          narration: { type: 'string' },
          duration: { oneOf: [{ type: 'number', minimum: 0 }, { type: 'string', enum: ['auto'] }] },
          transition: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              duration: { type: 'number', minimum: 0 }
            }
          },
          animations: { type: 'array' },
          customAnimation: { type: 'string' }
        }
      }
    }
  }
};

// Simple schema validator (no external deps)
function validate(project) {
  const errors = [];

  if (!project || typeof project !== 'object') {
    return { valid: false, errors: ['Project must be a JSON object'] };
  }

  if (project.version !== '1.0') {
    errors.push(`Invalid version "${project.version}", expected "1.0"`);
  }

  if (!project.settings) {
    errors.push('Missing required field: settings');
  } else {
    if (!project.settings.resolution) {
      errors.push('Missing required field: settings.resolution');
    } else {
      if (!project.settings.resolution.width || !project.settings.resolution.height) {
        errors.push('settings.resolution must have width and height');
      }
    }
    if (!project.settings.fps || project.settings.fps < 1) {
      errors.push('settings.fps must be a positive number');
    }
  }

  if (!project.scenes || !Array.isArray(project.scenes) || project.scenes.length === 0) {
    errors.push('Project must have at least one scene');
  } else {
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      if (!scene.id) errors.push(`Scene ${i}: missing id`);
      if (!scene.html) errors.push(`Scene ${i}: missing html`);

      // Validate animation types
      if (scene.animations) {
        for (let j = 0; j < scene.animations.length; j++) {
          const anim = scene.animations[j];
          if (!anim.type) errors.push(`Scene ${i}, animation ${j}: missing type`);
        }
      }
    }

    // Check unique IDs
    const ids = project.scenes.map(s => s.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      errors.push(`Duplicate scene IDs: ${[...new Set(dupes)].join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { PROJECT_SCHEMA, validate };
