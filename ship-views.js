// One owner for ship-stage visibility. Rendering remains owned by each view.
const views = new Map();
let selected = 'map';
export function selectShipView(id, { focus = false } = {}) {
  if (!views.has(id)) return false;
  selected = id;
  for (const [key, view] of views) {
    const active = key === id;
    view.stage.hidden = !active;
    view.button.setAttribute('aria-pressed', String(active));
    view.onSelect?.(active);
  }
  document.getElementById('viewLabel').textContent = views.get(id).label;
  if (focus) views.get(id).button.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent('marie:shipview', { detail: { id } }));
  return true;
}
export function registerShipView(id, { button, stage, label, onSelect }) {
  if (views.has(id) || !button || !stage) throw new Error('Invalid ship view registration');
  views.set(id, { button, stage, label, onSelect });
  button.addEventListener('click', () => selectShipView(id));
  stage.hidden = selected !== id;
  button.setAttribute('aria-pressed', String(selected === id));
  onSelect?.(selected === id);
}
registerShipView('map', { button: document.getElementById('mapViewBtn'), stage: document.getElementById('mapStage'), label: 'SHIP MODULE MAP' });
// Capture the modal state before legacy Escape handlers close it.
// Escape inside a modal closes only that modal; a second Escape returns to map.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !document.getElementById('homePanel').classList.contains('active') || ['map', 'flight'].includes(selected) || document.querySelector('.modal:not(.hidden),dialog[open]')) return;
  selectShipView('map', { focus: true });
}, true);
