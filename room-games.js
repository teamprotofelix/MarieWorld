import { createFlightScene } from "./flight-scene.js";
import { SEEDS, DREAM, TEAS, CARGO, clamp } from "./room-models.js";
const choices = (action, items, selected) =>
  `<div class="event-choices">${items.map(([value, label]) => `<button data-action="${action}" data-value="${value}" aria-pressed="${String(selected) === String(value)}">${label}</button>`).join("")}</div>`;
const meter = (id, label, value = 0) =>
  `<div class="event-meter"><span>${label}</span><div><i id="${id}" style="width:${value}%"></i></div></div>`;
const gauge = () =>
  `<div class="tune-gauge" role="img" aria-label="가동 중인 출력 게이지"><span id="gaugeTarget"></span><i id="gaugeNeedle"></i></div><p id="gaugeText" class="event-subtle"></p>`;
const arrows = () =>
  `<div class="event-pad" role="group" aria-label="우주선 방향 조종"><button data-move="up" aria-label="위로 이동">↑</button><div><button data-move="left" aria-label="왼쪽 이동">←</button><button data-move="down" aria-label="아래로 이동">↓</button><button data-move="right" aria-label="오른쪽 이동">→</button></div></div>`;
const labels = {
  head: ["둥근 렌즈", "별 눈", "안테나"],
  body: ["민트 코어", "보라 코어", "노을 코어"],
  arms: ["집게 손", "잎사귀 손", "별빛 손"],
  move: ["바퀴", "궤도", "호버"],
};
export function gameMarkup(s) {
  const d = s.data;
  switch (s.room) {
    case "cockpit":
      return `<canvas class="event-canvas" id="missionCanvas" tabindex="0" aria-label="스타 플라이트. 방향키 또는 WASD, B 보호막." aria-describedby="eventInstructions"></canvas><div class="event-numbers"><span id="missionFragments"></span><span id="missionHull"></span><span id="missionHits"></span></div>${arrows()}<button data-action="shield" class="primary-btn">예비 보호막 · ${s.charges}회 남음</button>`;
    case "garden":
      return `<div class="garden-scene" id="gardenScene" role="img" aria-label="자라는 식물"><div class="grow-stars">✧ · ✦ · ✧</div><div class="plant"><i class="stem"></i><i class="leaf leaf-a"></i><i class="leaf leaf-b"></i><i class="leaf leaf-c"></i><i class="leaf leaf-d"></i><b>✿</b></div><div class="pot">ASTERIA GARDEN</div></div>${choices(
        "seed",
        Object.entries(SEEDS).map(([k, v]) => [k, v.label]),
        d.seed,
      )}<p id="gardenTarget" class="event-subtle"></p><label class="event-slider">물 <output id="waterValue">${d.water}%</output><input type="range" min="0" max="100" step="5" data-range="water" aria-label="물 조절" value="${d.water}"></label><label class="event-slider">빛 <output id="lightValue">${d.light}%</output><input type="range" min="0" max="100" step="5" data-range="light" aria-label="빛 조절" value="${d.light}"></label>${meter("growthMeter", "생장")}<p id="growthText"></p><button data-action="harvest" class="primary-btn">수확하기</button>`;
    case "kitchen":
      return `<div class="galley-scene"><span class="steam">⌁ ⌁ ⌁</span><div class="soup-pot"><div class="soup ${d.ingredients.length === 3 ? "soup-ready" : ""}">${d.ingredients.map((x) => ({ water: "♒", potato: "◈", basil: "✿" })[x]).join(" ") || "·"}</div><b>♡</b></div><p>RECIPE / 물 → 감자 → 바질</p></div>${choices(
        "ingredient",
        [
          ["water", "♒ 물"],
          ["potato", "◈ 감자"],
          ["basil", "✿ 바질"],
          ["sugar", "◇ 설탕"],
        ],
        "",
      )}<p>넣은 재료 ${d.ingredients.length}/3 · 순서 재확인 ${d.mistakes}회 · 젓기 ${d.stirs.length}/3</p>${gauge()}<button data-action="stir" class="secondary-btn" id="stirButton">초록 구간에서 젓기</button><button data-action="plate" class="primary-btn" id="plateButton">수프 완성</button>`;
    case "workshop":
      return `<div class="maker-scene"><div class="made-robot head-${d.head} body-${d.body} arms-${d.arms} move-${d.move} ${d.boot ? "booting" : ""}" aria-label="선택한 파츠로 조립한 로봇"><div class="robot-head">${d.head === "" ? "?" : ["◉ ◉", "✦ ✦", "⌁ ◡ ⌁"][d.head]}</div><div class="robot-body"><span class="robot-arm left">${d.arms === "" ? "?" : ["⌘", "❧", "✦"][d.arms]}</span><b>${d.body === "" ? "?" : "♡"}</b><span class="robot-arm right">${d.arms === "" ? "?" : ["⌘", "❧", "✦"][d.arms]}</span></div><div class="robot-feet">${d.move === "" ? "?" : ["●　●", "▰　▰", "≈ ≈ ≈"][d.move]}</div></div><span id="bootText"></span></div>${Object.entries(
        labels,
      )
        .map(
          ([k, v]) =>
            `<fieldset><legend>${{ head: "머리", body: "몸체", arms: "팔", move: "이동 파츠" }[k]}</legend>${choices(
              k,
              v.map((x, i) => [i, x]),
              d[k],
            )}</fieldset>`,
        )
        .join(
          "",
        )}<button data-action="power" class="primary-btn">전원 시험</button>`;
    case "engine":
      return `<div class="reactor-scene"><div class="reactor-core">✧</div><div class="circuits">${Array.from({ length: 4 }, (_, i) => `<span class="${i < d.hits.length ? (d.hits[i] ? "stable" : "backup") : ""}">${i + 1}</span>`).join("")}</div></div><p>안정화 ${d.hits.filter(Boolean).length} / 4 · 현재 회로 ${Math.min(4, d.hits.length + 1)}</p>${gauge()}<button data-action="lock" id="lockButton" class="primary-btn">출력 고정</button>`;
    case "observatory":
      return `<div class="memory-sky"><span>✧ OUR CONSTELLATION ✧</span><div class="memory-grid">${d.cards
        .map((face, i) => {
          const shown = d.open.includes(i) || d.matched.includes(i);
          return `<button data-action="card" data-value="${i}" class="${d.matched.includes(i) ? "matched" : shown ? "revealed" : ""}" aria-label="별 카드 ${i + 1}${shown ? " " + face : ""}" aria-pressed="${shown}" ${d.matched.includes(i) ? "disabled" : ""}>${shown ? face : "✧"}</button>`;
        })
        .join(
          "",
        )}</div></div><p>별 카드 ${d.matched.length / 2} / 6쌍 · 관측 시도 ${d.attempts}회</p>`;
    case "bedroom": {
      const v = d.chosen;
      return `<div class="dream-scene light-${v.light ?? 0}" role="img" aria-label="조명·담요·쿠션 미리보기"><span class="dream-window">☾ · ✦</span><div class="dream-bed"><span class="dream-pillow">${["✦", "♡", "☁"][v.cushion ?? 0]}</span><div class="dream-blanket blanket-${v.blanket ?? 0}">${["✧ · ✦ · ✧", "≋ ≋ ≋", "·····"][v.blanket ?? 0]}</div></div></div><p class="dream-wish">오늘의 휴식 취향: ${Object.keys(
        DREAM,
      )
        .map((k) => DREAM[k][d.target[k]])
        .join(" · ")}</p>${Object.entries(DREAM)
        .map(
          ([k, v]) =>
            `<fieldset><legend>${{ light: "조명", blanket: "담요", cushion: "쿠션" }[k]}</legend>${choices(
              k,
              v.map((x, i) => [i, x]),
              d.chosen[k] ?? "",
            )}</fieldset>`,
        )
        .join(
          "",
        )}${meter("restMeter", "휴식도", s.restScore)}<p>휴식도 ${s.restScore}%</p><button data-action="rest" class="primary-btn">이 조합으로 쉬기</button>`;
    }
    case "cargo":
      return `<div class="cargo-bins" role="group" aria-label="화물 구역">${[
        ["food", "♨ 식량"],
        ["tools", "⚙ 정비"],
        ["bio", "✿ 생명 유지"],
      ]
        .map(
          ([k, label]) =>
            `<button data-action="bin" data-value="${k}" data-bin="${k}">${label}<b>${d.sorted.filter((id) => CARGO.find((x) => x[0] === id)[2] === k).length}/3</b></button>`,
        )
        .join(
          "",
        )}</div><p>남은 화물 ${9 - d.sorted.length}개 · 구역 재확인 ${d.mistakes}회</p><div class="cargo-items">${d.items
        .filter((x) => !d.sorted.includes(x[0]))
        .map(
          ([id, label, , icon]) =>
            `<button draggable="true" data-action="item" data-value="${id}" aria-pressed="${d.selected === id}"><span>${icon}</span>${label}</button>`,
        )
        .join(
          "",
        )}</div><p class="event-subtle">${d.selected ? "선택한 화물: " + CARGO.find((x) => x[0] === d.selected)[1] + " → 위 구역을 누르세요." : "화물을 누른 뒤 구역을 선택하거나, 구역으로 드래그하세요."}</p>`;
    case "corridor":
      return `<canvas id="patrolCanvas" class="event-canvas patrol-canvas" tabindex="0" aria-label="복도 순찰. Space 점프, 아래 방향키로 몸 낮추기." aria-describedby="eventInstructions"></canvas><div class="event-numbers"><span id="patrolDistance"></span><span id="patrolHearts"></span><span id="patrolNext"></span></div><div class="runner-actions"><button data-action="jump" class="primary-btn">↑ 점프 · Space</button><button data-action="duck" class="secondary-btn" aria-pressed="${s.patrol.duck}">${s.patrol.duck ? "일어서기" : "↓ 몸 낮추기"}</button></div>`;
    case "lounge":
      return `<div class="tea-scene"><span class="steam">⌁ ⌁ ⌁</span><div class="tea-cup" id="teaCup"><div id="teaLevel"></div><span>♡</span></div><div class="tea-snack">${d.snack ? { rice: "◈ ◈", cookie: "◉ ◉", fruit: "❧ ❧" }[d.snack] : "· · ·"}</div></div>${choices(
        "tea",
        Object.entries(TEAS).map(([k, v]) => [k, v.label]),
        d.tea,
      )}<p id="teaTarget" class="event-subtle"></p><p id="teaClock"></p><button data-action="brew" class="secondary-btn" ${d.brew === "stopped" ? "disabled" : ""}>${d.brew === "running" ? "우림 멈추기" : "우리기 시작"}</button><fieldset><legend>오늘의 간식 · 녹차/쌀과자, 루이보스/쿠키, 캐모마일/과일이 잘 어울려요</legend>${choices(
        "snack",
        [
          ["rice", "쌀과자"],
          ["cookie", "바질 쿠키"],
          ["fruit", "말린 과일"],
        ],
        d.snack,
      )}</fieldset><button data-action="serve" class="primary-btn">티타임 만들기</button>`;
  }
}

