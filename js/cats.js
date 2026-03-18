//  16. CAT BUTTON — easter egg
//
//  Sound:  Web Audio formant synthesis — two band-pass filters shaped
//          to mimic the F1/F2 formants of a real cat meow. Self-contained,
//          zero network, works in all browsers including Safari.
//
//  Images: Preloaded from cataas.com into a canvas, stored as blob URLs.
//          Each cat sticker shows a styled placeholder immediately and
//          swaps to the real photo when the blob is ready.
//
//  Polish: Conic-gradient cooldown ring on the wrapper drains over 2.5s.
//          Ring animates via rAF updating a CSS custom property.
// ═══════════════════════════════════════════

const MEOW_LABELS = ['meow!', 'mrow~', 'purrr', 'mew!', 'nya~', 'mreow', '...meow'];

// ── Formant-modelled cat meow ─────────────────
// Real cat meows have two dominant formants (resonant peaks):
//   F1 ≈ 750 Hz (mouth opening — the "ea" vowel shape)
//   F2 ≈ 1800 Hz (tongue position — the "ow" transition)
// We model this with a noise source → two BPFs → amplitude envelope
// plus a pitch-glide sine for the "voiced" fundamental.
function playCatMeow() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const dur  = 0.45 + Math.random() * 0.35;  // 450–800 ms
    const now  = ctx.currentTime;
    const root = 380 + Math.random() * 220;      // 380–600 Hz fundamental

    // ── Voiced fundamental (sine, pitch glide) ──
    const fund = ctx.createOscillator();
    const fGain = ctx.createGain();
    fund.type = 'sine';
    // Meow pitch arc: rise to peak at 30%, settle at 70%, fall to end
    fund.frequency.setValueAtTime(root * 0.75, now);
    fund.frequency.linearRampToValueAtTime(root * 1.35, now + dur * 0.30);
    fund.frequency.linearRampToValueAtTime(root * 1.10, now + dur * 0.70);
    fund.frequency.linearRampToValueAtTime(root * 0.65, now + dur);
    fGain.gain.setValueAtTime(0,    now);
    fGain.gain.linearRampToValueAtTime(0.14, now + 0.018);
    fGain.gain.setValueAtTime(0.14, now + dur * 0.65);
    fGain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.05);
    fund.connect(fGain); fGain.connect(ctx.destination);
    fund.start(now); fund.stop(now + dur + 0.06);

    // ── Noise through formant filters (breathiness / texture) ──
    const bufLen  = ctx.sampleRate * (dur + 0.1);
    const buf     = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise   = ctx.createBufferSource();
    noise.buffer  = buf;

    // F1 filter — mouth formant ~750 Hz
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 750;
    f1.Q.value = 8;

    // F2 filter — tongue formant ~1800 Hz
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    // F2 slides down as mouth closes (classic meow shape)
    f2.frequency.setValueAtTime(2200, now);
    f2.frequency.linearRampToValueAtTime(1400, now + dur);
    f2.Q.value = 10;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0,     now);
    nGain.gain.linearRampToValueAtTime(0.055, now + 0.025);
    nGain.gain.setValueAtTime(0.055, now + dur * 0.6);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.04);

    noise.connect(f1); noise.connect(f2);
    f1.connect(nGain); f2.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + dur + 0.06);

    setTimeout(() => ctx.close(), (dur + 0.3) * 1000);
  } catch(e) {}
}

// ── Image pool — canvas-baked blob URLs ───────
// Each pooled entry: { blobUrl: string|null, loading: bool }
// On load, the image is drawn to a canvas and stored as a blob URL.
// Spawning picks a ready blob URL; placeholder canvas shown otherwise.
const CAT_POOL_SIZE  = 10;
const CAT_FETCH_SIZE = 300;
const catPool        = [];  // { blobUrl, ready }

function preloadCatPool() {
  for (let i = 0; i < CAT_POOL_SIZE; i++) {
    const entry = { blobUrl: null, ready: false };
    catPool.push(entry);
    // Stagger requests 250ms apart to avoid rate limiting
    setTimeout(() => fetchCatIntoBlobUrl(entry, i), i * 250);
  }
}

function fetchCatIntoBlobUrl(entry, idx) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = CAT_FETCH_SIZE;
      canvas.getContext('2d').drawImage(img, 0, 0, CAT_FETCH_SIZE, CAT_FETCH_SIZE);
      canvas.toBlob(blob => {
        if (blob) { entry.blobUrl = URL.createObjectURL(blob); entry.ready = true; }
      }, 'image/jpeg', 0.88);
    } catch(e) {
      // CORS draw failure — store src directly as fallback
      entry.blobUrl = img.src; entry.ready = true;
    }
  };
  img.onerror = () => {
    // Retry once with a fresh URL after 2s
    setTimeout(() => fetchCatIntoBlobUrl(entry, idx), 2000);
  };
  img.src = `https://cataas.com/cat?width=${CAT_FETCH_SIZE}&height=${CAT_FETCH_SIZE}&t=${idx}_${Date.now()}`;
}

function getReadyCatBlobUrl() {
  const ready = catPool.filter(e => e.ready && e.blobUrl);
  return ready.length ? ready[Math.floor(Math.random() * ready.length)].blobUrl : null;
}

// ── Cooldown ring ─────────────────────────────
const CAT_COOLDOWN_MS = 2500;
let   catCooldownEnd  = 0;
let   catRingRaf      = null;

