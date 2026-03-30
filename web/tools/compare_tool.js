// ============================================================
//  RO Classic Item / Monster Compare Tool
//  Vanilla JS module for ROC Database TH
//  Loaded via <script src="tools/compare_tool.js"> in index.html
//  Renders UI inside #sec-compare
// ============================================================

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────
  const ITEM_IMG_BASE = 'https://static.divine-pride.net/images/items/collection/';
  const MOB_IMG_BASE  = 'https://static.divine-pride.net/images/mobs/png/';

  const SIZE_LABELS   = { Small: 'Small', Medium: 'Medium', Large: 'Large' };
  const DEBOUNCE_MS   = 200;
  const MAX_RESULTS   = 10;

  // Stats where LOWER is better for items
  const LOWER_IS_BETTER = new Set(['w', 'rlv']);

  // Item stat definitions: key, label, format function
  const ITEM_STATS = [
    { key: 'cat',   label: 'Type',           fmt: v => v || '-',                   numeric: false },
    { key: 'wtype', label: 'Weapon Type',    fmt: v => v || '-',                   numeric: false },
    { key: 'atk',   label: 'ATK',            fmt: v => v || 0,                     numeric: true  },
    { key: 'matk',  label: 'MATK',           fmt: v => v || 0,                     numeric: true  },
    { key: 'def',   label: 'DEF',            fmt: v => v || 0,                     numeric: true  },
    { key: 'w',     label: 'Weight',         fmt: v => v != null ? v / 10 : 0,     numeric: true  },
    { key: 'slots', label: 'Slots',          fmt: v => v != null ? v : 0,          numeric: true  },
    { key: 'rlv',   label: 'Req Level',      fmt: v => v || 0,                     numeric: true  },
    { key: 'wlv',   label: 'Weapon Level',   fmt: v => v || 0,                     numeric: true  },
  ];

  // Monster stat definitions
  const MOB_STATS = [
    { key: 'level',        label: 'Level',         fmt: v => num(v),                               numeric: true  },
    { key: 'hp',           label: 'HP',            fmt: v => num(v),                               numeric: true  },
    { key: 'sp',           label: 'SP',            fmt: v => num(v),                               numeric: true  },
    { key: 'atk',          label: 'ATK',           fmt: v => Array.isArray(v) ? `${num(v[0])} - ${num(v[1])}` : num(v), numeric: true, cmpVal: v => Array.isArray(v) ? (v[0] + v[1]) / 2 : (v || 0) },
    { key: 'def',          label: 'DEF',           fmt: v => num(v),                               numeric: true  },
    { key: 'mdef',         label: 'MDEF',          fmt: v => num(v),                               numeric: true  },
    { key: 'hit',          label: 'HIT',           fmt: v => num(v),                               numeric: true  },
    { key: 'flee',         label: 'FLEE',          fmt: v => num(v),                               numeric: true  },
    { key: 'str',          label: 'STR',           fmt: v => num(v),                               numeric: true  },
    { key: 'agi',          label: 'AGI',           fmt: v => num(v),                               numeric: true  },
    { key: 'vit',          label: 'VIT',           fmt: v => num(v),                               numeric: true  },
    { key: 'int',          label: 'INT',           fmt: v => num(v),                               numeric: true  },
    { key: 'dex',          label: 'DEX',           fmt: v => num(v),                               numeric: true  },
    { key: 'luk',          label: 'LUK',           fmt: v => num(v),                               numeric: true  },
    { key: 'attackRange',  label: 'Atk Range',     fmt: v => v || 0,                               numeric: true  },
    { key: 'size',         label: 'Size',          fmt: v => v || '-',                             numeric: false },
    { key: 'race',         label: 'Race',          fmt: v => v || '-',                             numeric: false },
    { key: 'element',      label: 'Element',       fmt: v => v || '-',                             numeric: false },
    { key: 'baseExp',      label: 'Base Exp',      fmt: v => num(v),                               numeric: true  },
    { key: 'jobExp',       label: 'Job Exp',       fmt: v => num(v),                               numeric: true  },
    { key: 'walkSpeed',    label: 'Walk Speed',    fmt: v => v || 0,                               numeric: true  },
    { key: 'attackDelay',  label: 'Atk Delay',     fmt: v => v ? `${num(v)} ms` : '0',            numeric: true, cmpVal: v => v || 0  },
    { key: 'attackMotion', label: 'Atk Motion',    fmt: v => v ? `${num(v)} ms` : '0',            numeric: true, cmpVal: v => v || 0  },
    { key: 'damageMotion', label: 'Dmg Motion',    fmt: v => v ? `${num(v)} ms` : '0',            numeric: true, cmpVal: v => v || 0  },
    { key: 'class',        label: 'Class',         fmt: v => v || 'Normal',                        numeric: false },
  ];

  // ─── Helpers ─────────────────────────────────────────────────
  function num(v) {
    if (v == null) return '0';
    return Number(v).toLocaleString();
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  // ─── State ───────────────────────────────────────────────────
  let mode = 'items';   // 'items' | 'monsters'
  let selectedA = null; // selected data object for side A
  let selectedB = null; // selected data object for side B

  // DOM refs (set during buildUI)
  let root = null;

  // ─── Inject Styles ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('compare-tool-styles')) return;
    const style = document.createElement('style');
    style.id = 'compare-tool-styles';
    style.textContent = `
/* ── Compare Tool ────────────────────────────────────────── */
.cmp-wrap {
  max-width: 1200px;
  margin: 0 auto;
}

/* Mode toggle */
.cmp-mode-bar {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}
.cmp-mode-btn {
  padding: 10px 28px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg2);
  color: var(--text2);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.cmp-mode-btn:hover {
  background: var(--bg3);
  color: var(--text);
}
.cmp-mode-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* Action buttons */
.cmp-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}
.cmp-action-btn {
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg3);
  color: var(--text2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.cmp-action-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* Main compare layout */
.cmp-columns {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  align-items: start;
}

.cmp-vs {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 900;
  color: var(--gold);
  text-shadow: 0 2px 12px rgba(241,196,15,0.25);
  padding: 0 16px;
  min-height: 120px;
  user-select: none;
  align-self: start;
  padding-top: 80px;
}

/* Card (each side) */
.cmp-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  min-height: 200px;
}

/* Search input area */
.cmp-search-wrap {
  position: relative;
  margin-bottom: 16px;
}
.cmp-search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg2);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.cmp-search-input:focus {
  border-color: var(--accent);
}
.cmp-search-input::placeholder {
  color: var(--text2);
  opacity: 0.7;
}

/* Dropdown */
.cmp-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 0 0 8px 8px;
  max-height: 360px;
  overflow-y: auto;
  display: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.cmp-dropdown.show {
  display: block;
}
.cmp-dd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.cmp-dd-item:hover {
  background: var(--bg3);
}
.cmp-dd-item img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 4px;
}
.cmp-dd-name {
  font-size: 14px;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cmp-dd-sub {
  font-size: 12px;
  color: var(--text2);
  flex-shrink: 0;
}

/* Selected preview */
.cmp-preview {
  text-align: center;
  margin-bottom: 16px;
}
.cmp-preview img {
  max-width: 120px;
  max-height: 120px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  padding: 8px;
}
.cmp-preview-name {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--gold);
}
.cmp-preview-sub {
  font-size: 12px;
  color: var(--text2);
  margin-top: 2px;
}

/* Placeholder (nothing selected) */
.cmp-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text2);
  font-size: 14px;
  gap: 10px;
}
.cmp-placeholder-icon {
  font-size: 48px;
  opacity: 0.3;
}

/* Stats table */
.cmp-stats {
  width: 100%;
  border-collapse: collapse;
}
.cmp-stats tr {
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cmp-stats tr:last-child {
  border-bottom: none;
}
.cmp-stats td {
  padding: 6px 0;
  font-size: 13px;
  vertical-align: top;
}
.cmp-stat-label {
  color: var(--text2);
  width: 100px;
  font-weight: 500;
}
.cmp-stat-value {
  color: var(--text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cmp-stat-diff {
  font-size: 11px;
  font-weight: 600;
  margin-left: 6px;
}

/* Compare colors */
.compare-better .cmp-stat-value {
  color: var(--accent);
}
.compare-worse .cmp-stat-value {
  color: #e74c3c;
}
.compare-diff .cmp-stat-value {
  color: var(--blue);
}

.cmp-stat-diff.positive {
  color: var(--accent);
}
.cmp-stat-diff.negative {
  color: #e74c3c;
}

/* Description */
.cmp-desc-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.cmp-desc-title {
  font-size: 12px;
  color: var(--text2);
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.cmp-desc-text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Drops list */
.cmp-drops-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.cmp-drops-title {
  font-size: 12px;
  color: var(--text2);
  margin-bottom: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.cmp-drop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 13px;
}
.cmp-drop-name {
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cmp-drop-rate {
  color: var(--gold);
  font-weight: 600;
  margin-left: 8px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* Bar visualization for numeric stats */
.cmp-stat-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cmp-stat-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--accent);
  opacity: 0.6;
  min-width: 2px;
  max-width: 120px;
  transition: width 0.3s ease;
}
.compare-worse .cmp-stat-bar {
  background: #e74c3c;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .cmp-columns {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .cmp-vs {
    padding: 10px 0;
    min-height: auto;
    font-size: 28px;
    padding-top: 0;
  }
  .cmp-card {
    padding: 14px;
  }
  .cmp-mode-btn {
    padding: 8px 18px;
    font-size: 13px;
  }
  .cmp-stat-label {
    width: 80px;
  }
  .cmp-stat-bar {
    max-width: 60px;
  }
}
`;
    document.head.appendChild(style);
  }

  // ─── Build UI ──────────────────────────────────────────────
  function buildUI(container) {
    container.innerHTML = `
      <div class="cmp-wrap">
        <!-- Mode Toggle -->
        <div class="cmp-mode-bar">
          <button class="cmp-mode-btn active" data-mode="items">Compare Items</button>
          <button class="cmp-mode-btn" data-mode="monsters">Compare Monsters</button>
        </div>

        <!-- Action Buttons -->
        <div class="cmp-actions">
          <button class="cmp-action-btn" id="cmpSwapBtn">&#8644; Swap A &amp; B</button>
          <button class="cmp-action-btn" id="cmpClearBtn">&#10005; Clear Both</button>
        </div>

        <!-- Columns -->
        <div class="cmp-columns">
          <!-- Side A -->
          <div class="cmp-card" id="cmpCardA">
            <div class="cmp-search-wrap">
              <input class="cmp-search-input" id="cmpSearchA" type="text" placeholder="Search by name or ID..." autocomplete="off">
              <div class="cmp-dropdown" id="cmpDropA"></div>
            </div>
            <div id="cmpContentA">
              <div class="cmp-placeholder">
                <div class="cmp-placeholder-icon">A</div>
                <div>Search and select an item</div>
              </div>
            </div>
          </div>

          <!-- VS Divider -->
          <div class="cmp-vs">VS</div>

          <!-- Side B -->
          <div class="cmp-card" id="cmpCardB">
            <div class="cmp-search-wrap">
              <input class="cmp-search-input" id="cmpSearchB" type="text" placeholder="Search by name or ID..." autocomplete="off">
              <div class="cmp-dropdown" id="cmpDropB"></div>
            </div>
            <div id="cmpContentB">
              <div class="cmp-placeholder">
                <div class="cmp-placeholder-icon">B</div>
                <div>Search and select an item</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Search Logic ──────────────────────────────────────────
  function getDataSource() {
    if (mode === 'items') {
      return typeof ITEMS !== 'undefined' ? ITEMS : [];
    }
    return typeof MONSTERS !== 'undefined' ? MONSTERS : [];
  }

  function searchData(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const data = getDataSource();
    const results = [];

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      // For items, skip cards (they have their own tab)
      if (mode === 'items' && d.cat === 'Card') continue;

      const idStr = String(d.id);
      const name  = (d.name || '').toLowerCase();

      if (name.includes(q) || idStr.includes(q)) {
        results.push(d);
        if (results.length >= MAX_RESULTS) break;
      }
    }
    return results;
  }

  function renderDropdownItem(item) {
    if (mode === 'items') {
      const imgUrl = ITEM_IMG_BASE + item.id + '.png';
      const sub = [item.cat, item.wtype].filter(Boolean).join(' / ');
      return `<div class="cmp-dd-item" data-id="${item.id}">
        <img src="${imgUrl}" onerror="this.style.visibility='hidden'" alt="">
        <span class="cmp-dd-name">${esc(item.name)}</span>
        <span class="cmp-dd-sub">#${item.id} ${esc(sub)}</span>
      </div>`;
    } else {
      const imgUrl = MOB_IMG_BASE + item.id + '.png';
      return `<div class="cmp-dd-item" data-id="${item.id}">
        <img src="${imgUrl}" onerror="this.style.visibility='hidden'" alt="">
        <span class="cmp-dd-name">${esc(item.name)}</span>
        <span class="cmp-dd-sub">#${item.id} Lv.${item.level}</span>
      </div>`;
    }
  }

  // ─── Setup Search for a Side ───────────────────────────────
  function setupSearch(inputId, dropdownId, side) {
    const input    = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    const doSearch = debounce(function () {
      const q = input.value.trim();
      if (q.length < 1) {
        dropdown.classList.remove('show');
        dropdown.innerHTML = '';
        return;
      }

      const results = searchData(q);
      if (!results.length) {
        dropdown.innerHTML = '<div style="padding:12px;color:var(--text2);font-size:13px;text-align:center;">No results found</div>';
        dropdown.classList.add('show');
        return;
      }

      dropdown.innerHTML = results.map(r => renderDropdownItem(r)).join('');
      dropdown.classList.add('show');

      // Bind clicks
      dropdown.querySelectorAll('.cmp-dd-item').forEach(el => {
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          const id = parseInt(this.dataset.id, 10);
          const data = getDataSource();
          const found = data.find(d => d.id === id);
          if (found) {
            selectItem(side, found);
            input.value = found.name;
          }
          dropdown.classList.remove('show');
          dropdown.innerHTML = '';
        });
      });
    }, DEBOUNCE_MS);

    input.addEventListener('input', doSearch);
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 1) doSearch();
    });
    input.addEventListener('blur', function () {
      setTimeout(() => {
        dropdown.classList.remove('show');
      }, 200);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dropdown.classList.remove('show');
      }
    });
  }

  // ─── Select Item / Monster ─────────────────────────────────
  function selectItem(side, data) {
    if (side === 'A') selectedA = data;
    else selectedB = data;
    renderComparison();
  }

  // ─── Render Comparison ─────────────────────────────────────
  function renderComparison() {
    renderSide('A', selectedA, selectedB);
    renderSide('B', selectedB, selectedA);
  }

  function renderSide(side, data, other) {
    const el = document.getElementById('cmpContent' + side);
    if (!el) return;

    if (!data) {
      const label = mode === 'items' ? 'an item' : 'a monster';
      el.innerHTML = `<div class="cmp-placeholder">
        <div class="cmp-placeholder-icon">${side}</div>
        <div>Search and select ${label}</div>
      </div>`;
      return;
    }

    if (mode === 'items') {
      renderItemSide(el, data, other, side);
    } else {
      renderMonsterSide(el, data, other, side);
    }
  }

  // ─── Item Side Rendering ───────────────────────────────────
  function renderItemSide(el, item, other, side) {
    const imgUrl = ITEM_IMG_BASE + item.id + '.png';
    let html = '';

    // Preview
    html += `<div class="cmp-preview">
      <img src="${imgUrl}" onerror="this.style.visibility='hidden'" alt="${esc(item.name)}">
      <div class="cmp-preview-name">${esc(item.name)}</div>
      <div class="cmp-preview-sub">#${item.id}</div>
    </div>`;

    // Stats table
    html += '<table class="cmp-stats"><tbody>';
    for (const stat of ITEM_STATS) {
      const valRaw = item[stat.key];
      const display = stat.fmt(valRaw);

      let rowClass = '';
      let diffHtml = '';

      if (stat.numeric && other) {
        const otherRaw = other[stat.key];
        const a = parseNumericValue(stat, valRaw);
        const b = parseNumericValue(stat, otherRaw);

        if (a !== b) {
          const diff = a - b;
          const lowerBetter = LOWER_IS_BETTER.has(stat.key);
          const isBetter = lowerBetter ? diff < 0 : diff > 0;

          rowClass = isBetter ? 'compare-better' : 'compare-worse';

          const sign = diff > 0 ? '+' : '';
          const diffClass = isBetter ? 'positive' : 'negative';
          // For weight, display diff as divided by 10
          const displayDiff = stat.key === 'w' ? (diff / 10) : diff;
          diffHtml = `<span class="cmp-stat-diff ${diffClass}">${sign}${displayDiff}</span>`;
        }
      } else if (!stat.numeric && other) {
        const otherVal = stat.fmt(other[stat.key]);
        if (String(display) !== String(otherVal)) {
          rowClass = 'compare-diff';
        }
      }

      // Bar for numeric stats
      let barHtml = '';
      if (stat.numeric) {
        const maxVal = getMaxStatValue(stat.key, 'items');
        const val = parseNumericValue(stat, valRaw);
        if (maxVal > 0) {
          const pct = Math.min(100, (val / maxVal) * 100);
          barHtml = `<div class="cmp-stat-bar" style="width:${Math.max(2, pct)}px"></div>`;
        }
      }

      html += `<tr class="${rowClass}">
        <td class="cmp-stat-label">${stat.label}</td>
        <td class="cmp-stat-value">
          <div class="cmp-stat-bar-wrap">
            <span>${display}${diffHtml}</span>
            ${barHtml}
          </div>
        </td>
      </tr>`;
    }
    html += '</tbody></table>';

    // Description
    if (item.desc) {
      html += `<div class="cmp-desc-section">
        <div class="cmp-desc-title">Description</div>
        <div class="cmp-desc-text">${esc(item.desc).replace(/\|/g, '<br>')}</div>
      </div>`;
    }

    el.innerHTML = html;
  }

  // ─── Monster Side Rendering ────────────────────────────────
  function renderMonsterSide(el, mob, other, side) {
    const imgUrl = mob.spriteUrl || (MOB_IMG_BASE + mob.id + '.png');
    let html = '';

    // Preview
    html += `<div class="cmp-preview">
      <img src="${imgUrl}" onerror="this.src='${MOB_IMG_BASE + mob.id}.png'; this.onerror=function(){this.style.visibility='hidden'}" alt="${esc(mob.name)}">
      <div class="cmp-preview-name">${esc(mob.name)}</div>
      <div class="cmp-preview-sub">#${mob.id} &middot; Lv.${mob.level} &middot; ${mob['class'] || 'Normal'}</div>
    </div>`;

    // Stats table
    html += '<table class="cmp-stats"><tbody>';
    for (const stat of MOB_STATS) {
      const valRaw = mob[stat.key];
      const display = stat.fmt(valRaw);

      let rowClass = '';
      let diffHtml = '';

      if (stat.numeric && other) {
        const otherRaw = other[stat.key];
        const getVal = stat.cmpVal || (v => Number(v) || 0);
        const a = getVal(valRaw);
        const b = getVal(otherRaw);

        if (a !== b) {
          const diff = a - b;
          rowClass = 'compare-diff';
          const sign = diff > 0 ? '+' : '';
          const diffClass = diff > 0 ? 'positive' : 'negative';
          diffHtml = `<span class="cmp-stat-diff ${diffClass}">${sign}${num(diff)}</span>`;
        }
      } else if (!stat.numeric && other) {
        const otherVal = stat.fmt(other[stat.key]);
        if (String(display) !== String(otherVal)) {
          rowClass = 'compare-diff';
        }
      }

      // Bar for numeric stats
      let barHtml = '';
      if (stat.numeric) {
        const maxVal = getMaxStatValue(stat.key, 'monsters');
        const getVal = stat.cmpVal || (v => Number(v) || 0);
        const val = getVal(valRaw);
        if (maxVal > 0) {
          const pct = Math.min(100, (val / maxVal) * 100);
          barHtml = `<div class="cmp-stat-bar" style="width:${Math.max(2, pct)}px"></div>`;
        }
      }

      html += `<tr class="${rowClass}">
        <td class="cmp-stat-label">${stat.label}</td>
        <td class="cmp-stat-value">
          <div class="cmp-stat-bar-wrap">
            <span>${display}${diffHtml}</span>
            ${barHtml}
          </div>
        </td>
      </tr>`;
    }
    html += '</tbody></table>';

    // Drops
    if (mob.drops && mob.drops.length) {
      html += `<div class="cmp-drops-section">
        <div class="cmp-drops-title">Drops</div>`;
      for (const drop of mob.drops) {
        const rate = drop.rate / 100;
        const rateStr = rate >= 1 ? rate.toFixed(1) + '%' : rate.toFixed(2) + '%';
        html += `<div class="cmp-drop-item">
          <span class="cmp-drop-name">${esc(drop.itemName || 'Item #' + drop.itemId)}</span>
          <span class="cmp-drop-rate">${rateStr}</span>
        </div>`;
      }
      html += '</div>';
    }

    el.innerHTML = html;
  }

  // ─── Utility: Parse Numeric Value ──────────────────────────
  function parseNumericValue(stat, val) {
    if (stat.cmpVal) return stat.cmpVal(val);
    if (stat.key === 'w') return val || 0;  // keep raw (divide in display)
    return Number(val) || 0;
  }

  // ─── Utility: Get max stat for bar scaling ─────────────────
  const statMaxCache = {};
  function getMaxStatValue(key, type) {
    const cacheKey = type + ':' + key;
    if (statMaxCache[cacheKey] !== undefined) return statMaxCache[cacheKey];

    const data = type === 'items'
      ? (typeof ITEMS !== 'undefined' ? ITEMS : [])
      : (typeof MONSTERS !== 'undefined' ? MONSTERS : []);

    let max = 0;
    for (const d of data) {
      let val;
      if (key === 'atk' && Array.isArray(d[key])) {
        val = (d[key][0] + d[key][1]) / 2;
      } else {
        val = Number(d[key]) || 0;
      }
      if (val > max) max = val;
    }
    statMaxCache[cacheKey] = max || 1;
    return statMaxCache[cacheKey];
  }

  // ─── Swap ──────────────────────────────────────────────────
  function swap() {
    const tmp = selectedA;
    selectedA = selectedB;
    selectedB = tmp;

    // Swap input values
    const inputA = document.getElementById('cmpSearchA');
    const inputB = document.getElementById('cmpSearchB');
    if (inputA && inputB) {
      const tmpVal = inputA.value;
      inputA.value = inputB.value;
      inputB.value = tmpVal;
    }

    renderComparison();
  }

  // ─── Clear ─────────────────────────────────────────────────
  function clearBoth() {
    selectedA = null;
    selectedB = null;

    const inputA = document.getElementById('cmpSearchA');
    const inputB = document.getElementById('cmpSearchB');
    if (inputA) inputA.value = '';
    if (inputB) inputB.value = '';

    renderComparison();
  }

  // ─── Switch Mode ───────────────────────────────────────────
  function switchMode(newMode) {
    if (newMode === mode) return;
    mode = newMode;

    // Update buttons
    document.querySelectorAll('.cmp-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Update placeholder text
    const placeholder = mode === 'items' ? 'Search by name or ID...' : 'Search by name or ID...';
    const inputA = document.getElementById('cmpSearchA');
    const inputB = document.getElementById('cmpSearchB');
    if (inputA) { inputA.value = ''; inputA.placeholder = placeholder; }
    if (inputB) { inputB.value = ''; inputB.placeholder = placeholder; }

    // Clear selections
    selectedA = null;
    selectedB = null;
    renderComparison();
  }

  // ─── Bind Events ──────────────────────────────────────────
  function bindEvents() {
    // Mode toggle
    document.querySelectorAll('.cmp-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Swap & Clear
    const swapBtn  = document.getElementById('cmpSwapBtn');
    const clearBtn = document.getElementById('cmpClearBtn');
    if (swapBtn) swapBtn.addEventListener('click', swap);
    if (clearBtn) clearBtn.addEventListener('click', clearBoth);

    // Search
    setupSearch('cmpSearchA', 'cmpDropA', 'A');
    setupSearch('cmpSearchB', 'cmpDropB', 'B');
  }

  // ─── Public init function ────────────────────────────────
  window.initCompareTool = function () {
    const container = document.getElementById('sec-compare');
    if (!container) {
      console.warn('[Compare Tool] #sec-compare not found');
      return;
    }

    injectStyles();
    buildUI(container);
    bindEvents();
    renderComparison();
  };
})();
