//  4. THREE.JS SCENE
// ═══════════════════════════════════════════

// THREE.OrbitControls is attached to the THREE namespace by the unpkg script tag.
// Alias it here so the rest of the file can use OrbitControls directly.
const OrbitControls = THREE.OrbitControls;

const SQ = 1; // Square size in world units

// Board coords → world position
function boardToWorld(r, f) {
  return { x: (f - 3.5) * SQ, z: (3.5 - r) * SQ };
}

// --- Renderer ---
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;

// --- Scene + fog ---
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x08001a, .055);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, .1, 150);
camera.position.set(0, 10, 9.5);

// --- Orbit controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = .07;
controls.minPolarAngle = .15;
controls.maxPolarAngle = Math.PI * .4;
controls.minDistance   = 6;
controls.maxDistance   = 22;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.update();

// --- Animated swirl background (custom shader) ---
const bgVert = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const bgFrag = `
  uniform float uT; varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){
    vec2 uv=vUv*2.8; float t=uT*.07;
    float a=n(uv+vec2(t,t*.6)),b=n(uv*1.4-vec2(t*.5,t*.9)),c=n(uv*.6+vec2(sin(t)*.4,cos(t*.7)*.4));
    float m=sin((a+b*.7+c*.5)*6.28)*.5+.5, m2=sin((b+c)*9.42+t*.3)*.5+.5;
    vec3 col=mix(vec3(.04,.01,.11),vec3(.16,.03,.30),m);
    col=mix(col,vec3(.36,.06,.52),m*m*.6);
    col=mix(col,vec3(.52,.08,.76),smoothstep(.46,.54,m2)*.32);
    col+=vec3(.1,.02,.16)*smoothstep(.7,1.,m2*m);
    gl_FragColor=vec4(col,1.);
  }`;

const bgMaterial = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 } },
  vertexShader: bgVert, fragmentShader: bgFrag, side: THREE.BackSide,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), bgMaterial));

// --- Lights ---
scene.add(new THREE.AmbientLight(0x180830, .6));

const keyLight = new THREE.DirectionalLight(0xfff0f8, 3.2);
keyLight.position.set(7, 18, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.left   = -12; keyLight.shadow.camera.right  = 12;
keyLight.shadow.camera.top    =  12; keyLight.shadow.camera.bottom = -12;
keyLight.shadow.camera.near   = .5;  keyLight.shadow.camera.far    = 50;
keyLight.shadow.bias = -.0008;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8833ff, 1.1);
fillLight.position.set(-8, 9, -5);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff44cc, 3.5, 28);
rimLight.position.set(0, 10, -10);
scene.add(rimLight);

const boardGlow = new THREE.PointLight(0x9900ff, 2, 14);
boardGlow.position.set(0, .8, 0);
scene.add(boardGlow);

const spot1 = new THREE.SpotLight(0xffffff, 4, 30, Math.PI/10, .35);
spot1.position.set(6, 15, 4);
scene.add(spot1); scene.add(spot1.target);

const spot2 = new THREE.SpotLight(0xcc66ff, 2.5, 25, Math.PI/12, .45);
spot2.position.set(-5, 13, -3);
scene.add(spot2); scene.add(spot2.target);

// --- Board slab ---
const slab = new THREE.Mesh(
  new THREE.BoxGeometry(9, .38, 9),
  new THREE.MeshStandardMaterial({ color: 0x08010f, roughness: .9, metalness: .15 })
);
slab.position.y = -.19;
slab.receiveShadow = true;
scene.add(slab);

// --- Neon frame ---
const frameMat = new THREE.MeshStandardMaterial({
  color: 0x110022,
  emissive: new THREE.Color(0xaa00ff),
  emissiveIntensity: 2.4,
  roughness: .25, metalness: .75,
});
const FW = 9.14, FD = .2, FH = .12;
[[-FW/2-FD/2,0,0,FD,FW],[FW/2+FD/2,0,0,FD,FW],[0,0,-FW/2-FD/2,FW+FD*2,FD],[0,0,FW/2+FD/2,FW+FD*2,FD]].forEach(([x,y,z,w,d]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,FH,d), frameMat);
  m.position.set(x, .06, z); scene.add(m);
});
[[-FW/2-FD*.5, FW/2+FD*.5],[FW/2+FD*.5, FW/2+FD*.5],[-FW/2-FD*.5,-FW/2-FD*.5],[FW/2+FD*.5,-FW/2-FD*.5]].forEach(([x,z]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(FD, FH*2.8, FD), frameMat);
  m.position.set(x, .1, z); scene.add(m);
});

