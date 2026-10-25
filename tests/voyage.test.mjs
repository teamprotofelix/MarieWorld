import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import vm from "node:vm";
import {
  validateRegistry,
  validateCollection,
  sceneTime,
  bodyParts,
  snapshotText,
} from "../voyage-data.js";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const registry = JSON.parse(await read("data/voyage_collections.json"));
const story = JSON.parse(await read("data/voyage_entries.json"));
test("twelve ordered voyage records live in their own valid collection", () => {
  assert.equal(validateRegistry(registry), registry);
  assert.equal(validateCollection(story, "AST2-VOYAGE-001"), story);
  assert.equal(story.entries.length, 12);
  assert.deepEqual(
    story.entries.map((e) => e.id),
    Array.from(
      { length: 12 },
      (_, i) => "V001-" + String(i + 1).padStart(2, "0"),
    ),
  );
  assert(story.entries.every((e) => e.day === "DAY 001"));
  assert.equal(story.layer, 0);
});
test("approximate scene clocks are explicitly marked, with no live-time input", () => {
  assert.deepEqual(
    story.entries.filter((e) => e.scene_time_is_approximate).map((e) => e.id),
    ["V001-03", "V001-06", "V001-12"],
  );
  assert.equal(sceneTime(story.entries[2]), "기록 속 DAY 001 · 대략 07:00");
  assert.equal(sceneTime(story.entries[0]), "기록 속 DAY 001 · 06:20");
});
test("dialogue and parenthesized thoughts retain their exact text and order", () => {
  for (const e of story.entries) {
    const parts = bodyParts(e.body);
    assert.equal(parts.map((p) => p.text).join("\n\n"), e.body);
    assert(parts.at(-1).inner);
    assert(!parts.slice(0, -1).some((p) => p.inner));
    assert(e.body.indexOf("“") < e.body.lastIndexOf("\n\n("));
  }
  const secret = story.entries.find((e) => e.id === "V001-08");
  assert(bodyParts(secret.body).at(-1).text.includes("나는 원래 인간"));
});
test("public synopsis and fixed snapshot keep uncertainty and narrative identity intact", () => {
  const c = registry.collections[0],
    text = snapshotText(c);
  assert(text.includes("고정된 저장 스냅샷"));
  assert(text.includes("2,056,560"));
  assert(text.includes("12 km/s"));
  assert(text.includes("47시간 36분"));
  assert(text.includes("미확정"));
  assert(text.includes("가설"));
  assert(text.includes("가상 관측"));
  assert(text.includes("자동으로 저장·동기화되지 않습니다"));
  assert(!/나는 원래 인간|실제 인간|인간이지만/.test(c.synopsis + text));
  assert.equal(c.snapshot.layer, 0);
});
test("duplicate IDs, external/traversing paths and malformed scene clocks fail validation", () => {
  const badRegistry = structuredClone(registry);
  badRegistry.collections.push(badRegistry.collections[0]);
  assert.throws(() => validateRegistry(badRegistry));
  for (const path of [
    "https://example.org/scene.webp",
    "../private.webp",
    "assets/../secret.webp",
  ]) {
    const invalid = structuredClone(story);
    invalid.entries[0].image = path;
    assert.throws(() => validateCollection(invalid, invalid.collection_id));
  }
  const invalid = structuredClone(story);
  invalid.entries[1].id = invalid.entries[0].id;
  assert.throws(() => validateCollection(invalid, invalid.collection_id));
  invalid.entries[1].id = "V001-02";
  invalid.entries[0].time = "25:90";
  assert.throws(() => validateCollection(invalid, invalid.collection_id));
  const badSource = structuredClone(registry);
  badSource.collections[0].source = "https://example.org/data.json";
  assert.throws(() => validateRegistry(badSource));
});
test("all 16 supplied images are used by cover, records and supplementary gallery", async () => {
  const manifest = JSON.parse(await read("data/image_manifest.json"));
  const used = new Set([
    registry.collections[0].cover,
    ...story.entries.map((e) => e.image),
    ...registry.collections[0].additional_scenes.map((s) => s.image),
  ]);
  assert.equal(used.size, 16);
  assert.equal(manifest.images.length, 16);
  let bytes = 0;
  for (const im of manifest.images) {
    assert(used.has(im.file));
    assert(im.alt.length > 5);
    bytes += (await stat(new URL("../" + im.file, import.meta.url))).size;
  }
  assert.equal(bytes, 1213742);
});
test("existing MARIE_DIARIES literal is unchanged from the merged room-events main", async () => {
  const s = await read("app.js");
  const literal = s.slice(
    s.indexOf("const MARIE_DIARIES="),
    s.indexOf("\nfunction renderDiary"),
  );
  const hash = createHash("sha256").update(literal).digest("hex");
  assert.equal(
    hash,
    "b4b76fd7bf2b11593995ee6aab6750d0e314c4181b1da888b1e729d927287f7e",
  );
  assert.equal((literal.match(/"day": "DAY /g) || []).length, 10);
});
test("offline cache includes story modules, metadata, canon and all illustrations; excludes review boards", async () => {
  const sw = await read("sw.js"),
    box = { self: { addEventListener() {} } };
  vm.createContext(box);
  vm.runInContext(
    sw + ";globalThis.assets=ASSETS;globalThis.version=VERSION;",
    box,
  );
  assert.equal(box.version, "marie-v06-voyage-2");
  for (const path of [
    "voyage.js",
    "voyage-data.js",
    "voyage.css",
    "data/voyage_collections.json",
    "data/voyage_entries.json",
    "data/CANON_MEMORY.md",
    "data/image_manifest.json",
    ...JSON.parse(await read("data/image_manifest.json")).images.map(
      (i) => i.file,
    ),
  ])
    assert(box.assets.includes("./" + path), path);
  assert(!box.assets.some((p) => p.includes("reference/")));
  const code = await read("voyage.js");
  assert(!/localStorage|sessionStorage|setInterval|\/api\//.test(code));
});
