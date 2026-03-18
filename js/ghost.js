//  11d. GHOST PIECE TRAIL — AI/opponent move preview
//
//  When an opponent or AI move happens, we spawn a
//  semi-transparent copy of the piece at the origin square
//  and fade it out over 600ms. Gives players a clear visual
//  of where the piece came from — especially useful for AI.
//
//  Only fires on non-player moves (fromNetwork=true or AI).
//  Does NOT fire on the local player's own moves.
// ═══════════════════════════════════════════

function spawnGhostTrail(type, color, r, f) {
  // Build a ghost group — same geometry, transparent material
  const isWhite = color === W;
  const ghostMat = new THREE.MeshStandardMaterial({
    color:     isWhite ? 0xeee8ff : 0x8844aa,
    roughness: .9,
    metalness: 0,
    transparent: true,
    opacity: .45,
    depthWrite: false,
  });

  // Re-use buildPieceMesh then override materials
  const group = buildPieceMesh(type, color);
  group.traverse(m => {
    if (m.isMesh && !m.userData.isOutline) {
      m.material   = ghostMat;
      m.castShadow = false;
    } else if (m.isMesh && m.userData.isOutline) {
      m.visible = false; // hide outline and fresnel on ghost
    }
  });

  const { x, z } = boardToWorld(r, f);
  group.position.set(x, 0, z);
  scene.add(group);

  // Fade out over 600ms then remove
  const start = performance.now();
  const dur   = 600;
  (function fade() {
    const t = Math.min(1, (performance.now() - start) / dur);
    ghostMat.opacity = .45 * (1 - t);
    if (t < 1) requestAnimationFrame(fade);
    else scene.remove(group);
  })();
}

