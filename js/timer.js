//  10. TIMER — chess clocks
// ═══════════════════════════════════════════

let timerTotal    = 0; // configured seconds per player
let timerWhite    = 0; // seconds remaining for white
let timerBlack    = 0; // seconds remaining for black
let timerInterval = null;

function initTimer(seconds) {
  timerTotal = seconds;
  timerWhite = seconds;
  timerBlack = seconds;
  const clockW = document.getElementById('clock-w');
  const clockB = document.getElementById('clock-b');
  clockW.classList.toggle('visible', seconds > 0);
  clockB.classList.toggle('visible', seconds > 0);
  renderClocks();
}

function startTimerTick() {
  stopTimerTick();
  if (!timerTotal) return;
  timerInterval = setInterval(() => {
    if (chess.status !== 'playing' && chess.status !== 'check') return;
    if (chess.turn === W) {
      timerWhite = Math.max(0, timerWhite - 1);
      if (timerWhite <= 10 && timerWhite > 0) SFX.lowtime();
      if (timerWhite === 0) { stopTimerTick(); triggerTimeout(W); return; }
    } else {
      timerBlack = Math.max(0, timerBlack - 1);
      if (timerBlack <= 10 && timerBlack > 0) SFX.lowtime();
      if (timerBlack === 0) { stopTimerTick(); triggerTimeout(B); return; }
    }
    renderClocks();
  }, 1000);
}

function stopTimerTick() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function triggerTimeout(loser) {
  const winner = loser === W ? B : W;
  burst(3, 3, [0xffd700, 0xff8800, 0xffffff, 0xff4444]);
  ui.goTitle.textContent = "TIME'S UP!";
  ui.goSub.textContent   = `${winner === W ? 'WHITE' : 'BLACK'} WINS ON TIME`;
  ui.go.classList.add('on');
  SFX.timeout();
  if (winner === myColor) setTimeout(SFX.win, 600);
  else setTimeout(SFX.lose, 600);
}

function formatTime(secs) {
  if (!timerTotal) return '--:--';
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderClocks() {
  const clockW  = document.getElementById('clock-w');
  const clockB  = document.getElementById('clock-b');
  const dispW   = document.getElementById('timer-w');
  const dispB   = document.getElementById('timer-b');
  if (!clockW || !clockB || !dispW || !dispB) return;

  dispW.textContent = formatTime(timerWhite);
  dispB.textContent = formatTime(timerBlack);

  const hasClock = !!timerTotal;
  clockW.classList.toggle('active', hasClock && chess.turn === W);
  clockB.classList.toggle('active', hasClock && chess.turn === B);
  clockW.classList.toggle('low',  hasClock && timerWhite <= 30 && timerWhite > 10);
  clockB.classList.toggle('low',  hasClock && timerBlack <= 30 && timerBlack > 10);
  clockW.classList.toggle('crit', hasClock && timerWhite <= 10 && timerWhite > 0);
  clockB.classList.toggle('crit', hasClock && timerBlack <= 10 && timerBlack > 0);
}

