# Drift — message in a bottle

Write a letter to a stranger, seal it in a bottle and throw it into the sea. Somewhere, someone finds it, opens it and writes back — and a glowing bottle drifts home to you with their reply.


<img width="1359" height="575" alt="image" src="https://github.com/user-attachments/assets/8a96f43d-41e7-420e-8428-56266f829048" />


- Realistic animated ocean (parallax wave layers, sun/moon light path, clouds, gulls, stars, splashes, ripples) drawn on a canvas — switch between day, sunset and night.
- Animated rituals: the letter rolls up, slides into the bottle, gets corked, is thrown in an arc and splashes down; opening a bottle pops the cork and unfurls the paper.
- Optional sea sound (♪ button, top right).

## Run it

```bash
npm start        # http://localhost:3000 — real strangers, bottles saved to data/bottles.json
```

No dependencies (Node 16+). Bottles are anonymous: each browser gets a random id, nothing else is collected.
Each stranger can answer a bottle once, and a bottle collects at most 3 replies.

Opening `public/index.html` without the server runs a **demo sea**: pre-written letters from "strangers" and simulated replies to your bottles after ~30–70 s.

## Layout

- `public/` — static front-end (`app.js` holds the ocean renderer, animations and UI)
- `server.js` — tiny JSON-file API (`/api/drift`, `/api/bottles`, `/api/bottles/:id/replies`, `/api/mine`)
- `public/seeds.js` — starter letters used for the demo sea and first server run
