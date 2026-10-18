# Marie World — ASTÉRIA-2

A cozy, **fictional**, idle spaceship experience for E and Marie. Explore an overhead ship map with ten clickable modules. Marie wanders the ship, does chores, and logs gentle daily adventures. Three space destinations, ship status bars, a browser-local logbook, a local scripted dialogue fallback and an optional server-side LLM are included. Works offline as a static site (AI endpoints unavailable).

## Quick start

```sh
npm test
npm start
```

Open `http://localhost:3000`. Set `PORT` if needed.

## Optional LLM

Set environment variables on the **hosting service**, not in the browser:

- `OPENAI_API_KEY` — server secret; leave unset for local simulation.
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODEL=gpt-6-luna` — requested model identifier. API compatibility/availability has not been validated; if the upstream rejects the request the UI uses the local scripted fallback.

`POST /api/chat` and `POST /api/diary` use a server-side proxy. No secrets are shipped to the client. No conversation history from ChatGPT is read automatically. Entries and user memories are saved only via localStorage on the visitor's browser. This is not a true shared multiplayer backend and auto travel progresses only when the page is open.

## Hosting

This repository contains a working static frontend + optional Node server. Deploy as a static site if API features are unnecessary, or as a Node service (`npm start`) if using environment-based LLM. Publishing to `marie.inwardis.chatgpt.site` requires creating/linking the domain in ChatGPT Sites and configuring the deployment there: GitHub uploads alone do **not** cause a Sites deployment.

## Assets and future PRs

- `assets/map.webp`: generated ship overview
- `assets/[room].webp`: ten previously generated room-life illustrations
- `assets/nebula.webp`, `assets/gold.webp`, `assets/ice.webp`: generated journey scenery
- `assets/sprite.svg`: transparent 4-frame hand-authored walking sprite sheet

Artwork files have been optimized to WebP. Future improvements should be made through PRs reviewed before merging into `main`.