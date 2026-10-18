import {FlightModel, SCENE_NAMES} from './flight-model.js';

const $ = id => document.getElementById(id);
const stage = $('flightStage'), canvas = $('flightCanvas'), context = canvas.getContext('2d');
const model = new FlightModel();
const media = matchMedia('(prefers-reduced-motion: reduce)');
const images = new Map(), keys = new Set(), pointers = new Map();
let selected = false, visible = true, raf = 0, last = 0, clock = 0, hudClock = 0;
let width = 1, height = 1, dpr = 1, lastSerial = -1, region = $('travelTitle').textContent;
let assetsRequested = false;
const controls = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down'};
const comments = ['조용한 항해예요. 따뜻한 차 한 잔 드릴까요?', '별 사이에서도, 우리의 집은 여기 있어요.', 'E님과 함께라면 조금 멀리 돌아가도 좋아요.'];
const stars = Array.from({length: 115}, (_, i) => ({x: Math.random(), y: Math.random(), depth: 1 + i % 3, r: .5 + Math.random() * 1.1, phase: Math.random() * 6}));

function loadAssets() {
  if (assetsRequested) return;
  assetsRequested = true;
  for (const name of ['nebula','ring','ice','lava','sun','blackhole','comet','gate','asteroid','constellation', ...Array.from({length:8},(_,i)=>`ship-${String(i+1).padStart(2,'0')}`)]) {
    const im = new Image(); images.set(name, im);
    im.onload = () => { if (selected) draw(); };
    im.onerror = () => { if (selected) draw(); };
    im.src = `assets/flight/${name}.webp`;
  }
}
function ready(name) { const im = images.get(name); return im?.complete && im.naturalWidth ? im : null; }
function fitImage(name, x, y, w, opacity = 1) {
  const im = ready(name); if (!im) return false;
  context.globalAlpha = opacity;
  const h = w * im.naturalHeight / im.naturalWidth;
  context.drawImage(im, x - w/2, y - h/2, w, h); context.globalAlpha = 1;
  return true;
}
function resize() {
  if (!selected) return;
  const box = canvas.getBoundingClientRect();
  width = Math.max(1, box.width); height = Math.max(1, box.height);
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  model.setBounds(width, height); draw();
}
function drawFallbackShip(x, y, w) {
  context.fillStyle = '#ade9ff'; context.beginPath();
  context.moveTo(x+w*.44,y); context.lineTo(x-w*.32,y-w*.19);
  context.lineTo(x-w*.2,y); context.lineTo(x-w*.32,y+w*.19); context.closePath(); context.fill();
  context.fillStyle = '#5bbafa'; context.fillRect(x-w*.22,y-w*.04,w*.35,w*.08);
}
function draw() {
  if (!context || !selected) return;
  const c = context, t = model.time;
  c.setTransform(dpr,0,0,dpr,0,0); c.globalAlpha = 1;
  c.fillStyle = '#080f27'; c.fillRect(0,0,width,height);
  const bg = ready('nebula');
  if (bg) {
    const bw = Math.max(width, height * bg.naturalWidth/bg.naturalHeight), bh = bw * bg.naturalHeight/bg.naturalWidth;
    const shift = t * 4 % bw;
    c.globalAlpha = .66; c.drawImage(bg,-shift,(height-bh)/2,bw,bh); c.drawImage(bg,bw-shift,(height-bh)/2,bw,bh); c.globalAlpha = 1;
  }
  const shade = c.createLinearGradient(0,0,width,height);
  shade.addColorStop(0,'#0c1c3666'); shade.addColorStop(.6,'#1b17372a'); shade.addColorStop(1,'#0a12377d');
  c.fillStyle = shade; c.fillRect(0,0,width,height);
  for (const star of stars) {
    const x = ((star.x * width - t * star.depth * 12) % width + width) % width;
    c.globalAlpha = .45 + Math.sin(t*.8 + star.phase)*.22;
    c.fillStyle = star.depth === 1 ? '#c3c7fa' : star.depth === 2 ? '#ffe4b9' : '#d1ffff';
    c.beginPath(); c.arc(x,star.y*height,star.r,0,Math.PI*2); c.fill();
    if (star.depth === 3) { c.fillRect(x-3,star.y*height,6,.6); c.fillRect(x,star.y*height-3,.6,6); }
  }
  c.globalAlpha = 1;
  for (const o of model.scenery) {
    const fade = Math.min(1, o.age / 2, (o.x+.35)/.2);
    const w = Math.min(width * o.size, 245) * (1 + Math.sin(t*.1)*.025);
    if (!fitImage(o.kind,o.x*width,o.y*height,w,Math.max(0,fade)*.9)) {
      c.strokeStyle = '#c4b5fd'; c.beginPath(); c.ellipse(o.x*width,o.y*height,w*.5,w*.24,-.4,0,Math.PI*2); c.stroke();
    }
  }
  for (const o of model.objects) {
    const x=o.x*width,y=o.y*height;
    if (o.kind === 'fragment') {
      c.save(); c.translate(x,y); c.rotate(t*.5); c.shadowColor='#94fff1';c.shadowBlur=14;
      c.fillStyle='#d9fff4';c.beginPath();c.moveTo(0,-12);c.lineTo(7,0);c.lineTo(0,12);c.lineTo(-7,0);c.closePath();c.fill();c.restore();
    } else if (!fitImage('asteroid',x,y,47)) {
      c.fillStyle='#8c7f9d';c.beginPath();c.arc(x,y,19,0,Math.PI*2);c.fill();
    }
  }
  const x=model.ship.x*width,y=model.ship.y*height,w=model.shipWidth;
  c.save(); c.translate(x,y); c.rotate(model.ship.tilt);
  const glow=c.createRadialGradient(-w*.37,0,0,-w*.37,0,w*.45);
  glow.addColorStop(0,'#8fefff90');glow.addColorStop(1,'#72caff00');
  c.fillStyle=glow;c.fillRect(-w*.83,-w*.45,w*.9,w*.9);
  c.globalAlpha=model.invincible>0 ? .65+.3*Math.sin(t*22) : 1;
  const frame=ready(`ship-${String(Math.floor(t*9)%8+1).padStart(2,'0')}`);
  // Frames are alpha-aligned on equal square canvases to avoid row-to-row jitter.
  if (frame) c.drawImage(frame,-w/2,-w/2,w,w); else drawFallbackShip(0,0,w);
  if (model.invincible>0) {c.strokeStyle='#b9fcff';c.lineWidth=2;c.beginPath();c.ellipse(0,0,w*.49,w*.33,0,0,Math.PI*2);c.stroke();}
  c.restore();
  if(model.flash>0){c.fillStyle=`rgba(255,185,161,${model.flash*.35})`;c.fillRect(0,0,width,height);}
}
function updateHUD() {
  $('flightRegion').textContent = region;
  $('flightScene').textContent = SCENE_NAMES[model.sceneIndex];
  $('flightDistance').textContent = Math.floor(model.distance).toLocaleString() + ' km';
  $('flightScore').textContent = model.fragments;
  $('flightShield').textContent = Math.round(model.shield) + '%';
  $('flightShield').parentElement.classList.toggle('shield-low',model.shield<=25);
  $('flightSpeed').textContent = media.matches ? '0.3× · 저속' : '1.0× · 순항';
  $('flightMode').textContent = model.mode === 'auto' ? 'AUTO PILOT' : 'MANUAL PILOT';
  if (lastSerial !== model.eventSerial) {
    lastSerial = model.eventSerial;
    if(model.lastEvent) $('flightComment').textContent = model.lastEvent;
  }
}
function clearInput() {
  keys.clear(); pointers.clear();
  stage.querySelectorAll('[data-steer]').forEach(b=>b.classList.remove('pressed'));
}
function allowed() { return selected && visible && !document.hidden && $('homePanel').classList.contains('active') && !document.querySelector('.modal:not(.hidden)'); }
function inputAllowed() { return allowed() && model.mode === 'manual'; }
function sync() {
  if (!allowed()) {
    if(raf) cancelAnimationFrame(raf);
    raf=0; last=0; clock=0; clearInput(); return;
  }
  if (!raf) raf=requestAnimationFrame(frame);
}
function frame(now) {
  raf=0;
  if(!allowed()) {last=0;clearInput();return;}
  const elapsed=last ? Math.min((now-last)/1000,.05) : 0;last=now;clock+=elapsed;
  const input={}; for(const key of keys) input[key]=true;for(const dir of pointers.values())input[dir]=true;
  const previousTime=model.time;
  // Physics follows elapsed seconds; throttling drawing must not slow steering.
  model.step(elapsed,input,media.matches);hudClock+=elapsed;
  const interval=media.matches ? 1/15 : 1/30;
  if(clock>=interval) {draw();clock%=interval;}
  if(hudClock>.25){hudClock=0;updateHUD();}
  if(model.mode==='auto' && Math.floor(model.time/18)>Math.floor(previousTime/18)) $('flightComment').textContent=comments[Math.floor(model.time/18)%comments.length];
  raf=requestAnimationFrame(frame);
}
function selectView(flight) {
  selected=flight;
  $('mapStage').hidden=flight;stage.hidden=!flight;
  $('mapViewBtn').setAttribute('aria-pressed',String(!flight));$('flightViewBtn').setAttribute('aria-pressed',String(flight));
  $('viewLabel').textContent=flight?'FLIGHT VIEW':'SHIP MODULE MAP';
  clearInput();
  if(flight){loadAssets();resize();updateHUD();}
  sync();
}
function setMode(mode) {
  clearInput();model.setMode(mode);
  $('autoPilotBtn').setAttribute('aria-pressed',String(mode==='auto'));
  $('manualPilotBtn').setAttribute('aria-pressed',String(mode==='manual'));
  $('flightControls').hidden=mode!=='manual';
  $('flightHelp').textContent=mode==='auto'?'마리가 조종하고 있어요. 편안하게 별을 바라보세요.':'방향키 / WASD · 화면 방향 버튼으로 조종 · 밝은 별조각 수집, 소행성 회피';
  $('flightComment').textContent=mode==='auto'?'조종은 제게 맡겨 주세요. E님은 잠깐 쉬어도 좋아요.':'함께 조종해 볼까요? 보호막이 있으니 괜찮아요.';
  updateHUD();
  if(mode==='manual') canvas.focus({preventScroll:true});
}
$('mapViewBtn').addEventListener('click',()=>selectView(false));
$('flightViewBtn').addEventListener('click',()=>selectView(true));
$('autoPilotBtn').addEventListener('click',()=>setMode('auto'));
$('manualPilotBtn').addEventListener('click',()=>setMode('manual'));
function editable(target) { return target instanceof Element && !!target.closest('input,textarea,select,[contenteditable="true"]'); }
document.addEventListener('keydown',e=>{
  const direction=controls[e.key] || controls[e.key.toLowerCase()];
  // Steering belongs to the focused canvas or on-screen controls, never global scrolling.
  if(!direction || e.altKey || e.ctrlKey || e.metaKey || !inputAllowed() || editable(e.target) || !stage.contains(document.activeElement))return;
  e.preventDefault();keys.add(direction);
});
document.addEventListener('keyup',e=>{const dir=controls[e.key]||controls[e.key.toLowerCase()];if(dir) keys.delete(dir);});
canvas.addEventListener('blur',clearInput);
stage.addEventListener('focusout',e=>{if(!stage.contains(e.relatedTarget))clearInput();});
for(const button of stage.querySelectorAll('[data-steer]')) {
  button.addEventListener('pointerdown',e=>{
    if(!inputAllowed())return;
    e.preventDefault();button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,button.dataset.steer);button.classList.add('pressed');
  });
  const release=e=>{pointers.delete(e.pointerId);button.classList.toggle('pressed',[...pointers.values()].includes(button.dataset.steer));};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
  // Keyboard activation for the accessible direction buttons.
  button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&inputAllowed()){e.preventDefault();keys.add(button.dataset.steer);button.classList.add('pressed');}});
  button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){keys.delete(button.dataset.steer);button.classList.remove('pressed');}});
  button.addEventListener('blur',clearInput);
}
window.addEventListener('blur',()=>{clearInput();if(raf)cancelAnimationFrame(raf);raf=0;last=0;clock=0;});
window.addEventListener('focus',sync);
document.addEventListener('visibilitychange',sync);
document.addEventListener('marie:view',sync);
document.addEventListener('marie:destination',e=>{region=e.detail.name;model.announce(region+' 항로 확인. 기존 항해 기록과 함께 이동합니다.');updateHUD();});
const lifecycleObserver = new MutationObserver(sync);
for (const el of document.querySelectorAll('.modal')) lifecycleObserver.observe(el,{attributes:true,attributeFilter:['class']});
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(stage);
media.addEventListener('change',()=>{clearInput();$('motionNote').hidden=!media.matches;updateHUD();sync();});
$('motionNote').hidden=!media.matches;
if(!context) {$('flightHelp').textContent='이 브라우저는 Canvas를 지원하지 않습니다. 선실 지도를 이용해 주세요.';}
updateHUD();
