//  3. AUDIO — Synthesized sounds via Web Audio API
// ═══════════════════════════════════════════

let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.14, delay = 0, endFreq = null) {
  try {
    const ctx  = getAudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type          = type;
    osc.frequency.value = freq;
    if (endFreq != null)
      osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + delay + duration);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + .012);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + delay + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + .05);
  } catch(e) {}
}

function playNoise(duration, volume = .08, delay = 0) {
  try {
    const ctx    = getAudioContext();
    const buf    = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src    = ctx.createBufferSource();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer       = buf;
    filter.type      = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value   = .8;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + delay + duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  } catch(e) {}
}

const SFX = {
  select()    { playTone(1100,.06,'sine',.09); playTone(1600,.08,'sine',.06,.04); },
  move()      { playTone(520,.06,'triangle',.13); playTone(760,.1,'sine',.07,.05); },
  capture()   { playNoise(.18,.18); playTone(180,.12,'sawtooth',.13); playTone(310,.18,'triangle',.09,.06); },
  check()     { [523,659,784,1047].forEach((f,i) => playTone(f,.22,'square',.08,i*.06)); },
  castle()    { [330,440,550,660].forEach((f,i) => playTone(f,.15,'triangle',.1,i*.07)); },
  promote()   { [523,659,784,1047,1319,1047,784].forEach((f,i) => playTone(f,.2,'sine',.16,i*.07)); },
  win()       { [523,659,784,880,1047,880,784].forEach((f,i) => playTone(f,.18,'sine',.17,i*.1)); },
  lose()      { [392,330,294,262,220].forEach((f,i) => playTone(f,.3,'triangle',.14,i*.14)); },
  connect()   { [440,660,880].forEach((f,i) => playTone(f,.18,'sine',.15,i*.09)); },
  tick()      { playTone(880,.04,'square',.05); },
  lowtime()   { playTone(660,.06,'square',.08); playTone(440,.09,'square',.05,.07); },
  timeout()   { [330,294,262,220,196].forEach((f,i) => playTone(f,.35,'sawtooth',.12,i*.12)); },
  btnClick()  { playTone(660,.05,'square',.1); playTone(880,.07,'square',.06,.04); },
  btnBack()   { playTone(440,.05,'square',.09); playTone(330,.07,'square',.06,.04); },
  btnStart()  { playTone(880,.06,'square',.1); playTone(1100,.08,'sine',.1,.05); playTone(1320,.12,'sine',.09,.1); },
  btnOnline() { playTone(440,.05,'triangle',.1); playTone(660,.06,'triangle',.09,.04); playTone(880,.08,'sine',.1,.08); },
  toggle()    { playTone(1047,.05,'square',.07); },
  copyCode()  { playTone(1047,.06,'sine',.1); playTone(1319,.08,'sine',.08,.06); playTone(1568,.1,'sine',.07,.12); },
  error()     { playTone(220,.08,'sawtooth',.12); playTone(185,.12,'sawtooth',.1,.06); },
  hover()     { playTone(1200,.03,'square',.04); },
};

