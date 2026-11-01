import { createGameState, legacySnapshot, replaceLegacy, reduceGameEvent } from './game-state.js';

// Owns state in a closure. Inputs, outputs and notifications cannot mutate it.
// Ids are deterministic per adapter; no wall clock or random source is required.
export function createLegacyAdapter(initial, { makeId = n => `legacy:${n}`, newEconomy = false } = {}) {
  let current = createGameState(initial, { newEconomy }), sequence = 0;
  const listeners = new Set();
  function publish(next) {
    if (next !== current) {
      current = next;
      for (const listener of listeners) listener(current);
    }
    return legacySnapshot(current);
  }
  return Object.freeze({
    read: () => legacySnapshot(current), snapshot: () => current,
    update(change) {
      const draft = structuredClone(legacySnapshot(current));
      change(draft);
      return publish(replaceLegacy(current, draft));
    },
    dispatch(event) { return publish(reduceGameEvent(current, event)); },
    crewAction(room, changes) {
      return publish(reduceGameEvent(current, { id: makeId(++sequence), type: 'CrewActionCompleted', payload: { room, action: 'together', changes } }));
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Expected listener');
      listeners.add(listener); return () => listeners.delete(listener);
    },
  });
}
