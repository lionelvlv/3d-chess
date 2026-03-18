//  11. GAME CONTROLLER
// ═══════════════════════════════════════════

let chess = new Chess();
let mode     = null;   // 'ai' | 'online' | 'local'
let myColor  = W;
let aiDiff   = 1;

// Selection + move state
let selSq         = null;  // { r, f } of selected square
let legalMoveCache = [];   // legal moves for selected piece
let lastFr        = null;  // last move from
let lastTo        = null;  // last move to

// Flags
let isBusy    = false; // animation in progress
let isAiThinking = false;
let pendingPromo  = null; // { fr, to } awaiting promotion choice
let captureLog    = { w:[], b:[] }; // captured piece types per side

const PIECE_NAMES = { p:'PAWN', r:'ROOK', n:'KNIGHT', b:'BISHOP', q:'QUEEN', k:'KING' };
const CAPTURE_VALUES = { p:1, n:3, b:3, r:5, q:9 };
const DIFF_NAMES = { 1:'ELO 1200', 2:'ELO 1700', 3:'FULL STR' };

// Cache all the DOM refs we touch repeatedly
const ui = {
  landing:   document.getElementById('landing'),
  hud:       document.getElementById('hud'),
  go:        document.getElementById('gameover'),
  promo:     document.getElementById('promo'),
  turn:      document.getElementById('turn-pill'),
  statusTxt: document.getElementById('status-txt'),
  selLabel:  document.getElementById('sel-label'),
  goTitle:   document.getElementById('go-title'),
  goSub:     document.getElementById('go-sub'),
  modeTag:   document.getElementById('mode-tag'),
  capTray:   document.getElementById('cap-tray'),
  chkFlash:  document.getElementById('chkflash'),
};

function startGame(m, col, diff, timerSeconds = 0) {
  mode    = m;
  myColor = col;
  aiDiff  = diff || 1;

  chess.reset();
  syncBoardToScene(chess, /* rainEffect */ true);
  setTimeout(orientAllKnights, 800);

  clearHighlights();
  removeSelectionRing();
  selSq          = null;
  legalMoveCache = [];
  lastFr = lastTo = null;
  isBusy    = false;
  isAiThinking = false;
  captureLog    = { w:[], b:[] };
  selectedRow = selectedFile = -1;
  stopKingPulse();
  stopTimerTick();
  resetHistoryPanel();

  ui.landing.style.display = 'none';
  ui.hud.classList.add('on');
  ui.go.classList.remove('on');
  ui.statusTxt.classList.remove('on');
  ui.selLabel.textContent = '';

  ui.modeTag.textContent = m === 'online'
    ? 'ONLINE 1v1'
    : `VS AI ${DIFF_NAMES[aiDiff]}`;

  // Face the board toward the player
  camera.position.set(0, 10, col === B ? -9.5 : 9.5);
  controls.target.set(0, 0, 0);
  controls.update();

  initTimer(timerSeconds);
  startTimerTick();
  refreshHUD();
  updateSfTag();

  // If AI goes first (player chose black)
  if (m === 'ai' && chess.turn !== myColor) setTimeout(runAi, 1200);
}

function refreshHUD() {
  const name = chess.turn === W ? 'WHITE' : 'BLACK';
  if (isAiThinking) {
    ui.turn.innerHTML = `<span style="color:#ffd700">THINKING...</span>`;
  } else {
    ui.turn.textContent = `${name}'S TURN`;
  }
  // Captured piece icons
  const icons  = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' };
  const whiteCaptures = captureLog.w.map(t => icons[t]).join('');
  const blackCaptures = captureLog.b.map(t => icons[t]).join('');
  ui.capTray.textContent = (whiteCaptures || blackCaptures)
    ? `${blackCaptures} ${whiteCaptures}` : '';
  renderClocks();
}

