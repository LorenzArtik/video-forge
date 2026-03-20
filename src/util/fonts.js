'use strict';

const fs = require('fs');
const path = require('path');

// System font directories to scan
const FONT_DIRS = [
  '/System/Library/Fonts',
  '/Library/Fonts',
  path.join(process.env.HOME || '', 'Library/Fonts')
];

// Common web fonts available via Google Fonts CDN
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2';

function buildFontFaceCSS(fontName, fontPath) {
  const ext = path.extname(fontPath).toLowerCase();
  const formats = { '.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'opentype' };
  const format = formats[ext] || 'truetype';
  const data = fs.readFileSync(fontPath);
  const dataUri = `data:font/${format};base64,${data.toString('base64')}`;
  return `@font-face { font-family: '${fontName}'; src: url('${dataUri}') format('${format}'); }`;
}

// Find a local font file by name
function findLocalFont(fontName) {
  const normalized = fontName.toLowerCase().replace(/\s+/g, '');
  for (const dir of FONT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const base = path.basename(file, path.extname(file)).toLowerCase().replace(/\s+/g, '');
        if (base === normalized || base.startsWith(normalized)) {
          return path.join(dir, file);
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }
  return null;
}

// Generate a Google Fonts link tag for embedding in HTML
function googleFontsLink(families) {
  if (!families || families.length === 0) return '';
  const params = families.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`).join('&');
  return `<link href="${GOOGLE_FONTS_CSS}?${params}&display=swap" rel="stylesheet">`;
}

module.exports = { buildFontFaceCSS, findLocalFont, googleFontsLink };
