'use strict';

const { loadProject } = require('./project/loader');
const { renderProject } = require('./render/render-pipeline');
const { generateTTS } = require('./audio/tts');
const { startPreview } = require('./preview/server');

module.exports = {
  loadProject,
  renderProject,
  generateTTS,
  startPreview
};
