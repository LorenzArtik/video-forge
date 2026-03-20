'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { googleFontsLink } = require('../util/fonts');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });
  }
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Create a Puppeteer page sized to the project resolution, load scene HTML.
 */
async function createScenePage(sceneHtml, options = {}) {
  const {
    width = 1920,
    height = 1080,
    fonts = ['Inter'],
    projectDir
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  // Build full HTML document
  const fontsTag = googleFontsLink(fonts);

  // Resolve local asset references to file:// paths
  let html = sceneHtml;
  if (projectDir) {
    html = html.replace(/(src|href)=["']\.\/([^"']+)["']/g, (match, attr, relPath) => {
      const absPath = path.resolve(projectDir, relPath);
      if (fs.existsSync(absPath)) {
        return `${attr}="file://${absPath}"`;
      }
      return match;
    });
  }

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}, height=${height}">
${fontsTag}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: #fff; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
</style>
</head>
<body>
${html}
</body>
</html>`;

  await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  return page;
}

/**
 * Take a screenshot of the current page state.
 * Returns a Buffer (PNG or raw RGBA).
 */
async function screenshotPage(page, options = {}) {
  const { format = 'png' } = options;

  if (format === 'raw') {
    // Use CDP for raw RGBA data (faster for piping to ffmpeg)
    const client = await page.createCDPSession();
    const { data } = await client.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    await client.detach();
    return Buffer.from(data, 'base64');
  }

  return page.screenshot({ type: 'png', omitBackground: false });
}

/**
 * Apply DOM updates from AnimationAPI state to the page.
 */
async function applyDomUpdates(page, domUpdates) {
  if (!domUpdates || domUpdates.length === 0) return;

  await page.evaluate((updates) => {
    for (const update of updates) {
      const el = document.querySelector(update.selector);
      if (!el) continue;
      if (update.styles) {
        for (const [prop, val] of Object.entries(update.styles)) {
          el.style[prop] = val;
        }
      }
      if (update.innerHTML !== undefined) {
        el.innerHTML = update.innerHTML;
      }
    }
  }, domUpdates);
}

module.exports = { getBrowser, closeBrowser, createScenePage, screenshotPage, applyDomUpdates };
