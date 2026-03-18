//  8. RAYCASTING — click/tap → board square
// ═══════════════════════════════════════════

const raycaster   = new THREE.Raycaster();
const mouseVec    = new THREE.Vector2();

function getSquareFromPointer(pointerEvent) {
  const rect = canvas.getBoundingClientRect();
  mouseVec.x = ((pointerEvent.clientX - rect.left) / rect.width)  * 2 - 1;
  mouseVec.y = -((pointerEvent.clientY - rect.top)  / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseVec, camera);

  // First check piece meshes (more precise feel)
  const pieceMeshes = [];
  pieces.forEach(data => data.g.traverse(m => {
    if (m.isMesh && !m.userData.isOutline) pieceMeshes.push(m);
  }));
  const pieceHits = raycaster.intersectObjects(pieceMeshes);
  if (pieceHits.length) {
    const u = pieceHits[0].object.userData;
    return { r: u.r, f: u.f };
  }

  // Fall back to board squares
  const squareHits = raycaster.intersectObjects(squares.flat());
  if (squareHits.length) {
    const u = squareHits[0].object.userData;
    return { r: u.r, f: u.f };
  }

  return null;
}

// 3D world position → screen space (for floating labels)
function floatScore(r, f, text, cssClass = 'cap') {
  const { x, z } = boardToWorld(r, f);
  const proj      = new THREE.Vector3(x, 1.5, z).project(camera);
  const el        = document.createElement('div');
  el.className    = `dmg ${cssClass}`;
  el.textContent  = text;
  el.style.left   = (proj.x * .5 + .5) * innerWidth  + 'px';
  el.style.top    = (-proj.y * .5 + .5) * innerHeight + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 960);
}

// Screen shake on capture
function screenShake() {
  canvas.classList.remove('shake');
  void canvas.offsetWidth; // force reflow to restart animation
  canvas.classList.add('shake');
  setTimeout(() => canvas.classList.remove('shake'), 300);
}

