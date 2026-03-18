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

