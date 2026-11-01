# 제공 자산 안내

출처: 사용자가 첨부한 `MarieWorld_v2_Codex_Handoff_20261101.zip`의 `assets/concepts/v2/`와 `docs/asset_manifest.json`. 원본 8개 WebP를 재인코딩/크롭하지 않았습니다. 모두 1672×941, 총 **4,099,412 bytes**입니다. PNG·원본 ZIP·로컬 제작 경로는 저장소에 포함하지 않습니다.

단일 시네마틱 콘셉트 아트로서 실제 설치 모델·캐릭터 애니메이션·투명 레이어가 아닙니다. 02의 우주 성은 미래 확장 비전이며 현행 ASTÉRIA-2 제원/건설 결과를 확정하지 않습니다.

| 파일 | 용도/상태 | bytes | SHA256 |
| --- | --- | ---: | --- |
| 01_hydroponic_garden_marie.webp | 정원 생활 / PR04·05 — 후속 장면 | 442,986 | `cd24c7761f0e9f929fdfeab8cb9209cf579a486f3a4b3d552d0e69c47e3ac0a7` |
| 02_exterior_giant_starship_castle.webp | 외관 성장 비전 / PR02 — 이 PR에서 사용 | 479,116 | `ba32b4cd975130bbcfe0f8740479adb1adfd119c3f8a2ff7920536ffe122261d` |
| 03_multideck_cross_section_cutaway.webp | 다층 단면 탐색 / PR03 — 다음 PR | 580,640 | `1113e6897216c44d7e0316d783a515afb3d00fdbd20cda97d5eda41f5b491e93` |
| 04_galley_kitchen_teatime.webp | 주방·티타임 / PR04 — 후속 장면 | 529,772 | `79b5925615b35b4bb3df339014b310d0bdab4c851a6770bd5a3791babd226689` |
| 05_workshop_drone_repair.webp | 공방·드론 / PR04·06 — 후속 장면 | 506,570 | `c77ebde25a24810a6d73c62e839d090752dd2e74984ff340a78f0f14a71621c6` |
| 06_observatory_voyage_diary.webp | 관측·일지 / PR04·06 — 후속 장면 | 479,568 | `0ca87db9a32351d0468d21011de7647ac0eca311b572dd480cdf1214ca57549b` |
| 07_hangar_expansion_module.webp | 격납고·확장 / PR07 — 후속 장면 | 522,272 | `7c436956c5441c1ddf94418889ebd5a5b88ac9113cfc0ac160370bb1f4ae802c` |
| 08_research_recycling_module.webp | 연구·재활용 / PR06·07 — 후속 장면 | 558,488 | `884811a04f5c3af4d7b4848005c69ad0b86039fad3fd503c91e225f1388e76ad` |

외관 화면은 02 한 장만 사용자가 선택했을 때 요청합니다. 나머지 7장은 후속 구현용으로 보관하며 초기 화면·최초 SW 설치 시 요청하지 않습니다. 기존 core 프리캐시는 유지합니다.

선택 이미지 8개를 별도 allowlist로 구분하고, 방문한 화면의 이미지 한 개씩 같은 버전 캐시에 저장합니다. 처음 방문하지 않은 화면은 오프라인에서 이미지 실패 안내와 기존 지도로 돌아가기를 제공합니다. 브라우저 용량 제한으로 선택 캐시에 쓰지 못해도 온라인 이미지는 볼 수 있습니다. 이 경우 오프라인 보존을 보장하지 않습니다.
