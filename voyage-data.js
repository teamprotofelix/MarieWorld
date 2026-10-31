// Static story data only. No simulation state, browser persistence or remote API.
const imagePath = /^assets\/voyage-\d{3}\/[A-Za-z0-9_-]+\.webp$/;
const supplementaryImagePath =
  /^assets\/(?:voyage-\d{3}|marie-leisure)\/[A-Za-z0-9_-]+\.webp$/;
const jsonPath = /^data\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.json$/;
const canonPath = /^data\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.md$/;
const text = (value) => typeof value === "string" && value.trim().length > 0;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function validateRegistry(data) {
  assert(
    data?.schema_version === 1 &&
      Array.isArray(data.collections) &&
      data.collections.length,
    "항해 컬렉션 목록이 올바르지 않습니다.",
  );
  const ids = new Set();
  for (const c of data.collections) {
    assert(
      /^AST2-VOYAGE-\d{3}$/.test(c.id) && !ids.has(c.id),
      "컬렉션 ID가 없거나 중복됩니다.",
    );
    ids.add(c.id);
    assert(
      text(c.title) &&
        text(c.synopsis) &&
        imagePath.test(c.cover) &&
        text(c.cover_alt) &&
        jsonPath.test(c.source) &&
        canonPath.test(c.canon),
      "컬렉션의 파일 경로 또는 설명이 올바르지 않습니다.",
    );
    assert(
      Array.isArray(c.additional_scenes) &&
        c.additional_scenes.every(
          (s) =>
            supplementaryImagePath.test(s.image) &&
            text(s.alt) &&
            text(s.title),
        ),
      "추가 장면이 올바르지 않습니다.",
    );
    const s = c.snapshot;
    assert(
      s &&
        text(s.day) &&
        text(s.time) &&
        Number.isInteger(s.layer) &&
        s.layer >= 0 &&
        Number.isFinite(s.remaining_km) &&
        s.remaining_km >= 0 &&
        Number.isFinite(s.assumed_speed_km_s) &&
        s.assumed_speed_km_s > 0 &&
        [s.eta, s.route, s.navigation].every(text) &&
        Array.isArray(s.unresolved) &&
        s.unresolved.every(text),
      "정전 스냅샷이 올바르지 않습니다.",
    );
  }
  return data;
}
export function validateCollection(data, expectedId) {
  assert(
    data?.schema_version === 1 &&
      data.collection_id === expectedId &&
      text(data.collection_title) &&
      Array.isArray(data.entries) &&
      data.entries.length,
    "항해 기록 형식이 올바르지 않습니다.",
  );
  assert(
    /^DAY \d{3,}$/.test(data.day) &&
      Number.isInteger(data.layer) &&
      data.layer >= 0,
    "컬렉션 날짜가 올바르지 않습니다.",
  );
  const ids = new Set();
  for (const e of data.entries) {
    assert(
      /^V\d{3}-\d{2,}$/.test(e.id) && !ids.has(e.id),
      "기록 ID가 없거나 중복됩니다.",
    );
    ids.add(e.id);
    assert(
      [e.title, e.summary, e.body, e.category, e.alt].every(text) &&
        imagePath.test(e.image),
      "기록 본문 또는 이미지가 올바르지 않습니다.",
    );
    assert(
      /^DAY \d{3,}$/.test(e.day) &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(e.time) &&
        typeof e.scene_time_is_approximate === "boolean",
      "기록 시각이 올바르지 않습니다.",
    );
  }
  return data; // Keep editorial order; never merge with or sort MARIE_DIARIES.
}
export const sceneTime = (e) =>
  `기록 속 ${e.day} · ${e.scene_time_is_approximate ? "대략 " : ""}${e.time}`;
export const bodyParts = (body) =>
  body.split("\n\n").map((value) => ({
    text: value,
    inner: value.startsWith("(") && value.endsWith(")"),
  }));
export function snapshotText(collection) {
  const s = collection.snapshot;
  return [
    collection.title,
    "허구의 항해 기록 · 고정된 저장 스냅샷",
    `${s.day} ${s.time} / Layer ${s.layer}`,
    s.route,
    s.navigation,
    `마지막 확인 잔여 거리 ${s.remaining_km.toLocaleString("ko-KR")} km · 이야기 속 가상 관측`,
    `가정 속도 ${s.assumed_speed_km_s} km/s · 예상 잔여 ${s.eta}`,
    ...s.unresolved,
    "새 장면은 편집·검토 후 사이트 업데이트로 추가합니다. ChatGPT 대화에 자동으로 저장·동기화되지 않습니다.",
  ].join("\n");
}
