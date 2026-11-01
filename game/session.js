import { createLegacyAdapter } from './legacy-adapter.js';
// Single game owner shared by UI adapters; never exposed as a window test hook.
export const game = createLegacyAdapter();
export function eventId(prefix) {
  const token = crypto.randomUUID ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16)).join('-');
  return `${prefix}:${token}`;
}
