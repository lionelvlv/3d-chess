// Perft: count every legal move sequence to a fixed depth and compare with
// published reference counts (https://www.chessprogramming.org/Perft_Results).
// Any bug in move generation, castling, en passant, promotion or pins shows up
// as a wrong count.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Chess, fromFEN } = require('./load-engine');

const PROMOS = ['q', 'r', 'b', 'n'];

function perft(g, depth) {
  if (depth === 0) return 1;
  let n = 0;
  for (const mv of g.allLegal()) {
    for (const prom of mv.sp === 'prom' ? PROMOS : ['q']) {
      const u = g._apply(mv, prom);
      g.turn = g.turn === 'w' ? 'b' : 'w';
      n += perft(g, depth - 1);
      g.turn = g.turn === 'w' ? 'b' : 'w';
      g._undo(u);
    }
  }
  return n;
}

const CASES = [
  { name: 'start position', g: () => new Chess(), counts: [20, 400, 8902, 197281] },
  { name: 'Kiwipete (castling, pins, en passant, promotions)',
    g: () => fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -'),
    counts: [48, 2039, 97862] },
  { name: 'position 3 (en passant discovered checks)',
    g: () => fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -'),
    counts: [14, 191, 2812, 43238] },
  { name: 'position 4 (promotions, castling out of check)',
    g: () => fromFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -'),
    counts: [6, 264, 9467] },
  { name: 'position 5',
    g: () => fromFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -'),
    counts: [44, 1486, 62379] },
];

for (const c of CASES) {
  c.counts.forEach((expected, i) => {
    test(`perft ${c.name}, depth ${i + 1} = ${expected}`, () => {
      assert.equal(perft(c.g(), i + 1), expected);
    });
  });
}
