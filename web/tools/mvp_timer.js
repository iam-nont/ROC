// ============================================================
// MVP Boss Respawn Timer — ROC Classic TH (Pre-Renewal)
// Self-contained: injects CSS, builds UI inside #sec-mvp-timer
// ============================================================

(function () {
  'use strict';

  // ─── MVP Data ─────────────────────────────────────────────
  const MVP_LIST = [
    { id: 1038, name: 'Osiris', map: 'moc_pryd06', mapName: 'Pyramid F6', minResp: 60, maxResp: 70, level: 78 },
    { id: 1039, name: 'Baphomet', map: 'prt_maze03', mapName: 'Labyrinth F3', minResp: 120, maxResp: 130, level: 81 },
    { id: 1046, name: 'Doppelganger', map: 'gef_dun02', mapName: 'Geffen Dungeon F2', minResp: 120, maxResp: 130, level: 72 },
    { id: 1059, name: 'Mistress', map: 'mjolnir_04', mapName: 'Mjolnir Field 4', minResp: 120, maxResp: 130, level: 79 },
    { id: 1086, name: 'Golden Thief Bug', map: 'prt_sewb4', mapName: 'Sewer B4', minResp: 60, maxResp: 70, level: 64 },
    { id: 1087, name: 'Orc Hero', map: 'gef_fild14', mapName: 'Orc Village', minResp: 60, maxResp: 70, level: 77 },
    { id: 1112, name: 'Drake', map: 'treasure02', mapName: 'Sunken Ship F2', minResp: 120, maxResp: 130, level: 60 },
    { id: 1115, name: 'Eddga', map: 'pay_fild11', mapName: 'Payon Forest 11', minResp: 120, maxResp: 130, level: 68 },
    { id: 1147, name: 'Maya', map: 'anthell02', mapName: 'Ant Hell F2', minResp: 120, maxResp: 130, level: 75 },
    { id: 1150, name: 'Moonlight Flower', map: 'pay_dun04', mapName: 'Payon Cave F4', minResp: 60, maxResp: 70, level: 73 },
    { id: 1159, name: 'Phreeoni', map: 'moc_fild17', mapName: 'Sograt Desert 17', minResp: 120, maxResp: 130, level: 69 },
    { id: 1190, name: 'Orc Lord', map: 'gef_fild10', mapName: 'Orc Field', minResp: 120, maxResp: 130, level: 78 },
    { id: 1251, name: 'Turtle General', map: 'tur_dun04', mapName: 'Turtle Island F4', minResp: 60, maxResp: 70, level: 97 },
    { id: 1272, name: 'Dark Lord', map: 'gl_chyard', mapName: 'Glast Heim Churchyard', minResp: 60, maxResp: 70, level: 80 },
    { id: 1312, name: 'Stormy Knight', map: 'xmas_dun02', mapName: 'Toy Factory F2', minResp: 60, maxResp: 70, level: 77 },
    { id: 1373, name: 'Lord of the Dead', map: 'gl_cas02', mapName: 'Glast Heim Castle 2', minResp: 133, maxResp: 143, level: 94 },
    { id: 1418, name: 'Evil Snake Lord', map: 'gon_dun03', mapName: 'Gonryun Dungeon F3', minResp: 94, maxResp: 104, level: 90 },
    { id: 1492, name: 'Incantation Samurai', map: 'ama_dun03', mapName: 'Amatsu Dungeon F3', minResp: 91, maxResp: 101, level: 85 },
    { id: 1511, name: 'Amon Ra', map: 'moc_pryd06', mapName: 'Pharaoh Tomb', minResp: 60, maxResp: 70, level: 88 },
    { id: 1583, name: 'Tao Gunka', map: 'beach_dun', mapName: 'Beach Dungeon', minResp: 300, maxResp: 310, level: 90 },
    { id: 1623, name: 'RSX-0806', map: 'ein_dun02', mapName: 'Einbroch Mine F2', minResp: 125, maxResp: 135, level: 90 },
    { id: 1685, name: 'Vesper', map: 'jupe_core', mapName: 'Juperos Core', minResp: 120, maxResp: 130, level: 97 },
    { id: 1688, name: 'Lady Tanee', map: 'ayo_dun02', mapName: 'Ayothaya Dungeon F2', minResp: 420, maxResp: 430, level: 89 },
    { id: 1708, name: 'Thanatos', map: 'thana_boss', mapName: 'Thanatos Tower Top', minResp: 120, maxResp: 130, level: 99 },
    { id: 1734, name: 'Kiel D-01', map: 'kh_dun02', mapName: 'Kiel Dungeon F2', minResp: 120, maxResp: 180, level: 93 },
  ];

  const STORAGE_KEY = 'roc_mvp_timers';

  // ─── CSS Injection ────────────────────────────────────────
  const STYLE_ID = 'mvp-timer-css';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
/* ═══ MVP Timer Controls ═══ */
.mvp-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.mvp-controls input[type="text"] {
  flex: 1;
  min-width: 200px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--bg2);
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.mvp-controls input[type="text"]:focus { border-color: var(--accent); }
.mvp-controls .mvp-btn-group {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.mvp-controls .mvp-btn-group button {
  padding: 8px 16px;
  border: none;
  background: var(--bg2);
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.mvp-controls .mvp-btn-group button:not(:last-child) {
  border-right: 1px solid var(--border);
}
.mvp-controls .mvp-btn-group button:hover { background: var(--bg3); color: var(--text); }
.mvp-controls .mvp-btn-group button.active {
  background: var(--accent);
  color: #fff;
}
.mvp-filter-group {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.mvp-filter-group button {
  padding: 8px 14px;
  border: none;
  background: var(--bg2);
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.mvp-filter-group button:not(:last-child) {
  border-right: 1px solid var(--border);
}
.mvp-filter-group button:hover { background: var(--bg3); color: var(--text); }
.mvp-filter-group button.active {
  background: var(--gold);
  color: #000;
}
.mvp-active-count {
  font-size: 13px;
  color: var(--text2);
  margin-left: 4px;
  white-space: nowrap;
}

/* ═══ MVP Card Grid ═══ */
.mvp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.mvp-grid.list-view {
  grid-template-columns: 1fr;
}
.mvp-grid.list-view .mvp-card {
  flex-direction: row;
  align-items: center;
  gap: 16px;
}
.mvp-grid.list-view .mvp-card-sprite {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}
.mvp-grid.list-view .mvp-card-body {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}
.mvp-grid.list-view .mvp-card-header { width: auto; }
.mvp-grid.list-view .mvp-card-map { margin-bottom: 0; }
.mvp-grid.list-view .mvp-timer-area { flex: 1; min-width: 200px; }
.mvp-grid.list-view .mvp-card-actions { flex-shrink: 0; }

/* ═══ MVP Card ═══ */
.mvp-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}
.mvp-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: transparent;
  transition: background 0.3s;
}
.mvp-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 20px rgba(46,204,113,0.1);
}

/* Timer states */
.mvp-card.state-waiting { border-color: var(--border); }
.mvp-card.state-waiting::before { background: var(--blue); }

.mvp-card.state-respawn {
  border-color: var(--gold);
  box-shadow: 0 0 20px rgba(241,196,15,0.15);
  animation: mvpPulse 2s ease-in-out infinite;
}
.mvp-card.state-respawn::before { background: var(--gold); }

.mvp-card.state-alive {
  border-color: var(--accent);
  box-shadow: 0 0 16px rgba(46,204,113,0.12);
}
.mvp-card.state-alive::before { background: var(--accent); }

@keyframes mvpPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(241,196,15,0.15); }
  50%      { box-shadow: 0 0 30px rgba(241,196,15,0.3); }
}

/* Sprite */
.mvp-card-sprite {
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mvp-card-sprite img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
}

/* Header */
.mvp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}
.mvp-card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.mvp-card-level {
  font-size: 13px;
  color: var(--text2);
  font-weight: 600;
}
.mvp-card-map {
  font-size: 12px;
  color: var(--text2);
  margin-bottom: 4px;
}
.mvp-card-resp {
  font-size: 12px;
  color: var(--blue);
  margin-bottom: 10px;
}

