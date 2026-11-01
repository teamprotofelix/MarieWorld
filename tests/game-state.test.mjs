import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGameState, DEFAULT_LEGACY, legacySnapshot, replaceLegacy, reduceGameEvent } from '../game/game-state.js';
import { ROOM_IDS, validateEvent } from '../game/game-events.js';
import { createLegacyAdapter } from '../game/legacy-adapter.js';
const resource = (id, changes) => ({ id, type: 'ResourceChanged', payload: { changes } });

test('legacy defaults round trip exactly; editorial data is absent', () => {
  const state = createGameState();
  assert.deepEqual(legacySnapshot(state), DEFAULT_LEGACY);
  assert.equal(state.schemaVersion, 1); assert.equal(state.scope, 'play-session');
  assert.equal(state.mode, 'healing'); assert.equal(state.features.newEconomy, false);
  assert.deepEqual(state.modules.baseRooms, ROOM_IDS);
  assert.deepEqual(Object.keys(state.research), ['points', 'unlocked']);
  assert(!JSON.stringify(state).includes('VOYAGE'));
});
test('state, event inputs and legacy views cannot mutate owned state', () => {
  const initial = structuredClone(DEFAULT_LEGACY), game = createLegacyAdapter(initial);
  initial.stats.food = 20; assert.equal(game.read().stats.food, 77);
  const before = game.snapshot(), event = resource('test:1', { food: 2 });
  game.dispatch(event); event.payload.changes.food = -100;
  assert.equal(game.read().stats.food, 79); assert.equal(before.stats.food, 77);
  assert.throws(() => { game.read().stats.food = 10; }, TypeError);
  assert.throws(() => { game.snapshot().modules.baseRooms.push('extra'); }, TypeError);
  assert.throws(() => { game.snapshot().session.feed.push({}); }, TypeError);
});
test('resource and crew events retain legacy 15–100 rounding and room position', () => {
  const game = createLegacyAdapter();
  game.dispatch(resource('minmax', { food: -100, oxygen: 100, power: -.5 }));
  assert.deepEqual(game.read().stats, { oxygen: 100, power: 86, food: 15, water: 83, hull: 96, mood: 92 });
  game.crewAction('garden', { oxygen: 5, food: 4, water: -1 });
  assert.equal(game.read().room, 'lounge');
  assert.equal(game.snapshot().crew.marie.lastActionRoom, 'garden');
  assert.equal(game.read().stats.food, 19);
});
test('event identity prevents repeated rewards and subscriber emissions', () => {
  const game = createLegacyAdapter(); let count = 0;
  const unsubscribe = game.subscribe(() => { count++; });
  const e = resource('reward-1', { food: 3 }); game.dispatch(e);
  const state = game.snapshot(); game.dispatch(e);
  assert.equal(count, 1); assert.equal(game.snapshot(), state); assert.equal(game.read().stats.food, 80);
  unsubscribe(); game.dispatch(resource('reward-2', { food: 1 })); assert.equal(count, 1);
});
test('malformed, non-finite, unknown and oversized events are atomic failures', () => {
  const game = createLegacyAdapter(), before = game.snapshot();
  for (const e of [resource('a', { food: NaN }), resource('a', { food: Infinity }), resource('a', { food: 101 }), resource('a', { unknown: 1 }), resource('a', {}),
    { ...resource('a', { food: 1 }), surprise: true }, { ...resource('a', { food: 1 }), type: 'EditorialChanged' },
    { id: 'bad', type: 'CrewActionCompleted', payload: { room: 'missing', action: 'tea', changes: { mood: 1 } } }]) {
    assert.throws(() => game.dispatch(e)); assert.equal(game.snapshot(), before);
  }
});
test('legacy bridge preserves clock, UI switches, feed and stats; rejects partial writes', () => {
  const game = createLegacyAdapter();
  const before = game.snapshot();
  assert.throws(() => game.update(d => { d.minute = 1440; d.stats.food = 50; })); assert.equal(game.snapshot(), before);
  assert.throws(() => game.update(d => { d.room = 'unknown'; }));
  game.update(d => { d.day = 2; d.minute = 4; d.auto = false; d.speed = 4; d.destination = 2; d.room = 'cargo'; d.stats.water = 42; d.feed.push({ day: 2, time: '00:04', text: 'play only' }); });
  const view = game.read(); assert.equal(view.room, 'cargo'); assert.equal(view.minute, 4); assert.equal(view.stats.water, 42);
  assert.deepEqual(view.feed, [{ day: 2, time: '00:04', text: 'play only' }]); assert.equal(game.snapshot().crew.marie.room, 'cargo');
  assert.equal(game.snapshot().research.points, 0);
});
test('new mission and construction contracts stay disabled by default', () => {
  const state = createGameState();
  const mission = { id: 'mission:1', type: 'MissionCompleted', payload: { missionId: 'scan-1', reward: { food: 2 } } };
  const module = { id: 'build:1', type: 'ModuleConstructed', payload: { moduleId: 'recycler', room: 'engine', cost: { power: 5 } } };
  validateEvent(mission); validateEvent(module);
  assert.throws(() => reduceGameEvent(state, mission), /disabled/); assert.throws(() => reduceGameEvent(state, module), /disabled/);
  const enabled = createGameState(DEFAULT_LEGACY, { newEconomy: true });
  const completed = reduceGameEvent(enabled, mission); assert.equal(completed.stats.food, 79);
  assert.equal(reduceGameEvent(completed, mission), completed);
  assert.throws(() => reduceGameEvent(completed, { ...mission, id: 'mission:2' }), /already/);
  const built = reduceGameEvent(enabled, module); assert.equal(built.stats.power, 81);
  assert.throws(() => reduceGameEvent(built, { ...module, id: 'build:2' }), /already/);
  assert.throws(() => reduceGameEvent(enabled, { ...module, payload: { ...module.payload, cost: { power: 100 } } }), /Insufficient/);
});
test('random and clock-independent transitions are reproducible with injected ids', () => {
  const run = () => {
    const game = createLegacyAdapter(DEFAULT_LEGACY, { makeId: n => `seed:${n}` });
    for (let i = 0; i < 50; i++) game.crewAction('engine', { power: 6, hull: 3 });
    return game.snapshot();
  };
  assert.deepEqual(run(), run()); assert.equal(run().playLog.length, 24); assert.equal(run().processedEventIds.length, 50);
});
test('legacy defaults validate all fields and nested feed entries', () => {
  for (const mutate of [d => d.stats.food = 0, d => d.day = 0, d => d.auto = 1, d => d.speed = 3, d => d.extra = 1, d => d.feed.push({ day: 1, time: '24:00', text: 'invalid' })]) {
    const d = structuredClone(DEFAULT_LEGACY); mutate(d);
    assert.throws(() => createGameState(d)); assert.throws(() => replaceLegacy(createGameState(), d));
  }
});
test('PWA ships every new app dependency and keeps consent activation', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['game-state', 'game-events', 'legacy-adapter']) assert(sw.includes(`./game/${f}.js`));
  assert(sw.includes("if(e.data?.type==='SKIP_WAITING')self.skipWaiting()"));
  assert(!sw.includes('concepts/v2')); // no 8-image install cost in the state PR
});
