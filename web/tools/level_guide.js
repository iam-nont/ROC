// ─── Leveling Guide / Map Recommender ────────────────────────────────────────
// Self-contained module: inject CSS + build UI inside #sec-level-guide
// Globals expected: MONSTERS, MAP_SPAWNS, MAP_DISPLAY_NAMES

(function () {
  'use strict';

  // ── Inject CSS ─────────────────────────────────────────────────────────────
  const STYLE = document.createElement('style');
  STYLE.textContent = /* css */ `
/* ─── Level Guide Section ─────────────────────────────────────────────────── */
#sec-level-guide { font-family: 'Segoe UI', Tahoma, sans-serif; }

/* Controls bar */
.lg-controls {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
  margin-bottom: 20px; padding: 16px; border-radius: 8px;
  background: var(--bg2); border: 1px solid var(--border);
}
.lg-ctrl-group { display: flex; flex-direction: column; gap: 4px; }
.lg-ctrl-group label {
  font-size: 12px; color: var(--text2); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.lg-ctrl-group input[type="number"],
.lg-ctrl-group select {
  background: var(--bg3); border: 1px solid var(--border); color: var(--text);
  padding: 8px 12px; border-radius: 6px; font-size: 14px; outline: none;
  transition: border-color 0.2s;
}
.lg-ctrl-group input[type="number"]:focus,
.lg-ctrl-group select:focus {
  border-color: var(--accent);
}
.lg-ctrl-group input[type="number"] { width: 80px; }
.lg-slider-row { display: flex; align-items: center; gap: 8px; }
.lg-slider-row input[type="range"] {
  flex: 1; min-width: 140px; accent-color: var(--accent);
  cursor: pointer;
}
.lg-slider-row .lg-lv-display {
  font-size: 20px; font-weight: 700; color: var(--gold);
  min-width: 44px; text-align: center;
}
.lg-search-box {
  position: relative; flex: 1; min-width: 200px;
}
.lg-search-box input {
  width: 100%; background: var(--bg3); border: 1px solid var(--border);
  color: var(--text); padding: 8px 12px 8px 34px; border-radius: 6px;
  font-size: 14px; outline: none; transition: border-color 0.2s;
}
.lg-search-box input:focus { border-color: var(--accent); }
.lg-search-box .lg-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--text2); font-size: 14px; pointer-events: none;
}

/* Stats summary */
.lg-summary {
  display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
  font-size: 13px; color: var(--text2);
}
.lg-summary span { background: var(--bg2); padding: 4px 10px; border-radius: 4px; }
.lg-summary b { color: var(--accent); }

/* Card grid */
.lg-grid {
  display: grid; gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 700px)  { .lg-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .lg-grid { grid-template-columns: repeat(3, 1fr); } }

/* Map card */
.lg-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
  overflow: hidden; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
  cursor: pointer; position: relative;
}
.lg-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
  border-color: var(--accent);
}
.lg-card.too-low {
  opacity: 0.45; filter: grayscale(0.6);
}
.lg-card.too-low:hover { opacity: 0.7; }
.lg-card.too-low .lg-too-low-badge {
  display: block;
}
.lg-too-low-badge {
  display: none; position: absolute; top: 10px; right: 10px;
  background: #c0392b; color: #fff; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 4px; text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Card header */
.lg-card-head {
  display: flex; gap: 12px; padding: 14px 14px 10px; align-items: flex-start;
}
.lg-card-mini {
  width: 72px; height: 72px; border-radius: 6px; object-fit: cover;
  background: var(--bg3); flex-shrink: 0; border: 1px solid var(--border);
}
.lg-card-info { flex: 1; min-width: 0; }
.lg-card-info h3 {
  font-size: 15px; color: var(--text); margin-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lg-card-info .lg-map-code {
  font-size: 12px; color: var(--text2); margin-bottom: 6px;
}
.lg-type-badge {
  display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px;
  border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px;
  margin-left: 4px; vertical-align: middle;
}
.lg-type-badge.field { background: #1a6b35; color: #6fcf8e; }
.lg-type-badge.dungeon { background: #6b1a1a; color: #cf6f6f; }

/* Stars */
.lg-stars { display: inline-flex; gap: 1px; margin-left: 2px; }
.lg-star { font-size: 14px; color: var(--border); }
.lg-star.filled { color: var(--gold); }
.lg-star.half { position: relative; color: var(--border); }
.lg-star.half::before {
  content: '\u2605'; position: absolute; left: 0; top: 0;
  color: var(--gold); overflow: hidden; width: 50%;
}

/* Meta row */
.lg-card-meta {
  display: flex; gap: 12px; padding: 0 14px 8px; flex-wrap: wrap;
  font-size: 12px; color: var(--text2);
}
.lg-card-meta span { display: flex; align-items: center; gap: 3px; }
.lg-card-meta .lg-val { color: var(--text); font-weight: 600; }

/* Level range bar */
.lg-range-bar-wrap {
  padding: 6px 14px 10px; position: relative;
}
.lg-range-bar {
  height: 6px; border-radius: 3px; background: var(--bg3);
  position: relative; overflow: hidden;
}
.lg-range-bar .lg-rb-optimal {
  position: absolute; top: 0; height: 100%;
  background: rgba(46,204,113,0.35); border-radius: 3px;
}
.lg-range-bar .lg-rb-monsters {
  position: absolute; top: 0; height: 100%;
  border-radius: 3px;
}
.lg-range-labels {
  display: flex; justify-content: space-between;
  font-size: 10px; color: var(--text2); margin-top: 2px;
}
.lg-range-labels .lg-rl-optimal { color: var(--accent); }

/* Monster list (collapsed) */
.lg-mob-list {
  padding: 0 14px 12px;
  max-height: 0; overflow: hidden;
  transition: max-height 0.35s ease;
}
.lg-card.expanded .lg-mob-list { max-height: 600px; }
.lg-mob-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0; border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.lg-mob-row:last-child { border-bottom: none; }
.lg-mob-sprite {
  width: 28px; height: 28px; object-fit: contain; flex-shrink: 0;
}
.lg-mob-name { flex: 1; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lg-mob-lv { color: var(--text2); font-size: 11px; min-width: 40px; }
.lg-mob-cnt { color: var(--blue); font-size: 11px; min-width: 28px; text-align: right; }
.lg-mob-exp { color: var(--gold); font-size: 11px; min-width: 50px; text-align: right; }
.lg-mob-penalty { font-size: 10px; min-width: 36px; text-align: right; }
.lg-mob-penalty.full  { color: var(--accent); }
.lg-mob-penalty.mid   { color: #e67e22; }
.lg-mob-penalty.low   { color: #c0392b; }

/* Exp estimate row */
.lg-exp-row {
  display: flex; gap: 12px; padding: 8px 14px 12px; flex-wrap: wrap;
  font-size: 12px; border-top: 1px solid var(--border);
}
.lg-exp-row span { display: flex; align-items: center; gap: 4px; }
.lg-exp-row .lg-exp-label { color: var(--text2); }
.lg-exp-row .lg-exp-val { font-weight: 700; font-size: 13px; }
.lg-exp-row .lg-exp-base { color: var(--gold); }
.lg-exp-row .lg-exp-job  { color: var(--blue); }

/* Expand hint */
.lg-expand-hint {
  text-align: center; font-size: 11px; color: var(--text2); padding: 0 0 8px;
  transition: opacity 0.2s;
}
.lg-card.expanded .lg-expand-hint { opacity: 0; }

/* Empty state */
.lg-empty {
  text-align: center; padding: 60px 20px; color: var(--text2);
  font-size: 15px;
}
.lg-empty .lg-empty-icon { font-size: 40px; margin-bottom: 12px; display: block; }

/* Pagination */
.lg-pagination {
  display: flex; justify-content: center; gap: 8px; margin-top: 20px;
  flex-wrap: wrap;
}
.lg-pagination button {
  background: var(--bg2); border: 1px solid var(--border); color: var(--text2);
  padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
  transition: all 0.15s;
}
.lg-pagination button:hover { border-color: var(--accent); color: var(--text); }
.lg-pagination button.active {
  background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 700;
}
.lg-pagination button:disabled { opacity: 0.4; cursor: default; }

/* Loading */
.lg-loading {
  text-align: center; padding: 40px; color: var(--text2); font-size: 14px;
}
  `;
  document.head.appendChild(STYLE);

  // ── Constants ──────────────────────────────────────────────────────────────
  const CARDS_PER_PAGE = 30;
  // Assumed kills per hour (accounting for travel, looting, varied mob difficulty)
  const KILLS_PER_HOUR_BASE = 300;
  // Max level for slider
  const MAX_LEVEL = 99;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Exp penalty when player level is higher than monster */
  function getExpPenalty(playerLv, monsterLv) {
    const diff = playerLv - monsterLv;
    if (diff <= 10) return 1.0;
    if (diff <= 15) return 0.8;
    if (diff <= 20) return 0.6;
    if (diff <= 25) return 0.4;
    return 0.1;
  }

  /** Determine if a map name is a dungeon */
  function isDungeon(mapName) {
    return /dun|cave|_in\d|hell|sewb|treasure|tower|gl_|tur_|alde_|gef_d|pay_d|moc_pry|anthell|sphinx|prt_maze|juperos|abyss|abbey|mag_dun|xmas_dun|orcsdun|iz_dun|lhz_dun|ein_dun|kh_dun|tha_t|thana|gefenia|jupe_core|gon_dun|ama_dun|lou_dun|um_dun|mosk_dun|ayo_dun|odin|nif_fild|ra_san|beach_dun|thor_v/i.test(mapName);
  }

  /** Display name for a map */
  function displayName(mapCode) {
    const dn = (typeof MAP_DISPLAY_NAMES !== 'undefined') ? MAP_DISPLAY_NAMES : {};
    return dn[mapCode] || mapCode;
  }

  /** Format number with commas */
  function fmt(n) {
    if (n == null) return '0';
    return Math.round(n).toLocaleString('en-US');
  }

  /** Star rating HTML (0-5, half-star support) */
  function starsHTML(rating) {
    let html = '<span class="lg-stars">';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        html += '<span class="lg-star filled">\u2605</span>';
      } else if (rating >= i - 0.5) {
        html += '<span class="lg-star half">\u2605</span>';
      } else {
        html += '<span class="lg-star">\u2605</span>';
      }
    }
    html += '</span>';
    return html;
  }

  /** Penalty class for styling */
  function penaltyClass(p) {
    if (p >= 0.8) return 'full';
    if (p >= 0.4) return 'mid';
    return 'low';
  }

  /** Build monster lookup from MONSTERS array */
  function buildMonsterMap() {
    const map = {};
    if (typeof MONSTERS === 'undefined') return map;
    for (const m of MONSTERS) {
      map[m.id] = m;
    }
    return map;
  }

  /** Estimate kills per hour for a monster given player level */
  function estimateKillsPerHour(playerLv, monsterLv, monsterHp) {
    // Simplified: higher level player kills faster; very tough mobs = fewer kills
    // Base: 300 kills/hr for equal-level mob with ~500 HP
    // Scale by HP ratio and level advantage
    const hpFactor = Math.max(0.05, 500 / Math.max(monsterHp, 1));
    const lvAdv = Math.max(0.2, 1 + (playerLv - monsterLv) * 0.03);
    return Math.min(KILLS_PER_HOUR_BASE * 2, Math.max(10, KILLS_PER_HOUR_BASE * hpFactor * lvAdv));
  }

  /** Level range bar color */
  function rangeBarColor(penalty) {
    if (penalty >= 0.8) return 'rgba(46,204,113,0.85)';  // green
    if (penalty >= 0.6) return 'rgba(241,196,15,0.75)';   // gold
    if (penalty >= 0.4) return 'rgba(230,126,34,0.75)';   // orange
    return 'rgba(192,57,43,0.65)';                         // red
  }

  // ── Map Analysis ───────────────────────────────────────────────────────────

  /**
   * Analyze all maps and return scored data.
   * Returns array of { mapCode, displayName, isDungeon, avgLv, minLv, maxLv,
   *   monsters[], score, baseExpHr, jobExpHr, tooLow }
   */
  function analyzeAllMaps(playerLv, monsterMap) {
    const spawns = (typeof MAP_SPAWNS !== 'undefined') ? MAP_SPAWNS : {};
    const results = [];

    for (const [mapCode, mobs] of Object.entries(spawns)) {
      if (!mobs || !mobs.length) continue;

      // Filter out special mobs (respawn timer mobs with very low count, plants, etc.)
      // Keep everything but mark appropriately
      let totalScore = 0;
      let totalBaseExpHr = 0;
      let totalJobExpHr = 0;
      let weightedLvSum = 0;
      let totalCount = 0;
      let minLv = 999;
      let maxLv = 0;
      const monsterDetails = [];
      let allTooLow = true;

      for (const sp of mobs) {
        const count = sp.c || 1;
        const lv = sp.lv || 1;
        const hp = sp.hp || 50;
        const monId = sp.id;

        // Lookup full monster data for exp values
        const full = monsterMap[monId];
        const baseExp = full ? full.baseExp : 0;
        const jobExp = full ? full.jobExp : 0;

        // Skip plants / special 0-exp mobs from scoring
        if (baseExp === 0 && jobExp === 0) continue;

        const penalty = getExpPenalty(playerLv, lv);
        if (penalty > 0.1) allTooLow = false;

        const effectiveBaseExp = baseExp * penalty;
        const effectiveJobExp = jobExp * penalty;

        // Score: weighted by spawn count and exp efficiency
        totalScore += effectiveBaseExp * count;

        // Estimated exp per hour (simplified: assume player can cycle through spawns)
        const killsHr = estimateKillsPerHour(playerLv, lv, hp);
        // Each mob type contributes proportionally to its spawn fraction
        totalBaseExpHr += effectiveBaseExp * Math.min(killsHr, count * 6); // cap by respawn
        totalJobExpHr += effectiveJobExp * Math.min(killsHr, count * 6);

        weightedLvSum += lv * count;
        totalCount += count;
        if (lv < minLv) minLv = lv;
        if (lv > maxLv) maxLv = lv;

        monsterDetails.push({
          id: monId,
          name: sp.n || (full ? full.name : 'Unknown'),
          lv: lv,
          hp: hp,
          count: count,
          baseExp: baseExp,
          jobExp: jobExp,
          penalty: penalty,
          effectiveBaseExp: effectiveBaseExp,
          spriteUrl: full ? full.spriteUrl : null,
        });
      }

      if (totalCount === 0 || monsterDetails.length === 0) continue;

      // Sort monsters by effective exp contribution descending
      monsterDetails.sort((a, b) => (b.effectiveBaseExp * b.count) - (a.effectiveBaseExp * a.count));

      results.push({
        mapCode,
        displayName: displayName(mapCode),
        dungeon: isDungeon(mapCode),
        avgLv: Math.round(weightedLvSum / totalCount),
        minLv,
        maxLv,
        monsters: monsterDetails,
        score: totalScore,
        baseExpHr: totalBaseExpHr,
        jobExpHr: totalJobExpHr,
        tooLow: allTooLow,
        totalCount,
      });
    }

    return results;
  }

  // ── UI Builder ─────────────────────────────────────────────────────────────

  function initLevelGuide() {
    const section = document.getElementById('sec-level-guide');
    if (!section) return;

    const monsterMap = buildMonsterMap();

    // State
    let playerLv = 30;
    let mapTypeFilter = 'all';  // 'all' | 'field' | 'dungeon'
    let sortBy = 'score';       // 'score' | 'baseExp' | 'monLv'
    let searchQ = '';
    let currentPage = 1;

    // ── Build Controls ───────────────────────────────────────────────────────
    section.innerHTML = `
      <div class="lg-controls">
        <div class="lg-ctrl-group">
          <label>Base Level</label>
          <div class="lg-slider-row">
            <span class="lg-lv-display" id="lgLvDisplay">${playerLv}</span>
            <input type="range" id="lgLvSlider" min="1" max="${MAX_LEVEL}" value="${playerLv}">
            <input type="number" id="lgLvInput" min="1" max="${MAX_LEVEL}" value="${playerLv}">
          </div>
        </div>
        <div class="lg-ctrl-group">
          <label>Map Type</label>
          <select id="lgMapType">
            <option value="all">All Maps</option>
            <option value="field">Field Only</option>
            <option value="dungeon">Dungeon Only</option>
          </select>
        </div>
        <div class="lg-ctrl-group">
          <label>Sort By</label>
          <select id="lgSortBy">
            <option value="score">Recommended (Score)</option>
            <option value="baseExp">Base Exp/hr</option>
            <option value="monLv">Monster Level</option>
          </select>
        </div>
        <div class="lg-ctrl-group lg-search-box">
          <label>Search</label>
          <span class="lg-search-icon">\uD83D\uDD0D</span>
          <input type="text" id="lgSearch" placeholder="Map name or monster name...">
        </div>
      </div>
      <div class="lg-summary" id="lgSummary"></div>
      <div id="lgContent"><div class="lg-loading">Calculating recommendations...</div></div>
      <div class="lg-pagination" id="lgPagination"></div>
    `;

    // ── Elements ──────────────────────────────────────────────────────────────
    const elSlider = document.getElementById('lgLvSlider');
    const elNumInput = document.getElementById('lgLvInput');
    const elDisplay = document.getElementById('lgLvDisplay');
    const elMapType = document.getElementById('lgMapType');
    const elSortBy = document.getElementById('lgSortBy');
    const elSearch = document.getElementById('lgSearch');
    const elContent = document.getElementById('lgContent');
    const elSummary = document.getElementById('lgSummary');
    const elPagination = document.getElementById('lgPagination');

    // ── Event Listeners ──────────────────────────────────────────────────────
    elSlider.addEventListener('input', () => {
      playerLv = parseInt(elSlider.value, 10);
      elNumInput.value = playerLv;
      elDisplay.textContent = playerLv;
      currentPage = 1;
      render();
    });

    elNumInput.addEventListener('change', () => {
      let v = parseInt(elNumInput.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > MAX_LEVEL) v = MAX_LEVEL;
      playerLv = v;
      elSlider.value = v;
      elNumInput.value = v;
      elDisplay.textContent = v;
      currentPage = 1;
      render();
    });

    elMapType.addEventListener('change', () => {
      mapTypeFilter = elMapType.value;
      currentPage = 1;
      render();
    });

    elSortBy.addEventListener('change', () => {
      sortBy = elSortBy.value;
      currentPage = 1;
      render();
    });

    let searchTimer;
    elSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQ = elSearch.value.toLowerCase().trim();
        currentPage = 1;
        render();
      }, 200);
    });

    // ── Render ────────────────────────────────────────────────────────────────
    function render() {
      let maps = analyzeAllMaps(playerLv, monsterMap);

      // Filter by map type
      if (mapTypeFilter === 'field') {
        maps = maps.filter(m => !m.dungeon);
      } else if (mapTypeFilter === 'dungeon') {
        maps = maps.filter(m => m.dungeon);
      }

      // Filter by search
      if (searchQ) {
        maps = maps.filter(m => {
          if (m.mapCode.toLowerCase().includes(searchQ)) return true;
          if (m.displayName.toLowerCase().includes(searchQ)) return true;
          if (m.monsters.some(mob => mob.name.toLowerCase().includes(searchQ))) return true;
          return false;
        });
      }

      // Sort
      if (sortBy === 'score') {
        maps.sort((a, b) => b.score - a.score);
      } else if (sortBy === 'baseExp') {
        maps.sort((a, b) => b.baseExpHr - a.baseExpHr);
      } else if (sortBy === 'monLv') {
        maps.sort((a, b) => {
          const da = Math.abs(a.avgLv - playerLv);
          const db = Math.abs(b.avgLv - playerLv);
          return da - db;
        });
      }

      // Push "too low" maps to the end
      maps.sort((a, b) => {
        if (a.tooLow && !b.tooLow) return 1;
        if (!a.tooLow && b.tooLow) return -1;
        return 0;
      });

      // Compute max score for star rating
      const maxScore = maps.reduce((mx, m) => m.tooLow ? mx : Math.max(mx, m.score), 1);

      // Summary
      const totalMaps = maps.length;
      const fieldCount = maps.filter(m => !m.dungeon).length;
      const dungeonCount = maps.filter(m => m.dungeon).length;
      const goodMaps = maps.filter(m => !m.tooLow).length;
      elSummary.innerHTML = `
        <span>Maps found: <b>${totalMaps}</b></span>
        <span>Field: <b>${fieldCount}</b></span>
        <span>Dungeon: <b>${dungeonCount}</b></span>
        <span>Recommended: <b>${goodMaps}</b></span>
      `;

      // Paginate
      const totalPages = Math.max(1, Math.ceil(maps.length / CARDS_PER_PAGE));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * CARDS_PER_PAGE;
      const pageMaps = maps.slice(start, start + CARDS_PER_PAGE);

      if (pageMaps.length === 0) {
        elContent.innerHTML = `<div class="lg-empty"><span class="lg-empty-icon">&#128270;</span>No maps found for the current filters.</div>`;
        elPagination.innerHTML = '';
        return;
      }

      // Build cards
      elContent.innerHTML = '<div class="lg-grid">' + pageMaps.map(m => renderCard(m, maxScore)).join('') + '</div>';
      renderPagination(totalPages);

      // Card expand/collapse listeners
      elContent.querySelectorAll('.lg-card').forEach(card => {
        card.addEventListener('click', () => {
          card.classList.toggle('expanded');
        });
      });

      // Lazy load minimap images
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
              }
              observer.unobserve(img);
            }
          });
        }, { rootMargin: '200px' });
        elContent.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
      } else {
        // Fallback: load all
        elContent.querySelectorAll('img[data-src]').forEach(img => {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        });
      }
    }

    // ── Render single card ────────────────────────────────────────────────────
    function renderCard(m, maxScore) {
      const starRating = m.tooLow ? 0 : Math.round((m.score / maxScore) * 10) / 2; // 0-5 in 0.5 steps
      const typeBadge = m.dungeon
        ? '<span class="lg-type-badge dungeon">Dungeon</span>'
        : '<span class="lg-type-badge field">Field</span>';

      // Level range bar: map 0-99 to 0-100%
      const barMin = Math.max(0, m.minLv);
      const barMax = Math.min(MAX_LEVEL, m.maxLv);
      const optLow = Math.max(0, playerLv - 10);
      const optHigh = Math.min(MAX_LEVEL, playerLv + 10);

      // Positions as percentages of level range (1-99)
      const pct = (lv) => ((lv - 1) / (MAX_LEVEL - 1)) * 100;
      const optLeftPct = pct(optLow);
      const optWidthPct = pct(optHigh) - pct(optLow);
      const mobLeftPct = pct(barMin);
      const mobWidthPct = Math.max(1, pct(barMax) - pct(barMin));

      // Determine the color based on average penalty
      const avgPenalty = m.monsters.reduce((s, mob) => s + mob.penalty * mob.count, 0) / m.totalCount;
      const mobBarColor = rangeBarColor(avgPenalty);

      // Monster rows (all rendered, revealed on expand via CSS max-height)
      const mobRowsHTML = m.monsters.map(mob => {
        const pClass = penaltyClass(mob.penalty);
        const penaltyStr = mob.penalty < 1.0 ? `${Math.round(mob.penalty * 100)}%` : '100%';
        const spriteImg = mob.id
          ? `<img class="lg-mob-sprite" src="https://static.divine-pride.net/images/mobs/png/${mob.id}.png" onerror="this.style.visibility='hidden'" alt="">`
          : '<span class="lg-mob-sprite"></span>';
        return `<div class="lg-mob-row">
          ${spriteImg}
          <span class="lg-mob-name">${escHtml(mob.name)}</span>
          <span class="lg-mob-lv">Lv${mob.lv}</span>
          <span class="lg-mob-cnt">x${mob.count}</span>
          <span class="lg-mob-exp">${fmt(mob.baseExp)} exp</span>
          <span class="lg-mob-penalty ${pClass}">${penaltyStr}</span>
        </div>`;
      }).join('');

      return `
      <div class="lg-card ${m.tooLow ? 'too-low' : ''}">
        <span class="lg-too-low-badge">Too Low</span>
        <div class="lg-card-head">
          <img class="lg-card-mini" data-src="minimaps/${m.mapCode}.png"
               onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22><rect fill=%22%23243034%22 width=%2272%22 height=%2272%22/><text x=%2236%22 y=%2240%22 text-anchor=%22middle%22 fill=%22%2398a8a0%22 font-size=%2210%22>No Map</text></svg>'"
               alt="${escHtml(m.mapCode)}">
          <div class="lg-card-info">
            <h3>${escHtml(m.displayName)} ${typeBadge}</h3>
            <div class="lg-map-code">${escHtml(m.mapCode)}</div>
            <div>${starsHTML(starRating)}</div>
          </div>
        </div>
        <div class="lg-card-meta">
          <span>Avg Lv: <span class="lg-val">${m.avgLv}</span></span>
          <span>Range: <span class="lg-val">${m.minLv}-${m.maxLv}</span></span>
          <span>Mobs: <span class="lg-val">${m.monsters.length} types</span></span>
          <span>Spawns: <span class="lg-val">${m.totalCount}</span></span>
        </div>
        <div class="lg-range-bar-wrap">
          <div class="lg-range-bar">
            <div class="lg-rb-optimal" style="left:${optLeftPct}%;width:${optWidthPct}%"></div>
            <div class="lg-rb-monsters" style="left:${mobLeftPct}%;width:${mobWidthPct}%;background:${mobBarColor}"></div>
          </div>
          <div class="lg-range-labels">
            <span>Lv 1</span>
            <span class="lg-rl-optimal">Optimal: ${optLow}-${optHigh}</span>
            <span>Lv ${MAX_LEVEL}</span>
          </div>
        </div>
        <div class="lg-exp-row">
          <span>
            <span class="lg-exp-label">Base Exp/hr:</span>
            <span class="lg-exp-val lg-exp-base">${fmt(m.baseExpHr)}</span>
          </span>
          <span>
            <span class="lg-exp-label">Job Exp/hr:</span>
            <span class="lg-exp-val lg-exp-job">${fmt(m.jobExpHr)}</span>
          </span>
        </div>
        <div class="lg-expand-hint">Click to show monsters</div>
        <div class="lg-mob-list">${mobRowsHTML}</div>
      </div>`;
    }

    // ── Pagination ────────────────────────────────────────────────────────────
    function renderPagination(totalPages) {
      if (totalPages <= 1) { elPagination.innerHTML = ''; return; }
      let html = '';

      // Prev
      html += `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo; Prev</button>`;

      // Page numbers (show max 7 around current)
      const startP = Math.max(1, currentPage - 3);
      const endP = Math.min(totalPages, currentPage + 3);
      if (startP > 1) html += `<button data-page="1">1</button>`;
      if (startP > 2) html += `<button disabled>...</button>`;
      for (let p = startP; p <= endP; p++) {
        html += `<button data-page="${p}" class="${p === currentPage ? 'active' : ''}">${p}</button>`;
      }
      if (endP < totalPages - 1) html += `<button disabled>...</button>`;
      if (endP < totalPages) html += `<button data-page="${totalPages}">${totalPages}</button>`;

      // Next
      html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next &raquo;</button>`;

      elPagination.innerHTML = html;
      elPagination.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.page, 10);
          if (p >= 1 && p <= totalPages) {
            currentPage = p;
            render();
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    // ── Utility ───────────────────────────────────────────────────────────────
    function escHtml(s) {
      if (!s) return '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Initial Render ────────────────────────────────────────────────────────
    render();
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  window.initLevelGuide = initLevelGuide;
})();
