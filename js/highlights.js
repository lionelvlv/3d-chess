//  6. HIGHLIGHTS — selection, legal moves, check
// ═══════════════════════════════════════════

const hlGeo  = new THREE.PlaneGeometry(.9, .9);
const hlMats = {
  sel:  new THREE.MeshBasicMaterial({ color:0x22eeff, transparent:true, opacity:.55, depthWrite:false, depthTest:false }),
  leg:  new THREE.MeshBasicMaterial({ color:0x44ffaa, transparent:true, opacity:.40, depthWrite:false, depthTest:false }),
  last: new THREE.MeshBasicMaterial({ color:0x8844ff, transparent:true, opacity:.38, depthWrite:false, depthTest:false }),
  chk:  new THREE.MeshBasicMaterial({ color:0xff2244, transparent:true, opacity:.65, depthWrite:false, depthTest:false }),
};

const activePlanes = []; // highlight planes currently in scene
const activeDots   = []; // dot meshes for empty legal squares

function addHighlight(r, f, mat) {
  const mesh      = new THREE.Mesh(hlGeo, mat);
  const { x, z }  = boardToWorld(r, f);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, .07, z);
  mesh.renderOrder = 5;
  scene.add(mesh);
  activePlanes.push(mesh);
}

function clearHighlights() {
  while (activePlanes.length) scene.remove(activePlanes.pop());
  activeDots.length = 0;
}

const dotGeo = new THREE.CircleGeometry(.15, 20);

function addMoveDot(r, f) {
  const mat      = new THREE.MeshBasicMaterial({ color:0x44ffaa, transparent:true, opacity:.9, depthWrite:false, depthTest:false });
  const dot      = new THREE.Mesh(dotGeo, mat);
  const { x, z } = boardToWorld(r, f);
  dot.rotation.x = -Math.PI/2;
  dot.position.set(x, .08, z);
  dot.renderOrder = 6;
  scene.add(dot);
  activePlanes.push(dot); // same array so clearHighlights handles it
  activeDots.push(dot);
}

function tickDotAnimation() {
  const t = Date.now() * .004;
  activeDots.forEach((dot, i) => {
    const s = .86 + Math.sin(t*2.4 + i*.8) * .14;
    dot.scale.setScalar(s);
    dot.material.opacity = .7 + Math.sin(t*2.4 + i*.8) * .22;
  });
}

// Refresh all board highlights (called after every state change)
function refreshHighlights() {
  clearHighlights();
  if (lastFr) addHighlight(lastFr.r, lastFr.f, hlMats.last);
  if (lastTo) addHighlight(lastTo.r, lastTo.f, hlMats.last);
  if (selSq) {
    addHighlight(selSq.r, selSq.f, hlMats.sel);
    for (const mv of legalMoveCache) {
      if (chess.bd[mv.to.r][mv.to.f]) addHighlight(mv.to.r, mv.to.f, hlMats.leg);
      else addMoveDot(mv.to.r, mv.to.f);
    }
  }
  if (chess.status === 'check') {
    const k = chess._findKing(chess.turn);
    if (k) addHighlight(k.r, k.f, hlMats.chk);
  }
}

// Rainbow selection ring
const selRingGeo = new THREE.TorusGeometry(.44, .055, 10, 44);
const selRingMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.95, depthWrite:false });
let selRingMesh  = null;
let selRingTime  = 0;

function showSelectionRing(r, f) {
  removeSelectionRing();
  selRingMesh = new THREE.Mesh(selRingGeo, selRingMat);
  const { x, z } = boardToWorld(r, f);
  selRingMesh.position.set(x, .09, z);
  selRingMesh.rotation.x = Math.PI/2;
  selRingMesh.renderOrder = 9;
  selRingTime = 0;
  scene.add(selRingMesh);
}

function removeSelectionRing() {
  if (selRingMesh) { scene.remove(selRingMesh); selRingMesh = null; }
}

function tickSelectionRing() {
  if (!selRingMesh) return;
  selRingTime += .055;
  selRingMat.color.setHSL(selRingTime * .09 % 1, 1, .65);
  selRingMat.opacity = .65 + Math.sin(selRingTime * 3) * .3;
  selRingMesh.rotation.y += .04;
  selRingMesh.scale.setScalar(1 + Math.sin(selRingTime * 5) * .04);
}