// --- Checkerboard squares (BoxGeometry avoids z-fighting) ---
const lightSquareMat = new THREE.MeshStandardMaterial({ color: 0xddd090, roughness: .72, metalness: .03 });
const darkSquareMat  = new THREE.MeshStandardMaterial({ color: 0x0b0118, roughness: .82, metalness: .10 });
const squareGeo      = new THREE.BoxGeometry(SQ - .025, .04, SQ - .025);
const squares        = [];

for (let r = 0; r < 8; r++) {
  squares[r] = [];
  for (let f = 0; f < 8; f++) {
    const mat  = (r+f) % 2 === 1 ? lightSquareMat : darkSquareMat;
    const mesh = new THREE.Mesh(squareGeo, mat);
    const { x, z } = boardToWorld(r, f);
    mesh.position.set(x, .02, z);
    mesh.receiveShadow = true;
    mesh.userData = { r, f, role: 'sq' };
    scene.add(mesh);
    squares[r][f] = mesh;
  }
}


// ── Board Themes ──────────────────────────────────────────────────
// Each theme defines: light square, dark square, white piece, black piece,
// outline colors, and fresnel tint.
const BOARD_THEMES = {
  classic: {
    name:        'Classic',
    lightSq:     0xddd090,
    darkSq:      0x0b0118,
    whitePiece:  0xeee8ff,
    blackPiece:  0x110022,
    whiteEmit:   0x110022,
    blackEmit:   0x220011,
    whiteOutline:0x220044,
    blackOutline:0xffaaff,
    whiteFresnelColor: 0xffffff,
    blackFresnelColor: 0xff88ff,
  },
  marble: {
    name:        'Marble',
    lightSq:     0xe8e0d4,
    darkSq:      0x3a3028,
    whitePiece:  0xf5f0eb,
    blackPiece:  0x1a1410,
    whiteEmit:   0x332211,
    blackEmit:   0x110800,
    whiteOutline:0x443322,
    blackOutline:0xccaa88,
    whiteFresnelColor: 0xfff8f0,
    blackFresnelColor: 0xffcc88,
  },
  neon: {
    name:        'Neon',
    lightSq:     0x001a2e,
    darkSq:      0x000a14,
    whitePiece:  0x00ffcc,
    blackPiece:  0xff0088,
    whiteEmit:   0x00ffcc,
    blackEmit:   0xff0088,
    whiteOutline:0x00ffcc,
    blackOutline:0xff0088,
    whiteFresnelColor: 0x00ffff,
    blackFresnelColor: 0xff00aa,
  },
};

let activeTheme = 'classic';

function applyTheme(themeKey) {
  const t = BOARD_THEMES[themeKey];
  if (!t) return;
  activeTheme = themeKey;

  // Update board square colors
  lightSquareMat.color.setHex(t.lightSq);
  darkSquareMat.color.setHex(t.darkSq);

  // Respawn all pieces with new geometry + colors for this theme.
  // syncBoardToScene reads the live chess board state.
  if (typeof chess !== 'undefined' && typeof syncBoardToScene === 'function') {
    syncBoardToScene(chess);
    if (typeof orientAllKnights === 'function') orientAllKnights();
  }

  // Save preference
  try { localStorage.setItem('chessTheme', themeKey); } catch(e) {}

  // Update UI chips
  document.querySelectorAll('.theme-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === themeKey);
  });
}


// Override makePieceMaterial + makeFresnelMaterial to read active theme colors.
// These are declared as functions in pieces.js (loaded before scene.js),
// so reassigning them here updates the global reference for all future calls.
makePieceMaterial = function(isWhite) {
  const t = BOARD_THEMES[activeTheme];
  return new THREE.MeshStandardMaterial({
    color:             isWhite ? t.whitePiece  : t.blackPiece,
    roughness:         isWhite ? .92 : .88,
    metalness:         0,
    emissive:          new THREE.Color(isWhite ? t.whiteEmit : t.blackEmit),
    emissiveIntensity: activeTheme === 'neon' ? 0.4 : 0.04,
  });
};

makeFresnelMaterial = function(isWhite) {
  const t = BOARD_THEMES[activeTheme];
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(isWhite ? t.whiteFresnelColor : t.blackFresnelColor) },
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
};

// Also override the outline color used in buildPieceMesh
function getOutlineColor(isWhite) {
  const t = BOARD_THEMES[activeTheme];
  return isWhite ? t.whiteOutline : t.blackOutline;
}
