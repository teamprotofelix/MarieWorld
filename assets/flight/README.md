# Flight asset inventory

Source: user-supplied `MarieWorld_FLIGHT_VIEW_assets_v0.4.zip` (generated artwork).
Only selected WebPs are shipped; no original PNG or full multi-object sheets.

The provided `ASSET_GUIDE.md` and `metadata.json` were checked before extraction.
The nonuniform subject bounds below were visually inspected. Within each crop,
alpha > 60 selects the largest connected subject; holes are filled and the mask
expanded 9 source pixels to retain the original alpha/glow around its edges.
Nearby subjects are removed; the result is alpha-trimmed and resized to fit 330px.
Asteroid uses an individual rock, constellation uses the connected star pattern.
Ship frames are resized to 320px, centered using their alpha > 80 subject bounds
on equal 360px transparent squares, then saved at 320px. This corrects the
vertical offset between the source sheet rows and keeps engine glow padding.
Nebula is resized to 1400px wide. WebP quality: 84 subjects, 85 ship, 82 background.

| Output | Source WebP / source-pixel crop (left, top, right, bottom) |
| --- | --- |
| ring | spritesheet_planets / (0, 40, 465, 375) |
| ice | spritesheet_planets / (430, 40, 775, 380) |
| lava | spritesheet_planets / (410, 375, 765, 715) |
| sun | spritesheet_planets / (0, 690, 420, 1080) |
| blackhole | spritesheet_planets / (375, 715, 835, 1060) |
| comet | spritesheet_planets / (770, 715, 1140, 1060) |
| gate | spritesheet_events / (40, 365, 455, 740) |
| asteroid | spritesheet_events / (135, 65, 395, 320) |
| constellation | spritesheet_constellations / (330, 325, 645, 620) |
| ship-01…08 | ship_frames/ship_frame_01…08; full frames |
| nebula | background_nebula; full panorama |

Bright collectable diamonds, stars, engine glow and fallback hull are drawn with
Canvas. All other scene types use the supplied art; no new image generation.

| File | Bytes |
| --- | ---: |
| asteroid.webp | 18,552 |
| blackhole.webp | 33,156 |
| comet.webp | 36,338 |
| constellation.webp | 17,546 |
| gate.webp | 31,930 |
| ice.webp | 44,240 |
| lava.webp | 45,806 |
| nebula.webp | 150,722 |
| ring.webp | 24,252 |
| ship-01.webp | 21,388 |
| ship-02.webp | 21,924 |
| ship-03.webp | 22,386 |
| ship-04.webp | 22,464 |
| ship-05.webp | 22,032 |
| ship-06.webp | 22,082 |
| ship-07.webp | 21,966 |
| ship-08.webp | 21,200 |
| sun.webp | 34,724 |
| **Total (18 WebPs)** | **612,708** |
