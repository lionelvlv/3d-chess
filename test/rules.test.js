const test = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('./load-engine');

// Custom setup mode (js/setup.js) places every piece with m: 0, so the
// engine must not treat "never moved" as "can castle" off the home squares.
function setupBoard(pieces) {
  const bd = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [sq, t, c] of pieces) bd[Number(sq[1]) - 1][sq.charCodeAt(0) - 97] = { t, c, m: 0 };
  return bd;
}
const sq = ({ r, f }) => 'abcdefgh'[f] + (r + 1);

test('setup mode: king off its home square cannot castle', () => {
  const g = new Chess();
  g.loadPosition(setupBoard([['d1', 'k', 'w'], ['h1', 'r', 'w'], ['e8', 'k', 'b']]));
  const kingMoves = g.legal(0, 3).map(m => sq(m.to));
  assert.ok(!kingMoves.includes('g1'), `king on d1 offered ${kingMoves}`);
});

test('setup mode: king cannot castle with an enemy rook', () => {
  const g = new Chess();
  g.loadPosition(setupBoard([['e1', 'k', 'w'], ['h1', 'r', 'b'], ['a8', 'k', 'b']]));
  assert.ok(!g.legal(0, 4).some(m => m.sp === 'cK'));
});

test('setup mode: castling still works from the real home squares', () => {
  const g = new Chess();
  g.loadPosition(setupBoard([['e1', 'k', 'w'], ['h1', 'r', 'w'], ['a1', 'r', 'w'], ['e8', 'k', 'b']]));
  const sps = g.legal(0, 4).map(m => m.sp);
  assert.ok(sps.includes('cK') && sps.includes('cQ'));
});

test('fool\'s mate is detected as checkmate', () => {
  const g = new Chess();
  const play = (a, b) => g.move({ r: +a[1] - 1, f: a.charCodeAt(0) - 97 }, { r: +b[1] - 1, f: b.charCodeAt(0) - 97 });
  play('f2', 'f3'); play('e7', 'e5'); play('g2', 'g4');
  assert.equal(play('d8', 'h4').status, 'checkmate');
});

test('illegal moves are rejected and do not change the turn', () => {
  const g = new Chess();
  assert.equal(g.move({ r: 1, f: 4 }, { r: 4, f: 4 }), null); // e2-e5
  assert.equal(g.turn, 'w');
});

test('pawn promotes to the chosen piece', () => {
  const g = new Chess();
  g.loadPosition(setupBoard([['a7', 'p', 'w'], ['e1', 'k', 'w'], ['h8', 'k', 'b']]));
  g.bd[6][0].m = 1;
  assert.equal(g.move({ r: 6, f: 0 }, { r: 7, f: 0 }, 'n').mv.sp, 'prom');
  assert.equal(g.bd[7][0].t, 'n');
});
