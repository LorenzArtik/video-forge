'use strict';

/**
 * Compositor: draws overlay elements on top of scene screenshots.
 * Cursor, click effects, highlights, and subtitles.
 *
 * Uses Puppeteer page overlay rather than node-canvas to avoid native deps.
 * We inject an overlay div on the page and render everything as HTML/CSS.
 */

const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" fill="#fff" stroke="#000" stroke-width="1.5"/>
</svg>`;

/**
 * Inject the overlay layer into a Puppeteer page.
 */
async function injectOverlay(page, options = {}) {
  const { subtitleStyle = {} } = options;
  const fontSize = subtitleStyle.fontSize || 24;
  const position = subtitleStyle.position || 'bottom';

  const positionCSS = position === 'top' ? 'top: 40px;' :
                      position === 'center' ? 'top: 50%; transform: translateY(-50%);' :
                      'bottom: 40px;';

  await page.evaluate((cursorSvg, fontSize, positionCSS) => {
    // Cursor element
    const cursor = document.createElement('div');
    cursor.id = 'vf-cursor';
    cursor.innerHTML = cursorSvg;
    cursor.style.cssText = 'position:fixed;top:-100px;left:-100px;z-index:99999;pointer-events:none;transition:none;';
    document.body.appendChild(cursor);

    // Click ripple
    const ripple = document.createElement('div');
    ripple.id = 'vf-click-fx';
    ripple.style.cssText = 'position:fixed;width:0;height:0;border-radius:50%;background:rgba(0,120,212,0.3);z-index:99998;pointer-events:none;display:none;';
    document.body.appendChild(ripple);

    // Highlight container
    const hlContainer = document.createElement('div');
    hlContainer.id = 'vf-highlights';
    hlContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99997;pointer-events:none;';
    document.body.appendChild(hlContainer);

    // Subtitle bar
    const subBar = document.createElement('div');
    subBar.id = 'vf-subtitles';
    subBar.style.cssText = `position:fixed;${positionCSS}left:50%;transform:translateX(-50%);z-index:99996;
      padding:8px 20px;border-radius:8px;background:rgba(0,0,0,0.7);color:#fff;
      font-size:${fontSize}px;font-family:'Inter',sans-serif;text-align:center;
      max-width:80%;line-height:1.4;display:none;`;
    document.body.appendChild(subBar);

    // Inject subtitle word styles
    const style = document.createElement('style');
    style.textContent = `
      .vf-sub-word { color: rgba(255,255,255,0.5); transition: color 0.1s; }
      .vf-sub-word.spoken { color: #fff; }
    `;
    document.head.appendChild(style);
  }, CURSOR_SVG, fontSize, positionCSS);
}

/**
 * Update the overlay elements for a specific frame.
 */
async function updateOverlay(page, state, subtitleData) {
  await page.evaluate((s, sub) => {
    // Cursor
    const cursor = document.getElementById('vf-cursor');
    if (cursor) {
      if (s.cursorVisible) {
        cursor.style.left = (s.cursorX - 4) + 'px';
        cursor.style.top = (s.cursorY - 1) + 'px';
        cursor.style.display = 'block';
      } else {
        cursor.style.display = 'none';
      }
    }

    // Click effect
    const ripple = document.getElementById('vf-click-fx');
    if (ripple && s.clickFx) {
      const size = 30 * s.clickFx.progress;
      ripple.style.display = 'block';
      ripple.style.left = (s.clickFx.x - size / 2) + 'px';
      ripple.style.top = (s.clickFx.y - size / 2) + 'px';
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.opacity = String(1 - s.clickFx.progress);
    } else if (ripple) {
      ripple.style.display = 'none';
    }

    // Highlights
    const hlContainer = document.getElementById('vf-highlights');
    if (hlContainer) {
      hlContainer.innerHTML = '';
      for (const hl of (s.highlights || [])) {
        const div = document.createElement('div');
        div.style.cssText = `position:absolute;left:${hl.x}px;top:${hl.y}px;width:${hl.w}px;height:${hl.h}px;
          border:2px solid rgba(0,120,212,${hl.alpha});border-radius:4px;
          box-shadow:0 0 8px rgba(0,120,212,${hl.alpha * 0.5});`;
        hlContainer.appendChild(div);
      }
    }

    // Subtitles
    const subBar = document.getElementById('vf-subtitles');
    if (subBar && sub) {
      subBar.style.display = 'block';
      const words = sub.words || [];
      subBar.innerHTML = words.map((w, i) =>
        `<span class="vf-sub-word${i <= sub.activeWordIndex ? ' spoken' : ''}">${w.word}</span>`
      ).join(' ');
    } else if (subBar) {
      subBar.style.display = 'none';
    }
  }, state, subtitleData);
}

/**
 * Hide all overlay elements (for clean scene screenshots).
 */
async function hideOverlay(page) {
  await page.evaluate(() => {
    ['vf-cursor', 'vf-click-fx', 'vf-highlights', 'vf-subtitles'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });
}

module.exports = { injectOverlay, updateOverlay, hideOverlay, CURSOR_SVG };
