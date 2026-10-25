# Marie World — ASTÉRIA-2 v0.6

A fictional, relaxing idle exploration site about Marie and E traveling together in a small spaceship. Static public hosting planned at https://marie.moip.ai.kr .

## Features

- Clickable overhead map with ten modules, animated walking sprite, automatic ship activities, three destinations and survival indicators.
- Switch between the default ship map and an animated Canvas **FLIGHT VIEW**, with eight ship frames, layered stars, nebula, planets, constellations, comets, black holes and warp gates.
- **AUTO PILOT** handles a gentle, safe flight; **MANUAL PILOT** supports arrows/WASD while the flight area has focus and touch direction buttons. Collect bright diamond fragments and avoid asteroids. A local shield recovers on failure; flight never drains the idle ship resources.
- The top **자동 여행** switch independently controls the existing cabin clock, resources and destination progression. Changing destinations updates the flight HUD and the existing voyage log. Scenic flybys do not trigger additional travel costs.
- Ten playable **room events** launch from each room modal: cockpit flight mission, hydroponic garden, recipe cooking, robot assembly, reactor timing, star memory, bedroom setup, cargo sorting, corridor patrol and tea brewing. Each has instructions, start, result, retry and return. Pause is shared, including automatic pause on tab hide/window blur.
- A separate **E와 함께한 항해** collection adds the first voyage in 12 illustrated records with 16 supplied WebPs, a keyboard/touch detail reader, scoped day/night reading themes and a fixed canon snapshot. It does not change the original diary entries.
- Ten **read-only, hand-authored fictional diaries** in `MARIE_DIARIES` in `app.js`; each entry includes a related room illustration. New stories are published through GitHub pull requests and site updates, **not** written or stored by visitors.
- Prewritten interactive dialogue. No LLM, OpenAI API access, chat transmission, account, visitor database or localStorage. In-memory idle simulation resets on refresh.
- Site art and sprites bundled in `assets/`; relative URLs work under GitHub Pages.

## GitHub Pages publication

1. Owner changes repository visibility to Public (Settings > General > Danger Zone), **after inspecting Git history and commit metadata**.
2. Owner enables Settings > Pages > Build and deployment > Deploy from branch > `main` / `/(root)`.
3. DNS at the administrator of `moip.ai.kr`: create **CNAME `marie` → `teamprotofelix.github.io`** (not the repository URL). The root `CNAME` file sets `marie.moip.ai.kr`.
4. After propagation, confirm `https://marie.moip.ai.kr` and enable Enforce HTTPS when certificate is ready. GitHub commit alone does not deploy until Pages is configured.

Run locally: `python -m http.server 8000` then visit http://localhost:8000; optional `npm test`.

## Public privacy notes

Only fictional diary scenarios should appear in published entries. Do not include real personal chat histories, full names, emails, private schedules, tokens, or API keys. Published `main` history may still contain previous fictional references and the original optional server-side LLM code: deleting files in later commits does **not** erase old commits. Check entire history prior to making the repo public. Future improvements via reviewed PRs.


## Flight implementation and checks

- `flight-model.js` owns the transient simulation; `flight.js` handles Canvas, assets, input and lifecycle. No runtime dependencies or external CDN. Ship images load on the first FLIGHT selection.
- Animation targets 30 fps, caps elapsed simulation steps at 50 ms and DPR at 2, and limits interactive/scenic objects to 14/4. These are implementation caps, not measured device performance claims.
- Leaving FLIGHT/home, opening a modal, scrolling the flight section out of view, window blur or hiding the page stops the loop and clears held input. Reduced motion slows scenery to 0.3× and renders at up to 15 fps; manual steering stays responsive.
- Flight is memory-only. Reloading starts a fresh flight without changing the existing site data policy. Black holes/gates are safe scenery; only manual asteroid encounters affect the flight shield.
- `sw.js` precaches the flight modules and 18 optimized WebPs in the current versioned cache. `pwa.js` retains the existing user-approved update flow.
- `npm test` runs Node regression tests. `node tests/flight.test.mjs` prints individual simulation/cache cases.
- `python tests/browser-qa.py` requires Python Playwright and Chromium (`CHROMIUM_PATH` can override `/usr/bin/chromium`). It starts its own localhost server, checks desktop/mobile layouts and touch emulation, runs 150 seconds of auto flight, then installs the baseline v2 worker and verifies consent-based upgrade and offline use. Results and four captures are written to `work/qa/` (`MARIE_QA_OUTPUT` can override it).
- Browser touch tests use Chromium emulation; Android installation, physical device touch and Safari/iOS performance require device QA.

