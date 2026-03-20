'use strict';

module.exports = {
  description: 'Hero + features + CTA for product launches',
  project: {
    version: '1.0',
    meta: { title: '', description: 'Product launch video' },
    settings: {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: '16:9'
    },
    audio: {
      tts: { provider: 'gemini', voice: 'Kore', language: 'it-IT' },
      backgroundMusic: { src: './assets/music.mp3', volume: 0.08, fadeIn: 2000, fadeOut: 3000 }
    },
    subtitles: { enabled: true, style: 'word-highlight', position: 'bottom', fontSize: 24 },
    scenes: [
      {
        id: 'hero',
        html: './scenes/hero.html',
        narration: 'Presentazione del prodotto con un impatto visivo forte.',
        duration: 'auto',
        transition: { type: 'fadeIn', duration: 500 },
        animations: [
          { type: 'wait', ms: 300 },
          { type: 'fadeIn', target: '#logo', duration: 600 },
          { type: 'wait', until: 'narration:0.2' },
          { type: 'slideIn', target: '#headline', from: 'bottom', duration: 800 },
          { type: 'wait', until: 'narration:0.6' },
          { type: 'fadeIn', target: '#tagline', duration: 600 }
        ]
      },
      {
        id: 'features',
        html: './scenes/features.html',
        narration: 'Le funzionalita principali che rendono unico il prodotto.',
        duration: 'auto',
        transition: { type: 'fadeIn', duration: 300 },
        animations: [
          { type: 'wait', ms: 200 },
          { type: 'slideIn', target: '#feature-1', from: 'left', duration: 600 },
          { type: 'wait', until: 'narration:0.35' },
          { type: 'slideIn', target: '#feature-2', from: 'right', duration: 600 },
          { type: 'wait', until: 'narration:0.7' },
          { type: 'slideIn', target: '#feature-3', from: 'left', duration: 600 }
        ]
      },
      {
        id: 'cta',
        html: './scenes/cta.html',
        narration: 'Scopri di piu e inizia oggi stesso.',
        duration: 'auto',
        transition: { type: 'fadeIn', duration: 300 },
        animations: [
          { type: 'wait', ms: 200 },
          { type: 'zoomIn', target: '#cta-text', duration: 800 },
          { type: 'wait', until: 'narration:0.5' },
          { type: 'fadeIn', target: '#cta-button', duration: 600 },
          { type: 'highlight', target: '#cta-button', duration: 1000 }
        ]
      }
    ]
  },
  scenes: [
    {
      path: 'scenes/hero.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%);">
  <div style="text-align:center;color:#fff;">
    <div id="logo" style="width:80px;height:80px;margin:0 auto 24px;background:#fff;border-radius:16px;opacity:0;"></div>
    <h1 id="headline" style="font-size:72px;font-weight:800;margin-bottom:16px;letter-spacing:-1px;opacity:0;">Nome Prodotto</h1>
    <p id="tagline" style="font-size:28px;opacity:0;color:rgba(255,255,255,0.8);">La tua tagline qui</p>
  </div>
</div>`
    },
    {
      path: 'scenes/features.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f8f9fa;padding:60px;">
  <div style="display:flex;gap:40px;max-width:1400px;">
    <div id="feature-1" style="flex:1;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);opacity:0;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;margin-bottom:16px;"></div>
      <h3 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#1a1a2e;">Funzionalita 1</h3>
      <p style="font-size:16px;color:#666;line-height:1.5;">Descrizione della prima funzionalita.</p>
    </div>
    <div id="feature-2" style="flex:1;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);opacity:0;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:12px;margin-bottom:16px;"></div>
      <h3 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#1a1a2e;">Funzionalita 2</h3>
      <p style="font-size:16px;color:#666;line-height:1.5;">Descrizione della seconda funzionalita.</p>
    </div>
    <div id="feature-3" style="flex:1;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);opacity:0;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#4facfe,#00f2fe);border-radius:12px;margin-bottom:16px;"></div>
      <h3 style="font-size:24px;font-weight:700;margin-bottom:8px;color:#1a1a2e;">Funzionalita 3</h3>
      <p style="font-size:16px;color:#666;line-height:1.5;">Descrizione della terza funzionalita.</p>
    </div>
  </div>
</div>`
    },
    {
      path: 'scenes/cta.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
  <div style="text-align:center;color:#fff;">
    <h2 id="cta-text" style="font-size:56px;font-weight:800;margin-bottom:32px;opacity:0;">Pronto per iniziare?</h2>
    <a id="cta-button" style="display:inline-block;padding:18px 48px;background:#fff;color:#764ba2;font-size:22px;font-weight:700;border-radius:50px;text-decoration:none;opacity:0;">Inizia ora</a>
  </div>
</div>`
    }
  ]
};
