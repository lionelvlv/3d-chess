//  12. EVENT LISTENERS
// ═══════════════════════════════════════════

// Board input — desktop click
canvas.addEventListener('click', e => {
  const sq = getSquareFromPointer(e);
  if (!sq) return;
  if (inSetupMode) handleSetupClick(sq.r, sq.f);
  else handleSquareClick(sq.r, sq.f);
});

// Board input — mobile tap (ignore if finger drifted > 8px = pan gesture)
let touchOriginX = 0, touchOriginY = 0;

canvas.addEventListener('touchstart', e => {
  touchOriginX = e.touches[0].clientX;
  touchOriginY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
  const t     = e.changedTouches[0];
  const dx    = t.clientX - touchOriginX;
  const dy    = t.clientY - touchOriginY;
  const drift = Math.sqrt(dx*dx + dy*dy);
  if (drift > 8) return; // was a pan, not a tap
  e.preventDefault(); // block synthetic click
  const sq = getSquareFromPointer(t);
  if (!sq) return;
  if (inSetupMode) handleSetupClick(sq.r, sq.f);
  else handleSquareClick(sq.r, sq.f);
}, { passive: false });

// Theme chips
document.querySelectorAll('.theme-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    SFX.toggle();
  });
});

// AI difficulty buttons
let chosenDiff = 1;
document.querySelectorAll('[data-d]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-d]').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  chosenDiff = parseInt(btn.dataset.d);
  SFX.toggle();
}));

// Timer buttons (AI game)
let chosenTimer = 0;
const customTimeRow = document.getElementById('custom-time-row');
document.querySelectorAll('.tc').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tc').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  const t = parseInt(btn.dataset.t);
  if (t === -1) { customTimeRow.classList.add('visible');    chosenTimer = -1; }
  else          { customTimeRow.classList.remove('visible'); chosenTimer = t; }
  SFX.toggle();
}));

// Timer buttons (online game)
let chosenOnlineTimer = 0;
document.querySelectorAll('.tc-online').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tc-online').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  chosenOnlineTimer = parseInt(btn.dataset.t);
  SFX.toggle();
}));

// Side selection → starts AI game
document.querySelectorAll('[data-c]').forEach(btn => btn.addEventListener('click', () => {
  SFX.btnStart();
  let col = btn.dataset.c;
  if (col === 'r') col = Math.random() < .5 ? W : B;
  const secs = chosenTimer === -1
    ? ((parseInt(document.getElementById('custom-mins').value) || 5) * 60)
    : chosenTimer;
  startGame('ai', col, chosenDiff, secs);
}));

// Landing menu buttons
document.getElementById('btn-ai').addEventListener('click', () => {
  const isOpen = document.getElementById('row-ai').classList.toggle('open');
  // Close online row whenever AI row is toggled
  document.getElementById('row-online').classList.remove('open');
  if (isOpen) SFX.btnStart(); else SFX.btnBack();
});

// ── btn-online: toggle expand-row (same pattern as btn-ai) ──
document.getElementById('btn-online').addEventListener('click', () => {
  pendingCustomBoard = null;
  const row    = document.getElementById('row-online');
  const isOpen = row.classList.toggle('open');
  // Close AI row if opening online row
  if (isOpen) document.getElementById('row-ai').classList.remove('open');
  SFX.btnOnline();
});

// Online expand-row action buttons
document.getElementById('op-create-btn').addEventListener('click', () => {
  SFX.btnOnline();
  pendingCustomBoard = null;
  document.getElementById('row-online').classList.remove('open');
  createRoom();
});
document.getElementById('op-create-setup-btn').addEventListener('click', () => {
  SFX.btnOnline();
  document.getElementById('row-online').classList.remove('open');
  setupEnter('online', W, chosenDiff, chosenOnlineTimer);
});
document.getElementById('op-join-btn').addEventListener('click', () => {
  SFX.btnClick();
  document.getElementById('row-online').classList.remove('open');
  document.getElementById('op-code-input').value = '';
  document.getElementById('op-join-status').textContent = '\u00a0';
  showOnlinePanel('joining');
  setTimeout(() => document.getElementById('op-code-input').focus(), 100);
});

// Engine toggle in AI expand-row
document.getElementById('btn-engine-sf').addEventListener('click', () => {
  useStockfish = true;
  document.getElementById('btn-engine-sf').classList.add('active');
  document.getElementById('btn-engine-mm').classList.remove('active');
  SFX.toggle();
});
document.getElementById('btn-engine-mm').addEventListener('click', () => {
  useStockfish = false;
  document.getElementById('btn-engine-mm').classList.add('active');
  document.getElementById('btn-engine-sf').classList.remove('active');
  SFX.toggle();
});
// "Custom Setup →" in the AI expand panel
document.getElementById('btn-setup-ai').addEventListener('click', () => {
  SFX.btnClick();
  const secs = chosenTimer === -1
    ? ((parseInt(document.getElementById('custom-mins').value) || 5) * 60)
    : chosenTimer;
  setupEnter('ai', W, chosenDiff, secs);
});

document.getElementById('op-connect-btn').addEventListener('click', () => {
  const code = document.getElementById('op-code-input').value.trim().toUpperCase();
  if (code.length !== 4) {
    SFX.error();
    document.getElementById('op-join-status').textContent = 'NEED 4 LETTERS';
    document.getElementById('op-join-status').className   = 'op-status err';
    return;
  }
  SFX.btnOnline();
  joinRoom(code);
});
document.getElementById('op-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('op-connect-btn').click();
});
document.getElementById('op-code').addEventListener('click', () => {
  SFX.copyCode();
  const code = document.getElementById('op-code').textContent;
  navigator.clipboard?.writeText(code).then(() => {
    document.getElementById('op-wait-status').textContent = 'COPIED!';
    document.getElementById('op-wait-status').className   = 'op-status ok';
  }).catch(() => {});
});
document.getElementById('op-cancel-wait').addEventListener('click', () => {
  SFX.btnBack();
  closePeer();
  pendingCustomBoard = null;
  showOnlinePanel('none');
});
// Cancel join → close overlay, re-open landing row
document.getElementById('op-cancel-join').addEventListener('click', () => {
  SFX.btnBack();
  showOnlinePanel('none');
  document.getElementById('row-online').classList.add('open');
});

