//  2. AI — Stockfish engine via UCI + Web Worker
//
//  Stockfish replaces the old alpha-beta search.
//  Communication: FEN → UCI → bestmove → our move format.
//
//  Difficulty mapping:
//    1 (Easy)   → Skill Level 3,  ELO ~1200, depth 6
//    2 (Medium) → Skill Level 10, ELO ~1700, depth 10
//    3 (Hard)   → Skill Level 20, full strength, depth 15
//
//  Fallback: if Stockfish fails to load (file://, CSP, etc.)
//  we fall back to a fixed-depth minimax so the game never breaks.
// ═══════════════════════════════════════════

// ── Stockfish Worker setup ──────────────────
let stockfish     = null;
let sfReady       = false;
let sfCallback    = null; // resolved when bestmove arrives
let useStockfish  = true; // toggled by engine buttons in AI expand-row

const SF_SKILL = { 1: 3, 2: 10, 3: 20 };
const SF_ELO   = { 1: 1200, 2: 1700, 3: 3200 };
const SF_DEPTH = { 1: 6,    2: 10,   3: 15   };

function initStockfish() {
  // fetch → blob → Worker: bypasses COEP on GitHub Pages.
  // On file:// fetch will fail and minimax takes over silently.
  const SF_URL = 'https://unpkg.com/stockfish.js@10.0.2/stockfish.js';

  fetch(SF_URL)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      try {
        stockfish = new Worker(blobUrl);
        stockfish.onmessage = e => handleStockfishMessage(e.data);
        stockfish.onerror   = err => {
          console.warn('[Chess Arcade] Stockfish Worker error:', err.message || err);
          stockfish = null; sfReady = false;
          URL.revokeObjectURL(blobUrl);
          updateSfTag();
        };
        stockfish.postMessage('uci');
        console.info('[Chess Arcade] Stockfish Worker created, waiting for uciok...');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } catch(e) {
        console.warn('[Chess Arcade] Worker() failed:', e.message);
        URL.revokeObjectURL(blobUrl);
        stockfish = null;
      }
    })
    .catch(() => {
      // file:// or network error — minimax will be used instead
      stockfish = null;
    });
}


function handleStockfishMessage(line) {
  if (line === 'uciok') {
    console.info('[Chess Arcade] Stockfish: uciok received, sending isready...');
    stockfish.postMessage('isready');
  } else if (line === 'readyok') {
    console.info('[Chess Arcade] Stockfish: readyok — engine fully loaded and ready.');
    sfReady = true;
    updateSfTag();
  } else if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    const move  = parts[1];
    if (sfCallback && move && move !== '(none)') {
      sfCallback(move);
    } else if (sfCallback) {
      sfCallback(null);
    }
    sfCallback = null;
  }
}

// Show/hide the engine status badge in the HUD.
// Only meaningful during an AI game. updateSfTag() is called:
//   - from handleStockfishMessage('readyok') — engine loaded
//   - from startGame/startGameWithCustomBoard — game mode is now known
// The readyok call fires before mode is set, so mode guards live here.
function updateSfTag() {
  const tag = document.getElementById('sf-tag');
  if (!tag) return;
  if (mode !== 'ai') { tag.style.display = 'none'; return; }
  tag.style.display = '';
  if (useStockfish && stockfish && sfReady) {
    tag.textContent = '● STOCKFISH';
    tag.className   = 'info-tag sf-on';
  } else if (!useStockfish) {
    tag.textContent = '● MINIMAX';
    tag.className   = 'info-tag sf-off';
  } else {
    // Stockfish selected but not ready yet / failed
    tag.textContent = '● MINIMAX';
    tag.className   = 'info-tag sf-off';
  }
}

// Configure Stockfish skill for the chosen difficulty.
// stockfish.js@10 only supports "Skill Level" (0-20).
// UCI_LimitStrength / UCI_Elo are not supported in this build — sending them
// causes the engine to ignore all options and play at full strength regardless.
function configureStockfish(difficulty) {
  const skill = SF_SKILL[difficulty];
  stockfish.postMessage(`setoption name Skill Level value ${skill}`);
}

