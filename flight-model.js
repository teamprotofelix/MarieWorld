// Flight-only simulation. No site resources or persistent state are modified.
export const SCENERY = ['ring', 'ice', 'lava', 'sun', 'constellation', 'comet', 'blackhole', 'gate'];
export const SCENE_NAMES = ['고리 행성의 빛', '오로라 얼음 세계', '붉은 용암의 노래', '따뜻한 항성 곁', '미지의 별자리', '혜성이 남긴 편지', '고요한 블랙홀', '오래된 워프 게이트'];
const bound = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export class FlightModel {
  constructor(random = Math.random) {
    this.random = random;
    this.width = 960; this.height = 540;
    this.mode = 'auto'; this.time = 0; this.distance = 0; this.fragments = 0;
    this.shield = 100; this.invincible = 0; this.recoveries = 0; this.flash = 0;
    this.ship = {x: .28, y: .53, tilt: 0};
    this.objects = []; this.scenery = []; this.spawnClock = 0; this.sceneClock = 0; this.sceneIndex = 0;
    this.lastEvent = ''; this.eventSerial = 0;
    this.scenery.push({kind: 'ring', x: .79, y: .25, size: .25, age: 3});
    this.scenery.push({kind: 'constellation', x: .86, y: .79, size: .15, age: 3});
    this.spawn('fragment', .7, .53);
    this.spawn('asteroid', 1.08, .78);
  }
  get shipWidth() { return bound(this.width * .22, 106, 190); }
  setBounds(w, h) { this.width = Math.max(1, w); this.height = Math.max(1, h); this.keepInBounds(); }
  keepInBounds() {
    const mx = (this.shipWidth / 2 + 10) / this.width;
    const my = (this.shipWidth * .32 + 12) / this.height;
    this.ship.x = bound(this.ship.x, mx, 1 - mx);
    this.ship.y = bound(this.ship.y, my, 1 - my);
  }
  setMode(mode) { this.mode = mode === 'manual' ? 'manual' : 'auto'; this.ship.tilt = 0; }
  announce(message) { this.lastEvent = message; this.eventSerial++; }
  spawn(kind, x = 1.1, y = .18 + this.random() * .64) {
    // Bounded pools: at most 14 interactive objects and 4 scenic objects.
    if (this.objects.length >= 14) return;
    this.objects.push({kind, x, y, age: 0, radius: kind === 'fragment' ? 12 : 20});
  }
  step(seconds, input = {}, reduced = false) {
    const dt = bound(Number.isFinite(seconds) ? seconds : 0, 0, .05);
    const pace = reduced ? .3 : 1;
    this.time += dt * pace;
    this.distance += dt * 12 * pace;
    this.invincible = Math.max(0, this.invincible - dt);
    this.flash = Math.max(0, this.flash - dt);
    const ship = this.ship;
    let dx = 0, dy = 0;
    if (this.mode === 'manual') {
      dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const norm = Math.hypot(dx, dy) || 1;
      ship.x += dx / norm * 240 / this.width * dt;
      ship.y += dy / norm * 240 / this.height * dt;
    } else {
      const target = this.objects.find(o => o.kind === 'fragment' && o.x > ship.x && o.x < .85);
      const hazard = this.objects.find(o => o.kind === 'asteroid' && o.x > ship.x && o.x < ship.x + .25 && Math.abs(o.y - ship.y) < .18);
      let y = target?.y ?? .5 + Math.sin(this.time * .38) * .12;
      if (hazard) y = hazard.y > .5 ? .28 : .72;
      dy = y - ship.y;
      ship.x += (.28 - ship.x) * (1 - Math.exp(-dt * 2));
      ship.y += dy * (1 - Math.exp(-dt * 2.8));
    }
    ship.tilt += (dy * .14 - ship.tilt) * (1 - Math.exp(-dt * 8));
    this.keepInBounds();
    this.spawnClock += dt * pace; this.sceneClock += dt * pace;
    if (this.spawnClock >= 2.8) {
      this.spawnClock -= 2.8;
      this.spawn(this.random() < .65 ? 'fragment' : 'asteroid');
    }
    if (this.sceneClock >= 9) {
      this.sceneClock -= 9; this.sceneIndex = (this.sceneIndex + 1) % SCENERY.length;
      if (this.scenery.length < 4) this.scenery.push({kind: SCENERY[this.sceneIndex], x: 1.25, y: this.sceneIndex % 2 ? .28 : .73, size: .18 + this.random() * .1, age: 0});
      this.announce(SCENE_NAMES[this.sceneIndex] + '… E님, 창밖을 봐 주세요.');
    }
    for (const o of this.scenery) { o.x -= dt * .047 * pace; o.age += dt * pace; }
    this.scenery = this.scenery.filter(o => o.x > -.4);
    for (const o of this.objects) {
      o.x -= dt * (o.kind === 'fragment' ? .14 : .11) * pace; o.age += dt * pace;
      const x = (o.x - ship.x) * this.width, y = (o.y - ship.y) * this.height;
      // Ellipse fits the visible hull, excluding transparent engine glow.
      const hit = (x / (this.shipWidth * .33 + o.radius)) ** 2 + (y / (this.shipWidth * .2 + o.radius)) ** 2 < 1;
      if (!hit) continue;
      if (o.kind === 'fragment') {
        o.collected = true; this.fragments++;
        this.announce('별조각 +1 ✧ 우리의 작은 보물이에요.');
      } else if (this.mode === 'manual' && this.invincible === 0) {
        this.shield = Math.max(0, this.shield - 25); this.invincible = 2; this.flash = .35;
        if (!this.shield) {
          this.shield = 100; this.recoveries++; this.invincible = 3;
          this.announce('보호막 자동 회복 완료. 천천히 다시 출발해요.');
        } else this.announce('보호막이 충격을 흡수했어요. 괜찮아요, E님.');
      }
    }
    this.objects = this.objects.filter(o => !o.collected && o.x > -.15);
    if (this.mode === 'auto') this.shield = Math.min(100, this.shield + dt * 3);
  }
}
