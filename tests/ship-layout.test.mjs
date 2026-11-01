import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ROOMS, ROOM_IDS } from '../game/rooms.js';
import { ROOM_IDS as EVENT_ROOMS } from '../game/game-events.js';
import { CUTAWAY_ROOMS, ZONES } from '../game/ship-layout.js';
import { EVENTS } from '../room-models.js';

test('shared room catalogue preserves every baseline text, coordinate and order', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(ROOMS)).digest('hex'),'cfd047417b868189178f774741e209d41dbcd485be1eb19e3bcceaa625a81977');
  assert.equal(ROOMS.length,10); assert(Object.isFrozen(ROOMS)); assert(ROOMS.every(Object.isFrozen));
  assert.deepEqual(ROOM_IDS,EVENT_ROOMS);
});
test('all ten existing games are reachable from unique cutaway anchors in three UI zones', () => {
  const ids=CUTAWAY_ROOMS.map(r=>r.id);
  assert.deepEqual([...ids].sort(),Object.keys(EVENTS).sort()); assert.equal(new Set(ids).size,10);
  assert.equal(Object.keys(ZONES).length,3);
  for(const r of CUTAWAY_ROOMS){ assert(r.x>0&&r.x<100&&r.y>0&&r.y<100); assert(Object.hasOwn(ZONES,r.zone)); assert(Object.isFrozen(r)); }
  assert.deepEqual([...new Set(CUTAWAY_ROOMS.map(r=>r.zone))].sort(),Object.keys(ZONES).sort());
});
test('cutaway dependencies ship offline while its large art stays optional', async () => {
  const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');const box={self:{addEventListener(){}},URL};vm.createContext(box);vm.runInContext(sw+';globalThis.core=ASSETS;globalThis.optional=OPTIONAL_ASSETS;',box);
  for(const path of ['./game/rooms.js','./game/ship-layout.js','./ship-cutaway.js','./cutaway.css'])assert(box.core.includes(path));
  const art='./assets/concepts/v2/03_multideck_cross_section_cutaway.webp';assert(!box.core.includes(art));assert(box.optional.includes(art));
});