// ── FEN serialiser ──────────────────────────
// Converts our internal board state → standard FEN string.
// Stockfish speaks FEN; this is the bridge.
function boardToFEN(ch) {
  const pieceChar = { p:'p', r:'r', n:'n', b:'b', q:'q', k:'k' };
  let fen = '';

  // Piece placement — rank 8 (row 7) down to rank 1 (row 0)
  // Our board: row 0 = rank 1 (white back rank), row 7 = rank 8 (black back rank)
  for (let rank = 7; rank >= 0; rank--) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = ch.bd[rank][file];
      if (!p) {
        empty++;
      } else {
        if (empty) { fen += empty; empty = 0; }
        const ch2 = pieceChar[p.t];
        fen += p.c === W ? ch2.toUpperCase() : ch2;
      }
    }
    if (empty) fen += empty;
    if (rank > 0) fen += '/';
  }

  // Active color
  fen += ' ' + ch.turn;

  // Castling availability
  let castling = '';
  if (ch.cr.w.k) castling += 'K';
  if (ch.cr.w.q) castling += 'Q';
  if (ch.cr.b.k) castling += 'k';
  if (ch.cr.b.q) castling += 'q';
  fen += ' ' + (castling || '-');

  // En passant target square
  if (ch.ep) {
    const file = 'abcdefgh'[ch.ep.f];
    const rank = ch.ep.r + 1;
    fen += ` ${file}${rank}`;
  } else {
    fen += ' -';
  }

  // Halfmove clock and fullmove number (we don't track these precisely, defaults are fine)
  fen += ' 0 1';

  return fen;
}

// ── UCI move → our internal format ─────────
// Stockfish returns "e2e4" or "e7e8q" (promotion).
// We convert to { fr:{r,f}, to:{r,f}, prom } matching our chess engine.
function uciMoveToInternal(uciMove) {
  const fileIdx = c => c.charCodeAt(0) - 97; // 'a'=0
  const rankIdx = c => parseInt(c) - 1;      // '1'=0

  const fr   = { r: rankIdx(uciMove[1]), f: fileIdx(uciMove[0]) };
  const to   = { r: rankIdx(uciMove[3]), f: fileIdx(uciMove[2]) };
  const prom = uciMove[4] || 'q'; // promotion piece, default queen

  return { fr, to, prom };
}

// ── Main AI entry point ─────────────────────
// Returns a Promise that resolves to { fr, to, prom } or null.
// Tries Stockfish first; falls back to minimax if unavailable.
function pickAiMove(liveChess, difficulty) {
  return new Promise(resolve => {
    if (useStockfish && stockfish && sfReady) {
      pickAiMoveStockfish(liveChess, difficulty, resolve);
    } else {
      resolve(pickAiMoveMinimax(liveChess, difficulty));
    }
  });
}

function pickAiMoveStockfish(liveChess, difficulty, resolve) {
  const fen   = boardToFEN(liveChess);
  const depth = SF_DEPTH[difficulty];

  configureStockfish(difficulty);
  stockfish.postMessage('ucinewgame');
  stockfish.postMessage(`position fen ${fen}`);

  // Timeout safety — if Stockfish hangs, fall back
  const timeout = setTimeout(() => {
    sfCallback = null;
    resolve(pickAiMoveMinimax(liveChess, difficulty));
  }, 4000);

  sfCallback = uciStr => {
    clearTimeout(timeout);
    if (uciStr) {
      const mv = uciMoveToInternal(uciStr);
      // Validate the move exists in our engine (sanity check)
      const legal = liveChess.legal(mv.fr.r, mv.fr.f);
      const found = legal.find(m => m.to.r === mv.to.r && m.to.f === mv.to.f);
      if (found) resolve(mv);
      else resolve(pickAiMoveMinimax(liveChess, difficulty));
    } else {
      resolve(pickAiMoveMinimax(liveChess, difficulty));
    }
  };

  stockfish.postMessage(`go depth ${depth}`);
}

// ── Fallback minimax (alpha-beta, depth 1-3) ─
// Used when Stockfish is unavailable (file://, CSP, old browsers).
// Also used as a sanity fallback when Stockfish returns an illegal move.