// ── Setup Mode buttons ───────────────────────────────────
// Piece palette chips
document.querySelectorAll('.pchip[data-piece]').forEach(chip => {
  chip.addEventListener('click', () => {
    const t = chip.dataset.piece;
    const c = chip.dataset.color;
    if (setupHeld && setupHeld.t === t && setupHeld.c === c) {
      // Tap same chip again = deselect
      setupHeld    = null;
      setupErasing = false;
    } else {
      setupHeld    = { t, c };
      setupErasing = false;
    }
    updateSetupCursor();
    updatePaletteActiveState();
    SFX.toggle();
  });
});

// Erase chip
document.getElementById('setup-erase').addEventListener('click', () => {
  setupErasing = !setupErasing;
  if (setupErasing) setupHeld = null;
  updateSetupCursor();
  updatePaletteActiveState();
  SFX.toggle();
});

// Clear board
document.getElementById('setup-clear-btn').addEventListener('click', () => {
  SFX.btnBack();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      if (setupBoard[r][f]) { despawnPiece(r, f); setupBoard[r][f] = null; }
    }
  updateSetupStatus();
});

// Reset to standard position
document.getElementById('setup-reset-btn').addEventListener('click', () => {
  SFX.btnClick();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      if (setupBoard[r][f]) despawnPiece(r, f);
    }
  const tempChess = new Chess();
  setupBoard = tempChess.bd.map(row => row.map(p => p ? {...p} : null));
  const tempCh = new Chess(); tempCh.bd = setupBoard;
  syncBoardToScene(tempCh);
  orientAllKnights();
  updateSetupStatus();
});

// Cancel setup
document.getElementById('setup-cancel-btn').addEventListener('click', () => {
  SFX.btnBack();
  setupExit();
});

// Start game from setup
document.getElementById('setup-start-btn').addEventListener('click', () => {
  setupStart();
});

// History toggle
document.getElementById('btn-history').addEventListener('click', () => {
  toggleHistoryPanel();
  SFX.toggle();
});

// In-game HUD buttons
document.getElementById('btn-new').addEventListener('click', () => {
  SFX.btnBack();
  if (mode === 'online' && conn) {
    try { conn.send({ type: 'resign' }); } catch(e) {}
  }
  closePeer();
  stopTimerTick();
  ui.landing.style.display = 'flex';
  ui.hud.classList.remove('on');
  ui.go.classList.remove('on');
  document.getElementById('row-ai').classList.remove('open');
});

document.getElementById('btn-again').addEventListener('click', () => {
  SFX.btnStart();
  if (mode === 'online') {
    closePeer();
    ui.landing.style.display = 'flex';
    ui.hud.classList.remove('on');
    ui.go.classList.remove('on');
  } else if (ui.modeTag.textContent.startsWith('CUSTOM')) {
    ui.go.classList.remove('on');
    ui.hud.classList.remove('on');
    setupEnter(mode, myColor, aiDiff, timerTotal);
  } else {
    startGame(mode, myColor, aiDiff, timerTotal);
  }
});

document.getElementById('btn-menu').addEventListener('click', () => {
  SFX.btnBack();
  if (mode === 'online' && conn) {
    try { conn.send({ type: 'resign' }); } catch(e) {}
  }
  closePeer();
  stopTimerTick();
  ui.landing.style.display = 'flex';
  ui.hud.classList.remove('on');
  ui.go.classList.remove('on');
});

// Pawn promotion picker
ui.promo.querySelectorAll('.pbtn').forEach(btn => btn.addEventListener('click', () => {
  SFX.btnStart();
  ui.promo.classList.remove('on');
  if (pendingPromo) {
    doExecute(pendingPromo.fr, pendingPromo.to, btn.dataset.p);
    pendingPromo = null;
  }
}));

// Hover sounds on all interactive elements
document.querySelectorAll('.btn, .btn-sm, .obtn, .pbtn, .pchip, .tc, .tc-online, [data-c], [data-d]').forEach(el => {
  el.addEventListener('mouseenter', () => SFX.hover());
});

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Invite link copy button
document.getElementById('op-copy-link').addEventListener('click', () => {
  const code = document.getElementById('op-code').textContent;
  const url  = buildInviteUrl(code);
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById('op-copy-link');
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = '⎘ Copy Link'; }, 2000);
  }).catch(() => {});
  SFX.copyCode();
});

// History copy-to-clipboard
document.getElementById('history-copy-btn').addEventListener('click', () => {
  if (!moveHistory.length) return;
  // Build a clean text representation: "1. e4 e5\n2. Nf3 Nc6\n..."
  const lines = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    const w = moveHistory[i]?.notation   || '';
    const b = moveHistory[i+1]?.notation || '';
    lines.push(`${Math.floor(i/2)+1}. ${w}${b ? ' ' + b : ''}`);
  }
  const text = lines.join('\n');
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.getElementById('history-copy-btn');
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.textContent = '⎘ Copy'; }, 2000);
  }).catch(() => {});
  SFX.copyCode();
});

// Check URL for invite code on load
checkUrlForJoinCode();

