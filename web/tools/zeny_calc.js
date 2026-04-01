// Zeny/Income Calculator for ROC Classic TH Database
// Self-contained module: builds UI inside #sec-zeny-calc
// Depends on globals: MONSTERS, MAP_SPAWNS, ITEM_PRICES, MAP_DISPLAY_NAMES

(function() {
  'use strict';

  // ── Inject CSS ──────────────────────────────────────────────────────
  const STYLE = document.createElement('style');
  STYLE.textContent = `
    /* Zeny Calculator Styles */
    #sec-zeny-calc {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      color: var(--text, #f0f0f0);
    }

    .zc-controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 16px;
      padding: 14px 18px;
      background: var(--bg2, #1e2628);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 8px;
    }
    .zc-controls label {
      font-size: 13px;
      color: var(--text2, #98a8a0);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .zc-controls input[type="number"],
    .zc-controls select {
      background: var(--bg3, #243034);
      color: var(--text, #f0f0f0);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .zc-controls input[type="number"]:focus,
    .zc-controls select:focus {
      border-color: var(--accent, #2ecc71);
    }
    .zc-controls input[type="number"] {
      width: 80px;
    }

    .zc-search-wrap {
      flex: 1 1 220px;
      position: relative;
    }
    .zc-search {
      width: 100%;
      background: var(--bg3, #243034);
      color: var(--text, #f0f0f0);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 4px;
      padding: 6px 10px 6px 30px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .zc-search:focus {
      border-color: var(--accent, #2ecc71);
    }
    .zc-search-icon {
      position: absolute;
      left: 9px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text2, #98a8a0);
      font-size: 14px;
      pointer-events: none;
    }

    .zc-summary-bar {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 14px;
      padding: 10px 16px;
      background: var(--bg2, #1e2628);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 6px;
      font-size: 13px;
      color: var(--text2, #98a8a0);
    }
    .zc-summary-bar span {
      color: var(--text, #f0f0f0);
      font-weight: 600;
    }

    .zc-table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border, #2c3a38);
      border-radius: 8px;
      background: var(--bg2, #1e2628);
    }
    .zc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 700px;
    }
    .zc-table thead {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .zc-table th {
      background: var(--bg3, #243034);
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: var(--text2, #98a8a0);
      border-bottom: 2px solid var(--border, #2c3a38);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: color 0.15s;
    }
    .zc-table th:hover {
      color: var(--text, #f0f0f0);
    }
    .zc-table th.zc-sort-active {
      color: var(--gold, #f1c40f);
    }
    .zc-table th .zc-sort-arrow {
      margin-left: 4px;
      font-size: 10px;
      opacity: 0.4;
    }
    .zc-table th.zc-sort-active .zc-sort-arrow {
      opacity: 1;
    }
    .zc-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border, #2c3a38);
      vertical-align: middle;
    }
    .zc-table tbody tr {
      cursor: pointer;
      transition: background 0.15s;
    }
    .zc-table tbody tr:hover {
      background: rgba(46, 204, 113, 0.06);
    }
    .zc-table tbody tr.zc-top5 {
      border-left: 3px solid var(--gold, #f1c40f);
    }
    .zc-table tbody tr.zc-expanded-active {
      background: rgba(46, 204, 113, 0.1);
    }

    .zc-rank {
      font-weight: 700;
      color: var(--text2, #98a8a0);
      text-align: center;
      width: 45px;
    }
    .zc-rank-top {
      color: var(--gold, #f1c40f);
    }
    .zc-map-name {
      font-weight: 600;
      color: var(--text, #f0f0f0);
    }
    .zc-map-code {
      font-size: 11px;
      color: var(--text2, #98a8a0);
      margin-left: 4px;
    }
    .zc-val-zeny {
      color: var(--gold, #f1c40f);
      font-weight: 600;
    }
    .zc-val-exp {
      color: var(--accent, #2ecc71);
      font-weight: 600;
    }
    .zc-val-job {
      color: var(--blue, #5dade2);
      font-weight: 600;
    }
    .zc-na {
      color: var(--text2, #98a8a0);
      font-style: italic;
    }

    /* Detail / Expanded Row */
    .zc-detail-row td {
      padding: 0 !important;
      border-bottom: 2px solid var(--accent, #2ecc71);
    }
    .zc-detail-content {
      padding: 16px 20px;
      background: var(--bg, #171c1e);
      animation: zcSlideDown 0.2s ease-out;
    }
    @keyframes zcSlideDown {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 2000px; }
    }
    .zc-detail-header {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .zc-detail-minimap {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid var(--border, #2c3a38);
      background: var(--bg2, #1e2628);
      flex-shrink: 0;
    }
    .zc-detail-info h3 {
      font-size: 16px;
      color: var(--gold, #f1c40f);
      margin-bottom: 6px;
    }
    .zc-detail-info p {
      font-size: 13px;
      color: var(--text2, #98a8a0);
      margin-bottom: 3px;
    }
    .zc-detail-info .zc-best-monster {
      color: var(--accent, #2ecc71);
      font-weight: 600;
    }

    .zc-mob-table-wrap {
      overflow-x: auto;
      border-radius: 6px;
      border: 1px solid var(--border, #2c3a38);
    }
    .zc-mob-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      min-width: 600px;
    }
    .zc-mob-table th {
      background: var(--bg3, #243034);
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
      color: var(--text2, #98a8a0);
      border-bottom: 1px solid var(--border, #2c3a38);
      cursor: default;
    }
    .zc-mob-table td {
      padding: 6px 10px;
      border-bottom: 1px solid rgba(44, 58, 56, 0.5);
      vertical-align: top;
    }
    .zc-mob-table tbody tr:last-child td {
      border-bottom: none;
    }

    .zc-drop-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .zc-drop-list li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 2px 0;
      font-size: 11px;
      color: var(--text2, #98a8a0);
      border-bottom: 1px dashed rgba(44, 58, 56, 0.4);
    }
    .zc-drop-list li:last-child {
      border-bottom: none;
    }
    .zc-drop-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zc-drop-rate {
      flex-shrink: 0;
      width: 55px;
      text-align: right;
      color: var(--text2, #98a8a0);
    }
    .zc-drop-price {
      flex-shrink: 0;
      width: 55px;
      text-align: right;
      color: var(--text2, #98a8a0);
    }
    .zc-drop-ev {
      flex-shrink: 0;
      width: 60px;
      text-align: right;
      font-weight: 600;
      color: var(--gold, #f1c40f);
    }
    .zc-mob-zeny-total {
      font-weight: 700;
      color: var(--gold, #f1c40f);
    }

    /* Pagination */
    .zc-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .zc-page-btn {
      background: var(--bg3, #243034);
      color: var(--text2, #98a8a0);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 4px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .zc-page-btn:hover:not(:disabled) {
      background: var(--bg2, #1e2628);
      color: var(--text, #f0f0f0);
      border-color: var(--accent, #2ecc71);
    }
    .zc-page-btn:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .zc-page-btn.zc-page-active {
      background: var(--accent, #2ecc71);
      color: #000;
      border-color: var(--accent, #2ecc71);
      font-weight: 600;
    }
    .zc-page-info {
      font-size: 12px;
      color: var(--text2, #98a8a0);
      margin: 0 8px;
    }

    .zc-build-btn {
      background: var(--bg3, #243034);
      color: var(--text2, #98a8a0);
      border: 1px solid var(--border, #2c3a38);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .zc-build-btn:hover {
      border-color: var(--accent, #2ecc71);
      color: var(--accent, #2ecc71);
    }
    .zc-build-btn.active {
      background: var(--accent, #2ecc71);
      color: #000;
      border-color: var(--accent, #2ecc71);
    }

    .zc-empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--text2, #98a8a0);
      font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .zc-controls {
        padding: 10px 12px;
        gap: 8px;
      }
      .zc-controls label {
        font-size: 12px;
      }
      .zc-detail-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(STYLE);


  // ── State ──────────────────────────────────────────────────────────
  let mapDataCache = [];     // Pre-calculated map income data
  let filteredData = [];     // After search filter
  let killsPerHour = 200;
  let dropRateMult = 1;
  let sortKey = 'zenyHr';
  let sortDir = -1;          // -1 = desc
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let expandedMap = null;
  let useBuildKills = false;

  // Monster lookup by ID
  let monsterById = {};


  // ── Initialization ─────────────────────────────────────────────────
  function initZenyCalc() {
    const container = document.getElementById('sec-zeny-calc');
    if (!container) return;

    // Build monster lookup
    if (typeof MONSTERS !== 'undefined' && Array.isArray(MONSTERS)) {
      MONSTERS.forEach(m => { monsterById[m.id] = m; });
    }

    // Build UI skeleton
    container.innerHTML = buildUI();

    // Bind events
    bindEvents(container);

    // Calculate and render
    recalcAll();
  }


  // ── Build UI HTML ──────────────────────────────────────────────────
  function buildUI() {
    return `
      <div class="zc-controls">
        <label>
          Kills/hr:
          <input type="number" id="zc-kills" value="200" min="50" max="500" step="10">
        </label>
        <button id="zc-use-build" class="zc-build-btn" title="Auto-calculate kills/hr from Build Simulator">Use Build</button>
        <label>
          Drop Rate:
          <select id="zc-droprate">
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="5">5x</option>
          </select>
        </label>
        <label>
          Sort:
          <select id="zc-sortby">
            <option value="zenyHr">Zeny/hr</option>
            <option value="baseExpHr">Base Exp/hr</option>
            <option value="jobExpHr">Job Exp/hr</option>
            <option value="efficiency">Efficiency</option>
          </select>
        </label>
        <div class="zc-search-wrap">
          <span class="zc-search-icon">&#128269;</span>
          <input type="text" class="zc-search" id="zc-search" placeholder="Search map or monster name...">
        </div>
      </div>
      <div class="zc-summary-bar" id="zc-summary"></div>
      <div class="zc-table-wrap">
        <table class="zc-table">
          <thead>
            <tr>
              <th data-col="rank" style="width:45px">#</th>
              <th data-col="map">Map</th>
              <th data-col="monsters" style="width:70px">Monsters</th>
              <th data-col="avgLv" style="width:70px">Avg Lv</th>
              <th data-col="zenyHr">Zeny/hr</th>
              <th data-col="baseExpHr">Base Exp/hr</th>
              <th data-col="jobExpHr">Job Exp/hr</th>
            </tr>
          </thead>
          <tbody id="zc-tbody"></tbody>
        </table>
      </div>
      <div class="zc-pagination" id="zc-pagination"></div>
    `;
  }


  // ── Event Binding ──────────────────────────────────────────────────
  function bindEvents(container) {
    // Kills per hour
    const killsInput = container.querySelector('#zc-kills');
    killsInput.addEventListener('input', function() {
      let v = parseInt(this.value, 10);
      if (isNaN(v)) v = 200;
      if (v < 50) v = 50;
      if (v > 500) v = 500;
      killsPerHour = v;
      recalcDerived();
      renderTable();
    });

    // Drop rate multiplier
    const dropSelect = container.querySelector('#zc-droprate');
    dropSelect.addEventListener('change', function() {
      dropRateMult = parseInt(this.value, 10);
      recalcAll();
    });

    // Sort dropdown
    const sortSelect = container.querySelector('#zc-sortby');
    sortSelect.addEventListener('change', function() {
      sortKey = this.value;
      sortDir = -1;
      applySort();
      renderTable();
    });

    // Column header sort
    container.querySelectorAll('.zc-table th[data-col]').forEach(th => {
      th.addEventListener('click', function() {
        const col = this.dataset.col;
        if (col === 'rank') return;
        const colToKey = {
          map: 'displayName',
          monsters: 'totalCount',
          avgLv: 'avgLv',
          zenyHr: 'zenyHr',
          baseExpHr: 'baseExpHr',
          jobExpHr: 'jobExpHr'
        };
        const key = colToKey[col];
        if (!key) return;
        if (sortKey === key) {
          sortDir *= -1;
        } else {
          sortKey = key;
          sortDir = (key === 'displayName') ? 1 : -1;
        }
        // Sync dropdown if applicable
        if (['zenyHr', 'baseExpHr', 'jobExpHr', 'efficiency'].includes(key)) {
          sortSelect.value = key;
        }
        applySort();
        renderTable();
      });
    });

    // Use Build button
    const buildBtn = container.querySelector('#zc-use-build');
    if (buildBtn) {
      buildBtn.addEventListener('click', function () {
        useBuildKills = !useBuildKills;
        this.classList.toggle('active', useBuildKills);
        killsInput.disabled = useBuildKills;
        if (useBuildKills) {
          recalcDerived();
          renderTable();
        } else {
          recalcDerived();
          renderTable();
        }
      });
    }

    // Listen for build state changes
    if (window.ROC_BUILD) {
      ROC_BUILD.on('*', function () {
        if (useBuildKills && mapDataCache.length > 0) {
          recalcDerived();
          renderTable();
        }
      });
    }

    // Search with debounce
    let searchTimer = null;
    const searchInput = container.querySelector('#zc-search');
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      const query = this.value;
      searchTimer = setTimeout(() => {
        applyFilter(query);
        currentPage = 1;
        renderTable();
      }, 300);
    });
  }


  // ── Calculation Engine ─────────────────────────────────────────────

  function getItemSellPrice(itemId) {
    if (typeof ITEM_PRICES === 'undefined') return 0;
    const entry = ITEM_PRICES[String(itemId)];
    if (!entry) return 0;
    return entry.sell || 0;
  }

  function calcMonsterZeny(monster, mult) {
    // Calculate expected zeny per kill from NPC-selling all drops
    if (!monster || !monster.drops) return 0;
    let total = 0;
    monster.drops.forEach(drop => {
      const sellPrice = getItemSellPrice(drop.itemId);
      if (sellPrice <= 0) return;
      // drop.rate is per 10000; apply multiplier, cap at 10000
      const effectiveRate = Math.min(drop.rate * mult, 10000);
      total += (effectiveRate / 10000) * sellPrice;
    });
    return total;
  }

  function calcMonsterDropDetails(monster, mult) {
    // Returns array of drop details for display
    if (!monster || !monster.drops) return [];
    return monster.drops.map(drop => {
      const sellPrice = getItemSellPrice(drop.itemId);
      const effectiveRate = Math.min(drop.rate * mult, 10000);
      const ratePercent = effectiveRate / 100;
      const expectedValue = sellPrice > 0 ? (effectiveRate / 10000) * sellPrice : 0;
      return {
        itemId: drop.itemId,
        itemName: drop.itemName,
        rate: drop.rate,
        effectiveRate: effectiveRate,
        ratePercent: ratePercent,
        sellPrice: sellPrice,
        expectedValue: expectedValue
      };
    });
  }

  function buildMapData(mult) {
    // Pre-calculate income data for every map in MAP_SPAWNS
    if (typeof MAP_SPAWNS === 'undefined') return [];
    const results = [];
    const hasPrices = (typeof ITEM_PRICES !== 'undefined');

    for (const mapName in MAP_SPAWNS) {
      const spawns = MAP_SPAWNS[mapName];
      if (!spawns || spawns.length === 0) continue;

      let totalCount = 0;
      let weightedZeny = 0;
      let weightedBaseExp = 0;
      let weightedJobExp = 0;
      let weightedLevel = 0;
      let monsterDetails = [];

      spawns.forEach(sp => {
        const count = sp.c || 0;
        totalCount += count;

        // Find full monster data by ID
        const fullMon = monsterById[sp.id];
        const zenyPerKill = fullMon ? calcMonsterZeny(fullMon, mult) : 0;
        const baseExp = fullMon ? (fullMon.baseExp || 0) : 0;
        const jobExp = fullMon ? (fullMon.jobExp || 0) : 0;
        const level = sp.lv || (fullMon ? fullMon.level : 0);

        weightedZeny += zenyPerKill * count;
        weightedBaseExp += baseExp * count;
        weightedJobExp += jobExp * count;
        weightedLevel += level * count;

        monsterDetails.push({
          name: sp.n || (fullMon ? fullMon.name : 'Unknown'),
          id: sp.id,
          count: count,
          level: level,
          hp: sp.hp || (fullMon ? fullMon.hp : 0),
          baseExp: baseExp,
          jobExp: jobExp,
          zenyPerKill: zenyPerKill,
          race: sp.race || (fullMon ? fullMon.race : ''),
          element: sp.el || (fullMon ? fullMon.element : ''),
          fullMonster: fullMon
        });
      });

      if (totalCount === 0) continue;

      const avgZeny = weightedZeny / totalCount;
      const avgBaseExp = weightedBaseExp / totalCount;
      const avgJobExp = weightedJobExp / totalCount;
      const avgLv = weightedLevel / totalCount;

      // Display name
      let displayName = mapName;
      if (typeof MAP_DISPLAY_NAMES !== 'undefined' && MAP_DISPLAY_NAMES[mapName]) {
        displayName = MAP_DISPLAY_NAMES[mapName];
      }

      // Sort monster details by zeny per kill descending
      monsterDetails.sort((a, b) => b.zenyPerKill - a.zenyPerKill);

      results.push({
        mapName: mapName,
        displayName: displayName,
        totalCount: totalCount,
        avgLv: avgLv,
        avgZeny: avgZeny,
        avgBaseExp: avgBaseExp,
        avgJobExp: avgJobExp,
        // These will be recalculated on kills/hr change
        zenyHr: 0,
        baseExpHr: 0,
        jobExpHr: 0,
        efficiency: 0,
        monsters: monsterDetails,
        hasPrices: hasPrices,
        // Search text (lowercase)
        _searchText: (displayName + ' ' + mapName + ' ' +
          monsterDetails.map(m => m.name).join(' ')).toLowerCase()
      });
    }

    return results;
  }

  /** Walk time between mobs based on map spawn density */
  function getWalkTime(mapTotalCount) {
    // More spawns = mobs closer together = less walk time
    // Reference: 50 mobs → 3s walk, scale inversely
    var t = 3.0 * (50 / Math.max(mapTotalCount, 1));
    return Math.max(0.5, Math.min(t, 15));
  }

  /** Estimate kills/hr for a specific monster using Build Simulator DPS */
  function getBuildKillsPerHour(monster, mapTotalCount) {
    if (!window.ROC_BUILD || !ROC_BUILD.calcDamageVsMonster) return killsPerHour;
    var monHP = monster.hp || 1;
    var dps = ROC_BUILD.calcDamageVsMonster(monster);
    if (dps <= 0) return 0;
    var timeToKill = monHP / dps;
    var walkTime = getWalkTime(mapTotalCount || 50);
    return Math.max(1, Math.floor(3600 / (timeToKill + walkTime)));
  }

  function recalcDerived() {
    // Recalculate hr-based values from cached avg values
    mapDataCache.forEach(md => {
      if (useBuildKills && window.ROC_BUILD && ROC_BUILD.calcDamageVsMonster) {
        // Auto-calc: per-monster kills/hr weighted by spawn count
        var totalZenyHr = 0, totalBaseHr = 0, totalJobHr = 0;
        md.monsters.forEach(mob => {
          var fullMon = mob.fullMonster || monsterById[mob.id];
          var kph = fullMon ? getBuildKillsPerHour(fullMon, md.totalCount) : killsPerHour;
          mob._autoKillsHr = kph;
          totalZenyHr += mob.zenyPerKill * kph;
          totalBaseHr += mob.baseExp * kph;
          totalJobHr += mob.jobExp * kph;
        });
        md.zenyHr = totalZenyHr;
        md.baseExpHr = totalBaseHr;
        md.jobExpHr = totalJobHr;
      } else {
        md.zenyHr = md.avgZeny * killsPerHour;
        md.baseExpHr = md.avgBaseExp * killsPerHour;
        md.jobExpHr = md.avgJobExp * killsPerHour;
      }
      // Efficiency: normalized combined score (zeny + exp)
      // We'll normalize after all are calculated
    });

    // Normalize efficiency: rank by zeny percentile + exp percentile
    if (mapDataCache.length > 0) {
      const maxZeny = Math.max(...mapDataCache.map(m => m.zenyHr), 1);
      const maxBase = Math.max(...mapDataCache.map(m => m.baseExpHr), 1);
      const maxJob = Math.max(...mapDataCache.map(m => m.jobExpHr), 1);
      mapDataCache.forEach(md => {
        md.efficiency = (md.zenyHr / maxZeny) * 40 +
                        (md.baseExpHr / maxBase) * 35 +
                        (md.jobExpHr / maxJob) * 25;
      });
    }

    // Also update filtered data reference values
    applyFilter(document.getElementById('zc-search') ? document.getElementById('zc-search').value : '');
  }

  function recalcAll() {
    mapDataCache = buildMapData(dropRateMult);
    recalcDerived();
    applySort();
    currentPage = 1;
    renderTable();
  }

  function applySort() {
    filteredData.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === 'string') {
        return sortDir * av.localeCompare(bv);
      }
      return sortDir * (av - bv);
    });
  }

  function applyFilter(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredData = mapDataCache.slice();
    } else {
      filteredData = mapDataCache.filter(md => md._searchText.includes(q));
    }
    applySort();
  }


  // ── Rendering ──────────────────────────────────────────────────────

  function fmt(n) {
    if (n == null || isNaN(n)) return '0';
    return Math.floor(n).toLocaleString();
  }

  function fmtDec(n, decimals) {
    if (n == null || isNaN(n)) return '0';
    return n.toLocaleString(undefined, { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
  }

  function renderTable() {
    const tbody = document.getElementById('zc-tbody');
    const pagination = document.getElementById('zc-pagination');
    const summary = document.getElementById('zc-summary');
    if (!tbody) return;

    // Summary
    const totalMaps = filteredData.length;
    const topMap = filteredData.length > 0 ? filteredData[0] : null;
    const killsLabel = useBuildKills ? '<span style="color:var(--accent)">Build DPS (per mob)</span>' : `<span>${killsPerHour}</span>`;
    summary.innerHTML = `
      Maps: <span>${totalMaps}</span>
      ${topMap ? `&nbsp;|&nbsp; Best (${escHtml(sortKeyLabel())}): <span style="color:var(--gold)">${escHtml(topMap.displayName)}</span>` : ''}
      &nbsp;|&nbsp; Kills/hr: ${killsLabel}
      &nbsp;|&nbsp; Drop Rate: <span>${dropRateMult}x</span>
    `;

    // Update sort arrows
    const thead = tbody.closest('table').querySelector('thead');
    thead.querySelectorAll('th[data-col]').forEach(th => {
      const col = th.dataset.col;
      const colToKey = {
        map: 'displayName',
        monsters: 'totalCount',
        avgLv: 'avgLv',
        zenyHr: 'zenyHr',
        baseExpHr: 'baseExpHr',
        jobExpHr: 'jobExpHr'
      };
      const key = colToKey[col];
      const isActive = (key === sortKey);
      th.classList.toggle('zc-sort-active', isActive);
      // Update arrow
      const arrowSpan = th.querySelector('.zc-sort-arrow');
      if (arrowSpan) {
        arrowSpan.textContent = isActive ? (sortDir > 0 ? '\u25B2' : '\u25BC') : '\u25BC';
      }
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = filteredData.slice(start, start + PAGE_SIZE);

    // Determine top 5 ranks (from sorted full list, not just page)
    const top5Maps = new Set();
    for (let i = 0; i < Math.min(5, filteredData.length); i++) {
      top5Maps.add(filteredData[i].mapName);
    }

    // Build rows
    let html = '';
    pageData.forEach((md, i) => {
      const globalRank = start + i + 1;
      const isTop5 = top5Maps.has(md.mapName);
      const isExpanded = (expandedMap === md.mapName);
      const rankClass = isTop5 ? 'zc-rank zc-rank-top' : 'zc-rank';
      const rowClass = (isTop5 ? 'zc-top5' : '') + (isExpanded ? ' zc-expanded-active' : '');

      html += `<tr class="${rowClass}" data-map="${escAttr(md.mapName)}">
        <td class="${rankClass}">${globalRank}</td>
        <td>
          <span class="zc-map-name">${escHtml(md.displayName)}</span>
          <span class="zc-map-code">(${escHtml(md.mapName)})</span>
        </td>
        <td>${md.totalCount}</td>
        <td>${fmtDec(md.avgLv, 1)}</td>
        <td class="${md.hasPrices ? 'zc-val-zeny' : 'zc-na'}">${md.hasPrices ? fmt(md.zenyHr) : 'N/A'}</td>
        <td class="zc-val-exp">${fmt(md.baseExpHr)}</td>
        <td class="zc-val-job">${fmt(md.jobExpHr)}</td>
      </tr>`;

      // Expanded detail row
      if (isExpanded) {
        html += buildDetailRow(md);
      }
    });

    if (pageData.length === 0) {
      html = '<tr><td colspan="7" class="zc-empty">No maps found</td></tr>';
    }

    tbody.innerHTML = html;

    // Bind row click events
    tbody.querySelectorAll('tr[data-map]').forEach(tr => {
      tr.addEventListener('click', function() {
        const map = this.dataset.map;
        if (expandedMap === map) {
          expandedMap = null;
        } else {
          expandedMap = map;
        }
        renderTable();
      });
    });

    // Pagination controls
    renderPagination(pagination, totalPages);
  }

  function sortKeyLabel() {
    const labels = {
      zenyHr: 'Zeny/hr',
      baseExpHr: 'Base Exp/hr',
      jobExpHr: 'Job Exp/hr',
      efficiency: 'Efficiency',
      displayName: 'Name',
      totalCount: 'Monsters',
      avgLv: 'Avg Lv'
    };
    return labels[sortKey] || sortKey;
  }

  function buildDetailRow(md) {
    const colspan = 7;
    let mobRows = '';

    md.monsters.forEach(mob => {
      const drops = mob.fullMonster ? calcMonsterDropDetails(mob.fullMonster, dropRateMult) : [];
      const valuableDrops = drops.filter(d => d.sellPrice > 0);

      let dropsHtml = '';
      if (valuableDrops.length > 0) {
        dropsHtml = '<ul class="zc-drop-list">';
        valuableDrops.forEach(d => {
          dropsHtml += `<li>
            <span class="zc-drop-name" title="${escAttr(d.itemName)}">${escHtml(d.itemName)}</span>
            <span class="zc-drop-rate">${fmtDec(d.ratePercent, 2)}%</span>
            <span class="zc-drop-price">${fmt(d.sellPrice)}z</span>
            <span class="zc-drop-ev">${fmtDec(d.expectedValue, 1)}z</span>
          </li>`;
        });
        dropsHtml += '</ul>';
      } else {
        dropsHtml = '<span class="zc-na">No sellable drops</span>';
      }

      mobRows += `<tr>
        <td style="font-weight:600">${escHtml(mob.name)}</td>
        <td style="text-align:center">${mob.count}</td>
        <td style="text-align:center">${mob.level}</td>
        <td style="text-align:right">${fmt(mob.hp)}</td>
        <td>${dropsHtml}</td>
        <td class="zc-mob-zeny-total" style="text-align:right">${fmtDec(mob.zenyPerKill, 1)}z</td>
      </tr>`;
    });

    // Best monster
    const bestMon = md.monsters.length > 0 ? md.monsters[0] : null;
    const bestMonLabel = bestMon ? `${bestMon.name} (${fmtDec(bestMon.zenyPerKill, 1)}z/kill)` : 'N/A';

    // Minimap path
    const minimapSrc = `minimaps/${md.mapName}.png`;

    return `<tr class="zc-detail-row"><td colspan="${colspan}">
      <div class="zc-detail-content">
        <div class="zc-detail-header">
          <img class="zc-detail-minimap" src="${escAttr(minimapSrc)}"
               alt="${escAttr(md.mapName)}"
               onerror="this.style.display='none'">
          <div class="zc-detail-info">
            <h3>${escHtml(md.displayName)}</h3>
            <p>Map: <strong>${escHtml(md.mapName)}</strong> | Total Spawns: <strong>${md.totalCount}</strong> | Avg Level: <strong>${fmtDec(md.avgLv, 1)}</strong></p>
            <p>Estimated Zeny/hr: <span class="zc-val-zeny">${fmt(md.zenyHr)}</span> | Base Exp/hr: <span class="zc-val-exp">${fmt(md.baseExpHr)}</span> | Job Exp/hr: <span class="zc-val-job">${fmt(md.jobExpHr)}</span></p>
            <p>Best Monster: <span class="zc-best-monster">${escHtml(bestMonLabel)}</span></p>
          </div>
        </div>
        <div class="zc-mob-table-wrap">
          <table class="zc-mob-table">
            <thead>
              <tr>
                <th>Monster</th>
                <th style="text-align:center;width:55px">Count</th>
                <th style="text-align:center;width:50px">Level</th>
                <th style="text-align:right;width:65px">HP</th>
                <th>Drops (Name / Rate / NPC Price / EV)</th>
                <th style="text-align:right;width:90px">Zeny/kill</th>
              </tr>
            </thead>
            <tbody>${mobRows}</tbody>
          </table>
        </div>
      </div>
    </td></tr>`;
  }

  function renderPagination(container, totalPages) {
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    html += `<button class="zc-page-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>&laquo; Prev</button>`;

    // Page numbers - show up to 7 pages with ellipsis
    const pages = buildPageNumbers(currentPage, totalPages, 7);
    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="zc-page-info">...</span>`;
      } else {
        const active = p === currentPage ? 'zc-page-active' : '';
        html += `<button class="zc-page-btn ${active}" data-page="${p}">${p}</button>`;
      }
    });

    html += `<button class="zc-page-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>Next &raquo;</button>`;
    html += `<span class="zc-page-info">(${filteredData.length} maps)</span>`;

    container.innerHTML = html;

    // Bind pagination events
    container.querySelectorAll('.zc-page-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const p = this.dataset.page;
        if (p === 'prev') {
          if (currentPage > 1) currentPage--;
        } else if (p === 'next') {
          if (currentPage < totalPages) currentPage++;
        } else {
          currentPage = parseInt(p, 10);
        }
        expandedMap = null;
        renderTable();
        // Scroll table into view
        const wrap = document.querySelector('.zc-table-wrap');
        if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function buildPageNumbers(current, total, maxVisible) {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    const half = Math.floor(maxVisible / 2);
    let rangeStart = Math.max(2, current - half);
    let rangeEnd = Math.min(total - 1, current + half);

    // Adjust range to always show maxVisible-2 middle pages
    const needed = maxVisible - 2;
    if (rangeEnd - rangeStart + 1 < needed) {
      if (rangeStart === 2) {
        rangeEnd = Math.min(total - 1, rangeStart + needed - 1);
      } else {
        rangeStart = Math.max(2, rangeEnd - needed + 1);
      }
    }

    pages.push(1);
    if (rangeStart > 2) pages.push('...');
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }


  // ── Helpers ────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  // ── Export ─────────────────────────────────────────────────────────
  window.initZenyCalc = initZenyCalc;

})();
