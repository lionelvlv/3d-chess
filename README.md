# 3D Chess

A browser-based 3D chess game built with Three.js and vanilla JavaScript.

## Documentation & Specs
- [Technical Specification](docs/SPEC.md)
- [Development Notes](development.md)
- [Features](features.md)

## Features
- Full 3D interactive board rendered via Three.js with orbit controls and lighting.
- Complete chess rules engine (legal moves, check, checkmate, castling, en passant, promotion).
- Raycasting-based piece selection and movement.
- Clean vanilla JavaScript / ES6 modular architecture.

## Tech Stack
- **Rendering:** Three.js / WebGL
- **Core:** Vanilla JavaScript (ES6), HTML5, CSS3
- **Testing:** Vitest / custom unit tests (`tests/`)

## Getting Started
1. Open `index.html` in any modern web browser or serve via a local static server (e.g., `npx serve .`).
