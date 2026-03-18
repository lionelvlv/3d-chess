//  1. CHESS ENGINE
//  Self-contained rules engine.
//  Important: _apply/_undo are SEARCH-ONLY tools.
//  They never update this.status — that's move()'s job.
//  This keeps AI search from corrupting live game state.
// ═══════════════════════════════════════════

const W  = 'w';
const B  = 'b';
const PT = { P:'p', R:'r', N:'n', B:'b', Q:'q', K:'k' };

class Chess {
  constructor() { this.reset(); }

  reset() {
    this.bd     = this._buildStartPos();
    this.turn   = W;
    this.ep     = null;
    this.cr     = { w:{ k:1, q:1 }, b:{ k:1, q:1 } };
    this.hist   = [];
    this.status = 'playing';
  }

  _buildStartPos() {
    const b    = Array.from({ length:8 }, () => Array(8).fill(null));
    const back = [PT.R, PT.N, PT.B, PT.Q, PT.K, PT.B, PT.N, PT.R];
    for (let f = 0; f < 8; f++) {
      b[0][f] = { t:back[f], c:W, m:0 };
      b[1][f] = { t:PT.P,    c:W, m:0 };
      b[6][f] = { t:PT.P,    c:B, m:0 };
      b[7][f] = { t:back[f], c:B, m:0 };
    }
    return b;
  }

  at(r, f) {
    return (r >= 0 && r < 8 && f >= 0 && f < 8) ? this.bd[r][f] : null;
  }

