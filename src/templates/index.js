'use strict';

const productLaunch = require('./product-launch');
const explainerSteps = require('./explainer-steps');
const socialReel = require('./social-reel');
const testimonial = require('./testimonial');

const TEMPLATES = {
  'product-launch': productLaunch,
  'explainer-steps': explainerSteps,
  'social-reel': socialReel,
  'testimonial': testimonial
};

function getTemplate(name) {
  return TEMPLATES[name] || null;
}

function listTemplates() {
  return Object.entries(TEMPLATES).map(([name, t]) => ({
    name,
    description: t.description
  }));
}

module.exports = { getTemplate, listTemplates };