export function mountGame(root, s) {
  const get = (id) => root.querySelector("#" + id);
  const text = (id, value) => {
    const el = get(id);
    if (el && el.textContent !== String(value)) el.textContent = value;
  };
  const canvas = get("missionCanvas") || get("patrolCanvas");
  const flight =
    canvas && s.room === "cockpit"
      ? createFlightScene(canvas, s.flight, {
          active: () => s.phase === "playing",
        })
      : null;
  let w = 1,
    h = 1,
    ratio = 1;
  const sprite = s.room === "corridor" ? new Image() : null;
  if (sprite) sprite.src = "assets/sprite.svg";
  function resize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    if (flight) flight.resize();
  }
  if (flight) flight.load();
  resize();
  function patrolDraw() {
    const c = canvas.getContext("2d");
    if (!c) return;
    const m = s.patrol,
      floor = h * 0.8;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.fillStyle = "#101d36";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const x =
        (i * w) / 4 -
        ((matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : m.time * 24) %
          (w / 4));
      c.strokeStyle = "#45617b";
      c.strokeRect(x, 20, w / 5, h * 0.55);
      c.fillStyle = "#a5ddd399";
      c.fillRect(x + 9, 31, w / 6, 3);
    }
    c.fillStyle = "#263c53";
    c.fillRect(0, floor, w, h - floor);
    c.strokeStyle = "#b2e3d2";
    c.beginPath();
    c.moveTo(0, floor);
    c.lineTo(w, floor);
    c.stroke();
    for (const o of m.obstacles) {
      const x = o.x * w;
      c.fillStyle = o.kind === "crate" ? "#d2a77e" : "#8babe2";
      if (o.kind === "crate") {
        c.fillRect(x - 13, floor - 30, 26, 30);
        c.fillStyle = "#6c5445";
        c.fillRect(x - 11, floor - 18, 22, 3);
      } else {
        c.fillRect(x - 12, floor - 90, 24, 56);
        c.fillStyle = "#20334f";
        c.fillRect(x - 8, floor - 79, 16, 36);
      }
    }
    const duck = m.duck || s.inputDuck,
      ph = duck ? 29 : 59,
      py = floor - ph - m.y * 105;
    c.globalAlpha = m.invincible > 0 ? 0.55 : 1;
    if (sprite?.complete && sprite.naturalWidth)
      c.drawImage(
        sprite,
        (Math.floor(m.time * 6) % 4) * 128,
        0,
        128,
        156,
        w * 0.2 - 24,
        py,
        48,
        ph,
      );
    else {
      c.fillStyle = "#b7ece2";
      c.fillRect(w * 0.2 - 16, py, 32, ph);
    }
    c.globalAlpha = 1;
  }
  function update(draw = true) {
    const d = s.data;
    if (flight) {
      text("missionFragments", `✧ ${s.flight.fragments} / 6`);
      text("missionHull", `보호막 ${s.flight.shield}%`);
      text("missionHits", `충돌 ${s.flight.collisions}회`);
      if (draw) flight.draw();
    }
    if (s.room === "garden") {
      const seed = SEEDS[d.seed];
      root
        .querySelectorAll("[data-action=seed]")
        .forEach((b) => (b.disabled = !!d.seed && b.dataset.value !== d.seed));
      text(
        "gardenTarget",
        seed
          ? `${seed.label} · 권장 물 ${seed.water}% / 빛 ${seed.light}%`
          : "씨앗을 먼저 선택해 주세요.",
      );
      text("waterValue", `${d.water}%`);
      text("lightValue", `${d.light}%`);
      get("gardenScene").dataset.stage = String(
        Math.min(3, Math.floor(d.growth / 10)),
      );
      get("gardenScene").setAttribute(
        "aria-label",
        `식물 성장 ${Math.min(3, Math.floor(d.growth / 10))}/3 단계`,
      );
      get("growthMeter").style.width = (d.growth / 30) * 100 + "%";
      const issue = seed
        ? d.water < seed.water - 12
          ? "물이 부족해요"
          : d.water > seed.water + 12
            ? "물이 너무 많아요"
            : d.light < seed.light - 12
              ? "빛이 부족해요"
              : d.light > seed.light + 12
                ? "빛이 너무 강해요"
                : "균형이 좋아요. 새잎이 자라요"
        : "씨앗 대기";
      text(
        "growthText",
        `${issue} · ${Math.floor(d.growth)} / 30초 · 성장 ${Math.min(3, Math.floor(d.growth / 10))}/3 단계`,
      );
    }
    if (s.room === "kitchen" || s.room === "engine") {
      const engine = s.room === "engine",
        target = engine ? s.engineTarget : 0.525;
      get("gaugeTarget").style.left =
        (target - (engine ? 0.12 : 0.125)) * 100 + "%";
      get("gaugeTarget").style.width = (engine ? 24 : 25) + "%";
      get("gaugeNeedle").style.left = s.gauge * 100 + "%";
      const ready = s.elapsed >= d.next;
      text(
        "gaugeText",
        `바늘 ${Math.round(s.gauge * 100)}% · 목표 ${Math.round((target - (engine ? 0.12 : 0.125)) * 100)}~${Math.round((target + (engine ? 0.12 : 0.125)) * 100)}% · ${ready ? "입력 가능" : Math.ceil(d.next - s.elapsed) + "초 후 입력 가능"}`,
      );
      if (engine) get("lockButton").disabled = !ready;
      else {
        get("stirButton").disabled =
          !ready || d.ingredients.length < 3 || d.stirs.length === 3;
        get("plateButton").disabled = d.stirs.length < 3 || s.elapsed < 30;
      }
    }
    if (s.room === "workshop")
      text(
        "bootText",
        d.boot
          ? `전원 시험 ${Math.ceil(d.boot)}초…`
          : "E의 작은 동료를 조립해 주세요.",
      );
    if (s.room === "corridor") {
      s.inputDuck = !!s.input?.duck;
      text("patrolDistance", Math.floor(s.patrol.distance) + " / 270 m");
      text("patrolHearts", "완충 " + Math.max(0, s.patrol.hearts) + " / 3");
      const next = s.patrol.obstacles.find((o) => o.x > 0.12);
      text(
        "patrolNext",
        next
          ? (next.kind === "crate" ? "다음: 상자 ↑" : "다음: 배관 ↓") +
              " · " +
              Math.max(0, (next.x - 0.2) / 0.23).toFixed(2) +
              "초"
          : "안전한 복도",
      );
      if (draw) patrolDraw();
    }
    if (s.room === "lounge") {
      const t = TEAS[d.tea];
      text(
        "teaTarget",
        t
          ? `권장 ${t.target}초 우림 · 지금은 ${d.brew === "idle" ? "준비" : d.brew === "running" ? "우리고 있어요" : "우림 완료"}`
          : "오늘의 찻잎을 골라 주세요.",
      );
      text("teaClock", d.steep.toFixed(1) + "초");
      get("teaLevel").style.height =
        clamp((d.steep / (t?.target || 30)) * 65, 5, 85) + "%";
      get("teaCup").style.setProperty(
        "--tea",
        d.tea === "green"
          ? "#98b975"
          : d.tea === "rooibos"
            ? "#bc7656"
            : "#dfc585",
      );
    }
  }
  return {
    update,
    resize,
    dispose() {
      flight?.dispose();
    },
  };
}
