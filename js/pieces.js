//  5. PIECES — 3D geometry, registry, animation
// ═══════════════════════════════════════════

// Fresnel rim shader for piece glow
const FRESNEL_VERT = `
  varying vec3 vNormal; varying vec3 vViewDir;
  void main(){
    vNormal  = normalize(normalMatrix * normal);
    vec4 mv  = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FRESNEL_FRAG = `
  uniform vec3 uColor; uniform float uPower; uniform float uStr;
  varying vec3 vNormal; varying vec3 vViewDir;
  void main(){
    float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uPower);
    gl_FragColor = vec4(uColor * f * uStr, f * uStr);
  }`;

function makeFresnelMaterial(isWhite) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: isWhite ? new THREE.Color(0xffffff) : new THREE.Color(0xff88ff) },
      uPower: { value: isWhite ? 2.2 : 2.0 },
      uStr:   { value: isWhite ? 0.9 : 1.1 },
    },
    vertexShader:   FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
    side:        THREE.FrontSide,
  });
}

function makePieceMaterial(isWhite) {
  return new THREE.MeshStandardMaterial({
    color:              isWhite ? 0xeee8ff : 0x110022,
    roughness:          isWhite ? .92 : .88,
    metalness:          0,
    emissive:           new THREE.Color(isWhite ? 0x110022 : 0x220011),
    emissiveIntensity:  .04,
  });
}

function buildPieceMesh(type, color) {
  const isWhite   = color === W;
  const mat       = makePieceMaterial(isWhite);
  const fresnelMat= makeFresnelMaterial(isWhite);
  const outlineColor = (typeof getOutlineColor === 'function')
    ? getOutlineColor(isWhite)
    : (isWhite ? 0x220044 : 0xffaaff);
  const outlineMat= new THREE.MeshBasicMaterial({ color: outlineColor, side: THREE.BackSide });

  // Dispatch to theme-specific geometry builder
  if (typeof activeTheme !== 'undefined' && activeTheme === 'marble') {
    return buildPieceMesh_marble(type, isWhite, mat, fresnelMat, outlineMat);
  }
  if (typeof activeTheme !== 'undefined' && activeTheme === 'neon') {
    return buildPieceMesh_neon(type, isWhite, mat, fresnelMat, outlineMat);
  }

  // ── Classic geometry ──────────────────────────────────────────
  const group = new THREE.Group();

  const addGeo = (geo, x=0, y=0, z=0) => {
    const mesh    = new THREE.Mesh(geo, mat);
    const outline = new THREE.Mesh(geo, outlineMat);
    const fresnel = new THREE.Mesh(geo, fresnelMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    outline.position.set(x, y, z);
    outline.scale.setScalar(1.08);
    outline.userData.isOutline = true;
    fresnel.position.set(x, y, z);
    fresnel.userData.isOutline = true;
    group.add(mesh, outline, fresnel);
  };

  if (type === PT.P) {
    addGeo(new THREE.CylinderGeometry(.31,.37,.09,18), 0,.045);
    addGeo(new THREE.CylinderGeometry(.145,.205,.27,16), 0,.225);
    addGeo(new THREE.SphereGeometry(.2,18,12), 0,.5);
  } else if (type === PT.R) {
    addGeo(new THREE.CylinderGeometry(.33,.39,.09,18), 0,.045);
    addGeo(new THREE.CylinderGeometry(.22,.28,.41,16), 0,.295);
    addGeo(new THREE.CylinderGeometry(.3,.24,.09,16),  0,.545);
    addGeo(new THREE.CylinderGeometry(.175,.175,.04,16), 0,.615);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI/2 + Math.PI/4;
      addGeo(new THREE.BoxGeometry(.1,.18,.1), Math.cos(a)*.2,.695,Math.sin(a)*.2);
    }
  } else if (type === PT.N) {
    addGeo(new THREE.CylinderGeometry(.33,.39,.09,18), 0,.045);
    addGeo(new THREE.CylinderGeometry(.175,.255,.27,16), 0,.225);
    addGeo(new THREE.BoxGeometry(.26,.41,.18), 0,.555);
    addGeo(new THREE.BoxGeometry(.2,.16,.33),  0,.74,.08);
    addGeo(new THREE.SphereGeometry(.115,14,10), 0,.835,-.04);
  } else if (type === PT.B) {
    addGeo(new THREE.CylinderGeometry(.33,.39,.09,18),  0,.045);
    addGeo(new THREE.CylinderGeometry(.135,.235,.13,16), 0,.185);
    addGeo(new THREE.CylinderGeometry(.175,.155,.47,18), 0,.455);
    addGeo(new THREE.SphereGeometry(.175,18,12), 0,.74);
    addGeo(new THREE.SphereGeometry(.058,10,8),  0,.905);
  } else if (type === PT.Q) {
    addGeo(new THREE.CylinderGeometry(.35,.41,.09,18),   0,.045);
    addGeo(new THREE.CylinderGeometry(.155,.265,.175,16), 0,.195);
    addGeo(new THREE.CylinderGeometry(.225,.175,.51,18),  0,.545);
    addGeo(new THREE.CylinderGeometry(.275,.245,.075,16), 0,.815);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI*2/5;
      addGeo(new THREE.SphereGeometry(.072,10,8), Math.cos(a)*.185,.91,Math.sin(a)*.185);
    }
    addGeo(new THREE.SphereGeometry(.095,14,10), 0,.91);
  } else if (type === PT.K) {
    addGeo(new THREE.CylinderGeometry(.35,.41,.09,18),   0,.045);
    addGeo(new THREE.CylinderGeometry(.155,.265,.175,16), 0,.195);
    addGeo(new THREE.CylinderGeometry(.245,.195,.53,18),  0,.555);
    addGeo(new THREE.CylinderGeometry(.295,.265,.075,16), 0,.835);
    addGeo(new THREE.BoxGeometry(.082,.345,.082), 0,1.04);
    addGeo(new THREE.BoxGeometry(.245,.082,.082), 0,1.09);
  }

  return group;
}

// Piece registry: Map<id, { g, r, f, t, c, id }>
const pieces  = new Map();
let   pieceId = 0;

function spawnPiece(type, color, r, f) {
  const group     = buildPieceMesh(type, color);
  const { x, z }  = boardToWorld(r, f);
  group.position.set(x, 0, z);
  group.traverse(m => { if (m.isMesh) m.userData = { role:'piece', pc:color, r, f }; });
  group.userData = { role:'piece', pc:color, r, f };
  scene.add(group);
  const id = pieceId++;
  pieces.set(id, { g:group, r, f, t:type, c:color, id });
  return id;
}

function despawnPiece(r, f) {
  for (const [id, data] of pieces) {
    if (data.r === r && data.f === f) {
      scene.remove(data.g);
      pieces.delete(id);
      return data;
    }
  }
  return null;
}

function getPieceAt(r, f) {
  for (const [, data] of pieces)
    if (data.r === r && data.f === f) return data;
  return null;
}

// Squash-and-bounce arc animation
function animateMove(fromR, fromF, toR, toF, onComplete) {
  const data = getPieceAt(fromR, fromF);
  if (!data) { onComplete?.(); return; }

  data.r = toR; data.f = toF;
  data.g.traverse(m => { if (m.isMesh) { m.userData.r = toR; m.userData.f = toF; } });

  const startX = data.g.position.x;
  const startZ = data.g.position.z;
  const { x: endX, z: endZ } = boardToWorld(toR, toF);
  const t0  = performance.now();
  const dur = 460;

  (function tick() {
    const t = Math.min(1, (performance.now() - t0) / dur);
    // Ease in-out quadratic
    const e = t < .5 ? 2*t*t : -1 + (4 - 2*t)*t;
    data.g.position.x = startX + (endX - startX) * e;
    data.g.position.z = startZ + (endZ - startZ) * e;
    // Arc height
    if (t < .72) {
      data.g.position.y = Math.sin(t / .72 * Math.PI) * .9;
    } else {
      const bt = (t - .72) / .28;
      data.g.position.y = Math.sin(bt * Math.PI) * .22 * (1 - bt * .5);
    }
    // Landing squash
    if (t > .7 && t < .78) {
      const s = (t-.7) / .08;
      data.g.scale.set(1 + .28*(1-s), .72 + .28*s, 1 + .28*(1-s));
    } else if (t >= .78) {
      const rv = 1 - Math.pow(1 - (t-.78)/.22, 3);
      data.g.scale.set(1 + .28*(1-rv), .72 + .28*rv, 1 + .28*(1-rv));
    } else {
      data.g.scale.set(1, 1, 1);
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      data.g.position.y = 0;
      data.g.scale.set(1, 1, 1);
      onComplete?.();
    }
  })();
}

// Piece rain animation on new game
function syncBoardToScene(ch, rainEffect = false) {
  for (const [, data] of pieces) scene.remove(data.g);
  pieces.clear();
  pieceId = 0;

  const entries = [];
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = ch.bd[r][f];
      if (p) entries.push({ r, f, p });
    }

  entries.forEach(({ r, f, p }, i) => {
    const id   = spawnPiece(p.t, p.c, r, f);
    if (!rainEffect) return;
    const data = pieces.get(id);
    const sy   = 6 + Math.random() * 3;
    data.g.position.y = sy;
    setTimeout(() => {
      const t0  = performance.now();
      const dur = 200 + Math.random() * 100;
      (function fall() {
        const t = Math.min(1, (performance.now() - t0) / dur);
        data.g.position.y = sy * (1 - t*t);
        if (t < 1) {
          requestAnimationFrame(fall);
        } else {
          data.g.position.y = 0;
          data.g.scale.set(1.3, .7, 1.3);
          setTimeout(() => data.g.scale.set(1, 1, 1), 60);
        }
      })();
    }, i * 16);
  });
}

// Point all knights toward the opposing king
function orientAllKnights() {
  for (const [, data] of pieces) {
    if (data.t !== PT.N) continue;
    const targetColor = data.c === W ? B : W;
    const king        = chess._findKing(targetColor);
    if (!king) continue;
    const kPos = boardToWorld(king.r, king.f);
    const nPos = boardToWorld(data.r, data.f);
    data.g.rotation.y = Math.atan2(kPos.x - nPos.x, kPos.z - nPos.z);
  }
}


// ── Per-theme piece geometry builders ────────────────────────────
// Each builder returns a THREE.Group using the same addGeo pattern.
// Called from buildPieceMesh when a non-classic theme is active.

function buildPieceMesh_marble(type, isWhite, mat, fresnelMat, outlineMat) {
  // Marble: chunkier, wider bases, more pronounced waists — classical Staunton feel
  const group = new THREE.Group();
  const addGeo = (geo, x=0, y=0, z=0) => {
    const mesh    = new THREE.Mesh(geo, mat);
    const outline = new THREE.Mesh(geo, outlineMat);
    const fresnel = new THREE.Mesh(geo, fresnelMat);
    mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true;
    outline.position.set(x,y,z); outline.scale.setScalar(1.08); outline.userData.isOutline = true;
    fresnel.position.set(x,y,z); fresnel.userData.isOutline = true;
    group.add(mesh, outline, fresnel);
  };

  if (type === PT.P) {
    addGeo(new THREE.CylinderGeometry(.34,.42,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.18,.28,.20,16), 0,.20);
    addGeo(new THREE.SphereGeometry(.24,20,14), 0,.52);
  } else if (type === PT.R) {
    addGeo(new THREE.CylinderGeometry(.37,.44,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.26,.32,.38,18), 0,.29);
    addGeo(new THREE.CylinderGeometry(.34,.28,.10,18), 0,.54);
    for (let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4; addGeo(new THREE.BoxGeometry(.12,.22,.12),Math.cos(a)*.22,.72,Math.sin(a)*.22);}
  } else if (type === PT.N) {
    addGeo(new THREE.CylinderGeometry(.36,.43,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.20,.30,.25,16), 0,.225);
    addGeo(new THREE.BoxGeometry(.30,.46,.20), 0,.57);
    addGeo(new THREE.BoxGeometry(.22,.18,.36), 0,.77,.10);
    addGeo(new THREE.SphereGeometry(.13,14,10), 0,.875,-.05);
  } else if (type === PT.B) {
    addGeo(new THREE.CylinderGeometry(.36,.43,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.16,.28,.15,18), 0,.20);
    addGeo(new THREE.CylinderGeometry(.20,.16,.50,20), 0,.475);
    addGeo(new THREE.SphereGeometry(.21,20,14), 0,.76);
    addGeo(new THREE.SphereGeometry(.065,12,8), 0,.965);
  } else if (type === PT.Q) {
    addGeo(new THREE.CylinderGeometry(.38,.45,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.18,.30,.18,16), 0,.20);
    addGeo(new THREE.CylinderGeometry(.26,.19,.54,20), 0,.565);
    addGeo(new THREE.CylinderGeometry(.32,.28,.08,18), 0,.855);
    for(let i=0;i<6;i++){const a=i*Math.PI*2/6; addGeo(new THREE.SphereGeometry(.08,10,8),Math.cos(a)*.21,.96,Math.sin(a)*.21);}
  } else if (type === PT.K) {
    addGeo(new THREE.CylinderGeometry(.38,.45,.10,20), 0,.05);
    addGeo(new THREE.CylinderGeometry(.18,.30,.18,16), 0,.20);
    addGeo(new THREE.CylinderGeometry(.27,.21,.56,20), 0,.58);
    addGeo(new THREE.CylinderGeometry(.33,.30,.08,18), 0,.87);
    addGeo(new THREE.BoxGeometry(.09,.38,.09), 0,1.10);
    addGeo(new THREE.BoxGeometry(.28,.09,.09), 0,1.15);
  }
  return group;
}

function buildPieceMesh_neon(type, isWhite, mat, fresnelMat, outlineMat) {
  // Neon: angular, crystalline, low-poly. Octagons replace cylinders, diamonds and pyramids replace spheres.
  const group = new THREE.Group();
  const addGeo = (geo, x=0, y=0, z=0, ry=0) => {
    const mesh    = new THREE.Mesh(geo, mat);
    const outline = new THREE.Mesh(geo, outlineMat);
    const fresnel = new THREE.Mesh(geo, fresnelMat);
    mesh.position.set(x,y,z); if(ry) mesh.rotation.y=ry;
    mesh.castShadow = mesh.receiveShadow = true;
    outline.position.set(x,y,z); if(ry) outline.rotation.y=ry;
    outline.scale.setScalar(1.09); outline.userData.isOutline = true;
    fresnel.position.set(x,y,z); if(ry) fresnel.rotation.y=ry;
    fresnel.userData.isOutline = true;
    group.add(mesh, outline, fresnel);
  };
  // Flat octagonal base for all pieces
  const base = (r1,r2,h) => new THREE.CylinderGeometry(r1,r2,h,8);

  if (type === PT.P) {
    addGeo(base(.30,.38,.08), 0,.04);
    addGeo(base(.13,.22,.22,8), 0,.21);
    addGeo(new THREE.OctahedronGeometry(.22), 0,.52);
  } else if (type === PT.R) {
    addGeo(base(.32,.40,.08), 0,.04);
    addGeo(base(.20,.28,.38), 0,.29);
    addGeo(base(.29,.22,.08), 0,.54);
    // Four corner turrets
    for(let i=0;i<4;i++){const a=i*Math.PI/2; addGeo(new THREE.BoxGeometry(.11,.20,.11),Math.cos(a)*.20,.70,Math.sin(a)*.20);}
  } else if (type === PT.N) {
    addGeo(base(.32,.40,.08), 0,.04);
    addGeo(base(.16,.26,.24), 0,.22);
    // Angular horse head from boxes
    addGeo(new THREE.BoxGeometry(.28,.40,.16), 0,.56);
    addGeo(new THREE.BoxGeometry(.18,.12,.30), 0,.75,.10);
    addGeo(new THREE.OctahedronGeometry(.12), 0,.86,-.04);
  } else if (type === PT.B) {
    addGeo(base(.32,.40,.08), 0,.04);
    addGeo(base(.13,.24,.12), 0,.18);
    addGeo(base(.18,.13,.48), 0,.46);
    addGeo(new THREE.OctahedronGeometry(.19), 0,.74);
    addGeo(new THREE.TetrahedronGeometry(.08), 0,.94);
  } else if (type === PT.Q) {
    addGeo(base(.34,.42,.08), 0,.04);
    addGeo(base(.14,.26,.16), 0,.20);
    addGeo(base(.22,.16,.52), 0,.56);
    addGeo(base(.30,.24,.07), 0,.85);
    // Star points
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5; addGeo(new THREE.TetrahedronGeometry(.09),Math.cos(a)*.19,.95,Math.sin(a)*.19);}
    addGeo(new THREE.OctahedronGeometry(.11), 0,.95);
  } else if (type === PT.K) {
    addGeo(base(.34,.42,.08), 0,.04);
    addGeo(base(.14,.26,.16), 0,.20);
    addGeo(base(.24,.18,.54), 0,.57);
    addGeo(base(.32,.26,.07), 0,.87);
    // Cross — two boxes
    addGeo(new THREE.BoxGeometry(.08,.36,.08), 0,1.09);
    addGeo(new THREE.BoxGeometry(.26,.08,.08), 0,1.13);
  }
  return group;
}
