let animTime = 0;

(function renderLoop() {
  requestAnimationFrame(renderLoop);
  animTime += .012;

  controls.update();

  // Shader + ambient animation
  bgMaterial.uniforms.uT.value = animTime;
  rimLight.intensity   = 3   + Math.sin(animTime * .45) * .5;
  boardGlow.intensity  = 1.8 + Math.sin(animTime * .60) * .4;
  frameMat.emissiveIntensity = 2.2 + Math.sin(animTime * .80) * .4;

  // Per-frame piece animations
  tickParticles();
  tickDust();
  tickKingPulse();
  tickBobAnimation();
  tickSelectionRing();
  tickDotAnimation();

  renderer.render(scene, camera);
})();


// ── Boot sequence ─────────────────────────────
// Show the initial board state (no rain effect — just pieces in place)
syncBoardToScene(chess);
orientAllKnights();

// Ensure landing is visible and HUD/game-over are hidden on first load
document.getElementById('landing').style.display   = 'flex';
document.getElementById('hud').classList.remove('on');
document.getElementById('gameover').classList.remove('on');

// Start Stockfish in the background (non-blocking).
// Works on GitHub Pages (https://) via fetch→blob→Worker.
// On file:// the fetch fails silently and minimax is used instead.
initStockfish();

