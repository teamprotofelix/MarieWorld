import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const read = p => readFile(new URL('../'+p, import.meta.url));

test('eight supplied concept WebPs keep their exact manifest bytes and hashes', async () => {
  const manifest = JSON.parse(await read('docs/v2-roadmap/asset_manifest.json'));
  assert.equal(manifest.reference_only, true); assert.equal(manifest.assets.length, 8);
  const files = await readdir(new URL('../assets/concepts/v2/', import.meta.url));
  assert.deepEqual(files.sort(), manifest.assets.map(a=>a.file.split('/').at(-1)).sort());
  for (const a of manifest.assets) {
    const b = await read(a.file); assert.equal(b.length, a.size_bytes);
    assert.equal(createHash('sha256').update(b).digest('hex'), a.sha256);
    assert.equal(b.subarray(0,4).toString(), 'RIFF'); assert.equal(b.subarray(8,12).toString(), 'WEBP');
    assert.equal(a.width, 1672); assert.equal(a.height, 941);
  }
});
test('concepts are excluded from core install and individually allowed for runtime cache', async () => {
  const box = {self:{addEventListener(){}},URL}; vm.createContext(box);
  vm.runInContext((await read('sw.js')).toString()+';globalThis.core=ASSETS;globalThis.optional=OPTIONAL_ASSETS;', box);
  assert(!box.core.some(p=>p.includes('concepts/v2')));
  const manifest=JSON.parse(await read('docs/v2-roadmap/asset_manifest.json'));
  assert.deepEqual([...box.optional].sort(),manifest.assets.map(a=>'./'+a.file).sort());
  for(const p of ['./ship-views.js','./ship-exterior.js','./ship-v2.css']) assert(box.core.includes(p));
});
test('new ship view uses relative art on demand and states the future-concept boundary', async () => {
  const html=(await read('index.html')).toString();
  assert(html.includes('id="exteriorViewBtn"'));assert(html.includes('미래 확장 비전'));
  assert(html.includes('data-src="assets/concepts/v2/02_exterior_giant_starship_castle.webp"'));
  assert(!html.includes('src="https://'));assert(html.includes('width="1672" height="941"'));
});
