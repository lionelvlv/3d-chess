# 3D Chess — Technical Specification & Architecture

## Overview
A browser-based 3D chess game built using Three.js and vanilla JavaScript, implementing full chess rules, move validation, and 3D piece rendering.

## Architecture
- **Rendering:** Three.js / WebGL (`js/` directory) for 3D board, piece models, lighting, and camera controls (OrbitControls).
- **Game Logic:** Custom chess rule engine handling legal move generation, check/checkmate detection, castling, en passant, and pawn promotion.
- **Interactivity:** Raycasting for mouse picking (selecting pieces and clicking destination squares).

## Directory Structure
- `index.html` — Main entry point and UI overlay (game controls, turn indicators, capture lists).
- `js/` — Game loop, Three.js scene setup, chess rules engine, and piece meshes.
- `css/` — UI styling, HUD overlays, menu screens.
- `docs/` — Technical specs and development notes.
- `tests/` — Unit tests for rule validation and board state.
