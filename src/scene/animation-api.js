'use strict';

/**
 * The `vf` animation API object, injected into custom animation scripts.
 * Equivalent of the tut/vex API in RISKASS Academy, but for headless rendering.
 *
 * All methods are async and advance the internal clock.
 * The renderer calls `tick()` each frame to get current state.
 */
class AnimationAPI {
  constructor(page, options = {}) {
    this._page = page;           // Puppeteer page
    this._width = options.width || 1920;
    this._height = options.height || 1080;
    this._narrationDuration = options.narrationDuration || 0; // ms
    this._clock = 0;             // current time in ms
    this._targetClock = 0;       // where clock should be after current action
    this._cursorX = -100;
    this._cursorY = -100;
    this._cursorVisible = false;
    this._highlights = [];       // active highlight effects
    this._clickFx = null;        // active click ripple
    this._pendingDomAnimations = []; // DOM changes to apply
    this._aborted = false;

    // Public cursor sub-object
    this.cursor = {
      at: (x, y) => this._cursorAt(x, y),
      show: (pos) => this._cursorShow(pos),
      hide: () => this._cursorHide(),
      moveTo: (x, y, duration) => this._cursorMoveTo(x, y, duration),
      moveToEl: (selector, duration) => this._cursorMoveToEl(selector, duration),
      click: () => this._cursorClick(),
      clickEl: (selector) => this._cursorClickEl(selector)
    };
  }

  // ── Time control ──

  async wait(ms) {
    this._targetClock = this._clock + ms;
    return this._advanceTo(this._targetClock);
  }

  async waitNarr(fraction) {
    if (this._narrationDuration <= 0) return;
    const targetMs = this._narrationDuration * fraction;
    if (targetMs <= this._clock) return; // already past this point
    this._targetClock = targetMs;
    return this._advanceTo(targetMs);
  }

  // ── Element queries (executed in Puppeteer) ──

  async el(selector) {
    return this._page.$(selector);
  }