const PIECE_VALUE = { p:100, n:320, b:330, r:500, q:900, k:20000 };
const PST_PAWN    = [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]];
const PST_KNIGHT  = [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]];

function evalBoard(ch) {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = ch.bd[r][f];
      if (!p) continue;
      let v    = PIECE_VALUE[p.t] || 0;
      const pr = p.c === W ? r : 7-r;
      if (p.t === PT.P) v += PST_PAWN[pr][f];
      if (p.t === PT.N) v += PST_KNIGHT[pr][f];
      score += p.c === B ? v : -v;
    }
  return score;
}

function alphaBeta(ch, depth, alpha, beta, isMaximizing) {
  if (ch.status === 'checkmate') return isMaximizing ? -1e6 : 1e6;
  if (ch.status === 'stalemate') return 0;
  if (depth === 0) return evalBoard(ch);
  const moves = ch.allLegal();
  if (!moves.length) return evalBoard(ch);
  moves.sort((a, b) => (ch.bd[b.to.r][b.to.f] ? 1 : 0) - (ch.bd[a.to.r][a.to.f] ? 1 : 0));
  if (isMaximizing) {
    let best = -Infinity;
    for (const mv of moves) {
      const u = ch._apply(mv); ch.turn = ch.turn===W?B:W; ch._updateStatus();
      const sc = alphaBeta(ch, depth-1, alpha, beta, false);
      ch.turn = ch.turn===W?B:W; ch._undo(u); ch._updateStatus();
      best = Math.max(best, sc); alpha = Math.max(alpha, sc);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const mv of moves) {
      const u = ch._apply(mv); ch.turn = ch.turn===W?B:W; ch._updateStatus();
      const sc = alphaBeta(ch, depth-1, alpha, beta, true);
      ch.turn = ch.turn===W?B:W; ch._undo(u); ch._updateStatus();
      best = Math.min(best, sc); beta = Math.min(beta, sc);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function pickAiMoveMinimax(liveChess, difficulty) {
  const ch = new Chess();
  ch.bd     = liveChess.bd.map(row => row.map(p => p ? {...p} : null));
  ch.turn   = liveChess.turn;
  ch.ep     = liveChess.ep ? {...liveChess.ep} : null;
  ch.cr     = JSON.parse(JSON.stringify(liveChess.cr));
  ch.status = liveChess.status;

  const moves = ch.allLegal();
  if (!moves.length) return null;

  // Easy: 1-ply evaluation, pick randomly from top pool
  // FIX: cap poolSize to actual moves.length to prevent out-of-bounds crash
  if (difficulty === 1) {
    const isBlack = ch.turn === B;
    const scored  = moves.map(mv => {
      const u = ch._apply(mv); ch.turn = ch.turn===W?B:W;
      const sc = evalBoard(ch);
      ch.turn = ch.turn===W?B:W; ch._undo(u);
      return { mv, sc };
    });
    // Black wants lowest score, White wants highest
    scored.sort((a, b) => isBlack ? a.sc - b.sc : b.sc - a.sc);
    const poolSize = Math.min(Math.max(1, Math.floor(scored.length * .45)), scored.length);
    return scored[Math.floor(Math.random() * poolSize)].mv;
  }

  const depth = difficulty === 2 ? 2 : 3;
  const isMaximizing = ch.turn === B; // Black maximizes in our eval (positive = good for black)
  moves.sort((a, b) => (ch.bd[b.to.r][b.to.f]?1:0) - (ch.bd[a.to.r][a.to.f]?1:0));

  let bestMove  = null;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const mv of moves) {
    const u = ch._apply(mv); ch.turn = ch.turn===W?B:W; ch._updateStatus();
    const sc = alphaBeta(ch, depth-1, -Infinity, Infinity, !isMaximizing);
    ch.turn = ch.turn===W?B:W; ch._undo(u); ch._updateStatus();
    if (isMaximizing ? sc > bestScore : sc < bestScore) {
      bestScore = sc; bestMove = mv;
    }
  }
  return bestMove;
}

