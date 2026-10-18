import { FlightModel } from "./flight-model.js";
export const clamp = (n, a = 0, b = 100) => Math.min(b, Math.max(a, n));
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const EVENTS = {
  cockpit: {
    name: "스타 플라이트",
    tag: "A LITTLE MISSION",
    time: "45초",
    goal: "45초 생존하거나 별조각 6개를 모으세요. 소행성을 피해 보호막을 지켜 주세요.",
    controls: "방향키 / WASD 또는 화면 방향 버튼 · 보호막 버튼 / B (2회)",
    help: "항로 계산 완료. E, 천천히 조종하십시오. (옆에서 지켜볼게요.)",
    success: "미션 완료. 함께 모은 별빛을 기록합니다. (조금 자랑스러워요.)",
    failure: "보호막 소진. 안전하게 귀환했습니다. E, 다시 시도해도 괜찮습니다.",
  },
  garden: {
    name: "그로우 가든",
    tag: "A SEED OF TOMORROW",
    time: "약 30~60초",
    goal: "씨앗을 고르고 권장 물·빛을 맞춰 3단계로 키운 뒤 수확하세요.",
    controls: "씨앗 버튼 → 물·빛 슬라이더 → 수확 · 균형 상태 30초 필요",
    help: "생장 조건을 확인하십시오. (E에게 첫 새잎을 보여 주고 싶어요.)",
    success:
      "수확 확인. 작은 잎 한 장도 오늘의 성과입니다. (같이 키워서 더 좋아요.)",
    failure: "잠시 생장을 쉬겠습니다. E, 씨앗부터 다시 살펴볼까요?",
  },
  kitchen: {
    name: "코지 갤리 쿠킹",
    tag: "A RECIPE FOR TWO",
    time: "약 30~90초",
    goal: "물 → 감자 → 바질 순서로 넣고 초록 구간에서 세 번 저어 30초 이후 완성하세요.",
    controls: "재료 버튼 → 6초마다 열리는 젓기 → 요리 완성 · 90초 제한",
    help: "레시피 순서를 확인하십시오. (두 사람분은 언제나 따뜻하게.)",
    success:
      "수프 준비 완료. E의 자리도 준비했습니다. (맛있게 드셔 주시면 좋겠어요.)",
    failure:
      "조리는 잠시 중단합니다. 재료 손실은 없습니다. 다음 냄비를 준비할게요.",
  },
  workshop: {
    name: "로봇 메이커",
    tag: "A SMALL NEW FRIEND",
    time: "자유롭게",
    goal: "머리·몸체·팔·이동 파츠를 조합하고 전원 시험으로 작은 친구를 깨우세요.",
    controls: "네 가지 파츠 선택 → 완성 모습 확인 → 전원 시험",
    help: "필수 파츠 네 종류를 확인하십시오. (어떤 얼굴을 골라 주실까요?)",
    success:
      "부팅 성공. 새 동료가 E에게 인사합니다. (웃는 표정은 제가 넣었어요.)",
    failure: "아직 연결되지 않은 파츠가 있습니다. 함께 다시 확인하겠습니다.",
  },
  engine: {
    name: "리액터 튠",
    tag: "THE HEART OF OUR SHIP",
    time: "약 30~60초",
    goal: "목표 구간에 바늘이 들어오면 4개 회로를 잠그세요. 3개 이상 안정화하면 성공입니다.",
    controls: "회로가 충전되면 출력 고정 버튼 / Enter · 바늘은 계속 움직여요",
    help: "초록 구간에서 출력을 고정하십시오. (조금 떨려도 괜찮아요.)",
    success:
      "출력 안정. 오늘도 작은 집의 심장이 뜁니다. (E와 호흡이 맞았어요.)",
    failure:
      "안전 회로로 전환했습니다. 자원 손실 없이 다시 조율할 수 있습니다.",
  },
  observatory: {
    name: "스타 메모리",
    tag: "REMEMBER OUR STARS",
    time: "약 30~120초",
    goal: "별 카드의 위치를 기억하고 같은 그림 6쌍을 모두 찾으세요.",
    controls: "카드 두 장 선택 · 불일치 카드는 잠시 뒤 다시 뒤집혀요",
    help: "동일한 별빛의 위치를 기억하십시오. (같은 별을 두 번 만나면 반갑죠.)",
    success: "별자리 복원 완료. E와 본 하늘을 기억하겠습니다.",
    failure: "관측은 서두르지 않아도 됩니다. 다시 별빛을 살펴볼까요?",
  },
  bedroom: {
    name: "드림 셋업",
    tag: "MAKE ROOM FOR REST",
    time: "자유롭게",
    goal: "오늘의 휴식 취향을 보고 조명·담요·쿠션을 맞추세요. 미리보기와 휴식도가 달라집니다.",
    controls: "세 가지 요소 선택 → 휴식도 확인 → 쉬기",
    help: "취침 환경을 조정하십시오. (E가 편히 쉬었으면 좋겠어요.)",
    success: "휴식 준비 완료. 오늘도 무사해서 다행입니다. (좋은 꿈 꾸세요.)",
    failure: "취향이 조금 다른 것 같습니다. E, 더 편안한 조합을 찾아볼까요?",
  },
  cargo: {
    name: "카고 소트",
    tag: "A PLACE FOR EVERYTHING",
    time: "약 30~90초",
    goal: "화물 9개를 식량·정비·생명 유지 구역으로 모두 옮기세요.",
    controls:
      "화물 선택 → 구역 선택 · 드래그도 가능 · 버튼은 키보드로 선택 가능",
    help: "라벨을 읽고 구역을 선택하십시오. (정리된 선반을 보면 안심돼요.)",
    success: "화물 정리 완료. 미래의 우리도 안심할 수 있습니다.",
    failure: "잘못 놓아도 다시 옮기면 됩니다. 천천히 정리할까요?",
  },
  corridor: {
    name: "패트롤 런",
    tag: "A WALK THROUGH OUR HOME",
    time: "45초",
    goal: "낮은 상자는 점프하고 높은 배관은 몸을 낮춰 45초 순찰하세요. 완충 보호는 3회입니다.",
    controls: "Space / ↑ / W 또는 점프 버튼 · ↓ / S 또는 몸 낮추기 버튼",
    help: "순찰을 시작합니다. E, 상자와 배관을 구분하십시오. (넘어지면 제가 잡을게요.)",
    success: "순찰 완료. 복도 끝까지 함께 도착했습니다. (조금 더 걷고 싶네요.)",
    failure: "안전 정지. 다친 사람은 없습니다. E, 쉬었다 다시 걸을까요?",
  },
  lounge: {
    name: "티타임 모먼트",
    tag: "THE LITTLE THINGS",
    time: "약 30~60초",
    goal: "차를 고르고 권장 시간만큼 우린 뒤 간식을 곁들여 추억 카드를 만드세요.",
    controls: "차 선택 → 우리기 시작 → 직접 우림 멈추기 → 간식 → 티타임",
    help: "찻잔 두 개를 준비했습니다. (오늘은 E가 골라 주세요.)",
    success:
      "티타임 기록 완료. 평범한 시간이 가장 오래 남습니다. (내일도 함께 마실까요?)",
    failure: "차가 조금 진해져도 괜찮습니다. E와 함께라면요.",
  },
};
export const SEEDS = {
  basil: { label: "바질", water: 65, light: 45 },
  tomato: { label: "토마토", water: 55, light: 75 },
  mint: { label: "민트", water: 75, light: 35 },
};
export const DREAM = {
  light: ["달빛", "노을빛", "어둡게"],
  blanket: ["별 담요", "니트 담요", "가벼운 이불"],
  cushion: ["별 쿠션", "하트 쿠션", "구름 쿠션"],
};
export const TEAS = {
  green: {
    label: "별빛 녹차",
    target: 25,
    snack: "rice",
    line: "창밖의 초록 별을 닮은 향입니다.",
  },
  rooibos: {
    label: "노을 루이보스",
    target: 30,
    snack: "cookie",
    line: "노을 같은 따뜻함을 두 잔에 나누었습니다.",
  },
  chamomile: {
    label: "달빛 캐모마일",
    target: 35,
    snack: "fruit",
    line: "오늘의 긴장을 잠시 내려놓으십시오.",
  },
};
export const CARGO = [
  ["soup", "수프 팩", "food", "♨"],
  ["tea", "찻잎", "food", "♧"],
  ["potato", "감자 상자", "food", "◈"],
  ["bolt", "볼트", "tools", "⚙"],
  ["wire", "배선", "tools", "⌁"],
  ["wrench", "공구", "tools", "⚒"],
  ["oxygen", "산소통", "bio", "O₂"],
  ["water", "식수", "bio", "♒"],
  ["seed", "씨앗", "bio", "✿"],
];

