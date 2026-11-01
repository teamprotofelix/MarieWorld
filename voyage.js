import {
  validateRegistry,
  validateCollection,
  sceneTime,
  bodyParts,
  snapshotText,
} from "./voyage-data.js";
import {
  LEISURE_COLLECTION,
  LEISURE_SOURCE,
  validateLeisureGallery,
  photoTime,
  relatedEntry,
  relatedPhoto,
  imageDimensions,
} from "./leisure-data.js";
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
let album = null,
  albumPromise = null,
  albumSelected = false,
  albumRequest = 0,
  viewerKind = "story";
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
  const dimensions = imageDimensions(src, cover);
  image.width = dimensions.width;
  image.height = dimensions.height;
  image.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
  image.loading = cover ? "eager" : "lazy";
  image.decoding = "async";
  const fallback = el(
    "span",
    "voyage-image-fallback",
    "이미지를 표시할 수 없습니다. " + alt,
  );
  fallback.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
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
  $("diaryCount").textContent = albumSelected
    ? "마리의 여가 사진 5장"
    : entries
      ? `함께한 항해 ${entries.entries.length}편`
      : "항해 기록";
}
function syncSubView() {
  $("voyageArchive").hidden = albumSelected;
  $("leisureAlbum").hidden = !albumSelected;
  $("voyageVolumeLabel").hidden =
    albumSelected || !registry || registry.collections.length < 2;
  $("voyageAlbumBtn").hidden = !registry?.collections.some(
    (c) => c.id === LEISURE_COLLECTION,
  );
  $("voyageAlbumBtn").setAttribute("aria-pressed", String(albumSelected));
}
function setAlbum(value) {
  albumSelected = value;
  albumRequest++;
  closeStory();
  syncSubView();
  count();
  if (!value) {
    $("leisureAlbum").setAttribute("aria-busy", "false");
    $("voyageAlbumBtn").focus({ preventScroll: true });
  }
}
async function ensureAlbum() {
  if (album) return album;
  if (albumPromise) return albumPromise;
  albumPromise = (async () => {
    const c = registry.collections.find((c) => c.id === LEISURE_COLLECTION);
    if (!c) throw new Error("사진첩의 항해권을 찾을 수 없습니다.");
    const volume =
      cache.get(c.id) || validateCollection(await json(c.source), c.id);
    const data = validateLeisureGallery(await json(LEISURE_SOURCE), volume);
    cache.set(c.id, volume);
    album = data;
    return data;
  })().finally(() => {
    albumPromise = null;
  });
  return albumPromise;
}
async function showAlbum() {
  setAlbum(true);
  const request = albumRequest;
  $("leisureLoading").hidden = false;
  $("leisureError").hidden = true;
  $("leisureAlbum").setAttribute("aria-busy", "true");
  try {
    await ensureAlbum();
    if (request !== albumRequest) return false;
    // Prepare hidden content too, so returning after a slow request shows the album.
    renderAlbum();
    if (
      !selected ||
      !$("diaryPanel").classList.contains("active")
    )
      return false;
    $("leisureTitle").focus({ preventScroll: true });
    $("leisureAlbum").scrollIntoView({ block: "start", behavior: "instant" });
    return true;
  } catch {
    if (request === albumRequest) $("leisureError").hidden = false;
    return false;
  } finally {
    if (request === albumRequest) {
      $("leisureLoading").hidden = true;
      $("leisureAlbum").setAttribute("aria-busy", "false");
    }
  }
}
function renderAlbum() {
  $("leisureNotes").textContent = album.notes;
  $("leisureCards").replaceChildren(
    ...album.photos.map((photo) => {
      const card = el("article", "leisure-card");
      card.dataset.photoId = photo.id;
      const frame = figure(photo.image, photo.alt),
        open = el("button", "leisure-photo-open");
      open.type = "button";
      open.dataset.photoOpen = photo.id;
      open.setAttribute("aria-label", photo.title + " 사진 확대");
      open.append(...frame.childNodes);
      frame.append(open);
      const content = el("div", "leisure-card-content");
      content.append(
        el("p", "voyage-meta", photoTime(photo)),
        el("h3", "", photo.title),
        el("p", "leisure-activity", photo.activity + " · " + photo.place),
        el("p", "leisure-summary", photo.summary),
        el("p", "leisure-caption", photo.caption),
      );
      const read = el("button", "voyage-button", "관련 항해일지 읽기 ↗");
      read.type = "button";
      read.dataset.photoEntry = photo.id;
      content.append(read);
      card.append(frame, content);
      return card;
    }),
  );
}
async function goToEntry(photo) {
  if (!photo) return;
  closeStory();
  setAlbum(false);
  if (activeId !== LEISURE_COLLECTION) await load(LEISURE_COLLECTION);
  if (
    !selected ||
    !$("diaryPanel").classList.contains("active") ||
    activeId !== LEISURE_COLLECTION
  )
    return;
  const entry = relatedEntry(photo, entries),
    launcher =
      entry &&
      $("voyageCards").querySelector(`[data-open-entry="${entry.id}"]`);
  if (launcher) {
    launcher.scrollIntoView({ block: "center", behavior: "instant" });
    showStory(entry.id, launcher);
  }
}
async function goToPhoto(entry) {
  closeStory();
  const ready = await showAlbum();
  if (!ready) return;
  const photo = relatedPhoto(entry, album),
    launcher =
      photo &&
      $("leisureCards").querySelector(`[data-photo-open="${photo.id}"]`);
  if (launcher) {
    launcher.scrollIntoView({ block: "center", behavior: "instant" });
    showPhoto(photo.id, launcher);
  }
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
  syncSubView();
}
function prepareViewer(kind, id, launcher, index, total) {
  if (!dialog.open) {
    returnFocus = launcher;
    previousOverflow = document.body.style.overflow;
    scrollPosition = scrollY;
    document.body.style.overflow = "hidden";
  }
  viewerKind = kind;
  opening = id;
  dialog.dataset.viewer = kind;
  $("voyageStoryClose").setAttribute(
    "aria-label",
    kind === "photo" ? "사진 닫기" : "항해 기록 닫기",
  );
  $("voyageStoryPosition").textContent = `${index + 1} / ${total}`;
  $("voyagePrevious").disabled = index === 0;
  $("voyageNext").disabled = index === total - 1;
  $("voyagePrevious").textContent =
    kind === "photo" ? "← 이전 사진" : "← 이전 기록";
  $("voyageNext").textContent =
    kind === "photo" ? "다음 사진 →" : "다음 기록 →";
}
function completeViewer() {
  if (!dialog.open) {
    dialog.showModal();
    $("voyageStoryTitle").focus({ preventScroll: true });
  }
  dialog.scrollTop = 0;
  if (document.activeElement.disabled)
    $("voyageStoryTitle").focus({ preventScroll: true });
}
function showStory(id, launcher) {
  const entry = entries?.entries.find((e) => e.id === id);
  if (!entry) return;
  prepareViewer(
    "story",
    id,
    launcher,
    entries.entries.indexOf(entry),
    entries.entries.length,
  );
  $("voyageStoryTitle").textContent = entry.title;
  $("voyageStoryMeta").textContent = sceneTime(entry) + " · " + entry.category;
  $("voyageStoryImage").replaceChildren(figure(entry.image, entry.alt));
  body.replaceChildren(
    ...bodyParts(entry.body).map((part) =>
      el("p", part.inner ? "voyage-inner" : "voyage-paragraph", part.text),
    ),
  );
  $("voyageRelatedLinks").hidden = activeId !== LEISURE_COLLECTION;
  $("voyageRelatedPhoto").hidden = activeId !== LEISURE_COLLECTION;
  $("voyageRelatedEntry").hidden = true;
  $("leisureOriginal").hidden = true;
  completeViewer();
}
function showPhoto(id, launcher) {
  const photo = album?.photos.find((p) => p.id === id);
  if (!photo) return;
  prepareViewer(
    "photo",
    id,
    launcher,
    album.photos.indexOf(photo),
    album.photos.length,
  );
  $("voyageStoryTitle").textContent = photo.title;
  $("voyageStoryMeta").textContent = photoTime(photo) + " · " + photo.activity;
  $("voyageStoryImage").replaceChildren(figure(photo.image, photo.alt));
  body.replaceChildren(
    el("p", "voyage-caption", photo.place + " · 1448 × 1086 · 전체 4:3 구도"),
    el("p", "voyage-paragraph", photo.summary),
    el("p", "voyage-paragraph", photo.caption),
  );
  $("voyageRelatedLinks").hidden = false;
  $("voyageRelatedPhoto").hidden = true;
  $("voyageRelatedEntry").hidden = false;
  $("leisureOriginal").hidden = false;
  $("leisureOriginal").href = photo.image;
  completeViewer();
}
function moveViewer(delta) {
  if (!opening) return;
  const list = viewerKind === "photo" ? album.photos : entries.entries,
    index = list.findIndex((item) => item.id === opening),
    next = list[index + delta];
  if (next) (viewerKind === "photo" ? showPhoto : showStory)(next.id);
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
$("voyagePrevious").addEventListener("click", () => moveViewer(-1));
$("voyageNext").addEventListener("click", () => moveViewer(1));
$("voyageAlbumBtn").addEventListener("click", () =>
  albumSelected ? setAlbum(false) : showAlbum(),
);
$("leisureBack").addEventListener("click", () => setAlbum(false));
$("leisureRetry").addEventListener("click", showAlbum);
$("leisureCards").addEventListener("click", (e) => {
  const open = e.target.closest("[data-photo-open]"),
    read = e.target.closest("[data-photo-entry]");
  if (open) showPhoto(open.dataset.photoOpen, open);
  if (read)
    goToEntry(album.photos.find((p) => p.id === read.dataset.photoEntry));
});
$("voyageRelatedEntry").addEventListener("click", () =>
  goToEntry(album.photos.find((p) => p.id === opening)),
);
$("voyageRelatedPhoto").addEventListener("click", () =>
  goToPhoto(entries.entries.find((e) => e.id === opening)),
);
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
