import { game } from './session.js';
const listeners = new Set();
let raf = 0, last = 0, inFrame = false, wasPaused = true;
export function simulationPaused() {
  const s = game.snapshot();
  const active = s.session.crewAutomation || s.mode === 'survival';
  const panel = document.querySelector('.panel-view.active')?.id;
  return !active || !s.session.auto || document.hidden || !['homePanel','explorationPanel'].includes(panel) ||
    !!document.querySelector('.modal:not(.hidden),dialog[open]');
}
function sync() {
  const paused = simulationPaused();
  if (paused) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    if (!wasPaused) for (const entry of listeners) entry.onPause?.();
  } else if (!raf && !inFrame) raf = requestAnimationFrame(frame);
  wasPaused = paused;
}
function frame(now) {
  raf = 0; inFrame = true;
  if (!simulationPaused()) {
    const seconds = last ? Math.min(.1, Math.max(0, (now-last)/1000)) * game.snapshot().session.speed : 0;
    last = now;
    for (const entry of listeners) entry.update(seconds);
  }
  inFrame = false; sync();
}
export function subscribeSimulation(update, onPause) {
  const entry = { update, onPause }; listeners.add(entry); sync();
  return () => { listeners.delete(entry); };
}
game.subscribe(sync);
for (const name of ['visibilitychange','marie:view']) document.addEventListener(name, sync);
const observer = new MutationObserver(sync);
for (const el of document.querySelectorAll('.modal,dialog')) observer.observe(el,{attributes:true,attributeFilter:['class','open']});
