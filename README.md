# Chess Arcade

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

## Notes for developers

- All JS files share one global scope — no ES modules, no bundler needed
- Load order matters — see `<script>` tags in `index.html`
- PeerJS is lazy-loaded only when a room is created/joined (not on page load)
- Stockfish loads only on HTTPS via fetch→blob→Worker pattern
