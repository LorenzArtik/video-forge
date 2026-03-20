'use strict';

const { AnimationAPI } = require('./animation-api');

// Built-in declarative animation types
const ANIMATION_TYPES = [
  'wait', 'parallel', 'fadeIn', 'fadeOut', 'slideIn', 'slideOut',
  'zoomIn', 'zoomOut', 'scale', 'rotate', 'highlight', 'typewriter',
  'counter', 'morph', 'scroll',
  'cursor.show', 'cursor.hide', 'cursor.moveTo', 'cursor.click'
];

/**
 * Execute a single declarative animation step on the AnimationAPI.
 */
async function executeAnimation(anim, vf) {
  switch (anim.type) {
    case 'wait':
      if (anim.until && anim.until.startsWith('narration:')) {
        const fraction = parseFloat(anim.until.split(':')[1]);
        await vf.waitNarr(fraction);
      } else {
        await vf.wait(anim.ms || 500);
      }
      break;

    case 'parallel':
      if (anim.actions && Array.isArray(anim.actions)) {
        await Promise.all(anim.actions.map(a => executeAnimation(a, vf)));
      }
      break;

    case 'fadeIn':
      await vf.fadeIn(anim.target, anim.duration || 800);
      break;

    case 'fadeOut':
      await vf.fadeOut(anim.target, anim.duration || 800);
      break;

    case 'slideIn':
      await vf.slideIn(anim.target, anim.from || 'bottom', anim.duration || 600, anim.distance);
      break;

    case 'slideOut':
      // slideOut is fadeOut + translate
      await vf.fadeOut(anim.target, anim.duration || 600);
      break;

    case 'zoomIn':
      await vf.zoomIn(anim.target, anim.duration || 600);
      break;

    case 'zoomOut':
      await vf.fadeOut(anim.target, anim.duration || 600);
      break;

    case 'scale':
      await vf.scale(anim.target, anim.from || 1, anim.to || 1.2, anim.duration || 600);
      break;

    case 'rotate':
      await vf.morph(anim.target, { transform: `rotate(${anim.to || 360}deg)` }, anim.duration || 600);
      break;

    case 'highlight':
      await vf.highlight(anim.target, anim.duration || 1000);
      break;

    case 'typewriter':
      await vf.type(anim.target, anim.text || '', anim.speed || 30);
      break;

    case 'counter': {
      const from = anim.from || 0;
      const to = anim.to || 100;
      const duration = anim.duration || 1000;
      const steps = Math.min(to - from, 60);
      const stepMs = duration / steps;
      for (let i = 0; i <= steps; i++) {
        const val = Math.round(from + (to - from) * (i / steps));
        const formatted = anim.format ? anim.format.replace('{}', val) : String(val);
        await vf._page.evaluate((sel, txt) => {
          const el = document.querySelector(sel);
          if (el) el.textContent = txt;
        }, anim.target, formatted);
        if (i < steps) await vf.wait(stepMs);
      }
      break;
    }

    case 'morph':
      await vf.morph(anim.target, anim.properties || {}, anim.duration || 600);
      break;

    case 'scroll':
      await vf.scroll(anim.target, anim.duration || 800);
      break;

    case 'cursor.show':
      if (anim.at) vf.cursor.at(anim.at[0], anim.at[1]);
      else vf.cursor.show();
      break;

    case 'cursor.hide':
      vf.cursor.hide();
      break;

    case 'cursor.moveTo':
      if (anim.target) {
        await vf.cursor.moveToEl(anim.target, anim.duration || 1000);
      } else if (anim.to) {
        await vf.cursor.moveTo(anim.to[0], anim.to[1], anim.duration || 1000);
      }
      break;

    case 'cursor.click':
      if (anim.target) {
        await vf.cursor.clickEl(anim.target);
      } else {
        await vf.cursor.click();
      }
      break;

    default:
      console.warn(`[vforge:anim] Unknown animation type: ${anim.type}`);
  }
}

/**
 * Execute all declarative animations for a scene.
 * Returns the total animation duration in ms.
 */
async function executeSceneAnimations(animations, vf) {
  if (!animations || animations.length === 0) return 0;

  for (const anim of animations) {
    if (vf._aborted) break;
    await executeAnimation(anim, vf);
  }

  return vf.clock;
}

/**
 * Execute a custom JS animation file.
 * The file should export: module.exports = async function(vf) { ... }
 */
async function executeCustomAnimation(animPath, vf) {
  const animFn = require(animPath);
  if (typeof animFn !== 'function') {
    throw new Error(`Custom animation must export a function: ${animPath}`);
  }
  await animFn(vf);
  return vf.clock;
}

module.exports = { executeAnimation, executeSceneAnimations, executeCustomAnimation, ANIMATION_TYPES };