See [flight asset inventory](assets/flight/README.md) for source/crop details and byte sizes.


## Room events

Open a map room, then **이벤트**. **함께하기** and next-room navigation remain available in the original room view. Escape inside an event returns to that room; a second Escape closes the room. Games use the existing room dialog, with focus trapping and temporary background inertness during the event. The sticky toolbar keeps pause/return within reach on small screens.

- `room-events.js` owns the single active event session, input, lifecycle, focus and result/retry flow.
- `room-models.js` defines the ten distinct game rules. Sessions and commemorative scores are in memory only. No shared-resource rewards, penalties, diary writing, accounts, new storage or services are added.
- `room-games.js` builds native controls and state-dependent visuals. `room-events.css` supplies authored CSS illustrations (growing plant, soup, assembled robot, bedroom, tea). Existing room images and Marie's sprite are reused; no new binary runtime artwork is needed. Audio remains silent.
- `flight-scene.js` extracts the original Canvas scene for reuse by both home flight and the cockpit mission. `FlightModel` retains healing defaults on home flight; the mission opts out of automatic shield recovery and supplies a 45-second / six-fragment goal plus two reserve shields. Only the event controller advances mission physics; no second home loop runs behind the room modal.
- The current service-worker cache includes the room JS/CSS modules as well as all existing art. First online preparation is required. After the worker is ready, all ten games start offline. Existing approval-based updates, manifest, icons and custom domain remain intact.

Checks: `npm test`; `node tests/room-events.test.mjs` for individual rule cases; `python tests/rooms-browser-qa.py` for ten full UI flows, repeated entry, touch/keyboard, offline and v04-to-current PWA upgrade. The browser script requires Python Playwright and Chromium and advances time through Playwright's clock for the room missions. `python tests/browser-qa.py` separately retains the real 150-second home-flight regression. Results and temporary PNGs are written under ignored `work/`.

See [room QA and review notes](docs/room-events/QA.md) for the room matrix, captures, outcomes and device limitations. There is no lint/type-check/build pipeline in this plain static project; syntax and test commands are documented as such.


## Illustrated voyage archive

In **항해 일기**, keep **마리의 일기** selected to read the original ten diaries, or choose **E와 함께한 항해** for the new collection. A scene opens a native dialog with previous/next, Escape, focus/scroll restoration, image alt/fallback and day/night reading controls. The reading theme follows the system until changed and stays in memory only. The ship and original diary styling remain unchanged.

`data/voyage_collections.json` registers collections. `data/voyage_entries.json` retains the supplied twelve records in editorial order. `data/CANON_MEMORY.md` is the supplied author canon; its download is behind a spoiler-labelled disclosure. The on-screen state panel/copy text is a fixed fictional DAY 001 snapshot, independent of the live ship clock, flight counter or resources. Approximate scene times are labelled **대략**. The public synopsis does not reveal the character's secret.

The archive is static editorial content. It does **not** automatically store chats or synchronize ChatGPT memory; a reader must explicitly pass the summary/canon into another conversation. New scenes are edited as JSON/art and reviewed through PRs. See [authoring guide](docs/voyage-001/AUTHORING.md).

`marie-v06-voyage-1` precaches the reader code/CSS, story metadata, canon and all sixteen images (848,326 bytes). One completed online service-worker preparation is required; subsequent offline reloads can read both collections. Existing `pwa.js` continues to require user approval for activation.

Validation: `npm test`, `node tests/voyage.test.mjs`, and `python tests/voyage-browser-qa.py` (Python Playwright + Chromium). Temporary files go to ignored `work/voyage-qa/`; `MARIE_VOYAGE_QA_OUTPUT` can override it. The existing flight and room browser QA scripts remain available. [Review notes and captures](docs/voyage-001/QA.md) distinguish browser emulation and local PWA upgrade checks from untested devices/production hosting.