  async getCenter(selector) {
    const box = await this._page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, selector);
    return box || { x: this._width / 2, y: this._height / 2 };
  }

  // ── DOM animations ──

  async fadeIn(selector, duration = 800) {
    this._pendingDomAnimations.push({
      type: 'fadeIn', selector, duration, startTime: this._clock
    });
    await this._page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.style.transition = 'none'; el.style.opacity = '0'; }
    }, selector);
    return this.wait(duration);
  }

  async fadeOut(selector, duration = 800) {
    this._pendingDomAnimations.push({
      type: 'fadeOut', selector, duration, startTime: this._clock
    });
    return this.wait(duration);
  }

  async slideIn(selector, from = 'bottom', duration = 600, distance = 40) {
    const transforms = {
      bottom: `translateY(${distance}px)`,
      top: `translateY(-${distance}px)`,
      left: `translateX(-${distance}px)`,
      right: `translateX(${distance}px)`
    };
    this._pendingDomAnimations.push({
      type: 'slideIn', selector, from, distance, duration, startTime: this._clock,
      initialTransform: transforms[from] || transforms.bottom
    });
    await this._page.evaluate((sel, tf) => {
      const el = document.querySelector(sel);
      if (el) { el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = tf; }
    }, selector, transforms[from] || transforms.bottom);
    return this.wait(duration);
  }

  async zoomIn(selector, duration = 600) {
    this._pendingDomAnimations.push({
      type: 'zoomIn', selector, duration, startTime: this._clock
    });
    await this._page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) { el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = 'scale(0.5)'; }
    }, selector);
    return this.wait(duration);
  }

  async scale(selector, from = 1, to = 1.2, duration = 600) {
    this._pendingDomAnimations.push({
      type: 'scale', selector, from, to, duration, startTime: this._clock
    });
    return this.wait(duration);
  }

  async highlight(selector, duration = 800) {
    const center = await this.getCenter(selector);
    const box = await this._page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, selector);
    if (box) {
      this._highlights.push({
        x: box.x - 3, y: box.y - 3, w: box.w + 6, h: box.h + 6,
        startTime: this._clock, duration, alpha: 0.45
      });
    }
    return this.wait(duration);
  }

  async type(selector, text, speed = 30) {
    const totalMs = text.length * speed;
    this._pendingDomAnimations.push({
      type: 'typewriter', selector, text, speed, startTime: this._clock, totalMs
    });
    return this.wait(totalMs);
  }

  async morph(selector, properties, duration = 600) {
    this._pendingDomAnimations.push({
      type: 'morph', selector, properties, duration, startTime: this._clock
    });
    return this.wait(duration);
  }

  async scroll(selector, duration = 800) {
    this._pendingDomAnimations.push({
      type: 'scroll', selector, duration, startTime: this._clock
    });
    return this.wait(duration);
  }

  // ── Cursor methods (private) ──

  _cursorAt(x, y) {
    this._cursorX = x;
    this._cursorY = y;
    this._cursorVisible = true;
  }

  _cursorShow(pos) {
    if (pos) { this._cursorX = pos.x || pos[0]; this._cursorY = pos.y || pos[1]; }
    this._cursorVisible = true;
  }

  _cursorHide() {
    this._cursorVisible = false;
  }

  async _cursorMoveTo(x, y, duration = 1000) {
    this._pendingDomAnimations.push({
      type: 'cursorMove', fromX: this._cursorX, fromY: this._cursorY,
      toX: x, toY: y, duration, startTime: this._clock
    });
    this._cursorVisible = true;
    await this.wait(duration);
    this._cursorX = x;
    this._cursorY = y;
  }

  async _cursorMoveToEl(selector, duration = 1000) {
    const center = await this.getCenter(selector);
    return this._cursorMoveTo(center.x, center.y, duration);
  }

  async _cursorClick() {
    this._clickFx = { x: this._cursorX, y: this._cursorY, startTime: this._clock, duration: 350 };
    return this.wait(350);
  }

  async _cursorClickEl(selector) {
    await this._cursorMoveToEl(selector, 400);
    return this._cursorClick();
  }

  // ── Frame state ──

  /**
   * Get the interpolated state at a specific time for rendering a frame.
   */
  getStateAt(timeMs) {
    const state = {
      cursorX: this._cursorX,
      cursorY: this._cursorY,
      cursorVisible: this._cursorVisible,
      clickFx: null,
      highlights: [],
      domUpdates: []
    };

    // Interpolate cursor moves
    for (const anim of this._pendingDomAnimations) {
      if (anim.type === 'cursorMove' && timeMs >= anim.startTime && timeMs <= anim.startTime + anim.duration) {
        const t = (timeMs - anim.startTime) / anim.duration;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
        state.cursorX = anim.fromX + (anim.toX - anim.fromX) * ease;
        state.cursorY = anim.fromY + (anim.toY - anim.fromY) * ease;
        state.cursorVisible = true;
      }
    }

    // Click effect
    if (this._clickFx && timeMs >= this._clickFx.startTime && timeMs < this._clickFx.startTime + this._clickFx.duration) {
      const t = (timeMs - this._clickFx.startTime) / this._clickFx.duration;
      state.clickFx = { x: this._clickFx.x, y: this._clickFx.y, progress: t };
    }

    // Highlights
    for (const hl of this._highlights) {
      if (timeMs >= hl.startTime && timeMs < hl.startTime + hl.duration) {
        const t = (timeMs - hl.startTime) / hl.duration;
        state.highlights.push({ ...hl, alpha: hl.alpha * (1 - t) });
      }
    }

    // DOM animation updates to apply via page.evaluate
    for (const anim of this._pendingDomAnimations) {
      if (timeMs < anim.startTime || timeMs > anim.startTime + (anim.duration || anim.totalMs || 0)) continue;
      const t = Math.min(1, (timeMs - anim.startTime) / (anim.duration || anim.totalMs || 1));
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      switch (anim.type) {
        case 'fadeIn':
          state.domUpdates.push({ selector: anim.selector, styles: { opacity: String(ease) } });
          break;
        case 'fadeOut':
          state.domUpdates.push({ selector: anim.selector, styles: { opacity: String(1 - ease) } });
          break;
        case 'slideIn':
          state.domUpdates.push({
            selector: anim.selector,
            styles: { opacity: String(ease), transform: `translateY(${anim.distance * (1 - ease)}px)` }
          });
          break;
        case 'zoomIn':
          state.domUpdates.push({
            selector: anim.selector,
            styles: { opacity: String(ease), transform: `scale(${0.5 + 0.5 * ease})` }
          });
          break;
        case 'scale':
          state.domUpdates.push({
            selector: anim.selector,
            styles: { transform: `scale(${anim.from + (anim.to - anim.from) * ease})` }
          });
          break;
        case 'typewriter':
          state.domUpdates.push({
            selector: anim.selector,
            innerHTML: anim.text.substring(0, Math.floor(anim.text.length * t))
          });
          break;
      }
    }

    return state;
  }

  // ── Internal ──

  _advanceTo(targetMs) {
    this._clock = targetMs;
    return Promise.resolve();
  }

  get clock() { return this._clock; }
  set aborted(v) { this._aborted = v; }
}

module.exports = { AnimationAPI };
