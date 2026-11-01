import { registerShipView, selectShipView } from './ship-views.js';
const $ = id => document.getElementById(id);
const stage = $('exteriorStage'), scene = $('exteriorScene'), image = $('exteriorImage');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let selected = false, visible = false, loaded = false, loading = false, quiet = false;
function sync() {
  scene.dataset.animate = String(selected && visible && loaded && !quiet && !media.matches && !document.hidden &&
    $('homePanel').classList.contains('active') && !document.querySelector('.modal:not(.hidden),dialog[open]'));
}
function load() {
  if (loaded || loading) return;
  loading = true; image.hidden = false; scene.dataset.loaded = 'false';
  $('exteriorStatus').textContent = '미래의 우주선을 펼치고 있습니다…';
  $('exteriorRetry').hidden = true;
  image.src = image.dataset.src;
}
image.addEventListener('load', () => {
  loading = false; loaded = true; scene.dataset.loaded = 'true';
  $('exteriorStatus').textContent = '성장 비전 · 현재 선체와 다른 미래 콘셉트'; sync();
});
image.addEventListener('error', () => {
  loading = false; loaded = false; image.hidden = true;
  $('exteriorStatus').textContent = '외관 이미지를 불러오지 못했습니다. 처음 여는 화면은 온라인 연결이 필요해요.';
  $('exteriorRetry').hidden = false; sync();
});
$('exteriorRetry').addEventListener('click', load);
$('exteriorBack').addEventListener('click', () => selectShipView('map', { focus: true }));
$('exteriorMotion').addEventListener('click', () => {
  quiet = !quiet; $('exteriorMotion').setAttribute('aria-pressed', String(quiet));
  $('exteriorMotion').textContent = quiet ? '빛 움직임 다시 켜기' : '빛 움직임 잠시 끄기'; sync();
});
registerShipView('exterior', { button: $('exteriorViewBtn'), stage, label: 'FUTURE EXTERIOR', onSelect(active) {
  selected = active; if (active) load(); sync();
} });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .05 }).observe(scene);
const observer = new MutationObserver(sync);
for (const el of document.querySelectorAll('.modal,dialog')) observer.observe(el, { attributes: true, attributeFilter: ['class', 'open'] });
for (const name of ['visibilitychange', 'marie:view']) document.addEventListener(name, sync);
media.addEventListener('change', sync);
