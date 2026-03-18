//  7. PARTICLES — bursts, dust, king pulse, bob
// ═══════════════════════════════════════════

const particlePool = [];

function burst(r, f, colors = [0xff6600, 0xffcc00, 0xff44aa, 0xaa44ff]) {
  const { x, z } = boardToWorld(r, f);
  for (let i = 0; i < 20; i++) {
    const col     = colors[Math.floor(Math.random() * colors.length)];
    const mesh    = new THREE.Mesh(
      new THREE.SphereGeometry(.038, 4, 4),
      new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:1 })
    );
    mesh.position.set(
      x + (Math.random()-.5)*.5,
      .3 + Math.random()*.3,
      z + (Math.random()-.5)*.5
    );
    mesh.userData.velocity = new THREE.Vector3(
      (Math.random()-.5)*.08, .08 + Math.random()*.1, (Math.random()-.5)*.08
    );
    mesh.userData.life = 0;
    scene.add(mesh);
    particlePool.push(mesh);
  }
}

function tickParticles() {
  for (let i = particlePool.length - 1; i >= 0; i--) {
    const p = particlePool[i];
    p.userData.life += .025;
    p.position.add(p.userData.velocity);
    p.userData.velocity.y -= .003; // gravity
    p.material.opacity = 1 - p.userData.life;
    if (p.userData.life >= 1) {
      scene.remove(p);
      particlePool.splice(i, 1);
    }
  }
}

// Ambient floating dust
const DUST_COUNT = 90;
const dustPositions = new Float32Array(DUST_COUNT * 3);
for (let i = 0; i < DUST_COUNT; i++) {
  dustPositions[i*3]   = (Math.random()-.5)*22;
  dustPositions[i*3+1] = Math.random()*8 + .5;
  dustPositions[i*3+2] = (Math.random()-.5)*22;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0xaa44ff, size: .048, transparent: true, opacity: .2,
})));

function tickDust() {
  const pos = dustGeo.attributes.position;
  for (let i = 0; i < DUST_COUNT; i++) {
    pos.array[i*3+1] += .002;
    if (pos.array[i*3+1] > 9) pos.array[i*3+1] = .5;
  }
  pos.needsUpdate = true;
}

// King pulse (red glow when in check)
let kingPulseData = null;
let kingPulseTime = 0;

function startKingPulse(r, f) {
  kingPulseData = { r, f };
  kingPulseTime = 0;
}

function stopKingPulse() {
  if (!kingPulseData) return;
  const data = getPieceAt(kingPulseData.r, kingPulseData.f);
  if (data) {
    const isW = data.c === W;
    data.g.traverse(m => {
      // Only MeshStandardMaterial has emissive — skip outline/fresnel meshes
      if (m.isMesh && !m.userData.isOutline && m.material.emissive) {
        m.material.emissive.set(isW ? 0x220044 : 0x880055);
        m.material.emissiveIntensity = isW ? .08 : .15;
      }
    });
  }
  kingPulseData = null;
}

function tickKingPulse() {
  if (!kingPulseData) return;
  kingPulseTime += .06;
  const data = getPieceAt(kingPulseData.r, kingPulseData.f);
  if (!data) return;
  const v = Math.max(0, Math.sin(kingPulseTime * 3) * .5 + .5);
  data.g.traverse(m => {
    // Only MeshStandardMaterial has .emissive — skip outline (MeshBasicMaterial) and fresnel (ShaderMaterial)
    if (m.isMesh && !m.userData.isOutline && m.material.emissive) {
      m.material.emissive.set(1, 0, .08 * v);
      m.material.emissiveIntensity = .25 + v * 1.3;
    }
  });
}

// Selected piece bob animation
let selectedRow = -1, selectedFile = -1;

function tickBobAnimation() {
  for (const [, data] of pieces) {
    const isSelected = data.r === selectedRow && data.f === selectedFile;
    const isPulsing  = kingPulseData && data.r === kingPulseData.r && data.f === kingPulseData.f;
    if (isSelected)       data.g.position.y = Math.sin(Date.now() * .005) * .07 + .09;
    else if (!isPulsing)  data.g.position.y = 0;
  }
}