/* Timer area */
.mvp-timer-area {
  min-height: 54px;
  margin-bottom: 10px;
}
.mvp-timer-status {
  font-size: 14px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mvp-timer-status .timer-icon { font-size: 14px; }
.mvp-timer-status.status-idle { color: var(--text2); }
.mvp-timer-status.status-waiting { color: var(--blue); }
.mvp-timer-status.status-respawn { color: var(--gold); font-weight: 700; }
.mvp-timer-status.status-alive { color: var(--accent); font-weight: 700; }

.mvp-timer-detail {
  font-size: 13px;
  color: var(--text2);
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 6px;
}

/* Progress bar */
.mvp-progress-wrap {
  height: 10px;
  background: var(--bg);
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  position: relative;
}
.mvp-progress-elapsed {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
  border-radius: 5px 0 0 5px;
}
.mvp-progress-window {
  height: 100%;
  background: var(--gold);
  transition: width 0.4s ease;
}
.mvp-progress-remaining {
  height: 100%;
  flex: 1;
  background: transparent;
}

/* Actions */
.mvp-card-actions {
  display: flex;
  gap: 8px;
}
.mvp-card-actions button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.mvp-btn-kill {
  background: rgba(241,196,15,0.15);
  color: var(--gold);
  border: 1px solid rgba(241,196,15,0.3) !important;
}
.mvp-btn-kill:hover {
  background: rgba(241,196,15,0.25);
}
.mvp-btn-reset {
  background: rgba(231,76,60,0.12);
  color: #e74c3c;
  border: 1px solid rgba(231,76,60,0.25) !important;
}
.mvp-btn-reset:hover {
  background: rgba(231,76,60,0.22);
}
.mvp-btn-reset:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Empty state */
.mvp-empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text2);
  font-size: 15px;
}

