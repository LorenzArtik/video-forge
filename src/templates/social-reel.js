'use strict';

module.exports = {
  description: '9:16 vertical social media reel',
  project: {
    version: '1.0',
    meta: { title: '', description: 'Social reel video' },
    settings: {
      resolution: { width: 1080, height: 1920 },
      fps: 30,
      aspectRatio: '9:16'
    },
    audio: {
      tts: { provider: 'gemini', voice: 'Kore', language: 'it-IT' },
      backgroundMusic: { src: './assets/music.mp3', volume: 0.10, fadeIn: 500, fadeOut: 1500 }
    },
    subtitles: { enabled: true, style: 'word-highlight', position: 'center', fontSize: 32 },
    scenes: [
      {
        id: 'hook',
        html: './scenes/hook.html',
        narration: 'Lo sapevi che...',
        duration: 'auto',
        animations: [
          { type: 'wait', ms: 200 },
          { type: 'zoomIn', target: '#hook-text', duration: 500 }
        ]
      },
      {
        id: 'content',
        html: './scenes/content.html',
        narration: 'Ecco cosa devi sapere.',
        duration: 'auto',
        animations: [
          { type: 'slideIn', target: '#point-1', from: 'left', duration: 400 },
          { type: 'wait', until: 'narration:0.4' },
          { type: 'slideIn', target: '#point-2', from: 'right', duration: 400 },
          { type: 'wait', until: 'narration:0.7' },
          { type: 'slideIn', target: '#point-3', from: 'left', duration: 400 }
        ]
      },
      {
        id: 'cta',
        html: './scenes/cta.html',
        narration: 'Seguimi per altri consigli.',
        duration: 'auto',
        animations: [
          { type: 'fadeIn', target: '#cta-text', duration: 500 },
          { type: 'wait', until: 'narration:0.5' },
          { type: 'scale', target: '#follow-btn', from: 0.8, to: 1, duration: 400 }
        ]
      }
    ]
  },
  scenes: [
    {
      path: 'scenes/hook.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(180deg,#ff6b6b,#ee5a24);">
  <h1 id="hook-text" style="font-size:64px;font-weight:900;color:#fff;text-align:center;padding:40px;line-height:1.2;opacity:0;">Lo sapevi che...?</h1>
</div>`
    },
    {
      path: 'scenes/content.html',
      html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;width:100%;height:100%;background:#fff;padding:60px;">
  <div id="point-1" style="width:90%;background:#f8f9fa;border-radius:16px;padding:32px;border-left:4px solid #ff6b6b;opacity:0;">
    <p style="font-size:28px;font-weight:600;color:#333;">Punto 1</p>
  </div>
  <div id="point-2" style="width:90%;background:#f8f9fa;border-radius:16px;padding:32px;border-left:4px solid #ffa502;opacity:0;">
    <p style="font-size:28px;font-weight:600;color:#333;">Punto 2</p>
  </div>
  <div id="point-3" style="width:90%;background:#f8f9fa;border-radius:16px;padding:32px;border-left:4px solid #2ed573;opacity:0;">
    <p style="font-size:28px;font-weight:600;color:#333;">Punto 3</p>
  </div>
</div>`
    },
    {
      path: 'scenes/cta.html',
      html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(180deg,#1a1a2e,#16213e);">
  <h2 id="cta-text" style="font-size:48px;font-weight:800;color:#fff;text-align:center;margin-bottom:40px;opacity:0;">Ti e stato utile?</h2>
  <div id="follow-btn" style="padding:16px 40px;background:#ff6b6b;color:#fff;font-size:24px;font-weight:700;border-radius:50px;">Seguimi</div>
</div>`
    }
  ]
};
