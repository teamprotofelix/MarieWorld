import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RoomSession,
  EVENTS,
  SEEDS,
  DREAM,
  CARGO,
  PatrolModel,
} from "../room-models.js";
import { readFile, stat } from "node:fs/promises";
import vm from "node:vm";
const play = (room) => {
  const s = new RoomSession(room, () => 0.37);
  s.start();
  return s;
};
const advance = (s, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds / 0.025); i++) s.tick(0.025, input);
};
const until = (s, condition, max = 90) => {
  for (let i = 0; i < max * 40 && !condition(); i++) s.tick(0.025);
  assert(condition(), "condition reached");
};
test("ten room registrations match real map IDs and shared flight engine/renderer", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const rooms = [...html.matchAll(/data-room="([a-z]+)"/g)].map((x) => x[1]);
  assert.deepEqual(rooms.sort(), Object.keys(EVENTS).sort());
  const {FlightModel}=await import('../flight-model.js');
  const mission=play('cockpit');
  assert(mission.flight instanceof FlightModel);
  assert.equal(mission.flight.recover,false);
  const renderer = await readFile(
    new URL("../room-games.js", import.meta.url),
    "utf8",
  );
  assert(renderer.includes("createFlightScene"));
});
test("garden seed selection, imbalance, three stages and actual harvest", () => {
  const s = play("garden");
  s.act("harvest");
  assert.equal(s.phase, "playing");
  s.act("seed", "mint");
  advance(s, 2);
  assert(s.data.stress > 0);
  s.act("water", SEEDS.mint.water);
  s.act("light", SEEDS.mint.light);
  advance(s, 10.1);
  assert(s.data.growth >= 10 && s.data.growth < 20);
  advance(s, 10);
  assert(s.data.growth >= 20);
  advance(s, 10);
  s.act("harvest");
  assert.equal(s.phase, "result");
  assert(s.result.detail.includes("민트"));
  const bad = play("garden");
  bad.act("seed", "tomato");
  bad.act("water", 0);
  advance(bad, 36);
  assert.equal(bad.result.success, false);
});
test("cooking rejects wrong order, judges timing and waits for a cooked dish", () => {
  const s = play("kitchen");
  s.act("ingredient", "basil");
  assert.equal(s.data.ingredients.length, 0);
  assert.equal(s.data.mistakes, 1);
  for (const x of ["water", "potato", "basil"]) s.act("ingredient", x);
  s.act("plate");
  assert.equal(s.phase, "playing");
  for (let i = 0; i < 3; i++) {
    until(
      s,
      () => s.elapsed >= s.data.next && s.gauge >= 0.4 && s.gauge <= 0.65,
    );
    s.act("stir");
  }
  assert.deepEqual(s.data.stirs, [true, true, true]);
  until(s, () => s.elapsed >= 30);
  s.act("plate");
  assert(s.result.success);
  const bad = play("kitchen");
  advance(bad, 91);
  assert(!bad.result.success);
});
test("robot cannot boot with missing parts; selected assembly completes its power test", () => {
  const s = play("workshop");
  s.act("power");
  assert(s.feedback.includes("머리"));
  assert.equal(s.data.boot, 0);
  for (const k of ["head", "body", "arms", "move"]) s.act(k, "2");
  assert(s.feedback.includes("전원"));
  s.act("power");
  advance(s, 3.1);
  assert.equal(s.phase, "result");
  assert.equal(s.data.move, "2");
});
test("reactor timing changes four circuit outcomes", () => {
  for (const good of [true, false]) {
    const s = play("engine");
    for (let i = 0; i < 4; i++) {
      until(
        s,
        () =>
          s.elapsed >= s.data.next &&
          Math.abs(s.gauge - s.engineTarget) <= 0.12 === good,
      );
      s.act("lock");
    }
    assert.equal(s.result.success, good);
    assert.equal(s.result.score, good ? 100 : 0);
  }
});
test("memory mismatch resolves with elapsed time, match cannot be replayed, all pairs complete", () => {
  const s = play("observatory"),
    d = s.data;
  s.act("card", 0);
  s.act(
    "card",
    d.cards.findIndex((x) => x !== d.cards[0]),
  );
  assert(d.delay > 0);
  s.act("card", 3);
  assert.equal(d.open.length, 2);
  advance(s, 1);
  assert.equal(d.open.length, 0);
  for (const face of new Set(d.cards)) {
    for (const i of d.cards
      .map((v, i) => (v === face ? i : -1))
      .filter((i) => i >= 0))
      s.act("card", i);
  }
  assert(s.result.success);
  assert.equal(d.matched.length, 12);
});
test("dream choices alter rest score and completion outcome", () => {
  for (const good of [true, false]) {
    const s = play("bedroom");
    s.act("rest");
    assert.equal(s.phase, "playing");
    for (const key of Object.keys(DREAM))
      s.act(key, good ? s.data.target[key] : (s.data.target[key] + 1) % 3);
    s.act("rest");
    assert.equal(s.result.success, good);
    assert.equal(s.result.score, good ? 100 : 0);
  }
});
test("cargo wrong bins keep cargo available; sorting every distinct item completes exactly once", () => {
  const s = play("cargo");
  s.act("item", "tea");
  s.act("bin", "tools");
  assert.equal(s.data.sorted.length, 0);
  assert.equal(s.data.mistakes, 1);
  for (const [id, , kind] of CARGO) {
    s.act("item", id);
    s.act("bin", kind);
  }
  assert(s.result.success);
  assert.equal(new Set(s.data.sorted).size, 9);
  const result = s.result;
  s.act("bin", "food");
  assert.equal(s.result, result);
});
test("tea requires brewing and snack, and time/pairing changes the memory card rating", () => {
  const make = (time, snack) => {
    const s = play("lounge");
    s.act("serve");
    assert.equal(s.phase, "playing");
    s.act("tea", "green");
    s.act("brew");
    advance(s, time);
    s.act("brew");
    s.act("snack", snack);
    s.act("serve");
    return s;
  };
  const good = make(25, "rice"),
    bad = make(3, "fruit");
  assert(good.result.score > bad.result.score);
  assert(good.result.detail.includes("알맞아요"));
});
test("cockpit goal/time, shield use, cooldown and terminal failure share the existing flight physics", () => {
  const s = play("cockpit");
  s.act("shield");
  assert.equal(s.charges, 1);
  s.act("shield");
  assert.equal(s.charges, 1);
  s.flight.fragments = 6;
  s.tick(0.025);
  assert(s.result.success);
  const elapsed = s.elapsed;
  advance(s, 2);
  assert.equal(s.elapsed, elapsed);
  const bad = play("cockpit");
  for (let i = 0; i < 4; i++) {
    bad.flight.invincible = 0;
    bad.flight.objects = [];
    bad.flight.spawn("asteroid", bad.flight.ship.x, bad.flight.ship.y);
    bad.tick(0.025);
  }
  assert.equal(bad.result.success, false);
  assert.equal(bad.flight.recoveries, 0);
  const survive = play("cockpit");
  survive.flight.spawn = () => {};
  survive.flight.objects = [];
  advance(survive, 46);
  assert(survive.result.success);
});
test("patrol jump/duck avoid distinct obstacles, cooldown prevents rapid damage; win and failure exist", () => {
  const m = new PatrolModel();
  m.obstacles = [{ kind: "crate", x: 0.2, hit: false, passed: false }];
  m.jump();
  for (let i = 0; i < 8; i++) m.step(0.025);
  assert(m.y > 0);
  const safe = new PatrolModel();
  safe.duck = true;
  safe.obstacles = [{ kind: "pipe", x: 0.2, hit: false, passed: false }];
  safe.step(0.025);
  assert.equal(safe.hearts, 3);
  const hit = new PatrolModel();
  hit.obstacles = [{ kind: "crate", x: 0.2, hit: false, passed: false }];
  hit.step(0.025);
  hit.step(0.025);
  assert.equal(hit.hearts, 2);
  const bad = play("corridor");
  advance(bad, 45);
  assert.equal(bad.result.success, false);
  const good = play("corridor");
  for (let i = 0; i < 46 * 40 && good.phase === "playing"; i++) {
    const next = good.patrol.obstacles.find((o) => o.x > 0.15);
    good.patrol.duck = next?.kind === "pipe";
    if (next?.kind === "crate" && next.x < 0.31 && next.x > 0.2)
      good.patrol.jump();
    good.tick(0.025);
  }
  assert.equal(good.result.success, true);
});
test("pause, long frame cap, invalid time and terminal guards hold for every room", () => {
  for (const room of Object.keys(EVENTS)) {
    const s = play(room);
    s.paused = true;
    s.act("seed", "mint");
    s.tick(100);
    assert.equal(s.elapsed, 0);
    s.paused = false;
    s.tick(100);
    assert.equal(s.elapsed, 0.05);
    s.tick(NaN);
    assert.equal(s.elapsed, 0.05);
    s.finish(true, "done");
    const first = s.result;
    s.finish(false, "again");
    s.tick(0.05);
    assert.equal(s.result, first);
    assert.equal(s.elapsed, 0.05);
  }
});
test("new code and core CSS are in the versioned offline cache without new storage or services", async () => {
  const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  const ctx = { self: { addEventListener() {} } };
  vm.createContext(ctx);
  vm.runInContext(
    sw + ";globalThis.paths=ASSETS;globalThis.version=VERSION",
    ctx,
  );
  assert.equal(ctx.version, "marie-v06-voyage-2");
  for (const path of [
    "room-events.js",
    "room-models.js",
    "room-games.js",
    "room-events.css",
    "flight-scene.js",
  ]) {
    assert(ctx.paths.includes("./" + path));
    assert((await stat(new URL("../" + path, import.meta.url))).size > 0);
    const code = await readFile(new URL("../" + path, import.meta.url), "utf8");
    assert(!/localStorage|sessionStorage|fetch\(|\/api\//.test(code));
  }
});
