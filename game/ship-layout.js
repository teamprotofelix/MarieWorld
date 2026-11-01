// Approximate anchors hand-calibrated against the supplied 1672x941 illustration.
// Three navigation groups are a UI convention, not physical ship dimensions.
import { ROOMS } from './rooms.js';
export const ZONES = Object.freeze({ upper: '상층 · 휴식과 관측', middle: '생활층 · 작업과 교류', lower: '작업층 · 정원과 항해 설비' });
const anchors = {
  cockpit: [85, 56, 'lower'], garden: [25, 57, 'lower'], kitchen: [60, 57, 'lower'],
  lounge: [69, 37, 'middle'], bedroom: [28, 21, 'upper'], workshop: [26, 37, 'middle'],
  cargo: [26, 76, 'lower'], observatory: [68, 19, 'upper'], engine: [62, 76, 'lower'], corridor: [45, 37, 'middle'],
};
export const CUTAWAY_ROOMS = Object.freeze(ROOMS.map(([id]) => {
  const [x, y, zone] = anchors[id];
  return Object.freeze({ id, x, y, zone });
}));