function showCheckEffect() {
  // Re-trigger animation by removing class, forcing reflow, then re-adding
  ui.statusTxt.classList.remove('on');
  void ui.statusTxt.offsetWidth;
  ui.statusTxt.classList.add('on');
  ui.chkFlash.classList.remove('on');
  void ui.chkFlash.offsetWidth;
  ui.chkFlash.classList.add('on');
  setTimeout(() => ui.statusTxt.classList.remove('on'), 1800);
}

function runAi() {
  if (chess.turn === myColor) return;
  if (chess.status === 'checkmate' || chess.status === 'stalemate') return;
  isAiThinking = true;
  refreshHUD();
  // pickAiMove returns a Promise (Stockfish async or instant minimax fallback)
  pickAiMove(chess, aiDiff).then(mv => {
    isAiThinking = false;
    if (mv) doExecute(mv.fr, mv.to, mv.prom || 'q');
    else refreshHUD();
  });
}

// Commit a move: update engine, animate piece, handle side effects
function doExecute(fr, to, prom, fromNetwork = false) {
  if (isBusy) return;

  // Read the moving piece BEFORE calling chess.move() — it clears the fr square
  const movingPiece = chess.at(fr.r, fr.f);
  if (!movingPiece) return;

  const result = chess.move(fr, to, prom);
  if (!result) return;

  const { mv, cap, status } = result;
  const movedColor           = chess.turn === W ? B : W; // turn already flipped

  // Record move in history — pass piece data we captured before the move
  pushMoveHistory(mv, cap, status, prom, movedColor, movingPiece.t);

  // Relay move to opponent if we made it locally
  if (!fromNetwork && conn && mode === 'online') {
    conn.send({ type:'move', fr, to, prom });
  }

  // Ghost trail: show translucent origin ghost on AI and opponent moves
  const isOpponentMove = fromNetwork || (mode === 'ai' && movedColor !== myColor);
  if (isOpponentMove) spawnGhostTrail(movingPiece.t, movedColor, fr.r, fr.f);

  // Handle captures
  if (cap) {
    despawnPiece(to.r, to.f);
    burst(to.r, to.f, movedColor === W
      ? [0xffd700, 0xffeedd, 0xffaa44]
      : [0xff44aa, 0xaa22ff, 0xff2266]);
    captureLog[cap.c === W ? 'b' : 'w'].push(cap.t);
    const val = CAPTURE_VALUES[cap.t];
    if (val) floatScore(to.r, to.f, `+${val}`, 'cap');
    SFX.capture();
    screenShake();
  } else if (mv.sp === 'cK' || mv.sp === 'cQ') {
    SFX.castle();
  } else {
    SFX.move();
  }

  // Handle rook movement for castling animation
  if (mv.sp === 'cK') animateMove(fr.r, 7, fr.r, 5);
  else if (mv.sp === 'cQ') animateMove(fr.r, 0, fr.r, 3);

  // En passant captured pawn cleanup
  if (mv.sp === 'ep') {
    const capturedColor = chess.turn === W ? B : W;
    const epRow         = capturedColor === W ? to.r-1 : to.r+1;
    const epData        = despawnPiece(epRow, to.f);
    if (epData) {
      burst(epRow, to.f, [0xff6600, 0xffcc00]);
      captureLog[epData.c === W ? 'b' : 'w'].push(epData.t);
    }
  }

  // Animate the main piece, then resolve post-move state
  isBusy = true;
  animateMove(fr.r, fr.f, to.r, to.f, () => {
    isBusy = false;

    // Pawn promotion: replace pawn with new piece
    if (mv.sp === 'prom') {
      const pc = chess.bd[to.r][to.f];
      despawnPiece(to.r, to.f);
      spawnPiece(prom, pc.c, to.r, to.f);
      burst(to.r, to.f, [0xffd700, 0xffaa00, 0xff6600, 0xffffff]);
      floatScore(to.r, to.f, 'PROMO!', 'prm');
      SFX.promote();
    }

    lastFr         = { r:fr.r, f:fr.f };
    lastTo         = { r:to.r, f:to.f };
    selSq          = null;
    legalMoveCache = [];
    selectedRow    = selectedFile = -1;
    removeSelectionRing();
    ui.selLabel.textContent = '';
    orientAllKnights();
    refreshHighlights();
    refreshHUD();

    // End-game states
    if (status === 'checkmate' || status === 'stalemate') {
      stopTimerTick();
      burst(to.r, to.f, [0xffd700, 0xff8800, 0xffffff, 0xff44ff]);
      setTimeout(() => {
        const winner = chess.turn === W ? B : W;
        ui.goTitle.textContent = status === 'checkmate' ? 'CHECKMATE!' : 'STALEMATE';
        ui.goSub.textContent   = status === 'checkmate'
          ? `${winner === W ? 'WHITE' : 'BLACK'} WINS`
          : "IT'S A DRAW";
        ui.go.classList.add('on');
        if (status === 'checkmate') {
          if (winner === myColor) SFX.win(); else SFX.lose();
        }
      }, 1200);

    } else if (status === 'check') {
      const k = chess._findKing(chess.turn);
      if (k) {
        startKingPulse(k.r, k.f);
        burst(k.r, k.f, [0xff2244, 0xff6644, 0xffaa44]);
        SFX.check();
        showCheckEffect();
      }
    } else {
      stopKingPulse();
      ui.statusTxt.classList.remove('on');
    }

    // Queue AI move if it's the AI's turn
    if (mode === 'ai' && chess.turn !== myColor && (status === 'playing' || status === 'check'))
      setTimeout(runAi, 660);
  });
}

