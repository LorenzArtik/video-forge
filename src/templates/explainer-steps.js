'use strict';

module.exports = {
  description: 'Problem -> Solution -> Demo explainer video',
  project: {
    version: '1.0',
    meta: { title: '', description: 'Explainer video' },
    settings: {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: '16:9'
    },
    audio: {
      tts: { provider: 'gemini', voice: 'Kore', language: 'it-IT' },
      backgroundMusic: { src: './assets/music.mp3', volume: 0.06, fadeIn: 2000, fadeOut: 3000 }
    },
    subtitles: { enabled: true, style: 'word-highlight', position: 'bottom', fontSize: 24 },
    scenes: [
      {
        id: 'problem',
        html: './scenes/problem.html',
        narration: 'Hai mai avuto questo problema? Non sei solo.',
        duration: 'auto',
        animations: [
          { type: 'wait', ms: 500 },
          { type: 'fadeIn', target: '#problem-icon', duration: 600 },
          { type: 'wait', until: 'narration:0.3' },
          { type: 'slideIn', target: '#problem-text', from: 'bottom', duration: 700 }
        ]
      },
      {
        id: 'solution',
        html: './scenes/solution.html',
        narration: 'Ecco la soluzione che stavai cercando.',
        duration: 'auto',
        animations: [
          { type: 'wait', ms: 300 },
          { type: 'zoomIn', target: '#solution-hero', duration: 800 },
          { type: 'wait', until: 'narration:0.5' },
          { type: 'fadeIn', target: '#solution-desc', duration: 600 }
        ]
      },
      {
        id: 'demo',
        html: './scenes/demo.html',
        narration: 'Guarda come funziona in pratica.',
        duration: 'auto',
        animations: [
          { type: 'cursor.show', at: [200, 300] },
          { type: 'wait', until: 'narration:0.2' },
          { type: 'cursor.moveTo', target: '#step-1', duration: 800 },
          { type: 'highlight', target: '#step-1', duration: 600 },
          { type: 'wait', until: 'narration:0.5' },
          { type: 'cursor.moveTo', target: '#step-2', duration: 800 },
          { type: 'highlight', target: '#step-2', duration: 600 },
          { type: 'wait', until: 'narration:0.8' },
          { type: 'cursor.moveTo', target: '#step-3', duration: 800 },
          { type: 'cursor.click' }
        ]
      }
    ]
  },
  scenes: [
    {
      path: 'scenes/problem.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#1a1a2e;">
  <div style="text-align:center;color:#fff;max-width:800px;">
    <div id="problem-icon" style="font-size:80px;margin-bottom:24px;opacity:0;">?</div>
    <h2 id="problem-text" style="font-size:48px;font-weight:700;line-height:1.3;opacity:0;">Il problema che tutti conoscono</h2>
  </div>
</div>`
    },
    {
      path: 'scenes/solution.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#11998e,#38ef7d);">
  <div style="text-align:center;color:#fff;">
    <h2 id="solution-hero" style="font-size:56px;font-weight:800;margin-bottom:20px;opacity:0;">La soluzione</h2>
    <p id="solution-desc" style="font-size:24px;max-width:700px;line-height:1.5;opacity:0;">Descrizione chiara di come risolve il problema.</p>
  </div>
</div>`
    },
    {
      path: 'scenes/demo.html',
      html: `<div style="width:100%;height:100%;background:#f5f5f5;padding:60px;">
  <h3 style="font-size:32px;font-weight:700;color:#333;margin-bottom:40px;text-align:center;">Come funziona</h3>
  <div style="display:flex;gap:32px;justify-content:center;">
    <div id="step-1" style="width:280px;background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="width:40px;height:40px;background:#667eea;border-radius:50%;color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">1</div>
      <p style="color:#333;font-size:16px;">Primo passaggio</p>
    </div>
    <div id="step-2" style="width:280px;background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="width:40px;height:40px;background:#f093fb;border-radius:50%;color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">2</div>
      <p style="color:#333;font-size:16px;">Secondo passaggio</p>
    </div>
    <div id="step-3" style="width:280px;background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="width:40px;height:40px;background:#38ef7d;border-radius:50%;color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">3</div>
      <p style="color:#333;font-size:16px;">Risultato finale</p>
    </div>
  </div>
</div>`
    }
  ]
};
