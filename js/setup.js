//  11b. SETUP MODE — pre-game board editor
//
//  Flow (Online):
//    Online 1v1 → "Create Room — Custom Setup"
//    → setupEnter('online') → edit board
//    → "Create Room" button → createRoom() with pendingCustomBoard set
//    → waiting screen with code → opponent joins → both load custom board
//
//  Flow (AI):
//    "Custom Setup" via AI menu or direct call
//    → setupEnter('ai') → edit board → "Start Game" → immediate start
//
//  Validation:
//    - Exactly one king per side required
//    - Neither king may be in check in the starting position
//    - Pawns may not be placed on rank 1 or rank 8 (promotion rows)
// ═══════════════════════════════════════════

let setupBoard   = null;
let setupHeld    = null;    // { t, c } currently held piece chip, or null
let setupErasing = false;
let inSetupMode  = false;

// Config saved when entering setup, used when game starts
let pendingSetupMode   = null;   // 'ai' | 'online'
let pendingSetupColor  = W;
let pendingSetupDiff   = 1;
let pendingSetupTimer  = 0;
let pendingCustomBoard = null;   // non-null = host has a custom board to send

const PIECE_SYMBOLS = {
  w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
  b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' },
};

// Enter setup mode. gameMode='online' changes button label to "Create Room".
function setupEnter(gameMode, col, diff, timerSecs) {
  inSetupMode       = true;
  pendingSetupMode  = gameMode;
  pendingSetupColor = col;
  pendingSetupDiff  = diff;
  pendingSetupTimer = timerSecs;
  setupHeld         = null;
  setupErasing      = false;

  // Start from standard position
  const fresh = new Chess();
  setupBoard = fresh.bd.map(row => row.map(p => p ? {...p} : null));

  // Hide all other UI, show the 3D board bare
  ui.landing.style.display = 'none';
  document.getElementById('online-overlay').classList.remove('on');
  ui.hud.classList.remove('on');
  ui.go.classList.remove('on');

  // Render the setup board in 3D
  const tempCh = new Chess();
  tempCh.bd = setupBoard;
  syncBoardToScene(tempCh);
  orientAllKnights();

  camera.position.set(0, 10, col === B ? -9.5 : 9.5);
  controls.target.set(0, 0, 0);
  controls.update();

  // Set action button label based on context
  const startBtn = document.getElementById('setup-start-btn');
  if (gameMode === 'online') {
    startBtn.textContent = 'Create Room';
  } else {
    startBtn.textContent = 'Start Game';
  }

  document.getElementById('setup-overlay').classList.add('on');
  updateSetupCursor();
  updateSetupStatus();
}

function setupExit() {
  inSetupMode  = false;
  setupHeld    = null;
  setupErasing = false;
  setupBoard   = null;
  document.getElementById('setup-overlay').classList.remove('on');
  document.getElementById('setup-cursor').style.display = 'none';
  document.querySelectorAll('.pchip').forEach(c => c.classList.remove('active'));
  document.getElementById('setup-erase').classList.remove('active');

  // Restore the standard board view
  syncBoardToScene(chess);

  // Return to the right place based on where we came from
  ui.landing.style.display = 'flex';
  if (pendingSetupMode === 'online') {
    // Re-open the online expand-row so user can see their options
    document.getElementById('row-online').classList.add('open');
  }
}

// Tap a square during setup
function handleSetupClick(r, f) {
  if (setupErasing) {
    if (setupBoard[r][f]) {
      setupBoard[r][f] = null;
      despawnPiece(r, f);
    }
    updateSetupStatus();
    return;
  }
  if (setupHeld) {
    // Block pawns on rank 1 (row 0) and rank 8 (row 7) — illegal in chess
    if (setupHeld.t === PT.P && (r === 0 || r === 7)) {
      SFX.error();
      const stat = document.getElementById('setup-status');
      stat.textContent = 'Pawns cannot be on rank 1 or 8';
      stat.className   = 'err';
      return;
    }
    const existing = setupBoard[r][f];
    if (existing && existing.t === setupHeld.t && existing.c === setupHeld.c) {
      setupBoard[r][f] = null;
      despawnPiece(r, f);
    } else {
      if (existing) despawnPiece(r, f);
      setupBoard[r][f] = { t: setupHeld.t, c: setupHeld.c, m: 0 };
      spawnPiece(setupHeld.t, setupHeld.c, r, f);
    }
    updateSetupStatus();
    SFX.select();
    return;
  }
  // Nothing held — pick up existing piece
  const pc = setupBoard[r][f];
  if (pc) {
    setupHeld    = { t: pc.t, c: pc.c };
    setupErasing = false;
    updateSetupCursor();
    updatePaletteActiveState();
    SFX.select();
  }
}

document.addEventListener('mousemove', e => {
  const cur = document.getElementById('setup-cursor');
  if (!inSetupMode || !cur) return;
  cur.style.left = e.clientX + 'px';
  cur.style.top  = e.clientY + 'px';
});

function updateSetupCursor() {
  const cur = document.getElementById('setup-cursor');
  if (!cur) return;
  if (setupHeld && !setupErasing) {
    cur.textContent   = PIECE_SYMBOLS[setupHeld.c][setupHeld.t];
    cur.style.display = 'block';
  } else {
    cur.style.display = 'none';
  }
}

