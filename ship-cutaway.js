import { ROOMS } from './game/rooms.js';
import { CUTAWAY_ROOMS, ZONES } from './game/ship-layout.js';
import { openRoom } from './app.js';
import { registerShipView, selectShipView } from './ship-views.js';
const $ = id => document.getElementById(id);
const stage = $('cutawayStage'), image = $('cutawayImage'), overlay = $('cutawayHotspots');
let loaded = false, loading = false;
function load() {
  if (loaded || loading) return;
  loading = true; image.hidden = false; overlay.hidden = true; $('cutawayViewport').hidden = false; $('cutawayZoomControls').hidden = false;
  $('cutawayStatus').textContent = '집 안의 풍경을 펼치고 있습니다…'; $('cutawayRetry').hidden = true;
  image.src = image.dataset.src;
}
image.addEventListener('load', () => {
  loaded = true; loading = false; overlay.hidden = false;
  $('cutawayStatus').textContent = '방 표시를 누르거나 아래 목록에서 편하게 골라 주세요.';
});
image.addEventListener('error', () => {
  loaded = false; loading = false; image.hidden = true; overlay.hidden = true; $('cutawayViewport').hidden = true; $('cutawayZoomControls').hidden = true;
  $('cutawayStatus').textContent = '단면 이미지를 불러오지 못했습니다. 아래 방 목록은 계속 이용할 수 있어요.';
  $('cutawayRetry').hidden = false;
});
function roomButton(room, type) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = `cutaway-${type}`; button.dataset.cutawayRoom = room[0];
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'roomModal');
  button.setAttribute('aria-label', `${room[1]} 들어가기`); button.textContent = room[1];
  button.addEventListener('click', () => openRoom(room[0])); return button;
}
for (const [zone, name] of Object.entries(ZONES)) {
  const group = document.createElement('section'); group.className = 'cutaway-room-group';
  const heading = document.createElement('h3'); heading.textContent = name;
  const list = document.createElement('div');
  for (const layout of CUTAWAY_ROOMS.filter(r => r.zone === zone)) {
    const room = ROOMS.find(r => r[0] === layout.id);
    const hotspot = roomButton(room, 'hotspot'); hotspot.style.left = `${layout.x}%`; hotspot.style.top = `${layout.y}%`; overlay.append(hotspot);
    const button = roomButton(room, 'room'); const intro = document.createElement('small'); intro.textContent = room[2]; button.append(intro); list.append(button);
  }
  group.append(heading, list); $('cutawayRooms').append(group);
}
function zoom(value, reset = false) {
  const z = Math.max(1, Math.min(2, Number(value)));
  $('cutawayZoom').value = String(z); $('cutawayZoomValue').value = `${Math.round(z * 100)}%`;
  $('cutawayCanvas').style.width = `${Math.max(780, $('cutawayViewport').clientWidth) * z}px`;
  $('cutawayZoomOut').disabled = z <= 1; $('cutawayZoomIn').disabled = z >= 2;
  if (reset) { $('cutawayViewport').scrollLeft = 0; $('cutawayViewport').scrollTop = 0; }
}
$('cutawayZoom').addEventListener('input', e => zoom(e.target.value));
$('cutawayZoomIn').addEventListener('click', () => zoom(Number($('cutawayZoom').value) + .25));
$('cutawayZoomOut').addEventListener('click', () => zoom(Number($('cutawayZoom').value) - .25));
$('cutawayZoomReset').addEventListener('click', () => zoom(1, true));
$('cutawayRetry').addEventListener('click', load);
$('cutawayBack').addEventListener('click', () => selectShipView('map', { focus: true }));
registerShipView('cutaway', { button: $('cutawayViewBtn'), stage, label: 'CONCEPT CUTAWAY', onSelect(active) { if (active) { zoom($('cutawayZoom').value); load(); } } });
function syncSize() { if (!stage.hidden && $('homePanel').classList.contains('active')) zoom($('cutawayZoom').value); }
window.addEventListener('resize', syncSize);
document.addEventListener('marie:view', syncSize);
zoom(1);
