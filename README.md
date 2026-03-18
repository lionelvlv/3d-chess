# Chess Arcade — Developer Guide

## ⚠️ IMPORTANT: Which file to open

**Open `chess-arcade/index.html`** — NOT any other `index.html` in a parent folder.

```
chess-arcade/          ← unzip here
  index.html           ← OPEN THIS FILE
  css/
  js/
```

If you have an old `index.html` in a parent folder (from a previous version),
that file is outdated. Always use `chess-arcade/index.html`.

---

## Running locally

### Option A — Direct file open (works, limited features)
Open `chess-arcade/index.html` directly in Chrome or Edge.

- ✅ Game works fully
- ✅ AI works (minimax)
- ❌ Stockfish engine disabled (requires HTTPS)
- ❌ Online multiplayer disabled (requires HTTPS)
- ⚠️  Edge may show "Tracking Prevention" warnings — these are harmless

### Option B — Local server (recommended, all features)
Run a local server from the `chess-arcade/` folder:

```bash
# Python
python -m http.server 8080

# Node
npx serve .

# VS Code
Install "Live Server" extension, right-click index.html → Open with Live Server
```

Then open: `http://localhost:8080`

---

## File structure

```
chess-arcade/
├── index.html          Main HTML shell
├── css/
│   ├── base.css        Design tokens, reset, typography
│   ├── landing.css     Landing screen, menu, buttons
│   ├── overlay.css     HUD, overlays, game over, setup
│   └── effects.css     History panel, animations, responsive
└── js/
    ├── engine.js       Chess rules engine
    ├── ai.js           Stockfish + minimax AI
    ├── audio.js        Web Audio SFX
    ├── scene.js        Three.js scene setup
    ├── pieces.js       3D piece geometry
    ├── highlights.js   Selection + legal move display
    ├── particles.js    Visual effects
    ├── raycasting.js   Click → board square
    ├── networking.js   PeerJS WebRTC (lazy loaded)
    ├── timer.js        Chess clocks
    ├── game.js         Game controller
    ├── setup.js        Custom board editor
    ├── history.js      Move notation panel
    ├── ghost.js        Ghost piece trail
    ├── invite.js       Invite link / URL auto-join
    ├── cats.js         Cat button easter egg
    ├── events.js       All event listeners
    └── main.js         Render loop + boot
```

## Notes for developers

- All JS files share one global scope — no ES modules, no bundler needed
- Load order matters — see `<script>` tags in `index.html`
- PeerJS is lazy-loaded only when a room is created/joined (not on page load)
- Stockfish loads only on HTTPS via fetch→blob→Worker pattern
