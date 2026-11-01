import { ROOM_IDS, RESOURCE_IDS, exact, validateEvent } from './game-events.js';

export const SCHEMA_VERSION = 1;
export const DEFAULT_LEGACY = Object.freeze({ day: 1, minute: 380, auto: true, speed: 1, room: 'lounge', destination: 0,
  stats: Object.freeze({ oxygen: 94, power: 86, food: 77, water: 83, hull: 96, mood: 92 }), feed: Object.freeze([]) });
export function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function validateLegacy(v, minimum=15) {
  exact(v, ['day', 'minute', 'auto', 'speed', 'room', 'destination', 'stats', 'feed']);
  if (!Number.isSafeInteger(v.day) || v.day < 1 || !Number.isInteger(v.minute) || v.minute < 0 || v.minute >= 1440 ||
      typeof v.auto !== 'boolean' || ![1, 2, 4].includes(v.speed) || !ROOM_IDS.includes(v.room) || ![0, 1, 2].includes(v.destination)) throw new TypeError('Invalid legacy state');
  exact(v.stats, RESOURCE_IDS);
  if (Object.values(v.stats).some(n => !Number.isFinite(n) || n < minimum || n > 100 || !Number.isInteger(n))) throw new TypeError('Invalid healing stats');
  if (!Array.isArray(v.feed) || v.feed.length > 12) throw new TypeError('Invalid feed');
  for (const item of v.feed) {
    exact(item, ['day', 'time', 'text']);
    if (!Number.isSafeInteger(item.day) || item.day < 1 || typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) || typeof item.text !== 'string' || item.text.length > 1000) throw new TypeError('Invalid feed entry');
  }
}
export function createGameState(legacy = DEFAULT_LEGACY, { newEconomy = false } = {}) {
  validateLegacy(legacy);
  if (typeof newEconomy !== 'boolean') throw new TypeError('Invalid feature flag');
  const v = structuredClone(legacy);
  return freeze({ schemaVersion: SCHEMA_VERSION, scope: 'play-session', day: v.day, minute: v.minute, mode: 'healing', stats: v.stats,
    crew: { marie: { room: v.room, action: 'idle', lastActionRoom: null } }, missions: {}, research: { points: 0, unlocked: [] },
    modules: { baseRooms: [...ROOM_IDS], installed: {} }, resources: { amounts: { ...v.stats }, lastRescueAt: null }, progress: { materials: 8 }, session: { auto: v.auto, speed: v.speed, destination: v.destination, feed: v.feed },
    features: { newEconomy }, playLog: [], processedEventIds: [] });
}
export function legacySnapshot(state) {
  return freeze(structuredClone({ day: state.day, minute: state.minute, stats: state.stats, room: state.crew.marie.room,
    auto: state.session.auto, speed: state.session.speed, destination: state.session.destination, feed: state.session.feed }));
}
// This bridge preserves the old healing arithmetic; it adds no new economy.
export function replaceLegacy(state, legacy) {
  validateLegacy(legacy,state.mode==='survival'?0:15);
  const v = structuredClone(legacy);
  const amounts={...state.resources.amounts};
  for(const key of RESOURCE_IDS)if(v.stats[key]!==state.stats[key])amounts[key]=v.stats[key];
  return freeze({ ...state, resources: {...state.resources,amounts}, day: v.day, minute: v.minute, stats: v.stats,
    crew: { ...state.crew, marie: { ...state.crew.marie, room: v.room } },
    session: { ...state.session, auto: v.auto, speed: v.speed, destination: v.destination, feed: v.feed } });
}
export function reduceGameEvent(state, event) {
  validateEvent(event);
  if (state.processedEventIds.includes(event.id)) return state;
  const p = event.payload;
  if (['MissionCompleted', 'ModuleConstructed'].includes(event.type) && !state.features.newEconomy) throw new Error('New economy is disabled');
  const next = structuredClone(state);
  let changes = p.changes;
  if (event.type === 'CrewActionCompleted') next.crew.marie = { ...next.crew.marie, action: p.action, lastActionRoom: p.room };
  if (event.type === 'MissionCompleted') {
    if (Object.hasOwn(next.missions, p.missionId)) throw new Error('Mission already completed');
    next.missions[p.missionId] = { status: 'completed' }; changes = p.reward;
  }
  if (event.type === 'ModuleConstructed') {
    if (ROOM_IDS.includes(p.moduleId) || Object.hasOwn(next.modules.installed, p.moduleId)) throw new Error('Module already installed');
    if (Object.entries(p.cost).some(([k, n]) => n > state.stats[k] - 15)) throw new Error('Insufficient resources');
    next.modules.installed[p.moduleId] = { room: p.room };
    changes = Object.fromEntries(Object.entries(p.cost).map(([k, n]) => [k, -n]));
  }
  for (const [key, delta] of Object.entries(changes)) {
    const amount=state.mode==='survival'?next.resources.amounts[key]+delta:next.stats[key]+delta;
    next.resources.amounts[key]=Math.min(100,Math.max(state.mode==='survival'?0:15,state.mode==='survival'?amount:Math.round(amount)));
    next.stats[key]=Math.round(next.resources.amounts[key]);
  }
  if(next.mode==='survival'&&Object.values(next.resources.amounts).some(n=>n<=10))next.session.auto=false;
  next.processedEventIds.push(event.id);
  // Bounded presentation log; the id ledger remains for the whole session.
  next.playLog = [...next.playLog, { id: event.id, type: event.type, day: state.day, minute: state.minute }].slice(-24);
  return freeze(next);
}
