//  15. INVITE LINK + URL AUTO-JOIN
//
//  When a room is created, build a shareable URL:
//    https://yoursite.com/?join=ABCD
//  Pasting/clicking this link auto-fills the join panel.
//
//  On page load, check window.location.search for ?join=CODE.
//  If found, pre-fill the join input and open the join panel.
// ═══════════════════════════════════════════

function buildInviteUrl(code) {
  const base = window.location.href.split('?')[0];
  return `${base}?join=${code}`;
}

function updateInviteDisplay(code) {
  const urlEl = document.getElementById('op-invite-url');
  if (urlEl) urlEl.textContent = buildInviteUrl(code);
}

function checkUrlForJoinCode() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('join');
  if (!code || code.length !== 4) return;
  // Pre-fill join panel and open it
  const input = document.getElementById('op-code-input');
  if (input) input.value = code.toUpperCase();
  showOnlinePanel('joining');
  setTimeout(() => {
    document.getElementById('op-join-status').textContent = `Code ${code.toUpperCase()} ready — tap Connect`;
    document.getElementById('op-join-status').className   = 'op-status ok';
  }, 100);
}

