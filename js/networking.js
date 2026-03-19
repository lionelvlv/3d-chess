//  9. NETWORKING — PeerJS WebRTC peer-to-peer
// ═══════════════════════════════════════════

let peer       = null;
let conn       = null;
let onlineRole = null; // 'host' | 'guest'

// Use the free PeerJS cloud broker (0.peerjs.com) as signalling + TURN fallback.
// This gives much better NAT traversal than bare STUN servers alone.
const PEER_CONFIG = {
  host:   '0.peerjs.com',
  port:   443,
  path:   '/',
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
};

// ── Lazy PeerJS loader ────────────────────────────────────────────
let _peerJsPromise = null;

function loadPeerJS() {
  if (_peerJsPromise) return _peerJsPromise;
  if (typeof Peer !== 'undefined') {
    _peerJsPromise = Promise.resolve();
    return _peerJsPromise;
  }
  _peerJsPromise = new Promise((resolve, reject) => {
    const s    = document.createElement('script');
    s.src      = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload   = () => resolve();
    s.onerror  = () => reject(new Error('Failed to load PeerJS'));
    document.head.appendChild(s);
  });
  return _peerJsPromise;
}

// ── Helpers ───────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function roomCodeToPeerId(code) {
  return 'chessarc-' + code.toLowerCase();
}

function closePeer() {
  if (conn) { try { conn.close();   } catch(e) {} conn  = null; }
  if (peer) { try { peer.destroy(); } catch(e) {} peer  = null; }
  onlineRole = null;
}

// ── Create room (host) ────────────────────────────────────────────
function createRoom() {
  closePeer();
  const code = generateRoomCode();
  const id   = document.getElementById('op-code');
  const stat = document.getElementById('op-wait-status');

  id.textContent = code;
  stat.innerHTML = '<span class="spinner">↻</span> LOADING...';
  showOnlinePanel('waiting');
  updateInviteDisplay(code);

  loadPeerJS().then(() => {
    stat.innerHTML = '<span class="spinner">↻</span> CONNECTING TO SERVER...';
    peer = new Peer(roomCodeToPeerId(code), PEER_CONFIG);

    peer.on('open', () => {
      stat.innerHTML = '<span class="spinner">↻</span> WAITING FOR OPPONENT...';
    });

    peer.on('connection', incomingConn => {
      conn       = incomingConn;
      onlineRole = 'host';

      // Wait for connection to fully open before wiring handlers + sending start
      conn.on('open', () => {
        setupConnectionHandlers();
        const ts  = chosenOnlineTimer;
        const msg = { type: 'start', guestColor: B, timerSecs: ts };
        if (pendingCustomBoard) msg.customBoard = pendingCustomBoard;
        conn.send(msg);
        showOnlinePanel('none');
        if (pendingCustomBoard) {
          startGameWithCustomBoard('online', W, 1, ts, pendingCustomBoard);
          pendingCustomBoard = null;
        } else {
          startGame('online', W, 1, ts);
        }
        SFX.connect();
      });
    });

    peer.on('error', err => {
      if (err.type === 'unavailable-id') { createRoom(); return; }
      stat.textContent = 'ERROR: ' + err.type;
      stat.className   = 'op-status err';
    });

  }).catch(err => {
    stat.textContent = 'Could not load networking library.';
    stat.className   = 'op-status err';
    console.warn('[Chess Arcade] PeerJS failed to load:', err.message);
  });
}

// ── Join room (guest) ─────────────────────────────────────────────
function joinRoom(code) {
  closePeer();
  const stat = document.getElementById('op-join-status');
  stat.innerHTML = '<span class="spinner">↻</span> LOADING...';
  stat.className = 'op-status';

  // Connection timeout — if not connected in 15s, show a useful error
  let connectTimeout = setTimeout(() => {
    if (!conn || conn.open === false) {
      stat.textContent = 'TIMED OUT — check the room code and try again';
      stat.className   = 'op-status err';
      closePeer();
    }
  }, 15000);

  loadPeerJS().then(() => {
    stat.innerHTML = '<span class="spinner">↻</span> CONNECTING TO SERVER...';
    peer = new Peer(undefined, PEER_CONFIG);

    peer.on('open', () => {
      stat.innerHTML = '<span class="spinner">↻</span> CONNECTING TO HOST...';
      conn = peer.connect(roomCodeToPeerId(code), { reliable: true, serialization: 'json' });

      conn.on('open', () => {
        clearTimeout(connectTimeout);
        stat.textContent = 'CONNECTED! WAITING FOR HOST...';
        stat.className   = 'op-status ok';
        setupConnectionHandlers();
      });

      conn.on('error', err => {
        clearTimeout(connectTimeout);
        stat.textContent = 'CONNECTION ERROR: ' + (err.message || err.type || err);
        stat.className   = 'op-status err';
      });
    });

    peer.on('error', err => {
      clearTimeout(connectTimeout);
      stat.textContent = 'ERR: ' + err.type;
      stat.className   = 'op-status err';
    });

  }).catch(err => {
    clearTimeout(connectTimeout);
    stat.textContent = 'Could not load networking library.';
    stat.className   = 'op-status err';
    console.warn('[Chess Arcade] PeerJS failed to load:', err.message);
  });
}

// ── Connection handlers ───────────────────────────────────────────
function setupConnectionHandlers() {
  conn.on('data',  handleNetworkData);
  conn.on('close', handleDisconnect);
  conn.on('error', handleDisconnect);
}

function handleNetworkData(data) {
  if (data.type === 'start') {
    onlineRole = 'guest';
    showOnlinePanel('none');
    if (data.customBoard) {
      startGameWithCustomBoard('online', data.guestColor, 1, data.timerSecs || 0, data.customBoard);
    } else {
      startGame('online', data.guestColor, 1, data.timerSecs || 0);
    }
    SFX.connect();
  } else if (data.type === 'move') {
    doExecute(data.fr, data.to, data.prom, true);
  } else if (data.type === 'resign') {
    ui.goTitle.textContent = 'OPPONENT QUIT';
    ui.goSub.textContent   = 'YOU WIN!';
    ui.go.classList.add('on');
    SFX.win();
  }
}

function handleDisconnect() {
  if (mode === 'online') {
    ui.goTitle.textContent = 'DISCONNECTED';
    ui.goSub.textContent   = 'OPPONENT LEFT';
    ui.go.classList.add('on');
  }
}

function showOnlinePanel(view) {
  ['op-waiting', 'op-joining'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  if (view === 'waiting') document.getElementById('op-waiting').style.display = 'block';
  if (view === 'joining') document.getElementById('op-joining').style.display = 'block';
  document.getElementById('online-overlay').classList.toggle('on', view !== 'none');
}
