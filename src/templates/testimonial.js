'use strict';

module.exports = {
  description: 'Testimonial / quote card video',
  project: {
    version: '1.0',
    meta: { title: '', description: 'Testimonial video' },
    settings: {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: '16:9'
    },
    audio: {
      tts: { provider: 'gemini', voice: 'Kore', language: 'it-IT' },
      backgroundMusic: { src: './assets/music.mp3', volume: 0.05, fadeIn: 1500, fadeOut: 2000 }
    },
    subtitles: { enabled: false },
    scenes: [
      {
        id: 'quote',
        html: './scenes/quote.html',
        narration: 'La testimonianza del cliente.',
        duration: 'auto',
        animations: [
          { type: 'wait', ms: 500 },
          { type: 'fadeIn', target: '#quote-mark', duration: 400 },
          { type: 'wait', ms: 200 },
          { type: 'fadeIn', target: '#quote-text', duration: 800 },
          { type: 'wait', until: 'narration:0.7' },
          { type: 'slideIn', target: '#author', from: 'bottom', duration: 600 }
        ]
      }
    ]
  },
  scenes: [
    {
      path: 'scenes/quote.html',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#2c3e50,#3498db);">
  <div style="max-width:900px;text-align:center;color:#fff;padding:60px;">
    <div id="quote-mark" style="font-size:120px;font-weight:300;line-height:1;color:rgba(255,255,255,0.3);margin-bottom:-20px;opacity:0;">"</div>
    <p id="quote-text" style="font-size:36px;font-weight:500;line-height:1.5;margin-bottom:40px;opacity:0;">La tua citazione testimoniale qui. Qualcosa di impattante e autentico.</p>
    <div id="author" style="opacity:0;">
      <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;"></div>
      <p style="font-size:20px;font-weight:700;">Nome Cliente</p>
      <p style="font-size:16px;color:rgba(255,255,255,0.7);">Ruolo, Azienda</p>
    </div>
  </div>
</div>`
    }
  ]
};