function startCatCooldown() {
  const wrap    = document.getElementById('btn-cat-wrap');
  const btn     = document.getElementById('btn-cat');
  catCooldownEnd = Date.now() + CAT_COOLDOWN_MS;
  btn.classList.add('cooling');

  // Animate --cat-pct from 100 → 0 over cooldown duration
  cancelAnimationFrame(catRingRaf);
  function animRing() {
    const remaining = catCooldownEnd - Date.now();
    if (remaining <= 0) {
      wrap.style.setProperty('--cat-pct', '0');
      btn.classList.remove('cooling');
      catRingRaf = null;
      return;
    }
    const pct = (remaining / CAT_COOLDOWN_MS) * 100;
    wrap.style.setProperty('--cat-pct', pct.toFixed(1));
    catRingRaf = requestAnimationFrame(animRing);
  }
  wrap.style.setProperty('--cat-pct', '100');
  catRingRaf = requestAnimationFrame(animRing);
}

// ── Physics ──────────────────────────────────
let activeCats  = [];
let catRafId    = null;
let lastCatTime = null;
const CAT_GRAVITY = 520;

function createCatPhysics(bx, by) {
  const size   = 130 + Math.floor(Math.random() * 130);
  const cx     = innerWidth  / 2;
  const cy     = innerHeight / 2;
  const base   = Math.atan2(cy - by, cx - bx);
  const spread = (Math.random() - 0.5) * (Math.PI * 0.55);
  const speed  = 1100 + Math.random() * 700;
  const vx     = Math.cos(base + spread) * speed;
  const vy     = Math.sin(base + spread) * speed;

  const el     = document.createElement('div');
  el.className = 'cat-sticker';

  // ── Image element — starts with placeholder, swaps to real cat ──
  const imgEl  = document.createElement('img');
  imgEl.className = 'cat-img-el';
  imgEl.width  = size;
  imgEl.height = size;
  imgEl.style.width  = size + 'px';
  imgEl.style.height = size + 'px';
  imgEl.alt    = '🐱';

  const blobUrl = getReadyCatBlobUrl();
  if (blobUrl) {
    imgEl.src = blobUrl;
  } else {
    // Placeholder: inline SVG cat face shown instantly
    imgEl.src = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">`+
      `<rect width="100" height="100" rx="14" fill="%23281828"/>` +
      `<text x="50" y="68" font-size="52" text-anchor="middle">🐱</text></svg>`
    )}`;
    // Swap to real image when one becomes ready (poll every 200ms, max 3s)
    let attempts = 0;
    const trySwap = setInterval(() => {
      attempts++;
      const url = getReadyCatBlobUrl();
      if (url) { imgEl.src = url; clearInterval(trySwap); }
      else if (attempts > 15) clearInterval(trySwap);
    }, 200);
  }

  const label = document.createElement('div');
  label.className   = 'meow-label';
  label.textContent = MEOW_LABELS[Math.floor(Math.random() * MEOW_LABELS.length)];
  label.style.fontSize = Math.max(0.6, size / 200) + 'rem';

  el.append(imgEl, label);
  el.style.left = (bx - size / 2) + 'px';
  el.style.top  = (by - size / 2) + 'px';
  document.body.appendChild(el);

  return {
    el,
    px: bx - size / 2, py: by - size / 2,
    vx, vy,
    rot: (Math.random() - 0.5) * 540,
    rotVal: 0,
    life: 0, maxLife: 1.9 + Math.random() * 0.7,
  };
}

function tickCats(ts) {
  if (!activeCats.length) { catRafId = null; lastCatTime = null; return; }
  const now = ts / 1000;
  const dt  = lastCatTime ? Math.min(now - lastCatTime, 0.05) : 0.016;
  lastCatTime = now;

  for (let i = activeCats.length - 1; i >= 0; i--) {
    const c = activeCats[i];
    c.life   += dt;
    c.vy     += CAT_GRAVITY * dt;
    c.px     += c.vx * dt;
    c.py     += c.vy * dt;
    c.rotVal += c.rot * dt;

    const r  = c.life / c.maxLife;
    const op = r > 0.55 ? 1 - (r - 0.55) / 0.45 : 1;
    const sc = r < 0.08 ? (r / 0.08) * 1.15 : Math.max(1, 1.15 - (r - 0.08) / 0.15 * 0.15);

    c.el.style.left      = c.px + 'px';
    c.el.style.top       = c.py + 'px';
    c.el.style.opacity   = op;
    c.el.style.transform = `rotate(${c.rotVal}deg) scale(${sc})`;

    if (c.life >= c.maxLife) { c.el.remove(); activeCats.splice(i, 1); }
  }
  catRafId = requestAnimationFrame(tickCats);
}

// ── Main trigger ──────────────────────────────
function explodeCats() {
  if (Date.now() < catCooldownEnd) return;

  const btn  = document.getElementById('btn-cat');
  const rect = btn.getBoundingClientRect();
  const bx   = rect.left + rect.width  / 2;
  const by   = rect.top  + rect.height / 2;

  // 1–2 meows with slight stagger
  playCatMeow();
  if (Math.random() > 0.45) setTimeout(playCatMeow, 80 + Math.random() * 160);

  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    activeCats.push(createCatPhysics(bx, by));
  }
  if (!catRafId) { lastCatTime = null; catRafId = requestAnimationFrame(tickCats); }

  // Button bounce
  btn.style.transform = 'scale(.82)';
  setTimeout(() => { btn.style.transform = ''; }, 120);

  startCatCooldown();
}

document.getElementById('btn-cat').addEventListener('click', explodeCats);

// Preload image pool immediately on script load
preloadCatPool();

