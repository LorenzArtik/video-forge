'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

// Track render state
let renderState = { landscape: 'idle', portrait: 'idle' }; // idle | rendering | done | error
let renderMessages = { landscape: '', portrait: '' };

async function startPreview(project, options = {}) {
  const { port = 3333 } = options;
  const projectDir = project._dir;
  const playerHtml = buildPlayerHtml(project);
  const vforgeBin = path.join(__dirname, '..', '..', 'bin', 'vforge.js');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(playerHtml);
      return;
    }

    // API: start render
    if (url.pathname === '/api/render') {
      const format = url.searchParams.get('format') || '16:9';
      const key = format === '9:16' ? 'portrait' : 'landscape';
      if (renderState[key] === 'rendering') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'rendering', message: renderMessages[key] }));
        return;
      }
      renderState[key] = 'rendering';
      renderMessages[key] = 'Avvio render...';
      const args = ['render'];
      if (format === '9:16') args.push('--format', '9:16');
      const proc = spawn('node', [vforgeBin, ...args], { cwd: projectDir, env: { ...process.env } });
      let output = '';
      proc.stdout.on('data', d => { output += d.toString(); renderMessages[key] = d.toString().trim().slice(-80); });
      proc.stderr.on('data', d => { output += d.toString(); renderMessages[key] = d.toString().trim().slice(-80); });
      proc.on('close', code => {
        if (code === 0) { renderState[key] = 'done'; renderMessages[key] = 'Completato'; }
        else { renderState[key] = 'error'; renderMessages[key] = 'Errore: ' + output.slice(-200); }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started' }));
      return;
    }

    // API: render status
    if (url.pathname === '/api/render-status') {
      const outputDir = path.join(projectDir, 'output');
      const landFile = path.join(outputDir, 'video.mp4');
      const portFile = path.join(outputDir, 'video-vertical.mp4');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        landscape: { status: renderState.landscape, message: renderMessages.landscape, exists: fs.existsSync(landFile), size: fs.existsSync(landFile) ? (fs.statSync(landFile).size / 1048576).toFixed(1) + ' MB' : null },
        portrait: { status: renderState.portrait, message: renderMessages.portrait, exists: fs.existsSync(portFile), size: fs.existsSync(portFile) ? (fs.statSync(portFile).size / 1048576).toFixed(1) + ' MB' : null }
      }));
      return;
    }

    // Serve output videos for download
    if (url.pathname.startsWith('/output/')) {
      const filePath = path.join(projectDir, url.pathname);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const filename = path.basename(filePath);
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': stat.size,
          'Content-Disposition': 'attachment; filename="' + filename + '"'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    const filePath = path.join(projectDir, url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.woff2':'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    res.writeHead(404); res.end('Not found');
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log('[vforge] Preview: http://localhost:' + port);
      resolve(server);
    });
  });
}