function updatePaletteActiveState() {
  document.querySelectorAll('.pchip[data-piece]').forEach(chip => {
    const match = setupHeld
      && chip.dataset.piece === setupHeld.t
      && chip.dataset.color === setupHeld.c;
    chip.classList.toggle('active', !!match);
  });
  document.getElementById('setup-erase').classList.toggle('active', setupErasing);
}

// Full validation with check detection using the engine's own inCheck().
// Returns { ok: bool, msg: string }
function setupValidateFull() {
  const wKings = countPieces(setupBoard, PT.K, W);
  const bKings = countPieces(setupBoard, PT.K, B);

  if (wKings === 0 && bKings === 0) return { ok: false, msg: 'Need both kings to start' };
  if (wKings === 0)  return { ok: false, msg: 'Missing white king' };
  if (bKings === 0)  return { ok: false, msg: 'Missing black king' };
  if (wKings > 1)    return { ok: false, msg: 'Only one white king allowed' };
  if (bKings > 1)    return { ok: false, msg: 'Only one black king allowed' };

  // Build probe instance for structural checks
  const probe = new Chess();
  probe.bd = setupBoard.map(row => row.map(p => p ? {...p} : null));
  probe.cr = { w:{ k:0, q:0 }, b:{ k:0, q:0 } };
  probe.ep = null;

  // Neither king may already be in check at start
  probe.turn = W;
  if (probe.inCheck(W)) return { ok: false, msg: 'White king is in check at start' };
  if (probe.inCheck(B)) return { ok: false, msg: 'Black king is in check at start' };

  // ── Checkmate-possible check ──────────────────────────────────
  // A position where one side has only a king and the other also only
  // has a king (KK) is a dead draw — checkmate is impossible.
  // More generally: bare king vs bare king, or KK+bishop/knight are
  // insufficient material. We check that at least one side has a piece
  // that can deliver check — i.e. something beyond just the king.
  // Simplest reliable rule: at least one non-king piece must exist,
  // AND white must have at least one legal move that doesn't immediately
  // leave the game in stalemate (the engine will handle that at play time).
  const allPieces = setupBoard.flat().filter(Boolean);
  const nonKings  = allPieces.filter(p => p.t !== PT.K);

  if (nonKings.length === 0) {
    return { ok: false, msg: 'King vs King — checkmate is impossible' };
  }

  // Check that white has at least one legal move (not already stalemate/checkmate)
  probe.turn = W;
  probe._updateStatus();
  if (probe.status === 'stalemate')  return { ok: false, msg: 'White is already in stalemate' };
  if (probe.status === 'checkmate')  return { ok: false, msg: 'White is already in checkmate' };

  const total = allPieces.length;
  return { ok: true, msg: `${total} piece${total !== 1 ? 's' : ''} — ready` };
}

function updateSetupStatus() {
  const stat  = document.getElementById('setup-status');
  const result = setupValidateFull();
  stat.textContent = result.msg;
  stat.className   = result.ok ? 'ok' : 'err';
}

function countPieces(bd, type, color) {
  let n = 0;
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = bd[r][f];
      if (p && p.t === type && p.c === color) n++;
    }
  return n;
}

// Called when the action button is pressed ("Start Game" or "Create Room")
function setupStart() {
  const result = setupValidateFull();
  if (!result.ok) {
    SFX.error();
    const stat = document.getElementById('setup-status');
    stat.className = 'err';
    stat.textContent = result.msg;
    // Brief visual shake on the bar
    const bar = document.getElementById('setup-bar');
    bar.style.animation = 'none'; void bar.offsetWidth;
    bar.style.animation = 'statusSlam 200ms ease';
    return;
  }

  SFX.btnStart();
  const bd = setupBoard.map(row => row.map(p => p ? {...p} : null));

  // Exit setup visuals
  inSetupMode = false;
  document.getElementById('setup-overlay').classList.remove('on');
  document.getElementById('setup-cursor').style.display = 'none';

  if (pendingSetupMode === 'online') {
    // Store the board and create the room — the board will be sent to guest on connect
    pendingCustomBoard = bd;
    createRoom();
  } else {
    startGameWithCustomBoard(pendingSetupMode, pendingSetupColor, pendingSetupDiff, pendingSetupTimer, bd);
  }
}

// Start game with a custom board loaded into the engine
function startGameWithCustomBoard(m, col, diff, timerSecs, bd) {
  mode    = m;
  myColor = col;
  aiDiff  = diff || 1;

  chess.loadPosition(bd);
  syncBoardToScene(chess, /* rain */ true);
  setTimeout(orientAllKnights, 800);

  clearHighlights();
  removeSelectionRing();
  selSq = null; legalMoveCache = []; lastFr = lastTo = null;
  isBusy = false; isAiThinking = false;
  captureLog = { w:[], b:[] };
  selectedRow = selectedFile = -1;
  stopKingPulse(); stopTimerTick();
  resetHistoryPanel();

  ui.landing.style.display = 'none';
  ui.hud.classList.add('on');
  ui.go.classList.remove('on');
  ui.statusTxt.classList.remove('on');
  ui.selLabel.textContent = '';

  ui.modeTag.textContent = m === 'online' ? 'CUSTOM ONLINE' : 'CUSTOM VS AI';

  camera.position.set(0, 10, col === B ? -9.5 : 9.5);
  controls.target.set(0, 0, 0); controls.update();

  initTimer(timerSecs); startTimerTick();
  refreshHUD(); updateSfTag();

  if (m === 'ai' && chess.turn !== myColor) setTimeout(runAi, 1200);
}

