import { sceneTime } from "./voyage-data.js";
export const LEISURE_COLLECTION = "AST2-VOYAGE-002";
export const LEISURE_SOURCE = "data/marie_leisure_gallery.json";
const photoPath = /^assets\/marie-leisure\/[A-Za-z0-9_-]+\.webp$/;
const framePath = /^assets\/voyage-002\/[A-Za-z0-9_-]+\.webp$/;
const text = (value) => typeof value === "string" && value.trim().length > 0;
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
export function validateLeisureGallery(data, volume) {
  assert(
    data?.schema_version === 1 &&
      text(data.title) &&
      text(data.notes) &&
      data.photo_count === 5 &&
      Array.isArray(data.photos) &&
      data.photos.length === 5,
    "사진첩 형식이 올바르지 않습니다.",
  );
  assert(
    volume?.collection_id === LEISURE_COLLECTION &&
      Array.isArray(volume.entries),
    "관련 항해권을 찾을 수 없습니다.",
  );
  const ids = new Set(),
    images = new Set(),
    frames = new Set();
  for (const p of data.photos) {
    assert(
      /^MARIE-LEISURE-\d{2}$/.test(p.id) &&
        !ids.has(p.id) &&
        !images.has(p.image) &&
        !frames.has(p.diary_image),
      "사진 ID 또는 경로가 중복됩니다.",
    );
    ids.add(p.id);
    images.add(p.image);
    frames.add(p.diary_image);
    assert(
      photoPath.test(p.image) &&
        framePath.test(p.diary_image) &&
        p.image_width === 1448 &&
        p.image_height === 1086,
      "사진 경로 또는 원본 구도가 올바르지 않습니다.",
    );
    assert(
      [p.title, p.activity, p.place, p.alt, p.summary, p.caption].every(text) &&
        /^DAY \d{3}$/.test(p.day) &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.time) &&
        typeof p.time_approx === "boolean",
      "사진 설명 또는 시각이 올바르지 않습니다.",
    );
    const matches = volume.entries.filter((e) => e.image === p.diary_image);
    assert(
      matches.length === 1,
      "사진과 관련 일지의 연결이 올바르지 않습니다.",
    );
    assert(
      matches[0].day === p.day &&
        matches[0].time === p.time &&
        matches[0].scene_time_is_approximate === p.time_approx,
      "사진과 일지의 날짜/시각이 일치하지 않습니다.",
    );
  }
  return data;
}
export const photoTime = (p) =>
  sceneTime({ ...p, scene_time_is_approximate: p.time_approx });
export const relatedEntry = (p, volume) =>
  volume.entries.find((e) => e.image === p.diary_image);
export const relatedPhoto = (entry, gallery) =>
  gallery?.photos.find((p) => p.diary_image === entry.image);
export const imageDimensions = (src, cover = false) =>
  photoPath.test(src)
    ? { width: 1448, height: 1086 }
    : cover
      ? { width: 1600, height: 900 }
      : { width: 960, height: 540 };