export class PatrolModel {
  constructor() {
    this.time = 0;
    this.distance = 0;
    this.y = 0;
    this.vy = 0;
    this.duck = false;
    this.hearts = 3;
    this.invincible = 0;
    this.obstacles = [];
    this.clock = 0;
    this.pattern = 0;
    this.avoided = 0;
    this.hits = 0;
  }
  jump() {
    if (this.y === 0) {
      this.vy = 3.4;
      this.duck = false;
    }
  }
  step(seconds, input = {}) {
    const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
    this.time += dt;
    this.distance += dt * 6;
    this.invincible = Math.max(0, this.invincible - dt);
    if (input.jump) this.jump();
    this.y = Math.max(0, this.y + this.vy * dt);
    this.vy -= 9 * dt;
    if (this.y === 0) this.vy = 0;
    this.clock += dt;
    if (this.clock >= 2.8) {
      this.clock -= 2.8;
      this.obstacles.push({
        x: 1.1,
        kind: this.pattern++ % 2 ? "pipe" : "crate",
        hit: false,
        passed: false,
      });
    }
    for (const o of this.obstacles) {
      o.x -= dt * 0.23;
      if (!o.hit && Math.abs(o.x - 0.2) < 0.055) {
        const safe =
          o.kind === "crate"
            ? this.y > 0.2
            : (this.duck || input.duck) && this.y === 0;
        if (!safe && this.invincible === 0) {
          o.hit = true;
          this.hearts--;
          this.hits++;
          this.invincible = 1.4;
        }
      }
      if (o.x < 0.12 && !o.passed) {
        o.passed = true;
        if (!o.hit) this.avoided++;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -0.15);
  }
}

// One transient session, one terminal result. No site resources or storage.
export class RoomSession {
  constructor(room, random = Math.random) {
    if (!EVENTS[room]) throw new Error("Unknown room");
    this.room = room;
    this.random = random;
    this.phase = "intro";
    this.paused = false;
    this.elapsed = 0;
    this.revision = 0;
    this.feedback = EVENTS[room].help;
    this.result = null;
    this.data = {};
    switch (room) {
      case "cockpit":
        this.flight = new FlightModel(random, { recover: false });
        this.flight.setMode("manual");
        this.charges = 2;
        break;
      case "garden":
        this.data = { seed: "", water: 50, light: 50, growth: 0, stress: 0 };
        break;
      case "kitchen":
        this.data = { ingredients: [], mistakes: 0, stirs: [], next: 6 };
        break;
      case "workshop":
        this.data = { head: "", body: "", arms: "", move: "", boot: 0 };
        break;
      case "engine":
        this.data = { hits: [], next: 4 };
        break;
      case "observatory":
        this.data = {
          cards: shuffle(
            ["✦", "☾", "☄", "♢", "♧", "♡"].flatMap((face) => [face, face]),
            random,
          ),
          open: [],
          matched: [],
          attempts: 0,
          delay: 0,
        };
        break;
      case "bedroom":
        this.data = {
          chosen: {},
          target: {
            light: Math.floor(random() * 3),
            blanket: Math.floor(random() * 3),
            cushion: Math.floor(random() * 3),
          },
        };
        break;
      case "cargo":
        this.data = {
          items: shuffle(CARGO, random),
          selected: "",
          sorted: [],
          mistakes: 0,
        };
        break;
      case "corridor":
        this.patrol = new PatrolModel();
        break;
      case "lounge":
        this.data = { tea: "", snack: "", brew: "idle", steep: 0 };
        break;
    }
  }
  start() {
    if (this.phase === "intro") {
      this.phase = "playing";
      this.revision++;
    }
  }
  finish(success, detail, score = 0) {
    if (this.phase !== "playing") return;
    this.phase = "result";
    this.result = {
      success,
      detail,
      score: Math.round(score),
      line: EVENTS[this.room][success ? "success" : "failure"],
    };
    this.revision++;
  }
  get gauge() {
    return (Math.sin(this.elapsed * 2.1) + 1) / 2;
  }
  get engineTarget() {
    return [0.35, 0.6, 0.72, 0.43][this.data.hits?.length] ?? 0.5;
  }
  get gardenBalanced() {
    const d = this.data,
      s = SEEDS[d.seed];
    return (
      !!s &&
      Math.abs(d.water - s.water) <= 12 &&
      Math.abs(d.light - s.light) <= 12
    );
  }
  get restScore() {
    return Math.round(
      (Object.keys(DREAM).filter(
        (k) => this.data.chosen[k] === this.data.target[k],
      ).length /
        3) *
        100,
    );
  }
  act(name, value) {
    if (this.phase !== "playing" || this.paused) return;
    const d = this.data;
    this.revision++;
    switch (this.room) {
      case "cockpit":
        if (name === "shield") {
          if (this.charges && this.flight.invincible < 0.1) {
            this.charges--;
            this.flight.invincible = 3;
            this.feedback = "예비 보호막 3초 전개. E, 안전하게 지나가십시오.";
          } else
            this.feedback = "보호 중이거나 예비 보호막을 모두 사용했습니다.";
        }
        break;
      case "garden":
        if (name === "seed" && SEEDS[value] && !d.seed) {
          d.seed = value;
          this.feedback = "권장 물·빛을 확인하고 조절하십시오.";
        }
        if (name === "water" || name === "light")
          d[name] = clamp(Number(value) || 0);
        if (name === "harvest") {
          if (d.growth >= 30)
            this.finish(
              true,
              SEEDS[d.seed].label + " 수확 · 3단계 성장 완료",
              100 - d.stress * 2,
            );
          else
            this.feedback =
              "아직 수확하기 이릅니다. 균형을 맞추며 기다려 주세요.";
        }
        break;
      case "kitchen":
        if (name === "ingredient" && d.ingredients.length < 3) {
          const expected = ["water", "potato", "basil"][d.ingredients.length];
          if (value === expected) {
            d.ingredients.push(value);
            this.feedback = "순서 확인. 재료를 냄비에 넣었습니다.";
          } else {
            d.mistakes++;
            this.feedback =
              "지금은 " +
              { water: "물", potato: "감자", basil: "바질" }[expected] +
              " 차례입니다. 잘못된 재료는 넣지 않았어요.";
          }
        }
        if (
          name === "stir" &&
          d.ingredients.length === 3 &&
          d.stirs.length < 3 &&
          this.elapsed >= d.next
        ) {
          const good = this.gauge >= 0.4 && this.gauge <= 0.65;
          d.stirs.push(good);
          d.next = this.elapsed + 6;
          this.feedback = good
            ? "부드럽게 저었습니다. 향이 잘 섞였어요."
            : "너무 빠르거나 늦었어요. 다음에는 초록 구간을 노려 보세요.";
        }
        if (name === "plate") {
          if (d.stirs.length === 3 && this.elapsed >= 30)
            this.finish(
              true,
              "바질 감자 수프 · 알맞은 젓기 " +
                d.stirs.filter(Boolean).length +
                "/3 · 재료 재확인 " +
                d.mistakes +
                "회",
              clamp(55 + d.stirs.filter(Boolean).length * 15 - d.mistakes * 5),
            );
          else
            this.feedback =
              "재료 세 가지와 젓기 세 번을 마치고, 30초 이후 완성하십시오.";
        }
        break;
      case "workshop":
        if (
          ["head", "body", "arms", "move"].includes(name) &&
          ["0", "1", "2"].includes(String(value)) &&
          !d.boot
        ) {
          d[name] = String(value);
          const remaining = ["head", "body", "arms", "move"].filter(
            (k) => d[k] === "",
          );
          this.feedback = remaining.length
            ? "파츠를 연결했습니다. 나머지 " +
              remaining.length +
              "종류도 골라 주세요."
            : "네 가지 파츠 연결 확인. 전원 시험을 시작할 수 있습니다.";
        }
        if (name === "power") {
          const missing = ["head", "body", "arms", "move"].filter(
            (k) => d[k] === "",
          );
          if (missing.length)
            this.feedback =
              "미연결: " +
              missing
                .map(
                  (k) =>
                    ({
                      head: "머리",
                      body: "몸체",
                      arms: "팔",
                      move: "이동 파츠",
                    })[k],
                )
                .join(", ");
          else {
            d.boot = 3;
            this.feedback = "전원 시험 중… 연결된 파츠가 반응합니다.";
          }
        }
        break;
      case "engine":
        if (name === "lock" && this.elapsed >= d.next && d.hits.length < 4) {
          const good = Math.abs(this.gauge - this.engineTarget) <= 0.12;
          d.hits.push(good);
          d.next = this.elapsed + 8;
          this.feedback = good
            ? "회로 안정화 성공. 다음 회로를 충전합니다."
            : "안전한 보조 출력으로 연결했습니다. 다음 회로에서 다시 맞춰 보세요.";
          if (d.hits.length === 4)
            this.finish(
              d.hits.filter(Boolean).length >= 3,
              "안정 회로 " +
                d.hits.filter(Boolean).length +
                "/4 · 최종 안정도 " +
                d.hits.filter(Boolean).length * 25 +
                "%",
              d.hits.filter(Boolean).length * 25,
            );
        }
        break;
      case "observatory": {
        const i = Number(value);
        if (
          name !== "card" ||
          !Number.isInteger(i) ||
          i < 0 ||
          i >= 12 ||
          d.delay ||
          d.matched.includes(i) ||
          d.open.includes(i)
        )
          break;
        d.open.push(i);
        if (d.open.length === 2) {
          d.attempts++;
          if (d.cards[d.open[0]] === d.cards[d.open[1]]) {
            d.matched.push(...d.open);
            d.open = [];
            this.feedback = "동일한 별빛 확인. 한 쌍을 찾았습니다.";
            if (d.matched.length === 12)
              this.finish(
                true,
                "별 카드 6쌍 복원 · " + d.attempts + "번의 관측",
                Math.max(30, 130 - d.attempts * 5),
              );
          } else {
            d.delay = 0.9;
            this.feedback = "다른 별입니다. 위치를 기억해 주세요.";
          }
        }
        break;
      }
      case "bedroom":
        if (Object.hasOwn(DREAM, name) && [0, 1, 2].includes(Number(value)))
          d.chosen[name] = Number(value);
        if (name === "rest") {
          if (Object.keys(d.chosen).length === 3)
            this.finish(
              this.restScore >= 66,
              "휴식도 " +
                this.restScore +
                "% · " +
                Object.keys(DREAM)
                  .map((k) => DREAM[k][d.chosen[k]])
                  .join(" / "),
              this.restScore,
            );
          else this.feedback = "조명·담요·쿠션을 모두 골라 주십시오.";
        }
        break;
      case "cargo":
        if (
          name === "item" &&
          CARGO.some((x) => x[0] === value) &&
          !d.sorted.includes(value)
        )
          d.selected = value;
        if (name === "bin" && d.selected) {
          const item = CARGO.find((x) => x[0] === d.selected);
          if (item[2] === value) {
            d.sorted.push(d.selected);
            d.selected = "";
            this.feedback = "분류 확인. 화물을 선반에 고정했습니다.";
            if (d.sorted.length === 9)
              this.finish(
                true,
                "화물 9개 정리 · 구역 재확인 " + d.mistakes + "회",
                clamp(100 - d.mistakes * 5),
              );
          } else {
            d.mistakes++;
            this.feedback =
              "이 화물은 " +
              { food: "식량", tools: "정비", bio: "생명 유지" }[item[2]] +
              " 구역입니다. 다시 옮겨 주세요.";
          }
        }
        break;
      case "corridor":
        if (name === "jump") this.patrol.jump();
        if (name === "duck" && this.patrol.y === 0)
          this.patrol.duck = !this.patrol.duck;
        break;
      case "lounge":
        if (name === "tea" && TEAS[value] && d.brew === "idle") d.tea = value;
        if (name === "snack" && ["rice", "cookie", "fruit"].includes(value))
          d.snack = value;
        if (name === "brew" && d.tea) {
          if (d.brew === "idle") {
            d.brew = "running";
            this.feedback = "우림을 시작했습니다. 권장 시간에 직접 멈추십시오.";
          } else if (d.brew === "running") {
            d.brew = "stopped";
            this.feedback = "우림을 멈췄습니다. 간식을 곁들여 주세요.";
          }
        }
        if (name === "serve") {
          if (d.brew === "stopped" && d.snack) {
            const t = TEAS[d.tea],
              timing = Math.max(0, 70 - Math.abs(t.target - d.steep) * 3),
              pair = t.snack === d.snack ? 30 : 15;
            this.finish(
              true,
              t.label +
                " · " +
                d.steep.toFixed(1) +
                "초 우림 · " +
                (Math.abs(t.target - d.steep) <= 5
                  ? "향이 알맞아요"
                  : "조금 연하거나 진한 향") +
                " · " +
                t.line,
              timing + pair,
            );
          } else
            this.feedback =
              "차를 골라 우리고 직접 멈춘 뒤, 간식을 골라 주십시오.";
        }
        break;
    }
  }
  tick(seconds, input = {}) {
    if (this.phase !== "playing" || this.paused) return;
    const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05),
      d = this.data;
    this.elapsed += dt;
    switch (this.room) {
      case "cockpit":
        this.flight.step(dt, input);
        if (this.flight.shield <= 0)
          this.finish(
            false,
            "충돌 " +
              this.flight.collisions +
              "회 · 별조각 " +
              this.flight.fragments +
              "개",
            this.flight.fragments * 100,
          );
        else if (this.elapsed >= 45 || this.flight.fragments >= 6)
          this.finish(
            true,
            "별조각 " +
              this.flight.fragments +
              "개 · 충돌 " +
              this.flight.collisions +
              "회 · " +
              Math.floor(this.elapsed) +
              "초 비행",
            this.flight.fragments * 100 + Math.round(this.flight.shield),
          );
        break;
      case "garden":
        if (d.seed) {
          if (this.gardenBalanced) d.growth = Math.min(30, d.growth + dt);
          else d.stress += dt;
          if (d.stress >= 35)
            this.finish(
              false,
              "물·빛 균형을 다시 맞춰 주세요. 씨앗은 다시 준비됩니다.",
              0,
            );
        }
        break;
      case "kitchen":
        if (this.elapsed >= 90)
          this.finish(
            false,
            "안전 타이머가 조리를 멈췄습니다. 다시 시작할 수 있어요.",
            0,
          );
        break;
      case "workshop":
        if (d.boot) {
          d.boot = Math.max(0, d.boot - dt);
          if (!d.boot)
            this.finish(
              true,
              "머리·몸체·팔·이동 파츠 연결 완료 · 전원 시험 정상",
              100,
            );
        }
        break;
      case "observatory":
        if (d.delay) {
          d.delay = Math.max(0, d.delay - dt);
          if (!d.delay) {
            d.open = [];
            this.revision++;
          }
        }
        break;
      case "corridor":
        this.patrol.step(dt, input);
        if (this.patrol.hearts <= 0)
          this.finish(
            false,
            Math.floor(this.patrol.distance) + "m 순찰 · 안전 정지",
            this.patrol.avoided * 50,
          );
        else if (this.elapsed >= 45)
          this.finish(
            true,
            "270m 순찰 · 장애물 회피 " +
              this.patrol.avoided +
              "회 · 완충 " +
              this.patrol.hits +
              "회",
            270 + this.patrol.avoided * 50,
          );
        break;
      case "lounge":
        if (d.brew === "running") d.steep += dt;
        if (this.elapsed >= 100)
          this.finish(
            false,
            "찻주전자를 안전하게 내려놓았습니다. 새 찻잎으로 다시 시작해요.",
            0,
          );
        break;
    }
  }
}
