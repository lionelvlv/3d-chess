//  11c. MOVE HISTORY — algebraic notation log
//
//  Generates standard short algebraic notation (SAN-lite).
//  Pairs moves into rows (white + black per turn number).
//  Works for both local and multiplayer — doExecute calls
//  pushMoveHistory() after every committed move regardless of source.
// ═══════════════════════════════════════════

let moveHistory     = [];   // flat list of notation strings
let historyVisible  = false;

const FILE_NAMES = ['a','b','c','d','e','f','g','h'];
const PIECE_SAN  = { p:'', r:'R', n:'N', b:'B', q:'Q', k:'K' };

// Build readable short algebraic notation for a move.
// pieceType is the type of the piece that moved (read before chess.move() clears the square).
// Called AFTER chess.move() so status reflects the resulting position.
function buildNotation(mv, cap, status, prom, pieceType) {
  const { fr, to, sp } = mv;

  if (sp === 'cK') return 'O-O';
  if (sp === 'cQ') return 'O-O-O';

  const piece    = PIECE_SAN[pieceType] ?? '';
  const toFile   = FILE_NAMES[to.f];
  const toRank   = to.r + 1;
  const capture  = (cap || sp === 'ep') ? 'x' : '';
  // Pawns include origin file on captures
  const fromHint = (!piece && capture) ? FILE_NAMES[fr.f] : '';
  const promSuf  = sp === 'prom' ? `=${(prom || 'q').toUpperCase()}` : '';
  const checkSuf = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';

  return `${piece}${fromHint}${capture}${toFile}${toRank}${promSuf}${checkSuf}`;
}

function pushMoveHistory(mv, cap, status, prom, movedColor, pieceType) {
  const notation = buildNotation(mv, cap, status, prom, pieceType);
  moveHistory.push({ notation, color: movedColor });
  renderMoveHistory();
}

function clearMoveHistory() {
  moveHistory = [];
  const list = document.getElementById('history-list');
  if (list) list.innerHTML = '';
}

function renderMoveHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  // Build rows: pair white + black moves together
  const rows = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    rows.push({
      num:   Math.floor(i / 2) + 1,
      white: moveHistory[i]?.notation   || '',
      black: moveHistory[i+1]?.notation || '',
    });
  }

  list.innerHTML = rows.map((row, idx) => {
    const isLatest = idx === rows.length - 1;
    return `<div class="hist-row${isLatest ? ' latest' : ''}">
      <span class="hist-num">${row.num}.</span>
      <span class="hist-w">${row.white}</span>
      <span class="hist-b">${row.black}</span>
    </div>`;
  }).join('');

  // Auto-scroll to bottom
  list.scrollTop = list.scrollHeight;
}

function toggleHistoryPanel() {
  historyVisible = !historyVisible;
  document.getElementById('history-panel').classList.toggle('open', historyVisible);
  document.getElementById('btn-history').classList.toggle('active', historyVisible);
}

function resetHistoryPanel() {
  historyVisible = false;
  document.getElementById('history-panel').classList.remove('open');
  document.getElementById('btn-history').classList.remove('active');
  clearMoveHistory();
}

