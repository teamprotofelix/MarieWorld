import {FlightModel, SCENE_NAMES} from './flight-model.js';
import {createFlightScene} from './flight-scene.js';

const $ = id => document.getElementById(id);
const stage = $('flightStage'), canvas = $('flightCanvas'), context = canvas.getContext('2d');
const model = new FlightModel();
const media = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set(), pointers = new Map();
let selected = false, visible = true, raf = 0, last = 0, clock = 0, hudClock = 0;
let lastSerial = -1, region = $('travelTitle').textContent;
const controls = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', a:'left', d:'right', w:'up', s:'down'};
const comments = ['조용한 항해예요. 따뜻한 차 한 잔 드릴까요?', '별 사이에서도, 우리의 집은 여기 있어요.', 'E과 함께라면 조금 멀리 돌아가도 좋아요.'];

const scene=createFlightScene(canvas,model,{active:()=>selected});
const loadAssets=()=>scene.load(), resize=()=>scene.resize(), draw=()=>scene.draw();
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
  $('flightComment').textContent=mode==='auto'?'조종은 제게 맡겨 주세요. E은 잠깐 쉬어도 좋아요.':'함께 조종해 볼까요? 보호막이 있으니 괜찮아요.';
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
