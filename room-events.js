import { RoomSession, EVENTS } from "./room-models.js";
import { gameMarkup, mountGame } from "./room-games.js";
const $ = (id) => document.getElementById(id);
const modal = $("roomModal"),
  event = $("roomEvent"),
  body = $("eventBody"),
  shell = document.querySelector(".site-shell");
let room = "cockpit",
  session = null,
  view = null,
  raf = 0,
  last = 0,
  paintClock = 0,
  revision = -1,
  previousInert = false;
const keys = new Set(),
  pointers = new Map();
const directions = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
function clearInput() {
  keys.clear();
  pointers.clear();
  event
    .querySelectorAll("[data-move]")
    .forEach((b) => b.classList.remove("pressed"));
}
function stopLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
  paintClock = 0;
  clearInput();
}
function disposeView() {
  view?.dispose();
  view = null;
}
function render() {
  if (!session) return;
  const focused = document.activeElement;
  const focusKey = event.contains(focused)
    ? {
        action: focused.dataset.action,
        value: focused.dataset.value,
        id: focused.id,
      }
    : null;
  clearInput();
  disposeView();
  revision = session.revision;
  $("eventTitle").textContent = EVENTS[room].name;
  $("eventEyebrow").textContent = EVENTS[room].tag;
  $("eventInstructions").textContent = EVENTS[room].controls;
  $("eventFeedback").textContent = session.feedback;
  $("eventPhase").textContent = {
    intro: "준비",
    playing: "플레이",
    result: "결과",
  }[session.phase];
  $("eventPause").hidden = session.phase !== "playing";
  $("eventPause").textContent = session.paused ? "▶ 계속하기" : "Ⅱ 일시정지";
  $("eventPause").setAttribute("aria-pressed", String(session.paused));
  $("eventPaused").hidden = !session.paused;
  const description = EVENTS[room];
  if (session.phase === "intro") {
    body.innerHTML = `<div class="event-intro"><img src="assets/${room}.webp" alt="${description.name}의 방" /><div><span class="event-duration">${description.time}</span><h3>오늘은, E와 함께.</h3><p>${description.goal}</p><p class="event-subtle">${description.controls}</p><button id="eventStart" class="primary-btn">시작하기 ✧</button></div></div>`;
  } else if (session.phase === "result") {
    const r = session.result;
    body.innerHTML = `<div class="event-result"><span class="result-star">${r.success ? "✦" : "☾"}</span><p class="eyebrow">ASTÉRIA-2 / A LITTLE MEMORY</p><h3>${r.success ? "오늘의 작은 성취" : "안전하게 쉬어가기"}</h3><p id="eventResultDetail">${r.detail}</p><strong>${r.score} <small>기념 점수</small></strong><blockquote>${r.line}</blockquote><p class="event-subtle">항해 자원과 일기는 그대로입니다. 이 카드는 이번 플레이에만 남아요.</p><div class="event-result-actions"><button id="eventRetry" class="primary-btn">다시 하기 ↻</button><button data-return class="secondary-btn">방으로 돌아가기</button></div></div>`;
  } else {
    body.innerHTML = gameMarkup(session);
    view = mountGame(body, session);
    view.update();
  }
  body.inert = session.paused;
  if (focusKey) {
    const candidates = [...event.querySelectorAll("button,input,canvas")];
    const restore = candidates.find((el) =>
      focusKey.id
        ? el.id === focusKey.id
        : el.dataset.action === focusKey.action &&
          el.dataset.value === focusKey.value,
    );
    if (restore && !restore.disabled) restore.focus({ preventScroll: true });
    else if (session.phase === "playing" && !session.paused)
      (
        body.querySelector("button:not([disabled]),input,canvas") ||
        $("eventBack")
      ).focus({ preventScroll: true });
  }
}
function act(name, value) {
  if (!session) return;
  session.act(name, value);
  if (
    session.phase === "playing" &&
    (room === "cockpit" || room === "corridor")
  ) {
    revision = session.revision;
    const shield = body.querySelector("[data-action=shield]");
    if (shield)
      shield.textContent = "예비 보호막 · " + session.charges + "회 남음";
    const duck = body.querySelector("[data-action=duck]");
    if (duck) {
      duck.textContent = session.patrol.duck ? "일어서기" : "↓ 몸 낮추기";
      duck.setAttribute("aria-pressed", String(session.patrol.duck));
    }
    view?.update(false);
  } else render();
  updateToolbar();
  if (session.phase === "result") {
    stopLoop();
    $("eventRetry").focus();
  }
}
function updateToolbar() {
  if (!session) return;
  $("eventTime").textContent = Math.floor(session.elapsed) + "초";
  $("eventFeedback").textContent = session.feedback;
}
function run(now) {
  raf = 0;
  if (
    !session ||
    session.phase !== "playing" ||
    session.paused ||
    document.hidden
  )
    return;
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  paintClock += dt;
  const input = {};
  for (const code of keys) if (directions[code]) input[directions[code]] = true;
  for (const dir of pointers.values()) input[dir] = true;
  if (room === "corridor")
    input.duck = keys.has("ArrowDown") || keys.has("KeyS");
  session.input = input;
  session.tick(dt, input);
  if (revision !== session.revision) render();
  if (paintClock >= 1 / 30) {
    view?.update();
    updateToolbar();
    paintClock %= 1 / 30;
  }
  if (session.phase === "result") {
    stopLoop();
    $("eventRetry")?.focus({ preventScroll: true });
    return;
  }
  raf = requestAnimationFrame(run);
}
function startLoop() {
  if (
    session?.phase === "playing" &&
    !session.paused &&
    !raf &&
    !document.hidden
  ) {
    last = 0;
    raf = requestAnimationFrame(run);
  }
}
function pause() {
  if (!session || session.phase !== "playing" || session.paused) return;
  session.paused = true;
  stopLoop();
  render();
  $("eventPause").focus({ preventScroll: true });
}
function togglePause() {
  if (!session || session.phase !== "playing") return;
  if (session.paused) {
    session.paused = false;
    render();
    startLoop();
    focusPlay();
  } else pause();
}
function focusPlay() {
  (
    body.querySelector("canvas") ||
    body.querySelector("button,input") ||
    $("eventBack")
  ).focus({ preventScroll: true });
}
function open() {
  if (session) return;
  previousInert = shell.inert;
  shell.inert = true;
  session = new RoomSession(room);
  event.hidden = false;
  modal.querySelector(".room-hero").hidden = true;
  modal.querySelector(".room-bottom").hidden = true;
  modal.setAttribute("aria-labelledby", "eventTitle");
  render();
  updateToolbar();
  $("eventStart").focus();
  modal.querySelector(".modal-content").scrollTop = 0;
}
function close(restoreFocus = true) {
  if (!session) return;
  stopLoop();
  disposeView();
  session = null;
  body.replaceChildren();
  body.inert = false;
  event.hidden = true;
  modal.querySelector(".room-hero").hidden = false;
  modal.querySelector(".room-bottom").hidden = false;
  modal.setAttribute("aria-labelledby", "roomTitle");
  shell.inert = previousInert;
  if (restoreFocus && !modal.classList.contains("hidden"))
    $("roomEventBtn").focus({ preventScroll: true });
}
function refreshRoom(id) {
  close(false);
  room = id;
  const description = EVENTS[room];
  $("roomEventName").textContent = description.name;
  $("roomEventDescription").textContent = description.goal;
  $("roomEventBtn").textContent = "✧ 이벤트 · " + description.name;
}
$("roomEventBtn").addEventListener("click", open);
$("eventBack").addEventListener("click", () => close());
$("eventPause").addEventListener("click", togglePause);
event.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  if (button.id === "eventStart") {
    session.start();
    render();
    startLoop();
    focusPlay();
    return;
  }
  if (button.id === "eventRetry") {
    stopLoop();
    session = new RoomSession(room);
    render();
    updateToolbar();
    $("eventStart").focus();
    return;
  }
  if (button.hasAttribute("data-return")) {
    close();
    return;
  }
  if (button.dataset.action) act(button.dataset.action, button.dataset.value);
});
event.addEventListener("input", (e) => {
  const key = e.target.dataset.range;
  if (key && session) {
    session.act(key, e.target.value);
    revision = session.revision;
    view?.update(false);
    updateToolbar();
  }
});
event.addEventListener("pointerdown", (e) => {
  const button = e.target.closest("[data-move]");
  if (!button || session?.phase !== "playing" || session.paused) return;
  e.preventDefault();
  button.focus({ preventScroll: true });
  button.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, button.dataset.move);
  button.classList.add("pressed");
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  event.addEventListener(type, (e) => {
    pointers.delete(e.pointerId);
    const button = e.target.closest("[data-move]");
    button?.classList.remove("pressed");
  });
event.addEventListener("focusout", (e) => {
  if (!event.contains(e.relatedTarget)) clearInput();
});
event.addEventListener("dragstart", (e) => {
  const item = e.target.closest("[data-action=item]");
  if (item && session?.phase === "playing" && !session.paused) {
    session.act("item", item.dataset.value);
    revision = session.revision;
    item.setAttribute("aria-pressed", "true");
    e.dataTransfer.setData("text/plain", item.dataset.value);
    e.dataTransfer.effectAllowed = "move";
  }
});
event.addEventListener("dragend", () => {
  if (session?.phase === "playing") render();
});
event.addEventListener("dragover", (e) => {
  if (e.target.closest("[data-bin]")) e.preventDefault();
});
event.addEventListener("drop", (e) => {
  const bin = e.target.closest("[data-bin]");
  if (!bin || !session) return;
  e.preventDefault();
  session.act("item", e.dataTransfer.getData("text/plain"));
  session.act("bin", bin.dataset.bin);
  render();
  updateToolbar();
  if (session.phase === "result") stopLoop();
});
// Capture only when the room event owns the dialog; Escape returns one level.
document.addEventListener(
  "keydown",
  (e) => {
    if (!session) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
      return;
    }
    if (e.key === "Tab") {
      const nodes = [
        ...modal.querySelectorAll("button,input,canvas[tabindex]"),
      ].filter(
        (el) =>
          !el.disabled &&
          !el.closest("[hidden],[inert]") &&
          el.getClientRects().length,
      );
      if (!nodes.length) return;
      const first = nodes[0],
        lastNode = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (
      session.phase !== "playing" ||
      session.paused ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      !event.contains(document.activeElement) ||
      e.target.closest("input,textarea,select,[contenteditable]")
    )
      return;
    if (room === "cockpit" && directions[e.code]) {
      e.preventDefault();
      keys.add(e.code);
      return;
    }
    if (room === "cockpit" && e.code === "KeyB" && !e.repeat) {
      e.preventDefault();
      act("shield");
      focusPlay();
      return;
    }
    if (room === "corridor") {
      if (
        ["Space", "ArrowUp", "KeyW"].includes(e.code) &&
        document.activeElement.tagName === "CANVAS"
      ) {
        e.preventDefault();
        if (!e.repeat) act("jump");
        return;
      }
      if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        keys.add(e.code);
        return;
      }
    }
    if (
      e.target.matches("[data-move]") &&
      ["Enter", "Space"].includes(e.code)
    ) {
      e.preventDefault();
      pointers.set("keyboard", e.target.dataset.move);
    }
  },
  true,
);
document.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (["Enter", "Space"].includes(e.code)) pointers.delete("keyboard");
});
for (const el of [$("closeRoom"), modal.querySelector(".backdrop")])
  el.addEventListener(
    "click",
    (e) => {
      if (session) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    },
    true,
  );
document.addEventListener("marie:room", (e) => refreshRoom(e.detail.room));
document.addEventListener("marie:roomclosed", () => close(false));
document.addEventListener("marie:view", () => {
  if (session) {
    close(false);
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", pause);
window.addEventListener("resize", () => view?.resize());
const observer = new MutationObserver(() => {
  if (modal.classList.contains("hidden")) close(false);
  else if (
    session &&
    document.querySelector(".modal:not(#roomModal):not(.hidden)")
  )
    pause();
});
for (const el of document.querySelectorAll(".modal"))
  observer.observe(el, { attributes: true, attributeFilter: ["class"] });
refreshRoom(room);
