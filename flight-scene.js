// Shared scene renderer for the home flight view and isolated cockpit missions.
// Rendering only: the caller owns the single animation loop and lifecycle.
const images = new Map(),
  listeners = new Set();
const names = [
  "nebula",
  "ring",
  "ice",
  "lava",
  "sun",
  "blackhole",
  "comet",
  "gate",
  "asteroid",
  "constellation",
  ...Array.from(
    { length: 8 },
    (_, i) => `ship-${String(i + 1).padStart(2, "0")}`,
  ),
];
function requestAssets() {
  if (images.size) return;
  for (const name of names) {
    const im = new Image();
    images.set(name, im);
    im.onload = im.onerror = () => {
      for (const listener of listeners) listener();
    };
    im.src = `assets/flight/${name}.webp`;
  }
}
export function createFlightScene(canvas, model, { active = () => true } = {}) {
  const context = canvas.getContext("2d");
  let width = 1,
    height = 1,
    dpr = 1;
  const stars = Array.from({ length: 115 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    depth: 1 + (i % 3),
    r: 0.5 + Math.random() * 1.1,
    phase: Math.random() * 6,
  }));
  function ready(name) {
    const im = images.get(name);
    return im?.complete && im.naturalWidth ? im : null;
  }
  function fitImage(name, x, y, w, opacity = 1) {
    const im = ready(name);
    if (!im) return false;
    context.globalAlpha = opacity;
    const h = (w * im.naturalHeight) / im.naturalWidth;
    context.drawImage(im, x - w / 2, y - h / 2, w, h);
    context.globalAlpha = 1;
    return true;
  }
  function resize() {
    if (!active()) return;
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    model.setBounds(width, height);
    draw();
  }
  function drawFallbackShip(x, y, w) {
    context.fillStyle = "#ade9ff";
    context.beginPath();
    context.moveTo(x + w * 0.44, y);
    context.lineTo(x - w * 0.32, y - w * 0.19);
    context.lineTo(x - w * 0.2, y);
    context.lineTo(x - w * 0.32, y + w * 0.19);
    context.closePath();
    context.fill();
    context.fillStyle = "#5bbafa";
    context.fillRect(x - w * 0.22, y - w * 0.04, w * 0.35, w * 0.08);
  }
  function draw() {
    if (!context || !active()) return;
    const c = context,
      t = model.time;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = "#080f27";
    c.fillRect(0, 0, width, height);
    const bg = ready("nebula");
    if (bg) {
      const bw = Math.max(width, (height * bg.naturalWidth) / bg.naturalHeight),
        bh = (bw * bg.naturalHeight) / bg.naturalWidth;
      const shift = (t * 4) % bw;
      c.globalAlpha = 0.66;
      c.drawImage(bg, -shift, (height - bh) / 2, bw, bh);
      c.drawImage(bg, bw - shift, (height - bh) / 2, bw, bh);
      c.globalAlpha = 1;
    }
    const shade = c.createLinearGradient(0, 0, width, height);
    shade.addColorStop(0, "#0c1c3666");
    shade.addColorStop(0.6, "#1b17372a");
    shade.addColorStop(1, "#0a12377d");
    c.fillStyle = shade;
    c.fillRect(0, 0, width, height);
    for (const star of stars) {
      const x =
        (((star.x * width - t * star.depth * 12) % width) + width) % width;
      c.globalAlpha = 0.45 + Math.sin(t * 0.8 + star.phase) * 0.22;
      c.fillStyle =
        star.depth === 1 ? "#c3c7fa" : star.depth === 2 ? "#ffe4b9" : "#d1ffff";
      c.beginPath();
      c.arc(x, star.y * height, star.r, 0, Math.PI * 2);
      c.fill();
      if (star.depth === 3) {
        c.fillRect(x - 3, star.y * height, 6, 0.6);
        c.fillRect(x, star.y * height - 3, 0.6, 6);
      }
    }
    c.globalAlpha = 1;
    for (const o of model.scenery) {
      const fade = Math.min(1, o.age / 2, (o.x + 0.35) / 0.2);
      const w = Math.min(width * o.size, 245) * (1 + Math.sin(t * 0.1) * 0.025);
      if (
        !fitImage(o.kind, o.x * width, o.y * height, w, Math.max(0, fade) * 0.9)
      ) {
        c.strokeStyle = "#c4b5fd";
        c.beginPath();
        c.ellipse(
          o.x * width,
          o.y * height,
          w * 0.5,
          w * 0.24,
          -0.4,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    }
    for (const o of model.objects) {
      const x = o.x * width,
        y = o.y * height;
      if (o.kind === "fragment") {
        c.save();
        c.translate(x, y);
        c.rotate(t * 0.5);
        c.shadowColor = "#94fff1";
        c.shadowBlur = 14;
        c.fillStyle = "#d9fff4";
        c.beginPath();
        c.moveTo(0, -12);
        c.lineTo(7, 0);
        c.lineTo(0, 12);
        c.lineTo(-7, 0);
        c.closePath();
        c.fill();
        c.restore();
      } else if (!fitImage("asteroid", x, y, 47)) {
        c.fillStyle = "#8c7f9d";
        c.beginPath();
        c.arc(x, y, 19, 0, Math.PI * 2);
        c.fill();
      }
    }
    const x = model.ship.x * width,
      y = model.ship.y * height,
      w = model.shipWidth;
    c.save();
    c.translate(x, y);
    c.rotate(model.ship.tilt);
    const glow = c.createRadialGradient(
      -w * 0.37,
      0,
      0,
      -w * 0.37,
      0,
      w * 0.45,
    );
    glow.addColorStop(0, "#8fefff90");
    glow.addColorStop(1, "#72caff00");
    c.fillStyle = glow;
    c.fillRect(-w * 0.83, -w * 0.45, w * 0.9, w * 0.9);
    c.globalAlpha = model.invincible > 0 ? 0.65 + 0.3 * Math.sin(t * 22) : 1;
    const frame = ready(
      `ship-${String((Math.floor(t * 9) % 8) + 1).padStart(2, "0")}`,
    );
    // Frames are alpha-aligned on equal square canvases to avoid row-to-row jitter.
    if (frame) c.drawImage(frame, -w / 2, -w / 2, w, w);
    else drawFallbackShip(0, 0, w);
    if (model.invincible > 0) {
      c.strokeStyle = "#b9fcff";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, 0, w * 0.49, w * 0.33, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    if (model.flash > 0) {
      c.fillStyle = `rgba(255,185,161,${model.flash * 0.35})`;
      c.fillRect(0, 0, width, height);
    }
  }
  return {
    load() {
      listeners.add(draw);
      requestAssets();
      draw();
    },
    resize,
    draw,
    dispose() {
      listeners.delete(draw);
    },
  };
}
