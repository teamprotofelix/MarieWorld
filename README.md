# Marie World — ASTÉRIA-2 v0.2

A fictional, relaxing idle exploration site about Marie and E traveling together in a small spaceship. Static public hosting planned at https://marie.moip.ai.kr .

## Features

- Clickable overhead map with ten modules, animated walking sprite, automatic ship activities, three destinations and survival indicators.
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
