// Play-session contracts. Editorial diaries and their clocks never enter events.
import { ROOM_IDS } from './rooms.js';
export { ROOM_IDS };
export const RESOURCE_IDS = Object.freeze(['oxygen', 'power', 'food', 'water', 'hull', 'mood']);
const own = (v, key) => Object.hasOwn(v, key);
export function object(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Expected a plain object');
  return value;
}
export function exact(value, keys) {
  object(value);
  if (Object.keys(value).some(k => !keys.includes(k)) || keys.some(k => !own(value, k))) throw new TypeError('Unexpected or missing field');
}
export function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,95}$/.test(value)) throw new TypeError('Invalid identifier');
}
export function resourceChanges(value) {
  object(value);
  if (!Object.keys(value).length || Object.entries(value).some(([k, n]) => !RESOURCE_IDS.includes(k) || !Number.isFinite(n) || Math.abs(n) > 100)) throw new TypeError('Invalid resource changes');
}
export function validateEvent(event) {
  exact(event, ['id', 'type', 'payload']); identifier(event.id);
  const p = event.payload;
  switch (event.type) {
    case 'ResourceChanged': exact(p, ['changes']); resourceChanges(p.changes); break;
    case 'CrewActionCompleted':
      exact(p, ['room', 'action', 'changes']);
      if (!ROOM_IDS.includes(p.room)) throw new TypeError('Unknown room');
      identifier(p.action); resourceChanges(p.changes); break;
    case 'MissionCompleted':
      exact(p, ['missionId', 'reward']); identifier(p.missionId); resourceChanges(p.reward);
      if (Object.values(p.reward).some(n => n < 0)) throw new TypeError('Negative reward');
      break;
    case 'ModuleConstructed':
      exact(p, ['moduleId', 'room', 'cost']); identifier(p.moduleId); resourceChanges(p.cost);
      if (!ROOM_IDS.includes(p.room) || Object.values(p.cost).some(n => n < 0)) throw new TypeError('Invalid construction');
      break;
    default: throw new TypeError('Unknown event');
  }
  return event;
}
