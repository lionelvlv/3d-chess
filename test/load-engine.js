// engine.js is a classic browser script (no exports), so load it into a VM
// context and pull the Chess class out of it.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${src}\nthis.Chess = Chess;`, ctx);

const HOME = { // squares a piece starts on; anything else counts as "has moved"
  K: ['e1'], k: ['e8'], R: ['a1', 'h1'], r: ['a8', 'h8'],
};

// Build a fresh Chess instance from a FEN string (board, side, castling, ep).
function fromFEN(fen) {
  const [placement, side, castling, ep] = fen.split(' ');
  const bd = Array.from({ length: 8 }, () => Array(8).fill(null));
  placement.split('/').forEach((row, i) => {
    const r = 7 - i;
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += Number(ch); continue; }
      const sq = 'abcdefgh'[f] + (r + 1);
      const home = HOME[ch];
      bd[r][f] = { t: ch.toLowerCase(), c: ch === ch.toUpperCase() ? 'w' : 'b', m: home && home.includes(sq) ? 0 : 1 };
      f++;
    }
  });
  // Rooks / kings whose castling right is gone count as moved.
  const lose = (r, f) => { if (bd[r][f]) bd[r][f].m = 1; };
  if (!castling.includes('K')) lose(0, 7);
  if (!castling.includes('Q')) lose(0, 0);
  if (!castling.includes('k')) lose(7, 7);
  if (!castling.includes('q')) lose(7, 0);

  const g = new ctx.Chess();
  g.loadPosition(bd);
  g.turn = side;
  g.ep = ep === '-' ? null : { r: Number(ep[1]) - 1, f: ep.charCodeAt(0) - 97 };
  return g;
}

module.exports = { Chess: ctx.Chess, fromFEN };
