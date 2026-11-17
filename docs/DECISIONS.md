# 3D Chess — Decision Log

This log documents the "why" behind key architectural and implementation choices for 3D Chess.

## 1. Core Architecture

### 1.1 Rendering: Three.js
*   **Decision:** Use Three.js for 3D rendering.
*   **Rationale:** Provides high-level abstractions for WebGL (lights, cameras, scene graph), significantly reducing boilerplate compared to raw GLSL/WebGL.
*   **Tradeoff:** Heavier dependency footprint for a simple game.

### 1.2 Game Engine
*   **Decision:** Custom JavaScript rule engine over an existing library (e.g., chess.js).
*   **Rationale:** Educational focus; wanted to implement piece logic (move validation, check detection) manually to understand the underlying state machine.

## 2. Interaction
*   **Decision:** Raycasting for piece selection.
*   **Rationale:** Native 3D interaction model matches the Three.js viewport and allows for direct 1:1 mapping of screen coordinates to 3D space.
