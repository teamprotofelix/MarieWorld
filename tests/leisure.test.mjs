import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";
import {
  validateRegistry,
  validateCollection,
  sceneTime,
  bodyParts,
  snapshotText,
} from "../voyage-data.js";
import {
  validateLeisureGallery,
  relatedEntry,
  relatedPhoto,
  photoTime,
  imageDimensions,
  LEISURE_COLLECTION,
} from "../leisure-data.js";
const bytes = (p) => readFile(new URL("../" + p, import.meta.url));
const json = async (p) => JSON.parse(await bytes(p));
const registry = await json("data/voyage_collections.json"),
  volume = await json("data/voyage-002/entries.json"),
  gallery = await json("data/marie_leisure_gallery.json");
const hash = (b) => createHash("sha256").update(b).digest("hex");
test("002 is appended exactly once and keeps five independent chronological records", () => {
  assert.equal(validateRegistry(registry), registry);
  assert.equal(registry.collections[0].id, "AST2-VOYAGE-001");
  assert.equal(
    registry.collections.filter((c) => c.id === LEISURE_COLLECTION).length,
    1,
  );
  assert.equal(validateCollection(volume, LEISURE_COLLECTION), volume);
  assert.deepEqual(
    volume.entries.map((e) => e.id),
    ["V002-01", "V002-02", "V002-03", "V002-04", "V002-05"],
  );
  assert.deepEqual(
    volume.entries.map((e) => e.time),
    ["15:12", "07:50", "08:15", "08:50", "09:30"],
  );
});
test("photo links join diary_image rather than assuming matching album/journal order", () => {
  assert.equal(validateLeisureGallery(gallery, volume), gallery);
  assert.deepEqual(
    gallery.photos.map((p) => relatedEntry(p, volume).id),
    ["V002-01", "V002-03", "V002-05", "V002-04", "V002-02"],
  );
  for (const entry of volume.entries)
    assert.equal(relatedEntry(relatedPhoto(entry, gallery), volume), entry);
});
test("4:3 originals and 16:9 journal frames have distinct dimensions and constrained paths", () => {
  for (const p of gallery.photos) {
    assert.deepEqual(imageDimensions(p.image), { width: 1448, height: 1086 });
    assert.deepEqual(imageDimensions(p.diary_image), {
      width: 960,
      height: 540,
    });
  }
  assert.deepEqual(
    imageDimensions("assets/voyage-002/00_album_cover.webp", true),
    { width: 1600, height: 900 },
  );
  const bad = structuredClone(registry);
  bad.collections[1].cover = gallery.photos[0].image;
  assert.throws(() => validateRegistry(bad));
  bad.collections[1].cover = registry.collections[1].cover;
  bad.collections[1].additional_scenes[0].image =
    "assets/marie-leisure/../private.webp";
  assert.throws(() => validateRegistry(bad));
  const entry = structuredClone(volume);
  entry.entries[0].image = gallery.photos[0].image;
  assert.throws(() => validateCollection(entry, LEISURE_COLLECTION));
});
test("invalid gallery duplicates, missing links and mismatched clocks cannot silently connect photos", () => {
  for (const mutate of [
    (d) => (d.photos[1].id = d.photos[0].id),
    (d) => (d.photos[0].image = "https://example.org/p.webp"),
    (d) => (d.photos[0].diary_image = "assets/voyage-002/missing.webp"),
    (d) => (d.photos[0].image_width = 960),
    (d) => (d.photos[0].time = "00:01"),
  ]) {
    const invalid = structuredClone(gallery);
    mutate(invalid);
    assert.throws(() => validateLeisureGallery(invalid, volume));
  }
});
test("new source assets match supplied hashes, sizes and roles with no PNG originals", async () => {
  const m = await json("data/assets_manifest.json");
  assert.equal(m.assets.length, 11);
  let total = 0,
    full = 0;
  for (const a of m.assets) {
    const b = await bytes(a.path);
    assert.equal(b.length, a.bytes);
    assert.equal(hash(b), a.sha256);
    total += b.length;
    if (a.kind === "photo_full") {
      full += b.length;
      assert.equal(a.width / a.height, 4 / 3);
    } else assert.equal(a.width / a.height, 16 / 9);
  }
  assert.equal(full, 1299404);
  assert.equal(total, 1955794);
  for (const p of ["assets/marie-leisure", "assets/voyage-002"])
    assert(
      (await readdir(new URL("../" + p, import.meta.url))).every((n) =>
        n.endsWith(".webp"),
      ),
    );
});
test("new story preserves dialogue/inner order, approximate time and DAY001 navigation snapshot", () => {
  for (const e of volume.entries) {
    assert.equal(
      bodyParts(e.body)
        .map((p) => p.text)
        .join("\n\n"),
      e.body,
    );
    assert(bodyParts(e.body).at(-1).inner);
    assert(e.body.indexOf("“") < e.body.lastIndexOf("\n\n("));
  }
  assert(volume.entries.slice(1).every((e) => sceneTime(e).includes("대략")));
  assert.equal(photoTime(gallery.photos[2]), "기록 속 DAY 002 · 대략 09:30");
  const c = registry.collections.find((c) => c.id === LEISURE_COLLECTION),
    snapshot = snapshotText(c);
  assert.equal(c.snapshot.day, "DAY 001");
  assert(snapshot.includes("14:58"));
  assert(snapshot.includes("2,037,120"));
  assert(snapshot.includes("DAY 002 실시간 항법 수치가 아닙니다"));
  assert(
    snapshot.includes("발아율·수확량·LED 비교 결과는 아직 관측되지 않았습니다"),
  );
});
test("current main 001 art, entries, canon and registry record remain byte-for-byte intact", async () => {
  const m = await json("data/image_manifest.json"),
    paths = [
      ...m.images.map((i) => i.file),
      "data/voyage_entries.json",
      "data/CANON_MEMORY.md",
      "data/image_manifest.json",
    ].sort();
  const digest = hash(
    (
      await Promise.all(paths.map(async (p) => p + ":" + hash(await bytes(p))))
    ).join("\n"),
  );
  assert.equal(
    digest,
    "167d5d430047087a9bb06038ceee09abab54573ddcf2b2502a2677d47c3e63eb",
  );
  assert.equal(
    hash(JSON.stringify(registry.collections[0])),
    "f13af39a12a8d3cdccbf2a1db91a4cca1a5cf9d3f2beeb9553066519383eee9c",
  );
});
test("new photos, frames, metadata, canon and viewer code are in one versioned offline cache", async () => {
  const sw = (await bytes("sw.js")).toString(),
    box = { self: { addEventListener() {} } };
  vm.createContext(box);
  vm.runInContext(
    sw + ";globalThis.paths=ASSETS;globalThis.version=VERSION",
    box,
  );
  assert.equal(box.version, "marie-v07-leisure-1");
  const m = await json("data/assets_manifest.json");
  for (const path of [
    ...m.assets.map((a) => a.path),
    "data/marie_leisure_gallery.json",
    "data/assets_manifest.json",
    "data/voyage-002/entries.json",
    "data/voyage-002/CANON_MEMORY.md",
    "leisure-data.js",
    "leisure.css",
  ])
    assert(box.paths.includes("./" + path), path);
  assert.equal(new Set(box.paths).size, box.paths.length);
  for (const path of ["voyage.js", "leisure-data.js"])
    assert(
      !/localStorage|sessionStorage|\/api\//.test(
        (await bytes(path)).toString(),
      ),
    );
});