// Handle a click/tap on the board
function handleSquareClick(r, f) {
  if (isBusy || isAiThinking) return;
  if (chess.status === 'checkmate' || chess.status === 'stalemate') return;
  if (mode === 'ai'     && chess.turn !== myColor) return;
  if (mode === 'online' && chess.turn !== myColor) return;

  const piece = chess.at(r, f);

  if (selSq) {
    // Something is already selected — check if this is a valid target
    const move = legalMoveCache.find(m => m.to.r === r && m.to.f === f);

    if (move) {
      selSq = null; selectedRow = selectedFile = -1;
      removeSelectionRing();
      ui.selLabel.textContent = '';
      // Pawn promotion: show picker first
      if (move.sp === 'prom') {
        pendingPromo = { fr: move.fr, to: move.to };
        showPromoPickerFor(chess.turn);
        return;
      }
      doExecute(move.fr, move.to, 'q');

    } else if (piece && piece.c === chess.turn) {
      // Clicked a friendly piece — reselect it
      selSq          = { r, f };
      selectedRow    = r; selectedFile = f;
      legalMoveCache = chess.legal(r, f);
      showSelectionRing(r, f);
      ui.selLabel.textContent = `${piece.c === W ? 'WHITE' : 'BLACK'} ${PIECE_NAMES[piece.t]}`;
      SFX.select();
      refreshHighlights();

    } else {
      // Clicked empty/enemy with no move — deselect
      selSq          = null; selectedRow = selectedFile = -1;
      removeSelectionRing();
      legalMoveCache = [];
      ui.selLabel.textContent = '';
      refreshHighlights();
    }

  } else if (piece && piece.c === chess.turn) {
    // Nothing selected — select this piece
    selSq          = { r, f };
    selectedRow    = r; selectedFile = f;
    legalMoveCache = chess.legal(r, f);
    showSelectionRing(r, f);
    ui.selLabel.textContent = `${piece.c === W ? 'WHITE' : 'BLACK'} ${PIECE_NAMES[piece.t]}`;
    SFX.select();
    refreshHighlights();
  }
}

function showPromoPickerFor(color) {
  ui.promo.classList.add('on');
  const symbols = {
    w: { q:'♕', r:'♖', b:'♗', n:'♘' },
    b: { q:'♛', r:'♜', b:'♝', n:'♞' },
  };
  ui.promo.querySelectorAll('.pbtn').forEach(btn => {
    btn.textContent = symbols[color][btn.dataset.p];
  });
}

