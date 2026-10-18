# 자산과 런타임 파일

새 런타임 이미지·폰트·음원은 추가하지 않았습니다. 기존 `assets/{room}.webp`,
`assets/sprite.svg`와 `assets/flight/*.webp`를 그대로 재사용합니다.
스프라이트는 기존 SVG의 128×156 프레임 4개, 비행 기체는 정렬된 기존 WebP 8개입니다.

식물 단계, 냄비/수프, 파츠별 로봇, 회로, 휴식 공간, 차는 직접 작성한 CSS/HTML/Canvas 도형입니다.
새 생성형 이미지나 사진을 제작했다고 주장하지 않습니다. 식물/방/로봇/차의 실제 게임 상태가 표현됩니다.
새 오디오나 자동 재생은 없으며 기존 무음 정책을 유지합니다.

| 신규 런타임 파일 | bytes |
| --- | ---: |
| `flight-scene.js` | 6,264 |
| `room-events.js` | 13,408 |
| `room-models.js` | 24,745 |
| `room-games.js` | 16,861 |
| `room-events.css` | 16,172 |
| **합계** | **77,450** |

`flight-scene.js`는 기존 `flight.js`의 그리기 코드를 이동한 공유 렌더러입니다.
위 합계가 모두 순수 추가 JS는 아닙니다. 외부 CDN/새 런타임 패키지는 없습니다.

같은 폴더의 검토용 WebP 캡처는 브라우저 실행을 촬영·최적화한 결과이며, 게임 자산이나 SW 프리캐시 대상이 아닙니다.
원본 PNG, 업로드된 지시서, 임시 생성물과 전체 테스트 스크래치는 커밋하지 않습니다.

| 검토용 캡처 | bytes |
| --- | ---: |
| desktop-flight.webp | 75,024 |
| desktop-robot.webp | 34,998 |
| mobile-cargo.webp | 86,778 |
| mobile-memory.webp | 73,878 |