  // Generate pseudo-legal moves (doesn't check for leaving king in check)
  _pseudo(r0, f0) {
    const pc = this.bd[r0][f0];
    if (!pc) return [];
    const mv  = [];
    const opp = pc.c === W ? B : W;

    const push = (r, f) => {
      if (r < 0 || r > 7 || f < 0 || f > 7) return;
      const target = this.bd[r][f];
      if (!target || target.c === opp) mv.push({ fr:{r:r0,f:f0}, to:{r,f}, sp:null });
    };

    const slide = (dr, df) => {
      let r = r0+dr, f = f0+df;
      while (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const target = this.bd[r][f];
        if (target) {
          if (target.c === opp) mv.push({ fr:{r:r0,f:f0}, to:{r,f}, sp:null });
          break;
        }
        mv.push({ fr:{r:r0,f:f0}, to:{r,f}, sp:null });
        r += dr; f += df;
      }
    };

    if (pc.t === PT.P) {
      const dir   = pc.c === W ? 1 : -1;
      const start = pc.c === W ? 1 : 6;
      const prRow = pc.c === W ? 7 : 0;
      const r1    = r0 + dir;
      // Single push
      if (r1 >= 0 && r1 < 8 && !this.bd[r1][f0]) {
        mv.push({ fr:{r:r0,f:f0}, to:{r:r1,f:f0}, sp: r1===prRow ? 'prom' : null });
        // Double push from start rank
        if (r0 === start && !this.bd[r0+2*dir][f0])
          mv.push({ fr:{r:r0,f:f0}, to:{r:r0+2*dir,f:f0}, sp:'dp' });
      }
      // Diagonal captures + en passant
      for (const df of [-1, 1]) {
        const rf = f0 + df;
        if (rf < 0 || rf > 7 || r1 < 0 || r1 > 7) continue;
        const target = this.bd[r1][rf];
        if (target && target.c === opp)
          mv.push({ fr:{r:r0,f:f0}, to:{r:r1,f:rf}, sp: r1===prRow ? 'prom' : null });
        if (this.ep && this.ep.r === r1 && this.ep.f === rf)
          mv.push({ fr:{r:r0,f:f0}, to:{r:r1,f:rf}, sp:'ep' });
      }

    } else if (pc.t === PT.N) {
      for (const [dr,df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        push(r0+dr, f0+df);

    } else if (pc.t === PT.B) {
      for (const [dr,df] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr,df);

    } else if (pc.t === PT.R) {
      for (const [dr,df] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,df);

    } else if (pc.t === PT.Q) {
      for (const [dr,df] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,df);

    } else if (pc.t === PT.K) {
      for (const [dr,df] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        push(r0+dr, f0+df);
      // Castling (only if king hasn't moved)
      if (!pc.m) {
        const rk = this.bd[r0][7];
        if (rk && rk.t === PT.R && !rk.m && !this.bd[r0][5] && !this.bd[r0][6])
          mv.push({ fr:{r:r0,f:f0}, to:{r:r0,f:6}, sp:'cK' });
        const rq = this.bd[r0][0];
        if (rq && rq.t === PT.R && !rq.m && !this.bd[r0][1] && !this.bd[r0][2] && !this.bd[r0][3])
          mv.push({ fr:{r:r0,f:f0}, to:{r:r0,f:2}, sp:'cQ' });
      }
    }

    return mv;
  }

  _findKing(color) {
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const p = this.bd[r][f];
        if (p && p.t === PT.K && p.c === color) return { r, f };
      }
    return null;
  }

  _isAttacked(r, f, byColor) {
    for (let r2 = 0; r2 < 8; r2++)
      for (let f2 = 0; f2 < 8; f2++) {
        const p = this.bd[r2][f2];
        if (!p || p.c !== byColor) continue;
        if (this._pseudo(r2, f2).some(m => m.to.r === r && m.to.f === f)) return true;
      }
    return false;
  }

  inCheck(color) {
    const k = this._findKing(color);
    return k ? this._isAttacked(k.r, k.f, color === W ? B : W) : false;
  }

  // Apply a move to the board — returns undo token.
  // NEVER calls _updateStatus. Use only inside legal() and AI search.
  _apply(mv, prom = 'q') {
    const { fr, to, sp } = mv;
    const pc  = this.bd[fr.r][fr.f];
    const cap = this.bd[to.r][to.f];

    const undo = {
      fr, to, sp,
      pc:  { ...pc },
      cap,
      ep:  this.ep,
      cr:  JSON.parse(JSON.stringify(this.cr)),
      epc: null,
    };

    this.bd[to.r][to.f]  = { ...pc, m:1 };
    this.bd[fr.r][fr.f]  = null;
    this.ep               = null;

    if (sp === 'dp')   this.ep = { r: fr.r + (pc.c === W ? 1 : -1), f: fr.f };
    else if (sp === 'ep') {
      const er = pc.c === W ? to.r-1 : to.r+1;
      undo.epc = { r:er, f:to.f, p: this.bd[er][to.f] };
      this.bd[er][to.f] = null;
    }
    else if (sp === 'prom') this.bd[to.r][to.f] = { t:prom, c:pc.c, m:1 };
    else if (sp === 'cK')  { this.bd[to.r][5] = { ...this.bd[to.r][7], m:1 }; this.bd[to.r][7] = null; }
    else if (sp === 'cQ')  { this.bd[to.r][3] = { ...this.bd[to.r][0], m:1 }; this.bd[to.r][0] = null; }

    if (pc.t === PT.K) { this.cr[pc.c].k = 0; this.cr[pc.c].q = 0; }
    if (pc.t === PT.R) {
      if (fr.f === 0) this.cr[pc.c].q = 0;
      if (fr.f === 7) this.cr[pc.c].k = 0;
    }

    return undo;
  }

  _undo(u) {
    this.bd[u.fr.r][u.fr.f] = u.pc;
    this.bd[u.to.r][u.to.f] = u.cap;
    this.ep = u.ep;
    this.cr = u.cr;
    if (u.sp === 'ep')  this.bd[u.epc.r][u.epc.f] = u.epc.p;
    else if (u.sp === 'cK') { this.bd[u.to.r][7] = { ...this.bd[u.to.r][5], m:0 }; this.bd[u.to.r][5] = null; }
    else if (u.sp === 'cQ') { this.bd[u.to.r][0] = { ...this.bd[u.to.r][3], m:0 }; this.bd[u.to.r][3] = null; }
  }

  // Compute the real game status (used only after a committed move)
  _updateStatus() {
    const moves = this.allLegal();
    if (!moves.length) {
      this.status = this.inCheck(this.turn) ? 'checkmate' : 'stalemate';
    } else if (this.inCheck(this.turn)) {
      this.status = 'check';
    } else {
      this.status = 'playing';
    }
  }

  // Legal moves for one piece — filters out self-check
  legal(r, f) {
    const pc = this.bd[r]?.[f];
    if (!pc || pc.c !== this.turn) return [];

    return this._pseudo(r, f).filter(mv => {
      // Castle can't cross an attacked square
      if (mv.sp === 'cK') {
        if (this.inCheck(this.turn)) return false;
        const u = this._apply({ fr:mv.fr, to:{ r:mv.fr.r, f:5 } });
        const attacked = this.inCheck(this.turn);
        this._undo(u);
        if (attacked) return false;
      }
      if (mv.sp === 'cQ') {
        if (this.inCheck(this.turn)) return false;
        const u = this._apply({ fr:mv.fr, to:{ r:mv.fr.r, f:3 } });
        const attacked = this.inCheck(this.turn);
        this._undo(u);
        if (attacked) return false;
      }
      // Normal: make sure king isn't in check after
      const u  = this._apply(mv);
      const ic = this.inCheck(this.turn);
      this._undo(u);
      return !ic;
    });
  }

  // All legal moves for the current player
  allLegal() {
    const moves = [];
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const p = this.bd[r][f];
        if (p && p.c === this.turn) moves.push(...this.legal(r, f));
      }
    return moves;
  }

  // Load an arbitrary board position (for custom setup mode).
  // Resets history and EP/castling rights since they don't apply to custom positions.
  loadPosition(bd) {
    this.bd     = bd.map(row => row.map(p => p ? {...p} : null));
    this.turn   = W;
    this.ep     = null;
    // Infer castling rights from piece positions and move counts
    this.cr = { w:{ k:0, q:0 }, b:{ k:0, q:0 } };
    const wk = this.bd[0][4], wkr = this.bd[0][7], wqr = this.bd[0][0];
    const bk = this.bd[7][4], bkr = this.bd[7][7], bqr = this.bd[7][0];
    if (wk && wk.t === PT.K && wk.c === W && !wk.m) {
      if (wkr && wkr.t === PT.R && wkr.c === W && !wkr.m) this.cr.w.k = 1;
      if (wqr && wqr.t === PT.R && wqr.c === W && !wqr.m) this.cr.w.q = 1;
    }
    if (bk && bk.t === PT.K && bk.c === B && !bk.m) {
      if (bkr && bkr.t === PT.R && bkr.c === B && !bkr.m) this.cr.b.k = 1;
      if (bqr && bqr.t === PT.R && bqr.c === B && !bqr.m) this.cr.b.q = 1;
    }
    this.hist   = [];
    this.status = 'playing';
    this._updateStatus();
  }

  // Commit a move. This is the ONLY place that updates turn + status.
  move(fr, to, prom = 'q') {
    const legal = this.legal(fr.r, fr.f);
    const mv    = legal.find(m => m.to.r === to.r && m.to.f === to.f);
    if (!mv) return null;

    const undo = this._apply(mv, prom);
    this.hist.push({ mv, undo, prom });
    this.turn = this.turn === W ? B : W;
    this._updateStatus();

    return { mv, cap: undo.cap, status: this.status };
  }
}