/* Responsive */
@media (max-width: 768px) {
  .mvp-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .mvp-controls { gap: 8px; }
  .mvp-grid.list-view .mvp-card { flex-direction: column; }
  .mvp-grid.list-view .mvp-card-sprite { width: 64px; height: 64px; margin: 0 auto 8px; }
  .mvp-grid.list-view .mvp-card-body { flex-direction: column; }
}
@media (max-width: 480px) {
  .mvp-grid { grid-template-columns: 1fr; }
  .mvp-card-actions { flex-direction: column; }
  .mvp-card-actions button { flex: unset; }
}
`;
    document.head.appendChild(style);
  }

  // ─── State ────────────────────────────────────────────────
  let viewMode = 'grid';  // 'grid' | 'list'
  let filterMode = 'all'; // 'all' | 'active' | 'upcoming'
  let searchQuery = '';
  let intervalId = null;

  // ─── localStorage helpers ─────────────────────────────────
  function loadTimers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function saveTimers(timers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }

  function markKilled(mvpId) {
    const timers = loadTimers();
    timers[mvpId] = Date.now();
    saveTimers(timers);
  }

  function resetTimer(mvpId) {
    const timers = loadTimers();
    delete timers[mvpId];
    saveTimers(timers);
  }

  // ─── Timer logic ──────────────────────────────────────────
  function getTimerState(mvp, killedAt) {
    if (!killedAt) return { state: 'NOT_TRACKING' };
    const now = Date.now();
    const elapsed = (now - killedAt) / 60000; // minutes
    if (elapsed < mvp.minResp) {
      return {
        state: 'WAITING',
        elapsed: elapsed,
        remaining: mvp.minResp - elapsed,
        maxRemaining: mvp.maxResp - elapsed,
      };
    }
    if (elapsed < mvp.maxResp) {
      return {
        state: 'RESPAWN_WINDOW',
        elapsed: elapsed,
        remaining: mvp.maxResp - elapsed,
      };
    }
    return { state: 'ALIVE', elapsed: elapsed };
  }

  // ─── Formatting helpers ───────────────────────────────────
  function fmtTime(minutes) {
    if (minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.floor((minutes * 60) % 60);
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's';
    return m + 'm ' + String(s).padStart(2, '0') + 's';
  }

  function fmtTimeAgo(minutes) {
    if (minutes < 1) return 'just now';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h > 0) return h + 'h ' + m + 'm ago';
    return m + 'm ago';
  }

  // ─── Track previous states for window-open flash ──────────
  const prevStates = {};

  // ─── Build UI ─────────────────────────────────────────────
  function initMvpTimer() {
    const container = document.getElementById('sec-mvp-timer');
    if (!container) return;

    container.innerHTML = `
      <div class="mvp-controls">
        <input type="text" id="mvpSearch" placeholder="Search MVP name...">
        <div class="mvp-btn-group">
          <button data-view="grid" class="active" title="Grid view">Grid</button>
          <button data-view="list" title="List view">List</button>
        </div>
        <div class="mvp-filter-group">
          <button data-filter="all" class="active">All</button>
          <button data-filter="active">Active</button>
          <button data-filter="upcoming">Upcoming</button>
        </div>
        <span class="mvp-active-count" id="mvpActiveCount"></span>
      </div>
      <div class="mvp-grid" id="mvpGrid"></div>
    `;

    // Events: search
    container.querySelector('#mvpSearch').addEventListener('input', function () {
      searchQuery = this.value.toLowerCase().trim();
      renderCards();
    });

    // Events: view toggle
    container.querySelectorAll('.mvp-btn-group button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.mvp-btn-group button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        viewMode = btn.dataset.view;
        var grid = container.querySelector('#mvpGrid');
        grid.classList.toggle('list-view', viewMode === 'list');
      });
    });

    // Events: filter toggle
    container.querySelectorAll('.mvp-filter-group button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.mvp-filter-group button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filterMode = btn.dataset.filter;
        renderCards();
      });
    });

    // Initial render
    renderCards();

    // Auto-update every second
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateTimers, 1000);
  }

  // ─── Render all cards ─────────────────────────────────────
  function renderCards() {
    var grid = document.getElementById('mvpGrid');
    if (!grid) return;

    var timers = loadTimers();

    // Filter MVPs
    var filtered = MVP_LIST.filter(function (mvp) {
      // Search filter
      if (searchQuery && mvp.name.toLowerCase().indexOf(searchQuery) === -1) return false;

      // Status filter
      if (filterMode === 'all') return true;
      var killedAt = timers[mvp.id];
      var ts = getTimerState(mvp, killedAt);

      if (filterMode === 'active') {
        return ts.state === 'WAITING' || ts.state === 'RESPAWN_WINDOW';
      }
      if (filterMode === 'upcoming') {
        return ts.state === 'RESPAWN_WINDOW' || ts.state === 'ALIVE';
      }
      return true;
    });

    // Sort: active timers first (RESPAWN_WINDOW > WAITING by remaining), then not-tracking
    filtered.sort(function (a, b) {
      var ta = getTimerState(a, timers[a.id]);
      var tb = getTimerState(b, timers[b.id]);
      var order = { RESPAWN_WINDOW: 0, WAITING: 1, ALIVE: 2, NOT_TRACKING: 3 };
      var oa = order[ta.state] !== undefined ? order[ta.state] : 4;
      var ob = order[tb.state] !== undefined ? order[tb.state] : 4;
      if (oa !== ob) return oa - ob;
      // Within same state, sort by remaining time (less remaining = higher)
      var ra = ta.remaining !== undefined ? ta.remaining : 99999;
      var rb = tb.remaining !== undefined ? tb.remaining : 99999;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });

    // Update active count
    var activeCount = 0;
    MVP_LIST.forEach(function (mvp) {
      var ts = getTimerState(mvp, timers[mvp.id]);
      if (ts.state !== 'NOT_TRACKING') activeCount++;
    });
    var countEl = document.getElementById('mvpActiveCount');
    if (countEl) {
      countEl.textContent = activeCount > 0
        ? activeCount + ' timer' + (activeCount > 1 ? 's' : '') + ' active'
        : '';
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="mvp-empty">No MVPs match your search or filter.</div>';
      return;
    }

    grid.innerHTML = filtered.map(function (mvp) {
      return buildCardHTML(mvp, timers[mvp.id]);
    }).join('');

    // Bind card events
    grid.querySelectorAll('.mvp-card').forEach(function (card) {
      var id = parseInt(card.dataset.mvpId);
      var killBtn = card.querySelector('.mvp-btn-kill');
      var resetBtn = card.querySelector('.mvp-btn-reset');
      if (killBtn) {
        killBtn.addEventListener('click', function () {
          markKilled(id);
          renderCards();
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          resetTimer(id);
          delete prevStates[id];
          renderCards();
        });
      }
    });
  }

  // ─── Build single card HTML ───────────────────────────────
  function buildCardHTML(mvp, killedAt) {
    var ts = getTimerState(mvp, killedAt);
    var stateClass = '';
    if (ts.state === 'WAITING') stateClass = 'state-waiting';
    else if (ts.state === 'RESPAWN_WINDOW') stateClass = 'state-respawn';
    else if (ts.state === 'ALIVE') stateClass = 'state-alive';

    // Timer area
    var timerHTML = '';
    if (ts.state === 'NOT_TRACKING') {
      timerHTML = '<div class="mvp-timer-status status-idle"><span class="timer-icon">&#9201;</span> Not tracking</div>';
    } else if (ts.state === 'WAITING') {
      timerHTML = ''
        + '<div class="mvp-timer-status status-waiting"><span class="timer-icon">&#9201;</span> Killed ' + fmtTimeAgo(ts.elapsed) + '</div>'
        + '<div class="mvp-timer-detail">' + fmtTime(ts.remaining) + ' ~ ' + fmtTime(ts.maxRemaining) + ' left</div>'
        + buildProgressHTML(mvp, ts);
    } else if (ts.state === 'RESPAWN_WINDOW') {
      timerHTML = ''
        + '<div class="mvp-timer-status status-respawn"><span class="timer-icon">&#9888;</span> MIGHT BE ALIVE!</div>'
        + '<div class="mvp-timer-detail">Window closes in ' + fmtTime(ts.remaining) + '</div>'
        + buildProgressHTML(mvp, ts);
    } else if (ts.state === 'ALIVE') {
      timerHTML = ''
        + '<div class="mvp-timer-status status-alive"><span class="timer-icon">&#10004;</span> Likely alive!</div>'
        + '<div class="mvp-timer-detail">Killed ' + fmtTimeAgo(ts.elapsed) + '</div>'
        + buildProgressHTML(mvp, ts);
    }

    var hasTimer = ts.state !== 'NOT_TRACKING';

    return ''
      + '<div class="mvp-card ' + stateClass + '" data-mvp-id="' + mvp.id + '">'
      +   '<div class="mvp-card-sprite">'
      +     '<img src="https://static.divine-pride.net/images/mobs/png/' + mvp.id + '.png"'
      +     ' alt="' + mvp.name + '"'
      +     ' loading="lazy"'
      +     ' onerror="this.style.opacity=\'0.3\';this.onerror=null;">'
      +   '</div>'
      +   '<div class="mvp-card-body">'
      +     '<div class="mvp-card-header">'
      +       '<span class="mvp-card-name">' + mvp.name + '</span>'
      +       '<span class="mvp-card-level">Lv.' + mvp.level + '</span>'
      +     '</div>'
      +     '<div class="mvp-card-map">' + mvp.mapName + ' (' + mvp.map + ')</div>'
      +     '<div class="mvp-card-resp">Respawn: ' + mvp.minResp + '~' + mvp.maxResp + ' min</div>'
      +     '<div class="mvp-timer-area">' + timerHTML + '</div>'
      +     '<div class="mvp-card-actions">'
      +       '<button class="mvp-btn-kill">Mark as Killed</button>'
      +       '<button class="mvp-btn-reset"' + (hasTimer ? '' : ' disabled') + '>Reset Timer</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  // ─── Progress bar ─────────────────────────────────────────
  function buildProgressHTML(mvp, ts) {
    // Total span is from 0 to maxResp
    var total = mvp.maxResp;
    var elapsedPct, windowPct;

    if (ts.state === 'WAITING') {
      elapsedPct = (ts.elapsed / total) * 100;
      windowPct = ((mvp.maxResp - mvp.minResp) / total) * 100;
    } else if (ts.state === 'RESPAWN_WINDOW') {
      elapsedPct = (mvp.minResp / total) * 100;
      // Gold portion: from minResp to current elapsed
      var windowElapsed = ts.elapsed - mvp.minResp;
      windowPct = (windowElapsed / total) * 100;
      // Show the full gold window hint with opacity
      var windowRemainingPct = ((mvp.maxResp - ts.elapsed) / total) * 100;
      return ''
        + '<div class="mvp-progress-wrap">'
        +   '<div class="mvp-progress-elapsed" style="width:' + elapsedPct.toFixed(2) + '%;border-radius:5px 0 0 5px;"></div>'
        +   '<div class="mvp-progress-window" style="width:' + windowPct.toFixed(2) + '%;"></div>'
        +   '<div class="mvp-progress-window" style="width:' + windowRemainingPct.toFixed(2) + '%;opacity:0.35;"></div>'
        +   '<div class="mvp-progress-remaining"></div>'
        + '</div>';
    } else if (ts.state === 'ALIVE') {
      // Fully elapsed
      elapsedPct = (mvp.minResp / total) * 100;
      windowPct = ((mvp.maxResp - mvp.minResp) / total) * 100;
      return ''
        + '<div class="mvp-progress-wrap">'
        +   '<div class="mvp-progress-elapsed" style="width:' + elapsedPct.toFixed(2) + '%;border-radius:5px 0 0 5px;"></div>'
        +   '<div class="mvp-progress-window" style="width:' + windowPct.toFixed(2) + '%;border-radius:0 5px 5px 0;"></div>'
        + '</div>';
    }

    return ''
      + '<div class="mvp-progress-wrap">'
      +   '<div class="mvp-progress-elapsed" style="width:' + elapsedPct.toFixed(2) + '%;border-radius:5px 0 0 5px;"></div>'
      +   '<div class="mvp-progress-window" style="width:' + windowPct.toFixed(2) + '%;opacity:0.35;"></div>'
      +   '<div class="mvp-progress-remaining"></div>'
      + '</div>';
  }

  // ─── Tick: update timers in-place (no full re-render) ─────
  function updateTimers() {
    var timers = loadTimers();
    var anyChanged = false;

    document.querySelectorAll('.mvp-card').forEach(function (card) {
      var id = parseInt(card.dataset.mvpId);
      var mvp = MVP_LIST.find(function (m) { return m.id === id; });
      if (!mvp) return;

      var killedAt = timers[id];
      var ts = getTimerState(mvp, killedAt);

      // Detect state change for flash notification
      var prev = prevStates[id];
      if (prev && prev !== ts.state) {
        if (ts.state === 'RESPAWN_WINDOW') {
          card.style.animation = 'none';
          card.offsetHeight; // force reflow
          card.style.animation = '';
        }
        anyChanged = true;
      }
      prevStates[id] = ts.state;

      // Update state classes
      card.classList.remove('state-waiting', 'state-respawn', 'state-alive');
      if (ts.state === 'WAITING') card.classList.add('state-waiting');
      else if (ts.state === 'RESPAWN_WINDOW') card.classList.add('state-respawn');
      else if (ts.state === 'ALIVE') card.classList.add('state-alive');

      // Update timer area content
      var timerArea = card.querySelector('.mvp-timer-area');
      if (!timerArea) return;

      var timerHTML = '';
      if (ts.state === 'NOT_TRACKING') {
        timerHTML = '<div class="mvp-timer-status status-idle"><span class="timer-icon">&#9201;</span> Not tracking</div>';
      } else if (ts.state === 'WAITING') {
        timerHTML = ''
          + '<div class="mvp-timer-status status-waiting"><span class="timer-icon">&#9201;</span> Killed ' + fmtTimeAgo(ts.elapsed) + '</div>'
          + '<div class="mvp-timer-detail">' + fmtTime(ts.remaining) + ' ~ ' + fmtTime(ts.maxRemaining) + ' left</div>'
          + buildProgressHTML(mvp, ts);
      } else if (ts.state === 'RESPAWN_WINDOW') {
        timerHTML = ''
          + '<div class="mvp-timer-status status-respawn"><span class="timer-icon">&#9888;</span> MIGHT BE ALIVE!</div>'
          + '<div class="mvp-timer-detail">Window closes in ' + fmtTime(ts.remaining) + '</div>'
          + buildProgressHTML(mvp, ts);
      } else if (ts.state === 'ALIVE') {
        timerHTML = ''
          + '<div class="mvp-timer-status status-alive"><span class="timer-icon">&#10004;</span> Likely alive!</div>'
          + '<div class="mvp-timer-detail">Killed ' + fmtTimeAgo(ts.elapsed) + '</div>'
          + buildProgressHTML(mvp, ts);
      }
      timerArea.innerHTML = timerHTML;

      // Update reset button state
      var resetBtn = card.querySelector('.mvp-btn-reset');
      if (resetBtn) {
        resetBtn.disabled = (ts.state === 'NOT_TRACKING');
      }
    });

    // Re-render if filter requires it and states changed
    if (anyChanged && filterMode !== 'all') {
      renderCards();
    }
  }

  // ─── Expose globally ─────────────────────────────────────
  window.initMvpTimer = initMvpTimer;

})();
