# Marie World — ASTÉRIA-2 v0.4

A fictional, relaxing idle exploration site about Marie and E traveling together in a small spaceship. Static public hosting planned at https://marie.moip.ai.kr .

## Features

- Clickable overhead map with ten modules, animated walking sprite, automatic ship activities, three destinations and survival indicators.
- Switch between the default ship map and an animated Canvas **FLIGHT VIEW**, with eight ship frames, layered stars, nebula, planets, constellations, comets, black holes and warp gates.
- **AUTO PILOT** handles a gentle, safe flight; **MANUAL PILOT** supports arrows/WASD while the flight area has focus and touch direction buttons. Collect bright diamond fragments and avoid asteroids. A local shield recovers on failure; flight never drains the idle ship resources.
- The top **자동 여행** switch independently controls the existing cabin clock, resources and destination progression. Changing destinations updates the flight HUD and the existing voyage log. Scenic flybys do not trigger additional travel costs.
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
- `sw.js` precaches both flight modules and 18 optimized WebPs under `marie-v04-flight-1`. `pwa.js` retains the existing user-approved update flow.
- `npm test` runs Node regression tests. `node tests/flight.test.mjs` prints individual simulation/cache cases.
- `python tests/browser-qa.py` requires Python Playwright and Chromium (`CHROMIUM_PATH` can override `/usr/bin/chromium`). It starts its own localhost server, checks desktop/mobile layouts and touch emulation, runs 150 seconds of auto flight, then installs the baseline v2 worker and verifies consent-based upgrade and offline use. Results and four captures are written to `work/qa/` (`MARIE_QA_OUTPUT` can override it).
- Browser touch tests use Chromium emulation; Android installation, physical device touch and Safari/iOS performance require device QA.

See [flight asset inventory](assets/flight/README.md) for source/crop details and byte sizes.
