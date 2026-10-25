# 항해 삽화 재추출 — 2026-10-26

초기 배포의 강한 16:9 크롭에서 얼굴·선체가 잘리고 일부 구분선/글자 조각이 남는 문제를 수정했습니다. 사용자가 제공한 두 원본 보드의 개별 패널을 직접 측정해 다시 추출했습니다. 재생성 없이 원래 장면 전체를 보존하고, 짧은 쪽의 여백은 어두운 배경으로 채웠습니다. 원본에 포함된 설명 문구는 보존했습니다.

표지는 기존 제목을 유지하고 오른쪽 우주선·함교 장면을 전체 구도로 교체했습니다. 상세 좌표와 원본 SHA-256은 [RECROP.json](RECROP.json)에 기록합니다. 원본 PNG는 공개 저장소에 추가하지 않았습니다.

| WebP | bytes | SHA-256 |
| --- | ---: | --- |
| `00_voyage_cover.webp` | 143,982 | `a570eb846071ea201846e85dc99a261435d3fb09d07d819abf6f4e5d1d9a5a59` |
| `01_launch.webp` | 92,496 | `7e0980b2cf1d209e247f5c70d7e32774890fcf56597b2b0f7df6ba0a6a674b0f` |
| `02_marie_pilot.webp` | 86,716 | `6869b12a7013e25a007d6ed0df343acc6a7f42dc82fa7fa33c3f50a28813e130` |
| `03_unknown_signal.webp` | 43,810 | `824c6908df6739c15d8c2652b8ebcc51d0c7923a2d9df2cb432c1d2722edf01b` |
| `04_shared_cockpit.webp` | 67,882 | `42efce35d88722d4f1cc0f82fcfba70891df42fd9a4547fe6a6b8f5d667d40e7` |
| `05_steak_plate.webp` | 74,650 | `d3d7589419c626db1b4cc4d5663e5b9389ebcc1d84bcb23395bc8e3f1bb06129` |
| `06_marie_cooking.webp` | 80,208 | `98eb4809e2fc6a0a47dc8e7359a90e52cb03af07b3df165ab15cb3d4c57a2b57` |
| `07_dessert_lab.webp` | 67,938 | `ce41865f57c6e62898e1b082348f462662781ee7073871ba9460814ac4111274` |
| `08_subspace_storage.webp` | 85,556 | `77fc779d8a969acfafbde40db8254cf4243d317ba841940d96e2d54468397f07` |
| `09_expanded_interior.webp` | 73,046 | `81fd1cf4929b0403ddb5b9c0d41255f61b02a13bac8bd1ec6c9e3fef0588305e` |
| `10_many_maries.webp` | 90,014 | `51af1f9700a311d8b10333cb9913353682b039d683110e5627bc57a30b07df7a` |
| `11_identity_conversation.webp` | 73,254 | `bcbadf01c79af19a76eb5555947d7345549ff672430f0b04e362a9c7a398f8bc` |
| `12_dark_forest.webp` | 61,438 | `1914752a563d3a7de65fa8b73f664f3a0f286630a047fb06a7d0d00b7ccfcf94` |
| `13_together_stargazing.webp` | 52,864 | `9cece13c0fa3b5b65f11ad1a0af0da7f013f9fee8435acff3d44f910f10dbf9c` |
| `14_marie_reflection.webp` | 55,588 | `8a2e862d5814d32b224726cf03d9aed45e790742e09e9ade4b70c67916fa8696` |
| `15_voyage_journal.webp` | 64,300 | `00c522c40d535e3786231a1d10f97a9ce9846b33c5c9dadeb8e48da5e29c91c9` |
| **합계 16개** | **1,213,742** | |

기록 JSON·일기 본문·읽기 화면·게임 로직은 유지합니다. 같은 파일명을 사용하는 설치 앱의 구 캐시를 교체하기 위해 서비스워커 버전만 `marie-v06-voyage-2`로 갱신합니다.
