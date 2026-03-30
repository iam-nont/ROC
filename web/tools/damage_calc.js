// =====================================================================
// RO Classic Damage Calculator — damage_calc.js
// Renewal formulas (ROC Awakening Ep.14.03)
// Vanilla JS, self-contained with injected CSS.
// Loaded via <script> in index.html. Requires ITEMS and MONSTERS globals.
// Call initDamageCalc() after DOM ready to build UI inside #sec-damage-calc.
// =====================================================================

(function () {
  'use strict';

  // -------------------- Level-aware Element Table --------------------
  // ELEMENT_TABLE_LV[atkElement][defElement] = [lv1, lv2, lv3, lv4]
  // Values are multipliers x100 (100 = normal, 200 = double, 0 = immune)
  const ELEMENT_TABLE_LV = {
    Neutral: {
      Neutral:[100,100,100,100], Water:[100,100,100,100], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[100,100,100,100],
      Holy:[100,100,100,100], Shadow:[100,100,100,100], Ghost:[25,0,0,0], Undead:[100,100,100,100]
    },
    Water: {
      Neutral:[100,100,100,100], Water:[25,0,0,0], Earth:[100,100,100,100],
      Fire:[150,175,200,200], Wind:[90,80,70,60], Poison:[100,100,100,100],
      Holy:[75,50,25,0], Shadow:[100,100,100,100], Ghost:[100,75,50,25], Undead:[100,100,125,150]
    },
    Earth: {
      Neutral:[100,100,100,100], Water:[100,100,100,100], Earth:[25,0,0,0],
      Fire:[90,80,70,60], Wind:[150,175,200,200], Poison:[100,100,100,100],
      Holy:[75,50,25,0], Shadow:[100,100,100,100], Ghost:[100,75,50,25], Undead:[100,100,125,150]
    },
    Fire: {
      Neutral:[100,100,100,100], Water:[90,80,70,60], Earth:[150,175,200,200],
      Fire:[25,0,0,0], Wind:[100,100,100,100], Poison:[100,100,100,100],
      Holy:[75,50,25,0], Shadow:[100,100,100,100], Ghost:[100,75,50,25], Undead:[125,150,175,200]
    },
    Wind: {
      Neutral:[100,100,100,100], Water:[150,175,200,200], Earth:[90,80,70,60],
      Fire:[100,100,100,100], Wind:[25,0,0,0], Poison:[100,100,100,100],
      Holy:[75,50,25,0], Shadow:[100,100,100,100], Ghost:[100,75,50,25], Undead:[100,100,125,150]
    },
    Poison: {
      Neutral:[100,100,100,100], Water:[100,75,50,25], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[0,0,0,0],
      Holy:[75,50,25,0], Shadow:[50,25,0,0], Ghost:[100,75,50,25], Undead:[0,0,0,0]
    },
    Holy: {
      Neutral:[100,100,100,100], Water:[100,100,100,100], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[100,75,50,25],
      Holy:[0,0,0,0], Shadow:[125,150,175,200], Ghost:[100,75,50,25], Undead:[150,175,200,200]
    },
    Shadow: {
      Neutral:[100,100,100,100], Water:[100,100,100,100], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[50,25,0,0],
      Holy:[125,150,175,200], Shadow:[0,0,0,0], Ghost:[100,75,50,25], Undead:[0,0,0,0]
    },
    Ghost: {
      Neutral:[25,0,0,0], Water:[100,100,100,100], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[100,75,50,25],
      Holy:[100,100,100,100], Shadow:[100,100,100,100], Ghost:[125,150,175,200], Undead:[100,100,100,100]
    },
    Undead: {
      Neutral:[100,100,100,100], Water:[100,100,100,100], Earth:[100,100,100,100],
      Fire:[100,100,100,100], Wind:[100,100,100,100], Poison:[0,0,0,0],
      Holy:[150,175,200,200], Shadow:[0,0,0,0], Ghost:[100,75,50,25], Undead:[0,0,0,0]
    }
  };

  const ELEMENTS = ['Neutral','Water','Earth','Fire','Wind','Poison','Holy','Shadow','Ghost','Undead'];

  function getElementMod(atkEle, defEle, defLv) {
    const row = ELEMENT_TABLE_LV[atkEle] || ELEMENT_TABLE_LV['Neutral'];
    const arr = row[defEle];
    if (!arr) return 100;
    const lvIdx = Math.max(0, Math.min(3, (defLv || 1) - 1));
    return arr[lvIdx];
  }

  // -------------------- Size penalty --------------------
  const SIZE_PENALTY = {
    Dagger:   { Small:100, Medium:75,  Large:50  },
    Sword:    { Small:75,  Medium:100, Large:75  },
    '2H Sword': { Small:75, Medium:75, Large:100 },
    Spear:    { Small:75,  Medium:75,  Large:100 },
    Axe:      { Small:50,  Medium:75,  Large:100 },
    Mace:     { Small:75,  Medium:100, Large:100 },
    Rod:      { Small:100, Medium:100, Large:100 },
    Staff:    { Small:100, Medium:100, Large:100 },
    Book:     { Small:100, Medium:100, Large:100 },
    Bow:      { Small:100, Medium:100, Large:75  },
    Katar:    { Small:75,  Medium:100, Large:75  },
    Knuckle:  { Small:100, Medium:75,  Large:50  },
    Instrument:{ Small:75,  Medium:100, Large:75  },
    Whip:     { Small:75,  Medium:100, Large:75  },
  };

  // Weapon level variance percentages
  const WEAPON_VARIANCE = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.25 };

  // Renewal refine bonus tiers
  const REFINE_TIERS = {
    1: { base: 2,  overRefine: 3,  safeLimit: 7 },
    2: { base: 3,  overRefine: 5,  safeLimit: 6 },
    3: { base: 5,  overRefine: 8,  safeLimit: 5 },
    4: { base: 7,  overRefine: 14, safeLimit: 4 }
  };

  function calcRefineATK(weaponLevel, refineLevel) {
    const tier = REFINE_TIERS[weaponLevel] || REFINE_TIERS[1];
    if (refineLevel <= 0) return 0;
    const safe = Math.min(refineLevel, tier.safeLimit);
    const over = Math.max(0, refineLevel - tier.safeLimit);
    return safe * tier.base + over * (tier.base + tier.overRefine);
  }

  // -------------------- Helpers --------------------

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function parseElement(eleStr) {
    if (!eleStr) return { name: 'Neutral', level: 1 };
    const m = String(eleStr).match(/^(\w+)\s*(\d*)$/);
    if (!m) return { name: 'Neutral', level: 1 };
    return { name: m[1], level: parseInt(m[2] || '1', 10) };
  }

  function normalizeWtype(wtype) {
    if (!wtype) return 'Dagger';
    const t = wtype.trim();
    if (/dagger/i.test(t)) return 'Dagger';
    if (/two.?hand.*sword|2h\s*sword/i.test(t)) return '2H Sword';
    if (/sword/i.test(t)) return 'Sword';
    if (/spear/i.test(t)) return 'Spear';
    if (/axe/i.test(t)) return 'Axe';
    if (/mace/i.test(t)) return 'Mace';
    if (/rod|staff|ไม้เท้า/i.test(t)) return 'Rod';
    if (/bow|ธนู/i.test(t)) return 'Bow';
    if (/katar/i.test(t)) return 'Katar';
    if (/knuckle/i.test(t)) return 'Knuckle';
    if (/book/i.test(t)) return 'Book';
    if (/instrument/i.test(t)) return 'Instrument';
    if (/whip/i.test(t)) return 'Whip';
    if (/huuma/i.test(t)) return 'Katar';
    return 'Dagger';
  }

  function searchWeapons(query) {
    if (typeof ITEMS === 'undefined') return [];
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return ITEMS.filter(function (i) {
      return i.cat === 'Weapon' && (i.name.toLowerCase().includes(q) || String(i.id).includes(q));
    }).slice(0, 15);
  }

  function searchMonsters(query) {
    if (typeof MONSTERS === 'undefined') return [];
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return MONSTERS.filter(function (m) {
      return m.name.toLowerCase().includes(q) || String(m.id).includes(q);
    }).slice(0, 10);
  }

  // -------------------- CSS Injection --------------------

  function injectCSS() {
    if (document.getElementById('dmgCalcCSS')) return;
    const style = document.createElement('style');
    style.id = 'dmgCalcCSS';
    style.textContent = /* css */ `
      /* ===== Damage Calculator Styles ===== */
      .dc-wrap {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .dc-panel {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
      }
      .dc-panel h3 {
        font-size: 16px;
        color: var(--gold);
        margin-bottom: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }
      .dc-row {
        display: flex;
        gap: 12px;
        margin-bottom: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      .dc-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 80px;
      }
      .dc-field label {
        font-size: 11px;
        color: var(--text2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .dc-field input[type="number"],
      .dc-field select {
        padding: 8px 10px;
        border-radius: 6px;
        border: 2px solid var(--border);
        background: var(--bg2);
        color: var(--text);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
        width: 100%;
      }
      .dc-field input:focus,
      .dc-field select:focus {
        border-color: var(--accent);
      }
      .dc-search-wrap {
        position: relative;
        width: 100%;
      }
      .dc-search-wrap input[type="text"] {
        width: 100%;
        padding: 8px 10px;
        border-radius: 6px;
        border: 2px solid var(--border);
        background: var(--bg2);
        color: var(--text);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      .dc-search-wrap input:focus {
        border-color: var(--accent);
      }
      .dc-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 200;
        background: var(--bg2);
        border: 1px solid var(--accent);
        border-radius: 0 0 8px 8px;
        max-height: 260px;
        overflow-y: auto;
        display: none;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        scrollbar-width: thin;
        scrollbar-color: var(--accent) transparent;
      }
      .dc-dropdown.open { display: block; }
      .dc-dd-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
        transition: background 0.15s;
      }
      .dc-dd-item:last-child { border-bottom: none; }
      .dc-dd-item:hover { background: rgba(46,204,113,0.12); }
      .dc-dd-item img {
        width: 28px;
        height: 28px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .dc-dd-item .dd-name { color: var(--text); }
      .dc-dd-item .dd-sub { color: var(--text2); font-size: 11px; margin-left: auto; white-space: nowrap; }

      .dc-selected {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--bg3);
        border-radius: 8px;
        padding: 12px 14px;
        margin-top: 8px;
        min-height: 60px;
      }
      .dc-selected img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        image-rendering: auto;
      }
      .dc-sel-info { flex: 1; }
      .dc-sel-info .sel-name { font-size: 15px; font-weight: 600; color: var(--text); }
      .dc-sel-info .sel-detail { font-size: 12px; color: var(--text2); margin-top: 2px; }
      .dc-sel-clear {
        background: none;
        border: 1px solid var(--border);
        color: var(--text2);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
      }
      .dc-sel-clear:hover { border-color: #e74c3c; color: #e74c3c; }

      .dc-bonuses {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }
      .dc-bonuses h4 {
        font-size: 13px;
        color: var(--text2);
        margin-bottom: 8px;
      }

      .dc-mob-stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 6px;
        margin-top: 8px;
      }
      .dc-mob-stat {
        background: var(--bg2);
        border-radius: 6px;
        padding: 6px 10px;
        text-align: center;
      }
      .dc-mob-stat .ms-label {
        font-size: 10px;
        color: var(--text2);
        text-transform: uppercase;
      }
      .dc-mob-stat .ms-value {
        font-size: 14px;
        color: var(--text);
        font-weight: 600;
      }

      .dc-results {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
      }
      .dc-results h3 {
        font-size: 16px;
        color: var(--gold);
        margin-bottom: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }
      .dc-result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .dc-result-card {
        background: var(--bg3);
        border-radius: 8px;
        padding: 14px;
        text-align: center;
      }
      .dc-result-card .rc-label {
        font-size: 11px;
        color: var(--text2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .dc-result-card .rc-value {
        font-size: 26px;
        font-weight: 700;
        color: var(--gold);
        font-family: 'Consolas', 'Courier New', monospace;
      }
      .dc-result-card .rc-value.accent { color: var(--accent); }
      .dc-result-card .rc-value.blue { color: var(--blue); }
      .dc-result-card .rc-value.red { color: #e74c3c; }

      .dc-bar-wrap { margin-top: 10px; }
      .dc-bar-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text2);
        margin-bottom: 4px;
      }
      .dc-bar-track {
        height: 22px;
        background: var(--bg2);
        border-radius: 11px;
        overflow: hidden;
        position: relative;
      }
      .dc-bar-range {
        position: absolute;
        top: 0;
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--gold));
        border-radius: 11px;
        transition: left 0.3s, width 0.3s;
      }
      .dc-bar-avg {
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        background: #fff;
        transition: left 0.3s;
      }

      .dc-breakdown {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }
      .dc-breakdown summary {
        cursor: pointer;
        font-size: 13px;
        color: var(--text2);
        user-select: none;
      }
      .dc-breakdown summary:hover { color: var(--text); }
      .dc-breakdown-table {
        width: 100%;
        margin-top: 8px;
        font-size: 13px;
        border-collapse: collapse;
      }
      .dc-breakdown-table td {
        padding: 4px 8px;
        border-bottom: 1px solid var(--border);
      }
      .dc-breakdown-table td:first-child {
        color: var(--text2);
        width: 220px;
      }
      .dc-breakdown-table td:last-child {
        color: var(--text);
        font-weight: 600;
      }

      @media (max-width: 768px) {
        .dc-wrap { grid-template-columns: 1fr; }
        .dc-result-grid { grid-template-columns: repeat(2, 1fr); }
        .dc-mob-stats { grid-template-columns: repeat(3, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }

  // -------------------- State --------------------

  let dcState = {
    baseLv: 99,
    str: 1,
    dex: 1,
    luk: 1,
    aspd: 0,
    weapon: null,
    weaponEle: 'Neutral',
    refine: 0,
    bonusRace: 0,
    bonusEle: 0,
    bonusSize: 0,
    monster: null,
    manDef: 0,
    manSize: 'Medium',
    manRace: 'Formless',
    manEle: 'Neutral',
    manEleLv: 1,
  };

  // -------------------- Damage Calculation (Renewal) --------------------

  function calcDamage() {
    const s = dcState;

    // Renewal StatusATK: floor(BaseLv/4) + STR + floor(DEX/5) + floor(LUK/3)
    const statusATK = Math.floor(s.baseLv / 4) + s.str + Math.floor(s.dex / 5) + Math.floor(s.luk / 3);

    // Weapon ATK
    const weaponATK = s.weapon ? (s.weapon.atk || 0) : 0;
    const weaponLevel = s.weapon ? (s.weapon.wlv || 1) : 1;
    const variancePct = WEAPON_VARIANCE[weaponLevel] || 0.10;

    // Refine ATK (Renewal over-refine tiers)
    const refineATK = s.weapon ? calcRefineATK(weaponLevel, s.refine) : 0;

    // Renewal Total ATK = StatusATK x2 + WeaponATK(+-variance) + RefineATK
    const minATK = statusATK * 2 + Math.floor(weaponATK * (1 - variancePct)) + refineATK;
    const maxATK = statusATK * 2 + Math.floor(weaponATK * (1 + variancePct)) + refineATK;

    // Target properties
    let targetDef, targetSize, targetRace, targetEle, targetEleLv;
    if (s.monster) {
      targetDef = s.monster.def || 0;
      targetSize = s.monster.size || 'Medium';
      targetRace = s.monster.race || 'Formless';
      const parsed = parseElement(s.monster.element);
      targetEle = parsed.name;
      targetEleLv = parsed.level;
    } else {
      targetDef = s.manDef;
      targetSize = s.manSize;
      targetRace = s.manRace;
      targetEle = s.manEle;
      targetEleLv = s.manEleLv;
    }

    // Hard DEF reduction (Renewal formula)
    const hardDef = targetDef > 0 ? (4000 + targetDef) / (4000 + targetDef * 10) : 1;

    // Size penalty
    const wtype = normalizeWtype(s.weapon ? s.weapon.wtype : 'Dagger');
    const sizePenaltyMap = SIZE_PENALTY[wtype] || SIZE_PENALTY['Dagger'];
    const sizeMod = (sizePenaltyMap[targetSize] || 100) / 100;

    // Element modifier (level-aware)
    const atkEle = s.weaponEle;
    const eleModPct = getElementMod(atkEle, targetEle, targetEleLv);
    const eleMod = Math.max(0, eleModPct) / 100;

    // Card bonus multipliers (multiplicative, NOT additive)
    const raceMod = 1 + s.bonusRace / 100;
    const eleBonusMod = 1 + s.bonusEle / 100;
    const sizeBonusMod = 1 + s.bonusSize / 100;
    const totalCardMod = raceMod * eleBonusMod * sizeBonusMod;

    // Final damage
    const minDmg = Math.max(1, Math.floor(minATK * hardDef * sizeMod * eleMod * totalCardMod));
    const maxDmg = Math.max(1, Math.floor(maxATK * hardDef * sizeMod * eleMod * totalCardMod));
    const avgDmg = Math.floor((minDmg + maxDmg) / 2);

    // Hits to kill
    const monHP = s.monster ? (s.monster.hp || 0) : 0;
    const hitsToKill = avgDmg > 0 && monHP > 0 ? Math.ceil(monHP / avgDmg) : 0;

    // DPS: attacks per second = 50 / (200 - ASPD)
    const atkPerSec = s.aspd > 0 && s.aspd < 200 ? 50 / (200 - s.aspd) : 0;
    const realDPS = Math.floor(avgDmg * atkPerSec);

    return {
      baseLv: s.baseLv, statusATK, weaponATK, refineATK, refine: s.refine,
      minATK, maxATK,
      hardDef, sizeMod, eleMod, eleModPct,
      raceMod, eleBonusMod, sizeBonusMod, totalCardMod,
      wtype, targetDef, targetSize, targetRace, targetEle, targetEleLv,
      minDmg, maxDmg, avgDmg,
      monHP, hitsToKill,
      aspd: s.aspd, atkPerSec, dps: realDPS,
      weaponLevel, variancePct,
    };
  }

  // -------------------- UI Build --------------------

  function buildUI(container) {
    container.innerHTML = `
      <div class="dc-wrap">
        <!-- Left Panel: Player Setup -->
        <div class="dc-panel" id="dcPlayerPanel">
          <h3>Player Setup</h3>

          <div class="dc-row">
            <div class="dc-field" style="max-width:90px">
              <label>Base Lv</label>
              <input type="number" id="dcBaseLv" min="1" max="120" value="99">
            </div>
            <div class="dc-field" style="max-width:90px">
              <label>STR</label>
              <input type="number" id="dcSTR" min="1" max="130" value="1">
            </div>
            <div class="dc-field" style="max-width:90px">
              <label>DEX</label>
              <input type="number" id="dcDEX" min="1" max="130" value="1">
            </div>
            <div class="dc-field" style="max-width:90px">
              <label>LUK</label>
              <input type="number" id="dcLUK" min="1" max="130" value="1">
            </div>
            <div class="dc-field" style="max-width:90px">
              <label>ASPD</label>
              <input type="number" id="dcASPD" min="0" max="199" value="0" placeholder="0-199">
            </div>
          </div>

          <!-- Weapon Search -->
          <div class="dc-field" style="margin-bottom:6px">
            <label>Weapon</label>
            <div class="dc-search-wrap">
              <input type="text" id="dcWeaponSearch" placeholder="Search weapon name or ID..." autocomplete="off">
              <div class="dc-dropdown" id="dcWeaponDD"></div>
            </div>
          </div>
          <div id="dcWeaponSelected" style="display:none"></div>

          <!-- Refine (shown after weapon selected) -->
          <div class="dc-row" id="dcRefineRow" style="display:none;margin-top:6px">
            <div class="dc-field" style="max-width:90px">
              <label>Refine +</label>
              <input type="number" id="dcRefine" min="0" max="15" value="0">
            </div>
            <div class="dc-field" style="max-width:120px">
              <label>Refine ATK</label>
              <span id="dcRefineATK" style="font-size:14px;color:var(--gold);font-weight:600;padding:8px 0">+0</span>
            </div>
          </div>

          <!-- Weapon Element -->
          <div class="dc-row" style="margin-top:10px">
            <div class="dc-field">
              <label>Weapon Element</label>
              <select id="dcWeaponEle">
                ${ELEMENTS.map(e => `<option value="${e}"${e === 'Neutral' ? ' selected' : ''}>${e}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Card Bonuses -->
          <div class="dc-bonuses">
            <h4>Card / Bonus Modifiers (multiplicative)</h4>
            <div class="dc-row">
              <div class="dc-field">
                <label>+% ATK vs Race</label>
                <input type="number" id="dcBonusRace" min="0" max="500" value="0">
              </div>
              <div class="dc-field">
                <label>+% ATK vs Element</label>
                <input type="number" id="dcBonusEle" min="0" max="500" value="0">
              </div>
              <div class="dc-field">
                <label>+% ATK vs Size</label>
                <input type="number" id="dcBonusSize" min="0" max="500" value="0">
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Target Monster -->
        <div class="dc-panel" id="dcTargetPanel">
          <h3>Target Monster</h3>

          <div class="dc-field" style="margin-bottom:6px">
            <label>Monster</label>
            <div class="dc-search-wrap">
              <input type="text" id="dcMonsterSearch" placeholder="Search monster name or ID..." autocomplete="off">
              <div class="dc-dropdown" id="dcMonsterDD"></div>
            </div>
          </div>
          <div id="dcMonsterSelected" style="display:none"></div>
          <div id="dcMonsterStats" style="display:none"></div>

          <!-- Manual Target Override -->
          <div id="dcManualTarget">
            <div style="font-size:12px;color:var(--text2);margin: 10px 0 8px">Or set target manually:</div>
            <div class="dc-row">
              <div class="dc-field" style="max-width:90px">
                <label>DEF</label>
                <input type="number" id="dcManDef" min="0" max="999" value="0">
              </div>
              <div class="dc-field">
                <label>Size</label>
                <select id="dcManSize">
                  <option value="Small">Small</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="Large">Large</option>
                </select>
              </div>
            </div>
            <div class="dc-row">
              <div class="dc-field">
                <label>Race</label>
                <select id="dcManRace">
                  ${['Formless','Undead','Brute','Plant','Insect','Fish','Demon','Demi-Human','Angel','Dragon']
                    .map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
              </div>
              <div class="dc-field">
                <label>Element</label>
                <select id="dcManEle">
                  ${ELEMENTS.map(e => `<option value="${e}">${e}</option>`).join('')}
                </select>
              </div>
              <div class="dc-field" style="max-width:60px">
                <label>Ele Lv</label>
                <select id="dcManEleLv">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom: Results -->
      <div class="dc-results" id="dcResults">
        <h3>Damage Results</h3>
        <div class="dc-result-grid" id="dcResultGrid">
          <div class="dc-result-card">
            <div class="rc-label">Min Damage</div>
            <div class="rc-value" id="dcMinDmg">0</div>
          </div>
          <div class="dc-result-card">
            <div class="rc-label">Max Damage</div>
            <div class="rc-value" id="dcMaxDmg">0</div>
          </div>
          <div class="dc-result-card">
            <div class="rc-label">Average Damage</div>
            <div class="rc-value accent" id="dcAvgDmg">0</div>
          </div>
          <div class="dc-result-card">
            <div class="rc-label">Hits to Kill</div>
            <div class="rc-value accent" id="dcHitsToKill">-</div>
          </div>
          <div class="dc-result-card">
            <div class="rc-label">DPS</div>
            <div class="rc-value blue" id="dcDPS">-</div>
          </div>
        </div>

        <!-- Damage bar -->
        <div class="dc-bar-wrap" id="dcBarWrap">
          <div class="dc-bar-label">
            <span id="dcBarMin">0</span>
            <span style="color:var(--text)">Damage Range</span>
            <span id="dcBarMax">0</span>
          </div>
          <div class="dc-bar-track">
            <div class="dc-bar-range" id="dcBarRange" style="left:0%;width:100%"></div>
            <div class="dc-bar-avg" id="dcBarAvg" style="left:50%"></div>
          </div>
        </div>

        <!-- Calculation Breakdown -->
        <div class="dc-breakdown">
          <details>
            <summary>Calculation Breakdown</summary>
            <table class="dc-breakdown-table" id="dcBreakdown">
              <tbody></tbody>
            </table>
          </details>
        </div>
      </div>
    `;
  }

  // -------------------- Event Binding --------------------

  let weaponSearchTimer = null;
  let monsterSearchTimer = null;

  function bindEvents() {
    // Stat inputs
    ['dcBaseLv', 'dcSTR', 'dcDEX', 'dcLUK', 'dcASPD'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        const key = { dcBaseLv:'baseLv', dcSTR:'str', dcDEX:'dex', dcLUK:'luk', dcASPD:'aspd' }[id];
        dcState[key] = parseInt(this.value, 10) || 0;
        updateResults();
      });
    });

    // Refine
    const refineEl = document.getElementById('dcRefine');
    if (refineEl) {
      refineEl.addEventListener('input', function () {
        dcState.refine = Math.max(0, Math.min(15, parseInt(this.value, 10) || 0));
        const wlv = dcState.weapon ? (dcState.weapon.wlv || 1) : 1;
        const refATK = calcRefineATK(wlv, dcState.refine);
        const refATKEl = document.getElementById('dcRefineATK');
        if (refATKEl) refATKEl.textContent = '+' + refATK;
        updateResults();
      });
    }

    // Weapon element
    document.getElementById('dcWeaponEle').addEventListener('change', function () {
      dcState.weaponEle = this.value;
      updateResults();
    });

    // Bonus inputs
    ['dcBonusRace', 'dcBonusEle', 'dcBonusSize'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        const key = { dcBonusRace:'bonusRace', dcBonusEle:'bonusEle', dcBonusSize:'bonusSize' }[id];
        dcState[key] = parseInt(this.value, 10) || 0;
        updateResults();
      });
    });

    // Manual target inputs
    document.getElementById('dcManDef').addEventListener('input', function () {
      dcState.manDef = parseInt(this.value, 10) || 0;
      if (!dcState.monster) updateResults();
    });
    document.getElementById('dcManSize').addEventListener('change', function () {
      dcState.manSize = this.value;
      if (!dcState.monster) updateResults();
    });
    document.getElementById('dcManRace').addEventListener('change', function () {
      dcState.manRace = this.value;
      if (!dcState.monster) updateResults();
    });
    document.getElementById('dcManEle').addEventListener('change', function () {
      dcState.manEle = this.value;
      if (!dcState.monster) updateResults();
    });
    document.getElementById('dcManEleLv').addEventListener('change', function () {
      dcState.manEleLv = parseInt(this.value, 10) || 1;
      if (!dcState.monster) updateResults();
    });

    // Weapon search
    const weaponInput = document.getElementById('dcWeaponSearch');
    const weaponDD = document.getElementById('dcWeaponDD');
    weaponInput.addEventListener('input', function () {
      clearTimeout(weaponSearchTimer);
      weaponSearchTimer = setTimeout(function () {
        const results = searchWeapons(weaponInput.value);
        renderWeaponDropdown(results);
      }, 200);
    });
    weaponInput.addEventListener('focus', function () {
      if (weaponInput.value.length >= 2) {
        const results = searchWeapons(weaponInput.value);
        renderWeaponDropdown(results);
      }
    });
    document.addEventListener('click', function (e) {
      if (!weaponDD.contains(e.target) && e.target !== weaponInput) {
        weaponDD.classList.remove('open');
      }
    });

    // Monster search
    const monsterInput = document.getElementById('dcMonsterSearch');
    const monsterDD = document.getElementById('dcMonsterDD');
    monsterInput.addEventListener('input', function () {
      clearTimeout(monsterSearchTimer);
      monsterSearchTimer = setTimeout(function () {
        const results = searchMonsters(monsterInput.value);
        renderMonsterDropdown(results);
      }, 200);
    });
    monsterInput.addEventListener('focus', function () {
      if (monsterInput.value.length >= 2) {
        const results = searchMonsters(monsterInput.value);
        renderMonsterDropdown(results);
      }
    });
    document.addEventListener('click', function (e) {
      if (!monsterDD.contains(e.target) && e.target !== monsterInput) {
        monsterDD.classList.remove('open');
      }
    });
  }

  // -------------------- Weapon Dropdown --------------------

  function renderWeaponDropdown(items) {
    const dd = document.getElementById('dcWeaponDD');
    if (!items.length) {
      dd.classList.remove('open');
      return;
    }
    dd.innerHTML = items.map(function (w) {
      return `<div class="dc-dd-item" data-weapon-id="${w.id}">
        <span class="dd-name">${esc(w.name)}</span>
        <span class="dd-sub">ATK ${w.atk || 0} | ${esc(w.wtype)} | Lv${w.wlv || 1} | Slots ${w.slots || 0}</span>
      </div>`;
    }).join('');
    dd.classList.add('open');

    dd.querySelectorAll('.dc-dd-item').forEach(function (el) {
      el.addEventListener('click', function () {
        const id = parseInt(this.dataset.weaponId, 10);
        selectWeapon(id);
        dd.classList.remove('open');
      });
    });
  }

  function selectWeapon(id) {
    const w = ITEMS.find(function (i) { return i.id === id; });
    if (!w) return;
    dcState.weapon = w;

    const input = document.getElementById('dcWeaponSearch');
    input.value = '';

    const sel = document.getElementById('dcWeaponSelected');
    sel.style.display = 'block';
    sel.innerHTML = `<div class="dc-selected">
      <div class="dc-sel-info">
        <div class="sel-name">${esc(w.name)}</div>
        <div class="sel-detail">ATK ${w.atk || 0} | ${esc(w.wtype)} | Weapon Lv ${w.wlv || 1} | Slots ${w.slots || 0}</div>
      </div>
      <button class="dc-sel-clear" id="dcWeaponClear">Clear</button>
    </div>`;

    document.getElementById('dcWeaponClear').addEventListener('click', function () {
      dcState.weapon = null;
      dcState.refine = 0;
      sel.style.display = 'none';
      sel.innerHTML = '';
      const refRow = document.getElementById('dcRefineRow');
      if (refRow) refRow.style.display = 'none';
      const refInput = document.getElementById('dcRefine');
      if (refInput) refInput.value = '0';
      const refATKEl = document.getElementById('dcRefineATK');
      if (refATKEl) refATKEl.textContent = '+0';
      updateResults();
    });

    // Show refine row
    const refRow = document.getElementById('dcRefineRow');
    if (refRow) refRow.style.display = 'flex';

    updateResults();
  }

  // -------------------- Monster Dropdown --------------------

  function renderMonsterDropdown(monsters) {
    const dd = document.getElementById('dcMonsterDD');
    if (!monsters.length) {
      dd.classList.remove('open');
      return;
    }
    dd.innerHTML = monsters.map(function (m) {
      const spriteUrl = `https://static.divine-pride.net/images/mobs/png/${m.id}.png`;
      return `<div class="dc-dd-item" data-mob-id="${m.id}">
        <img src="${spriteUrl}" onerror="${m.spriteUrl ? `this.src='${m.spriteUrl}';this.onerror=function(){this.style.display='none'}` : `this.style.display='none'`}">
        <span class="dd-name">${esc(m.name)}</span>
        <span class="dd-sub">Lv${m.level} | HP ${(m.hp||0).toLocaleString()}</span>
      </div>`;
    }).join('');
    dd.classList.add('open');

    dd.querySelectorAll('.dc-dd-item').forEach(function (el) {
      el.addEventListener('click', function () {
        const id = parseInt(this.dataset.mobId, 10);
        selectMonster(id);
        dd.classList.remove('open');
      });
    });
  }

  function selectMonster(id) {
    const m = MONSTERS.find(function (x) { return x.id === id; });
    if (!m) return;
    dcState.monster = m;

    const input = document.getElementById('dcMonsterSearch');
    input.value = '';

    const sel = document.getElementById('dcMonsterSelected');
    sel.style.display = 'block';
    const spriteUrl = `https://static.divine-pride.net/images/mobs/png/${m.id}.png`;
    sel.innerHTML = `<div class="dc-selected">
      <img src="${spriteUrl}" onerror="${m.spriteUrl ? `this.src='${m.spriteUrl}';this.onerror=function(){this.style.display='none'}` : `this.style.display='none'`}">
      <div class="dc-sel-info">
        <div class="sel-name">${esc(m.name)}</div>
        <div class="sel-detail">Lv ${m.level} | HP ${(m.hp||0).toLocaleString()} | ${esc(m.element)}</div>
      </div>
      <button class="dc-sel-clear" id="dcMonsterClear">Clear</button>
    </div>`;

    document.getElementById('dcMonsterClear').addEventListener('click', function () {
      dcState.monster = null;
      sel.style.display = 'none';
      sel.innerHTML = '';
      document.getElementById('dcMonsterStats').style.display = 'none';
      document.getElementById('dcManualTarget').style.display = '';
      updateResults();
    });

    const statsEl = document.getElementById('dcMonsterStats');
    statsEl.style.display = 'block';
    statsEl.innerHTML = `<div class="dc-mob-stats">
      <div class="dc-mob-stat"><div class="ms-label">HP</div><div class="ms-value">${(m.hp||0).toLocaleString()}</div></div>
      <div class="dc-mob-stat"><div class="ms-label">DEF</div><div class="ms-value">${m.def||0}</div></div>
      <div class="dc-mob-stat"><div class="ms-label">MDEF</div><div class="ms-value">${m.mdef||0}</div></div>
      <div class="dc-mob-stat"><div class="ms-label">Size</div><div class="ms-value">${esc(m.size)}</div></div>
      <div class="dc-mob-stat"><div class="ms-label">Race</div><div class="ms-value">${esc(m.race)}</div></div>
      <div class="dc-mob-stat"><div class="ms-label">Element</div><div class="ms-value">${esc(m.element)}</div></div>
    </div>`;

    document.getElementById('dcManualTarget').style.display = 'none';

    updateResults();
  }

  // -------------------- Update Results --------------------

  function updateResults() {
    const r = calcDamage();

    document.getElementById('dcMinDmg').textContent = r.minDmg.toLocaleString();
    document.getElementById('dcMaxDmg').textContent = r.maxDmg.toLocaleString();
    document.getElementById('dcAvgDmg').textContent = r.avgDmg.toLocaleString();

    const htkEl = document.getElementById('dcHitsToKill');
    htkEl.textContent = r.hitsToKill > 0 ? r.hitsToKill.toLocaleString() : '-';

    const dpsEl = document.getElementById('dcDPS');
    dpsEl.textContent = r.dps > 0 ? r.dps.toLocaleString() : '-';

    updateDamageBar(r);
    updateBreakdown(r);
  }

  function updateDamageBar(r) {
    const barMin = document.getElementById('dcBarMin');
    const barMax = document.getElementById('dcBarMax');
    const barRange = document.getElementById('dcBarRange');
    const barAvg = document.getElementById('dcBarAvg');

    barMin.textContent = r.minDmg.toLocaleString();
    barMax.textContent = r.maxDmg.toLocaleString();

    if (r.maxDmg <= 0) {
      barRange.style.left = '0%';
      barRange.style.width = '0%';
      barAvg.style.left = '0%';
      return;
    }

    const scaleMax = Math.ceil(r.maxDmg * 1.1) || 1;
    const leftPct = (r.minDmg / scaleMax * 100).toFixed(1);
    const widthPct = ((r.maxDmg - r.minDmg) / scaleMax * 100).toFixed(1);
    const avgPct = (r.avgDmg / scaleMax * 100).toFixed(1);

    barRange.style.left = leftPct + '%';
    barRange.style.width = Math.max(parseFloat(widthPct), 1) + '%';
    barAvg.style.left = avgPct + '%';
  }

  function updateBreakdown(r) {
    const tbody = document.getElementById('dcBreakdown').querySelector('tbody');
    const rows = [
      ['Base Level', r.baseLv],
      ['Status ATK (Lv/4 + STR + DEX/5 + LUK/3)', r.statusATK],
      ['Renewal Total = StatusATK x2 + Weapon + Refine', ''],
      ['Weapon ATK', r.weaponATK],
      ['Weapon Level', r.weaponLevel],
      ['Weapon Variance', (r.variancePct * 100).toFixed(0) + '%'],
      ['Refine +' + r.refine, '+' + r.refineATK + ' ATK'],
      ['Min Total ATK', r.minATK],
      ['Max Total ATK', r.maxATK],
      ['---', ''],
      ['Weapon Type', r.wtype],
      ['Target DEF', r.targetDef],
      ['Hard DEF Reduction', (r.hardDef * 100).toFixed(2) + '%'],
      ['Target Size', r.targetSize],
      ['Size Penalty', (r.sizeMod * 100).toFixed(0) + '%'],
      ['Target Element', r.targetEle + ' Lv' + r.targetEleLv],
      ['Element Modifier', r.eleModPct + '% (Lv' + r.targetEleLv + ')'],
      ['---', ''],
      ['Race Bonus (card)', (r.raceMod * 100).toFixed(0) + '%'],
      ['Element Bonus (card)', (r.eleBonusMod * 100).toFixed(0) + '%'],
      ['Size Bonus (card)', (r.sizeBonusMod * 100).toFixed(0) + '%'],
      ['Total Card Mod (multiplicative)', (r.totalCardMod * 100).toFixed(0) + '%'],
      ['---', ''],
      ['Final Min Damage', r.minDmg.toLocaleString()],
      ['Final Max Damage', r.maxDmg.toLocaleString()],
      ['Average Damage', r.avgDmg.toLocaleString()],
    ];

    if (r.monHP > 0) {
      rows.push(['Monster HP', r.monHP.toLocaleString()]);
      rows.push(['Hits to Kill', r.hitsToKill.toLocaleString()]);
    }
    if (r.aspd > 0) {
      rows.push(['ASPD', r.aspd]);
      rows.push(['Attacks/sec', r.atkPerSec.toFixed(2)]);
      rows.push(['DPS', r.dps.toLocaleString()]);
    }

    tbody.innerHTML = rows.map(function (row) {
      if (row[0] === '---') {
        return '<tr><td colspan="2" style="padding:2px;border-bottom:1px solid var(--border)"></td></tr>';
      }
      return `<tr><td>${esc(row[0])}</td><td>${esc(String(row[1]))}</td></tr>`;
    }).join('');
  }

  // -------------------- Public Init --------------------

  window.initDamageCalc = function () {
    const container = document.getElementById('sec-damage-calc');
    if (!container) {
      console.warn('initDamageCalc: #sec-damage-calc not found');
      return;
    }

    injectCSS();
    buildUI(container);
    bindEvents();
    updateResults();
  };

})();
