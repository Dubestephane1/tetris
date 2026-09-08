# Tetris

A classic, fully-featured Tetris implementation in pure HTML, CSS, and JavaScript — **no frameworks, no build step, zero dependencies**. Features a scoring system, level progression, ghost piece, touch controls, and automated end-to-end tests.

**Play it live:** [tetris-bay.pages.dev](https://tetris-bay.pages.dev) · or locally: open `index.html`, or `npm start` → http://localhost:3000

## Features

- Classic Tetris gameplay on a 10×20 board
- Scoring system (see below) with level progression — speed increases every level
- **Next piece preview**
- **Ghost piece** showing where the current piece will land
- **Hard drop / soft drop** (space / down arrow)
- **Pause** (P key or button)
- **Touch controls + swipe gestures** for mobile
- **Responsive design** for different screen sizes
- **Automated E2E test** with Playwright

## How to Play

1. Open `index.html` in a browser (or `npm start`)
2. Click **Start / Pause** to begin
3. Controls:

| Key | Action |
|-----|--------|
| ← / → | Move piece |
| ↓ | Soft drop |
| ↑ | Rotate |
| Space | Hard drop |
| P | Pause / Resume |

Mobile: on-screen buttons + swipe gestures (swipe to move, tap to rotate).

## Scoring

| Action | Points |
|--------|--------|
| Piece placed | 10 |
| 1 line | 40 × level |
| 2 lines | 100 × level |
| 3 lines | 300 × level |
| 4 lines (Tetris) | 1200 × level |
| Soft drop | 1 / cell |
| Hard drop | 2 / cell |

Level increases every **10 lines** cleared; each level speeds up the fall.

## Development

```bash
npm install        # installs Playwright + http-server
npm start          # serve on http://localhost:3000
npm run test:e2e   # run Playwright E2E tests
```

Built with:
- HTML5 (canvas + DOM board)
- CSS3 — layout, animations, responsive breakpoints
- Vanilla JavaScript — game loop (`setInterval`), collision detection, rotation logic, touch gestures

## Repo contents

```
index.html          Game page
tetris.js           Game engine (~650 lines, vanilla JS)
style.css           Styles
tests/tetris.spec.ts  Playwright E2E test
package.json        Dev tooling (Playwright, http-server)
wrangler.toml       Experimental Cloudflare Workers config (unused scaffold)
```

## Honest note

`wrangler.toml` and `worker.js` are an **experimental Cloudflare Workers scaffold** — the game itself runs entirely client-side, so they're not required to play or build. They're kept as a placeholder for a possible future server-API integration and are not part of the core game.

## License

Free to use, modify, and distribute.

---

Enjoy the game!