function buildPlayerHtml(project) {
  const W = project.settings.resolution.width;
  const H = project.settings.resolution.height;
  const musicUrl = project.audio?.backgroundMusic?._path ? '/assets/' + path.basename(project.audio.backgroundMusic._path) : (project.audio?.backgroundMusic?.src || '');
  const musicVol = project.audio?.backgroundMusic?.volume ?? 0.08;

  const scenesJson = JSON.stringify(project.scenes.map(s => ({
    id: s.id, html: s._htmlContent, narration: s.narration || '',
    duration: s.duration, animations: s.animations || [],
    audioUrl: s._audioPath ? '/audio/' + path.basename(s._audioPath) : null,
    audioDuration: s._audioDuration || 0
  })));
  const vertJson = JSON.stringify((project.scenesVertical || []).map(s => ({
    id: s.id, html: s._htmlContent, animations: s.animations || []
  })));

  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>${project.meta?.title || 'Video Forge'}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a12;--card:#12121e;--border:rgba(255,255,255,.06);--primary:#3b82f6;--green:#22c55e;--t1:#f1f5f9;--t2:#94a3b8;--t3:#475569;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--t1);height:100vh;display:flex;flex-direction:column;overflow:hidden;}

/* Header */
.hdr{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--border);flex-shrink:0;}
.hdr-logo{display:flex;align-items:center;gap:8px;}
.hdr-icon{width:28px;height:28px;background:linear-gradient(135deg,var(--primary),#8b5cf6);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;}
.hdr-text{font-size:14px;font-weight:600;} .hdr-text span{color:var(--t3);font-weight:400;}
.hdr-title{font-size:13px;color:var(--t2);}
.hdr-live{font-size:10px;font-weight:700;color:var(--t3);display:flex;align-items:center;gap:5px;letter-spacing:.4px;}
.hdr-live.on{color:var(--green);} .hdr-live.on::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse 1.5s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

/* Main area: two viewports side by side */
.main{flex:1;display:flex;gap:16px;padding:12px 20px;min-height:0;}

/* Each viewport panel */
.panel{display:flex;flex-direction:column;min-height:0;}
.panel-land{flex:2;}
.panel-port{flex:1;max-width:320px;}
.panel-label{font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.5px;margin-bottom:6px;display:flex;align-items:center;gap:6px;}
.panel-label .badge{padding:2px 6px;background:rgba(59,130,246,.15);color:var(--primary);border-radius:4px;font-size:9px;}

.vp-wrap{flex:1;background:#111;border-radius:10px;overflow:hidden;position:relative;min-height:0;}
.vp-frame{position:absolute;top:0;left:0;transform-origin:top left;}
.vp-frame iframe{border:none;display:block;}

/* Subtitle overlay */
.sub-ov{position:absolute;bottom:12px;left:0;right:0;display:none;z-index:50;pointer-events:none;text-align:center;}
.sub-ov span.sub-inner{display:inline-block;padding:4px 12px;border-radius:6px;background:rgba(0,0,0,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font-size:11px;text-align:center;max-width:90%;line-height:1.4;}
.sub-w{color:rgba(255,255,255,.3);transition:color .1s ease;} .sub-w.on{color:rgba(255,255,255,.95);}

/* Control bar */
.cbar{height:48px;display:flex;align-items:center;padding:0 20px;gap:10px;border-top:1px solid var(--border);flex-shrink:0;}
.cb{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;font-family:inherit;}
.cb:hover{background:rgba(255,255,255,.1);color:#fff;} .cb svg{width:14px;height:14px;fill:currentColor;}
.cb-play{width:36px;height:36px;background:var(--primary);border-color:var(--primary);color:#fff;} .cb-play:hover{opacity:.9;}
.sep{width:1px;height:24px;background:rgba(255,255,255,.1);}
.dots{display:flex;gap:3px;} .dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.12);border:none;padding:0;cursor:pointer;transition:.3s;}
.dot.on{background:var(--primary);width:16px;border-radius:3px;} .dot.done{background:var(--green);}
.sub-bar{flex:1;font-size:11px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sub-bar .sub-w{color:rgba(255,255,255,.2);transition:color .12s;} .sub-bar .sub-w.on{color:rgba(255,255,255,.7);}
.audio-ind{display:flex;align-items:center;gap:3px;} .abar{width:2px;border-radius:1px;background:var(--primary);}
.abar:nth-child(1){height:8px;animation:wave 1s ease infinite;} .abar:nth-child(2){height:12px;animation:wave 1s ease infinite .15s;}
.abar:nth-child(3){height:6px;animation:wave 1s ease infinite .3s;} .abar:nth-child(4){height:10px;animation:wave 1s ease infinite .45s;}
@keyframes wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
.audio-ind.off .abar{animation:none;transform:scaleY(.25);}
.vol{display:flex;align-items:center;gap:4px;}
.vol input{width:50px;height:3px;-webkit-appearance:none;background:rgba(255,255,255,.15);border-radius:2px;outline:none;}
.vol input::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;background:var(--primary);cursor:pointer;}
.progress{height:2px;background:rgba(255,255,255,.04);} .progress-fill{height:100%;background:var(--primary);width:0%;transition:width .3s;}
.render-btn{background:rgba(34,197,94,.1)!important;border-color:rgba(34,197,94,.2)!important;color:var(--green)!important;font-size:10px;}
.render-btn:hover{background:rgba(34,197,94,.2)!important;}
.render-panel{padding:8px 20px;border-top:1px solid var(--border);flex-shrink:0;}
.rp-row{display:flex;gap:12px;}
.rp-card{flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:12px;}
.rp-label{font-size:11px;font-weight:700;color:var(--t2);min-width:90px;}
.rp-status{flex:1;font-size:11px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rp-status.rendering{color:#f59e0b;} .rp-status.done{color:var(--green);} .rp-status.error{color:#ef4444;}
.rp-actions{display:flex;gap:6px;}
.rp-btn{padding:5px 12px;font-size:11px;font-weight:600;font-family:inherit;border-radius:6px;border:none;cursor:pointer;background:var(--primary);color:#fff;transition:.15s;text-decoration:none;}
.rp-btn:hover{opacity:.85;}
.rp-dl{background:var(--green);display:inline-flex;align-items:center;gap:4px;}
</style></head><body>

<div class="hdr">
  <div class="hdr-logo"><div class="hdr-icon">V</div><div class="hdr-text">Video Forge <span>Preview</span></div></div>
  <div class="hdr-title">${project.meta?.title || ''}</div>
  <div class="hdr-live" id="live">PREVIEW</div>
</div>
<div class="progress"><div class="progress-fill" id="prog"></div></div>

<div class="main">
  <!-- 16:9 panel -->
  <div class="panel panel-land">
    <div class="panel-label"><span class="badge">16:9</span> Landscape</div>
    <div class="vp-wrap" id="vpL">
      <div class="vp-frame" id="frameL"></div>
    </div>
  </div>
  <!-- 9:16 panel -->
  <div class="panel panel-port">
    <div class="panel-label"><span class="badge">9:16</span> Portrait</div>
    <div class="vp-wrap" id="vpP">
      <div class="vp-frame" id="frameP"></div>
    </div>
  </div>
</div>

<div class="cbar">
  <button class="cb cb-play" id="btnPlay" onclick="togglePlay()"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
  <div class="audio-ind off" id="aInd"><div class="abar"></div><div class="abar"></div><div class="abar"></div><div class="abar"></div></div>
  <div class="sep"></div>
  <div class="sub-bar" id="subBar"></div>
  <div class="sep"></div>
  <div class="dots" id="dots"></div>
  <div class="sep"></div>
  <button class="cb" onclick="prev()"><svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
  <button class="cb" onclick="next()"><svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>
  <div class="sep"></div>
  <div class="vol">
    <button class="cb" onclick="toggleMute()"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
    <input type="range" min="0" max="100" value="80" oninput="setVol(this.value)">
  </div>
  <div class="sep"></div>
  <!-- Render buttons -->
  <button class="cb render-btn" id="btnRenderL" onclick="startRender('16:9')" title="Render 16:9">
    <svg viewBox="0 0 24 24" style="width:12px;height:12px;"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>
  </button>
  <button class="cb render-btn" id="btnRenderP" onclick="startRender('9:16')" title="Render 9:16">
    <svg viewBox="0 0 24 24" style="width:10px;height:14px;"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>
  </button>
</div>

<!-- Render panel -->
<div class="render-panel" id="renderPanel" style="display:none;">
  <div class="rp-row">
    <div class="rp-card" id="rpLand">
      <div class="rp-label">16:9 Landscape</div>
      <div class="rp-status" id="rpLandStatus">Pronto</div>
      <div class="rp-actions">
        <button class="rp-btn" onclick="startRender('16:9')">Genera MP4</button>
        <a class="rp-btn rp-dl" id="rpLandDl" style="display:none" href="/output/video.mp4">Scarica</a>
      </div>
    </div>
    <div class="rp-card" id="rpPort">
      <div class="rp-label">9:16 Portrait</div>
      <div class="rp-status" id="rpPortStatus">Pronto</div>
      <div class="rp-actions">
        <button class="rp-btn" onclick="startRender('9:16')">Genera MP4</button>
        <a class="rp-btn rp-dl" id="rpPortDl" style="display:none" href="/output/video-vertical.mp4">Scarica</a>
      </div>
    </div>
  </div>
</div>

<script>
const scenes=${scenesJson};
const vert=${vertJson};
const WL=${W},HL=${H};
const WP=1080,HP=1920; // portrait 9:16
const MUSIC='${musicUrl}',MVOL=${musicVol};
let idx=0,playing=false,aborted=false,audio=null,bgm=null,vol=0.8,muted=false,timers=[];

// Size viewports
function sizeAll(){
  size('vpL','frameL',WL,HL);
  size('vpP','frameP',WP,HP);
}
function size(wrapId,frameId,w,h){
  const wrap=document.getElementById(wrapId);
  const frame=document.getElementById(frameId);
  const ww=wrap.offsetWidth,wh=wrap.offsetHeight;
  const s=Math.min(ww/w,wh/h);
  frame.style.width=w+'px';frame.style.height=h+'px';
  frame.style.transform='scale('+s+')';
}
window.addEventListener('resize',sizeAll);

// Dots
const dotsEl=document.getElementById('dots');
scenes.forEach((_,i)=>{const d=document.createElement('button');d.className='dot';d.onclick=()=>{stop();show(i,true);};dotsEl.appendChild(d);});
function updateDots(){dotsEl.querySelectorAll('.dot').forEach((d,i)=>{d.className='dot'+(i===idx?' on':i<idx?' done':'');});}

// Show scene in both viewports
function show(i,vis){
  idx=i;updateDots();
  document.getElementById('live').textContent='SCENE '+(i+1)+'/'+scenes.length;
  loadFrame('frameL',scenes[i].html,WL,HL,vis);
  // Portrait: use vertical scene HTML if available, fallback to landscape
  const vScene=vert[i];
  loadFrame('frameP',vScene?vScene.html:scenes[i].html,WP,HP,vis);
  sizeAll();
  return new Promise(r=>setTimeout(r,400));
}
function loadFrame(id,html,w,h,vis){
  const el=document.getElementById(id);
  el.innerHTML='';
  const f=document.createElement('iframe');
  f.style.width=w+'px';f.style.height=h+'px';
  const visCSS=vis?'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}':'';
  const subCSS='.vf-sub{position:fixed;bottom:24px;left:0;right:0;text-align:center;z-index:9999;pointer-events:none;display:none;padding:0 20px;}.vf-sub-inner{display:inline-block;padding:6px 16px;border-radius:8px;background:rgba(0,0,0,.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font-size:'+(w>1200?'18':'24')+'px;line-height:1.4;max-width:90%;}.vf-sw{color:rgba(255,255,255,.3);transition:color .1s}.vf-sw.on{color:rgba(255,255,255,.95)}';
  f.srcdoc='<!DOCTYPE html><html><head><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel=stylesheet><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:'+w+'px;height:'+h+'px;overflow:hidden;font-family:Inter,system-ui,sans-serif}'+visCSS+subCSS+'</style></head><body>'+html+'<div class="vf-sub" id="vf-sub"><span class="vf-sub-inner" id="vf-sub-inner"></span></div></body></html>';
  el.appendChild(f);
}
function getDoc(id){const f=document.getElementById(id).querySelector('iframe');try{return f?(f.contentDocument||f.contentWindow.document):null;}catch(e){return null;}}

// Animation engine
function W8(ms){return new Promise(r=>{const t=setTimeout(r,ms);timers.push(t);})}
function W8N(frac,dur){
  if(!dur||dur<=0)return Promise.resolve();
  if(!audio||audio.paused)return W8(dur*1000*frac);
  return new Promise(r=>{
    const tgt=dur*frac;const s=setTimeout(r,(dur*frac+2)*1000);timers.push(s);
    const ck=()=>{if(aborted||!audio){clearTimeout(s);r();return;}if(audio.currentTime>=tgt){clearTimeout(s);r();return;}requestAnimationFrame(ck);};ck();
  });
}
function anim(el,props,dur){return new Promise(r=>{if(!el){r();return;}el.style.transition='all '+dur+'ms cubic-bezier(.4,0,.2,1)';void el.offsetWidth;requestAnimationFrame(()=>{for(const[k,v]of Object.entries(props))el.style[k]=v;const t=setTimeout(r,dur+30);timers.push(t);});})}

// Run animation on a single viewport
async function runAnimOn(a,dur,frameId){
  if(aborted)return;
  const doc=getDoc(frameId);
  const el=a.target&&doc?doc.querySelector(a.target):null;

  switch(a.type){
    case 'wait':
      if(a.until&&a.until.startsWith('narration:'))await W8N(parseFloat(a.until.split(':')[1]),dur);
      else await W8(a.ms||500);break;
    case 'parallel':
      if(a.actions)await Promise.all(a.actions.map(x=>runAnimOn(x,dur,frameId)));break;
    case 'fadeIn':
      await anim(el,{opacity:'1'},a.duration||800);break;
    case 'fadeOut':
      await anim(el,{opacity:'0'},a.duration||800);break;
    case 'slideIn':{
      const d=a.distance||40;const tf={bottom:'Y('+d,top:'Y(-'+d,left:'X(-'+d,right:'X('+d};const dir=tf[a.from||'bottom']||tf.bottom;
      if(el){el.style.transition='none';el.style.opacity='0';el.style.transform='translate'+dir+'px)';void el.offsetWidth;}
      await anim(el,{opacity:'1',transform:'translate(0,0)'},a.duration||600);break;}
    case 'zoomIn':
      if(el){el.style.transition='none';el.style.opacity='0';el.style.transform='scale(0.5)';void el.offsetWidth;}
      await anim(el,{opacity:'1',transform:'scale(1)'},a.duration||600);break;
    case 'scale':
      await anim(el,{transform:'scale('+(a.to||1.2)+')'},a.duration||600);break;
    case 'highlight':
      if(el){el.style.transition='box-shadow '+(a.duration||800)+'ms ease';el.style.boxShadow='0 0 0 3px rgba(59,130,246,.5),0 0 20px rgba(59,130,246,.3)';}
      await W8(a.duration||800);
      if(el){el.style.transition='box-shadow 400ms ease';el.style.boxShadow='none';}break;
    case 'counter':
      if(el){const from=a.from||0,to=a.to||100,steps=Math.min(Math.abs(to-from),60),ms=(a.duration||1000)/steps;
        for(let i=0;i<=steps&&!aborted;i++){const v=Math.round(from+(to-from)*(i/steps));el.textContent=a.format?a.format.replace('{}',v):String(v);await W8(ms);}}break;
    case 'typewriter':
      if(el&&a.text){for(let i=0;i<=a.text.length&&!aborted;i++){el.textContent=a.text.substring(0,i);await W8(a.speed||30);}el.textContent=a.text;}break;
    default:await W8(a.duration||300);
  }
}

// Subtitles
let sents=[],stw=0,csi=-1;
function initSub(t){['subL','subP','subBar'].forEach(id=>{const e=document.getElementById(id);if(e){e.style.display='none';e.innerHTML='';}});sents=[];csi=-1;stw=0;if(!t)return;sents=(t.match(/[^.!?]+[.!?]+[\\s]?|[^.!?]+$/g)||[t]).map(s=>s.trim()).filter(Boolean);stw=t.split(/\\s+/).length;}
function updSub(p){if(!sents.length)return;const wi=Math.floor(p*stw);let c=0;
  for(let i=0;i<sents.length;i++){const sw=sents[i].split(/\\s+/).length;if(wi<c+sw||i===sents.length-1){
    if(i!==csi){csi=i;const ws=sents[i].split(/\\s+/);const h=ws.map(w=>'<span class="vf-sw">'+w+'</span>').join(' ');
      // Write into iframes
      ['frameL','frameP'].forEach(fid=>{const doc=getDoc(fid);if(!doc)return;const el=doc.getElementById('vf-sub');const inner=doc.getElementById('vf-sub-inner');if(el&&inner){inner.innerHTML=h;el.style.display='block';}});
      // Also write to control bar
      const hBar=ws.map(w=>'<span class="sub-w">'+w+'</span>').join(' ');
      {const e=document.getElementById('subBar');if(e){e.innerHTML=hBar;e.style.display='block';}}}
    const li=wi-c;
    // Update iframe subtitles
    ['frameL','frameP'].forEach(fid=>{const doc=getDoc(fid);if(!doc)return;doc.querySelectorAll('.vf-sw').forEach((e,j)=>{e.classList.toggle('on',j<=li);});});
    // Update bar
    document.getElementById('subBar')?.querySelectorAll('.sub-w').forEach((e,j)=>{e.classList.toggle('on',j<=li);});
    return;}c+=sw;}}
function clrSub(){
  ['frameL','frameP'].forEach(fid=>{const doc=getDoc(fid);if(!doc)return;const el=doc.getElementById('vf-sub');if(el){el.style.display='none';el.querySelector('#vf-sub-inner').innerHTML='';}});
  {const e=document.getElementById('subBar');if(e){e.style.display='none';e.innerHTML='';}}
  sents=[];csi=-1;}

// Audio
function setVol(v){vol=v/100;applyVol();} function toggleMute(){muted=!muted;applyVol();}
function applyVol(){const v=muted?0:vol;if(audio)audio.volume=v;if(bgm)bgm.volume=v*MVOL/0.8;}
function startBgm(){if(!MUSIC||bgm)return;bgm=new Audio(MUSIC);bgm.loop=true;bgm.volume=(muted?0:vol)*MVOL/0.8;bgm.play().catch(()=>{});}
function stopBgm(){if(bgm){bgm.pause();bgm=null;}}

// Play scene
async function playScene(i){
  idx=i;updateDots();
  document.getElementById('live').textContent='SCENE '+(i+1)+'/'+scenes.length;
  await show(i,false);
  const s=scenes[i],dur=s.audioDuration||0;
  if(s.audioUrl){try{audio=new Audio(s.audioUrl);audio.volume=muted?0:vol;await audio.play();
    document.getElementById('aInd').classList.remove('off');initSub(s.narration);
    audio.addEventListener('timeupdate',()=>{if(dur>0)updSub(audio.currentTime/dur);});
    audio.addEventListener('ended',()=>{document.getElementById('aInd').classList.add('off');});
  }catch(e){audio=null;initSub(s.narration);}}
  // Run landscape + vertical animations in parallel
  const vScene=vert[i];
  const runL=async()=>{for(const a of s.animations){if(aborted)break;await runAnimOn(a,dur,'frameL');}};
  const runP=async()=>{const anims=vScene?vScene.animations:s.animations;for(const a of anims){if(aborted)break;await runAnimOn(a,dur,'frameP');}};
  await Promise.all([runL(),runP()]);
  if(audio&&!audio.ended&&!aborted)await new Promise(r=>{audio.addEventListener('ended',r);setTimeout(r,Math.max(0,(dur-(audio?.currentTime||0)+1))*1000);});
  clrSub();document.getElementById('aInd').classList.add('off');if(!aborted)await W8(300);
}

async function playAll(){
  if(playing)return;playing=true;aborted=false;
  document.getElementById('btnPlay').innerHTML='<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  const l=document.getElementById('live');l.classList.add('on');startBgm();
  for(let i=0;i<scenes.length;i++){if(aborted)break;document.getElementById('prog').style.width=((i/scenes.length)*100)+'%';await playScene(i);}
  document.getElementById('prog').style.width='100%';stop(true);show(scenes.length-1,true);
}
function stop(q){aborted=true;playing=false;timers.forEach(t=>clearTimeout(t));timers=[];if(audio){audio.pause();audio=null;}stopBgm();clrSub();
  document.getElementById('aInd').classList.add('off');document.getElementById('btnPlay').innerHTML='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const l=document.getElementById('live');l.classList.remove('on');l.textContent='PREVIEW';if(!q)show(idx,true);}
function togglePlay(){if(playing)stop();else playAll();}
function prev(){stop();if(idx>0)show(idx-1,true);}
function next(){stop();if(idx<scenes.length-1)show(idx+1,true);}

sizeAll();show(0,true);

// Render
const renderPanel=document.getElementById('renderPanel');
function startRender(fmt){
  renderPanel.style.display='block';
  const isPort=fmt==='9:16';
  const statusEl=document.getElementById(isPort?'rpPortStatus':'rpLandStatus');
  statusEl.textContent='Avvio render...';statusEl.className='rp-status rendering';
  fetch('/api/render?format='+encodeURIComponent(fmt)).then(r=>r.json()).then(()=>{pollRender();});
}
let pollTimer=null;
function pollRender(){
  if(pollTimer)clearInterval(pollTimer);
  pollTimer=setInterval(()=>{
    fetch('/api/render-status').then(r=>r.json()).then(d=>{
      // Landscape
      const ls=document.getElementById('rpLandStatus');
      const ld=document.getElementById('rpLandDl');
      ls.textContent=d.landscape.message||d.landscape.status;
      ls.className='rp-status '+(d.landscape.status==='rendering'?'rendering':d.landscape.status==='done'?'done':d.landscape.status==='error'?'error':'');
      if(d.landscape.exists){ld.style.display='inline-flex';ld.textContent='Scarica '+d.landscape.size;}else{ld.style.display='none';}
      // Portrait
      const ps=document.getElementById('rpPortStatus');
      const pd=document.getElementById('rpPortDl');
      ps.textContent=d.portrait.message||d.portrait.status;
      ps.className='rp-status '+(d.portrait.status==='rendering'?'rendering':d.portrait.status==='done'?'done':d.portrait.status==='error'?'error':'');
      if(d.portrait.exists){pd.style.display='inline-flex';pd.textContent='Scarica '+d.portrait.size;}else{pd.style.display='none';}
      // Stop polling if both done/error/idle
      if(d.landscape.status!=='rendering'&&d.portrait.status!=='rendering'){clearInterval(pollTimer);pollTimer=null;}
    });
  },2000);
}
// Check initial status
fetch('/api/render-status').then(r=>r.json()).then(d=>{
  if(d.landscape.exists||d.portrait.exists){renderPanel.style.display='block';pollRender();}
});
</script></body></html>`;
}

module.exports = { startPreview };
