import {
  validateRegistry,
  validateCollection,
  sceneTime,
  bodyParts,
  snapshotText,
} from "./voyage-data.js";
const $ = (id) => document.getElementById(id);
const root = $("voyageCollection"),
  dialog = $("voyageDialog"),
  body = $("voyageStoryBody");
const systemTheme = matchMedia("(prefers-color-scheme: light)");
let theme = systemTheme.matches ? "light" : "dark",
  themeChosen = false,
  selected = false;
let registry = null,
  collection = null,
  entries = null,
  activeId = null,
  opening = null,
  returnFocus = null,
  previousOverflow = "",
  scrollPosition = 0;
let loading = null,
  loadGeneration = 0;
const cache = new Map();
function el(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}
function figure(src, alt, { cover = false } = {}) {
  const frame = el("figure", "voyage-figure");
  const image = el("img");
  image.src = src;
  image.alt = alt;
  image.width = cover ? 1600 : 960;
  image.height = cover ? 900 : 540;
  image.loading = cover ? "eager" : "lazy";
  image.decoding = "async";
  const fallback = el(
    "p",
    "voyage-image-fallback",
    "이미지를 표시할 수 없습니다. " + alt,
  );
  fallback.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  });
  frame.append(image, fallback);
  return frame;
}
function setTheme(value, user = false) {
  theme = value;
  if (user) themeChosen = true;
  for (const area of [root, dialog]) area.dataset.readerTheme = theme;
  for (const button of document.querySelectorAll("[data-voyage-theme]")) {
    button.textContent = theme === "light" ? "☀ 낮 읽기" : "☾ 밤 읽기";
    button.setAttribute("aria-pressed", String(theme === "light"));
    button.setAttribute(
      "aria-label",
      theme === "light" ? "밤 읽기 테마로 전환" : "낮 읽기 테마로 전환",
    );
  }
}
function count() {
  if (!selected) return;
  $("diaryCount").textContent = entries
    ? `함께한 항해 ${entries.entries.length}편`
    : "항해 기록";
}
function choose(voyage) {
  selected = voyage;
  closeStory();
  root.hidden = !voyage;
  $("marieDiaryCollection").hidden = voyage;
  $("marieDiaryBtn").setAttribute("aria-pressed", String(!voyage));
  $("voyageDiaryBtn").setAttribute("aria-pressed", String(voyage));
  if (voyage) {
    count();
    if (!registry && !loading) loading = load();
  } else
    $("diaryCount").textContent =
      "공개된 항해 일기 " +
      document.querySelectorAll(".diary-card").length +
      "편";
}
async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("정적 기록을 읽지 못했습니다.");
  return response.json();
}
async function load(id) {
  const generation = ++loadGeneration;
  $("voyageLoading").hidden = false;
  $("voyageError").hidden = true;
  $("voyageContent").hidden = true;
  root.setAttribute("aria-busy", "true");
  try {
    const nextRegistry =
      registry || validateRegistry(await json("data/voyage_collections.json"));
    const next =
      nextRegistry.collections.find((c) => c.id === id) ||
      nextRegistry.collections[0];
    const nextEntries =
      cache.get(next.id) ||
      validateCollection(await json(next.source), next.id);
    if (generation !== loadGeneration) return;
    registry = nextRegistry;
    collection = next;
    entries = nextEntries;
    cache.set(next.id, nextEntries);
    activeId = next.id;
    render();
    count();
  } catch (error) {
    if (generation === loadGeneration) {
      $("voyageError").hidden = false;
      $("voyageContent").hidden = true;
    }
  } finally {
    if (generation === loadGeneration) {
      loading = null;
      $("voyageLoading").hidden = true;
      root.setAttribute("aria-busy", "false");
    }
  }
}
function render() {
  $("voyageContent").hidden = false;
  $("voyageVolume").replaceChildren(
    ...registry.collections.map((c) => {
      const option = el("option", "", c.title);
      option.value = c.id;
      return option;
    }),
  );
  $("voyageVolume").value = activeId;
  $("voyageVolumeLabel").hidden = registry.collections.length < 2;
  $("voyageCover").replaceChildren(
    figure(collection.cover, collection.cover_alt, { cover: true }),
  );
  $("voyageCollectionTitle").textContent = entries.collection_title;
  $("voyageSynopsis").textContent = collection.synopsis;
  $("voyageLeadNote").textContent =
    `아래 ${entries.entries.length}개 장면을 시간 순서대로 읽어 보세요.\nDAY와 시각은 이야기 속 날짜입니다.`;
  $("voyageArchiveMeta").textContent =
    `VOYAGE ${activeId.slice(-3)} / 기록 속 ${entries.day} / Layer ${entries.layer}`;
  const cards = entries.entries.map((entry, index) => {
    const card = el("article", "voyage-card");
    card.dataset.entryId = entry.id;
    const content = el("div", "voyage-card-content"),
      meta = el("p", "voyage-meta", sceneTime(entry) + " · " + entry.category),
      title = el("h3");
    const open = el("button", "voyage-open", entry.title + " ↗");
    open.type = "button";
    open.dataset.openEntry = entry.id;
    open.setAttribute("aria-label", entry.title + " 기록 읽기");
    title.append(open);
    content.append(
      el("span", "voyage-card-number", String(index + 1).padStart(2, "0")),
      meta,
      title,
      el("p", "voyage-summary", entry.summary),
    );
    card.append(figure(entry.image, entry.alt), content);
    return card;
  });
  $("voyageCards").replaceChildren(...cards);
  const s = collection.snapshot;
  $("voyageSnapshotMeta").textContent =
    `기록 속 ${s.day} ${s.time} · Layer ${s.layer} · 고정 스냅샷`;
  const list = el("dl", "voyage-snapshot-values");
  for (const [name, value] of [
    ["마지막 확인 잔여", s.remaining_km.toLocaleString("ko-KR") + " km"],
    ["가정 속도", s.assumed_speed_km_s + " km/s"],
    ["예상 잔여", s.eta],
    ["항로", s.route],
    ["운항", s.navigation],
  ])
    list.append(el("dt", "", name), el("dd", "", value));
  $("voyageSnapshotValues").replaceChildren(list);
  $("voyageUnknowns").replaceChildren(
    ...s.unresolved.map((text) => el("li", "", text)),
  );
  $("voyageMemoryText").textContent = snapshotText(collection);
  $("voyageCanonLink").href = collection.canon;
  $("voyageExtraScenes").replaceChildren(
    ...collection.additional_scenes.map((scene) => {
      const item = figure(scene.image, scene.alt);
      item.append(el("figcaption", "", scene.title));
      return item;
    }),
  );
  $("voyageCopyStatus").textContent = "";
  setTheme(theme);
}
function showStory(id, launcher) {
  const entry = entries?.entries.find((e) => e.id === id);
  if (!entry) return;
  if (!dialog.open) {
    returnFocus = launcher;
    previousOverflow = document.body.style.overflow;
    scrollPosition = scrollY;
    document.body.style.overflow = "hidden";
  }
  opening = id;
  const index = entries.entries.indexOf(entry);
  $("voyageStoryTitle").textContent = entry.title;
  $("voyageStoryMeta").textContent = sceneTime(entry) + " · " + entry.category;
  $("voyageStoryPosition").textContent =
    `${index + 1} / ${entries.entries.length}`;
  $("voyageStoryImage").replaceChildren(
    figure(entry.image, entry.alt, { cover: false }),
  );
  body.replaceChildren(
    ...bodyParts(entry.body).map((part) =>
      el("p", part.inner ? "voyage-inner" : "voyage-paragraph", part.text),
    ),
  );
  $("voyagePrevious").disabled = index === 0;
  $("voyageNext").disabled = index === entries.entries.length - 1;
  if (!dialog.open) {
    dialog.showModal();
    $("voyageStoryTitle").focus({ preventScroll: true });
  }
  dialog.scrollTop = 0;
  if (document.activeElement.disabled)
    $("voyageStoryTitle").focus({ preventScroll: true });
}
function restore() {
  if (opening === null) return;
  opening = null;
  document.body.style.overflow = previousOverflow;
  if (
    returnFocus?.isConnected &&
    selected &&
    $("diaryPanel").classList.contains("active")
  ) {
    window.scrollTo({ top: scrollPosition, behavior: "instant" });
    returnFocus.focus({ preventScroll: true });
  }
  returnFocus = null;
}
function closeStory() {
  if (dialog.open) dialog.close();
  restore();
}
$("marieDiaryBtn").addEventListener("click", () => choose(false));
$("voyageDiaryBtn").addEventListener("click", () => choose(true));
$("voyageRetry").addEventListener("click", () => {
  loading = load(activeId);
});
$("voyageVolume").addEventListener("change", (e) => {
  closeStory();
  loading = load(e.target.value);
});
$("voyageCards").addEventListener("click", (e) => {
  const button = e.target.closest("[data-open-entry]");
  if (button) showStory(button.dataset.openEntry, button);
});
$("voyageStoryClose").addEventListener("click", closeStory);
$("voyagePrevious").addEventListener("click", () => {
  const i = entries.entries.findIndex((e) => e.id === opening);
  if (i > 0) showStory(entries.entries[i - 1].id);
});
$("voyageNext").addEventListener("click", () => {
  const i = entries.entries.findIndex((e) => e.id === opening);
  if (i < entries.entries.length - 1) showStory(entries.entries[i + 1].id);
});
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeStory();
});
dialog.addEventListener("close", () => {
  if (!dialog.open) restore();
});
dialog.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Escape") e.stopPropagation();
    if (e.key === "Tab") {
      const buttons = [
        ...dialog.querySelectorAll(
          'button,a[href],select,input,[tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => !node.disabled && node.getClientRects().length);
      const first = buttons[0],
        last = buttons.at(-1),
        active = document.activeElement;
      if (
        e.shiftKey &&
        (active === first || active === $("voyageStoryTitle"))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (active === last || active === $("voyageStoryTitle"))
      ) {
        e.preventDefault();
        first?.focus();
      }
    }
  },
  true,
);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeStory();
  }
});
for (const button of document.querySelectorAll("[data-voyage-theme]"))
  button.addEventListener("click", () =>
    setTheme(theme === "light" ? "dark" : "light", true),
  );
systemTheme.addEventListener("change", () => {
  if (!themeChosen) setTheme(systemTheme.matches ? "light" : "dark");
});
$("voyageCopyMemory").addEventListener("click", async () => {
  const value = $("voyageMemoryText").textContent;
  try {
    await navigator.clipboard.writeText(value);
    $("voyageCopyStatus").textContent =
      "항해 요약을 복사했습니다. 새 대화에 직접 붙여 넣어 사용할 수 있어요.";
  } catch {
    const selection = getSelection(),
      range = document.createRange();
    range.selectNodeContents($("voyageMemoryText"));
    selection.removeAllRanges();
    selection.addRange(range);
    $("voyageMemoryText").focus();
    $("voyageCopyStatus").textContent =
      "아래 요약을 선택했습니다. 브라우저의 복사 기능을 이용해 주세요.";
  }
});
document.addEventListener("marie:view", () => {
  if (!$("diaryPanel").classList.contains("active")) closeStory();
  else count();
});
setTheme(theme);
