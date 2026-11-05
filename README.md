# Chess Arcade

[![tests](https://github.com/lionelvlv/3d-chess/actions/workflows/test.yml/badge.svg)](https://github.com/lionelvlv/3d-chess/actions/workflows/test.yml)

3D chess in the browser: a hand-written rules engine, a Stockfish opponent, and peer-to-peer online play with no game server.

**Play:** https://lionelvlv.github.io/3d-chess/

## Features
- Stockfish AI
- Online Multiplayer
- Timed Chess
- Themes
- Board Customization

Landing Page
![Landing Page](https://i.imgur.com/zPisX9P.png)

Chess Game
![Chess Game](https://i.imgur.com/zs0oM43.png)

Board Customization
![Board Customization](https://i.imgur.com/7TeXriq.png)

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

## How it works
- **Rules engine (`js/engine.js`)**: an 8x8 array board with pseudo-legal move generation, then a legality filter that plays each move, checks whether the mover's king is attacked, and undoes it. It handles castling (including not castling through check), en passant and promotion. `_apply`/`_undo` are search-only, so AI search never touches the live game status.
- **AI (`js/ai.js`)**: Stockfish in a Web Worker when served over HTTPS, with a built-in minimax fallback.
- **Multiplayer (`js/networking.js`)**: PeerJS (WebRTC data channels). The host's peer ID becomes an invite link and moves are sent peer to peer.
- **Rendering**: Three.js r128 with OrbitControls; clicks map to squares by raycasting.

## Testing
```bash
npm test
```
- **Perft tests** (`test/perft.test.js`) count every legal move sequence from 5 standard positions and compare with the [published reference counts](https://www.chessprogramming.org/Perft_Results), up to about 200k positions deep. That covers castling, en passant, promotion, pins and discovered checks.
- **Rule tests** (`test/rules.test.js`) cover checkmate detection, illegal-move rejection, promotion choice and custom-setup positions. They caught a bug where a king placed off e1 in the board editor could still "castle".
- Tests run on every push with GitHub Actions. They need no dependencies, just Node 20+.

## Notes for developers

- All JS files share one global scope — no ES modules, no bundler needed
- Load order matters — see `<script>` tags in `index.html`
- PeerJS is lazy-loaded only when a room is created/joined (not on page load)
- Stockfish loads only on HTTPS via fetch→blob→Worker pattern
