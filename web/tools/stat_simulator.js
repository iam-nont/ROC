// ============================================================
//  RO Classic Status/Stat Simulator
//  Vanilla JS module for ROC Database TH
//  Loaded via <script src="tools/stat_simulator.js"> in index.html
//  Renders UI inside #sec-stat-sim
// ============================================================

(function () {
  'use strict';

  // ─── Job Class Data (ROC Classic TH — Episode 14.03 Awakening) ────
  // Sources: roc.gnjoy.in.th official patch notes, rAthena job_db
  // baseAspd = bare-hand attack motion delay
  // maxBaseLv/maxJobLv = per-class level caps from ROC TH server
  // High Class: BaseLv 99, JobLv 70
  // Awakened Class: BaseLv 120, JobLv 75, Stat 130, ASPD 193
  const JOB_CLASSES = {
    // ── Novice ──
    0:  { name: 'Novice',     maxBaseLv: 99,  maxJobLv: 10, hpFactor: 1.0, spFactor: 1.0, baseAspd: 700, group: 'novice' },
    // ── 1st Class ──
    1:  { name: 'Swordman',   maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.7, spFactor: 0.7, baseAspd: 600, group: 'class1' },
    2:  { name: 'Mage',       maxBaseLv: 99,  maxJobLv: 50, hpFactor: 0.7, spFactor: 1.7, baseAspd: 700, group: 'class1' },
    3:  { name: 'Archer',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.2, spFactor: 1.0, baseAspd: 600, group: 'class1' },
    4:  { name: 'Acolyte',    maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.2, spFactor: 1.7, baseAspd: 650, group: 'class1' },
    5:  { name: 'Merchant',   maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.5, spFactor: 0.7, baseAspd: 600, group: 'class1' },
    6:  { name: 'Thief',      maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.3, spFactor: 0.8, baseAspd: 550, group: 'class1' },
    // ── 2nd Class ──
    7:  { name: 'Knight',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 2.0, spFactor: 0.5, baseAspd: 500, group: 'class2' },
    8:  { name: 'Priest',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.3, spFactor: 2.0, baseAspd: 650, group: 'class2' },
    9:  { name: 'Wizard',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 0.6, spFactor: 2.0, baseAspd: 700, group: 'class2' },
    10: { name: 'Blacksmith', maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.8, spFactor: 0.5, baseAspd: 550, group: 'class2' },
    11: { name: 'Hunter',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.2, spFactor: 1.0, baseAspd: 550, group: 'class2' },
    12: { name: 'Assassin',   maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.3, spFactor: 0.7, baseAspd: 500, group: 'class2' },
    14: { name: 'Crusader',   maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.8, spFactor: 0.8, baseAspd: 550, group: 'class2' },
    15: { name: 'Monk',       maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.5, spFactor: 1.0, baseAspd: 500, group: 'class2' },
    16: { name: 'Sage',       maxBaseLv: 99,  maxJobLv: 50, hpFactor: 0.8, spFactor: 1.8, baseAspd: 650, group: 'class2' },
    17: { name: 'Rogue',      maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.2, spFactor: 0.8, baseAspd: 550, group: 'class2' },
    18: { name: 'Alchemist',  maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.5, spFactor: 0.7, baseAspd: 550, group: 'class2' },
    19: { name: 'Bard',       maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'class2' },
    20: { name: 'Dancer',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'class2' },
    // ── High Class (Transcendent) — BaseLv 99, JobLv 70 ──
    4008: { name: 'Lord Knight',    maxBaseLv: 99,  maxJobLv: 70, hpFactor: 2.0, spFactor: 0.5, baseAspd: 500, group: 'trans' },
    4009: { name: 'High Priest',    maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.3, spFactor: 2.0, baseAspd: 650, group: 'trans' },
    4010: { name: 'High Wizard',    maxBaseLv: 99,  maxJobLv: 70, hpFactor: 0.6, spFactor: 2.0, baseAspd: 700, group: 'trans' },
    4011: { name: 'Whitesmith',     maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.8, spFactor: 0.5, baseAspd: 550, group: 'trans' },
    4012: { name: 'Sniper',         maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.2, spFactor: 1.0, baseAspd: 550, group: 'trans' },
    4013: { name: 'Assassin Cross', maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.3, spFactor: 0.7, baseAspd: 500, group: 'trans' },
    4015: { name: 'Paladin',        maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.8, spFactor: 0.8, baseAspd: 550, group: 'trans' },
    4016: { name: 'Champion',       maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.5, spFactor: 1.0, baseAspd: 500, group: 'trans' },
    4017: { name: 'Professor',      maxBaseLv: 99,  maxJobLv: 70, hpFactor: 0.8, spFactor: 1.8, baseAspd: 650, group: 'trans' },
    4018: { name: 'Stalker',        maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.2, spFactor: 0.8, baseAspd: 550, group: 'trans' },
    4019: { name: 'Creator',        maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.5, spFactor: 0.7, baseAspd: 550, group: 'trans' },
    4020: { name: 'Clown',          maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'trans' },
    4021: { name: 'Gypsy',          maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'trans' },
    // ── Awakened Class — BaseLv 120, JobLv 75 ──
    // Same stats as High Class counterpart but higher level caps
    5008: { name: 'Awakened Lord Knight',    maxBaseLv: 120, maxJobLv: 75, hpFactor: 2.0, spFactor: 0.5, baseAspd: 500, group: 'awakened' },
    5009: { name: 'Awakened High Priest',    maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.3, spFactor: 2.0, baseAspd: 650, group: 'awakened' },
    5010: { name: 'Awakened High Wizard',    maxBaseLv: 120, maxJobLv: 75, hpFactor: 0.6, spFactor: 2.0, baseAspd: 700, group: 'awakened' },
    5011: { name: 'Awakened Whitesmith',     maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.8, spFactor: 0.5, baseAspd: 550, group: 'awakened' },
    5012: { name: 'Awakened Sniper',         maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.2, spFactor: 1.0, baseAspd: 550, group: 'awakened' },
    5013: { name: 'Awakened Assassin Cross', maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.3, spFactor: 0.7, baseAspd: 500, group: 'awakened' },
    5015: { name: 'Awakened Paladin',        maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.8, spFactor: 0.8, baseAspd: 550, group: 'awakened' },
    5016: { name: 'Awakened Champion',       maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.5, spFactor: 1.0, baseAspd: 500, group: 'awakened' },
    5017: { name: 'Awakened Professor',      maxBaseLv: 120, maxJobLv: 75, hpFactor: 0.8, spFactor: 1.8, baseAspd: 650, group: 'awakened' },
    5018: { name: 'Awakened Stalker',        maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.2, spFactor: 0.8, baseAspd: 550, group: 'awakened' },
    5019: { name: 'Awakened Creator',        maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.5, spFactor: 0.7, baseAspd: 550, group: 'awakened' },
    5020: { name: 'Awakened Clown',          maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'awakened' },
    5021: { name: 'Awakened Gypsy',          maxBaseLv: 120, maxJobLv: 75, hpFactor: 1.1, spFactor: 1.2, baseAspd: 600, group: 'awakened' },
    // ── Extended Classes ──
    23: { name: 'Super Novice',  maxBaseLv: 120, maxJobLv: 60, hpFactor: 1.0, spFactor: 1.0, baseAspd: 700, group: 'extended' },
    24: { name: 'Gunslinger',   maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.3, spFactor: 0.8, baseAspd: 600, group: 'extended' },
    25: { name: 'Ninja',        maxBaseLv: 99,  maxJobLv: 70, hpFactor: 1.0, spFactor: 1.2, baseAspd: 600, group: 'extended' },
    // ── Taekwon Branch ──
    4046: { name: 'Taekwon Kid',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.0, spFactor: 1.0, baseAspd: 600, group: 'taekwon' },
    4047: { name: 'Star Gladiator',  maxBaseLv: 99,  maxJobLv: 50, hpFactor: 1.5, spFactor: 0.8, baseAspd: 550, group: 'taekwon' },
    4049: { name: 'Soul Linker',     maxBaseLv: 99,  maxJobLv: 50, hpFactor: 0.9, spFactor: 1.5, baseAspd: 650, group: 'taekwon' },
    // ── 2nd Extended (Ninja branch) — BaseLv 120, JobLv 60 ──
    4211: { name: 'Kagerou',  maxBaseLv: 120, maxJobLv: 60, hpFactor: 1.0, spFactor: 1.2, baseAspd: 600, group: 'extended2' },
    4212: { name: 'Oboro',    maxBaseLv: 120, maxJobLv: 60, hpFactor: 1.0, spFactor: 1.2, baseAspd: 600, group: 'extended2' },
  };

  const TRANS_STAT_BONUS = 52;  // Extra stat points from rebirth
  const TRANS_HP_SP_MULT = 1.25; // 25% HP/SP bonus for trans/awakened classes

  function isTransOrAwakened(group) {
    return group === 'trans' || group === 'awakened';
  }

  // ─── Stat Point Formulas ────────────────────────────────────
  function getTotalStatPoints(baseLv, isTrans) {
    // RO Classic formula: start with 48, each level gains floor((lv-1)/5)+3
    let total = 48;
    for (let lv = 2; lv <= baseLv; lv++) {
      total += Math.floor((lv - 1) / 5) + 3;
    }
    if (isTrans) total += TRANS_STAT_BONUS;
    return total;
  }

  function getStatCost(targetStat) {
    // Cost to raise TO targetStat (from targetStat-1)
    // rAthena: 1 + floor((source + 9) / 10) where source = targetStat - 1
    return 1 + Math.floor((targetStat + 8) / 10);
  }

  function getUsedPoints(stats) {
    let used = 0;
    for (const val of Object.values(stats)) {
      for (let i = 2; i <= val; i++) {
        used += getStatCost(i);
      }
    }
    return used;
  }

  // ─── Calculated Stats (Pre-Renewal, rAthena-verified) ──────
  function calculateStats(baseLv, jobLv, stats, jobClassId) {
    const { str, agi, vit, int_, dex, luk } = stats;
    const job = JOB_CLASSES[jobClassId];
    const isTrans = isTransOrAwakened(job.group);

    // ASPD: Simplified two-step formula.
    // NOTE: Full Renewal ASPD requires per-job weapon speed penalty tables
    // which are not currently available. This provides a reasonable approximation.
    const aspdRed = Math.floor(job.baseAspd * (4 * agi + dex) / 1000);
    const amotion = Math.max(job.baseAspd - aspdRed, 0);
    const aspd = Math.min(200 - Math.floor(amotion / 10), 190);

    // HP/SP: base formula * class factor, trans gets 25% bonus
    let hp = Math.floor((35 + baseLv * (baseLv / 5 + 14)) * job.hpFactor * (1 + vit / 100));
    let sp = Math.floor((10 + baseLv * (baseLv / 12 + 2)) * job.spFactor * (1 + int_ / 100));
    if (isTrans) {
      hp = Math.floor(hp * TRANS_HP_SP_MULT);
      sp = Math.floor(sp * TRANS_HP_SP_MULT);
    }

    // Renewal formulas (ROC Awakening)
    const statusATK  = Math.floor(baseLv / 4) + str + Math.floor(str * str / 100) + Math.floor(dex / 5) + Math.floor(luk / 3);
    const statusMATK = Math.floor(baseLv / 4) + int_ + Math.floor(int_ / 2) + Math.floor(dex / 5) + Math.floor(luk / 3);

    return {
      atk:           statusATK,
      matk_min:      statusMATK,
      matk_max:      statusMATK,
      hit:           175 + baseLv + dex + Math.floor(luk / 3),
      flee:          100 + baseLv + agi + Math.floor(luk / 5),
      def_soft:      Math.floor(vit / 2) + Math.floor(agi / 5) + Math.floor(baseLv / 2),
      mdef_soft:     int_ + Math.floor(vit / 5) + Math.floor(dex / 5) + Math.floor(baseLv / 4),
      crit:          Math.floor(luk * 0.3) + 1,
      perfect_dodge: Math.floor(luk / 10) + 1,
      aspd:          aspd,
      hp:            hp,
      sp:            sp,
      status_atk:    statusATK,
      status_matk:   statusMATK,
      carry_weight:  2000 + str * 30,
    };
  }

  // ─── Inject Styles ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('stat-sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'stat-sim-styles';
    style.textContent = `
      /* ---- Stat Simulator Layout ---- */
      .ss-wrap {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }
      .ss-left {
        flex: 1;
        min-width: 320px;
        max-width: 480px;
      }
      .ss-right {
        flex: 1;
        min-width: 300px;
      }

      /* Cards */
      .ss-card {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }
      .ss-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--gold);
        margin-bottom: 14px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ss-card-title .ss-icon {
        font-size: 18px;
        opacity: 0.85;
      }

      /* Job selector */
      .ss-field {
        margin-bottom: 12px;
      }
      .ss-label {
        display: block;
        font-size: 12px;
        color: var(--text2);
        margin-bottom: 4px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }
      .ss-select {
        width: 100%;
        padding: 8px 12px;
        background: var(--bg3);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='%2398a8a0'%3E%3Cpath d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
      }
      .ss-select:hover {
        border-color: var(--accent);
      }
      .ss-select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(46,204,113,0.15);
      }

      /* Level inputs */
      .ss-level-row {
        display: flex;
        gap: 16px;
      }
      .ss-level-row .ss-field {
        flex: 1;
      }
      .ss-level-input-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ss-num-input {
        width: 60px;
        padding: 6px 8px;
        background: var(--bg3);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        font-family: inherit;
      }
      .ss-num-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(46,204,113,0.15);
      }
      .ss-slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: var(--bg3);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .ss-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--bg);
        cursor: pointer;
        transition: transform 0.15s;
      }
      .ss-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .ss-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--bg);
        cursor: pointer;
      }

      /* Stat allocator table */
      .ss-stat-table {
        width: 100%;
        border-collapse: collapse;
      }
      .ss-stat-table td {
        padding: 6px 2px;
        vertical-align: middle;
      }
      .ss-stat-name {
        font-weight: 700;
        font-size: 14px;
        color: var(--gold);
        width: 42px;
        user-select: none;
      }
      .ss-stat-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid var(--border);
        background: var(--bg3);
        color: var(--text);
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
        user-select: none;
        line-height: 1;
      }
      .ss-stat-btn:hover:not(:disabled) {
        background: var(--accent);
        border-color: var(--accent);
        color: #000;
        transform: scale(1.1);
      }
      .ss-stat-btn:active:not(:disabled) {
        transform: scale(0.95);
      }
      .ss-stat-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .ss-stat-val {
        font-size: 22px;
        font-weight: 800;
        color: var(--text);
        text-align: center;
        width: 50px;
        font-variant-numeric: tabular-nums;
      }
      .ss-stat-input {
        width: 50px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        color: var(--text);
        font-size: 22px;
        font-weight: 800;
        text-align: center;
        padding: 2px 0;
        font-variant-numeric: tabular-nums;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        -moz-appearance: textfield;
      }
      .ss-stat-input::-webkit-inner-spin-button,
      .ss-stat-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .ss-stat-input:hover {
        border-color: var(--border);
        background: var(--bg2);
      }
      .ss-stat-input:focus {
        border-color: var(--accent);
        background: var(--bg2);
      }
      .ss-stat-cost {
        font-size: 11px;
        color: var(--text2);
        text-align: center;
        width: 40px;
        white-space: nowrap;
      }
      .ss-stat-bonus {
        font-size: 13px;
        color: #555;
        text-align: center;
        width: 36px;
      }
      .ss-stat-total {
        font-size: 15px;
        font-weight: 700;
        color: var(--accent);
        text-align: center;
        width: 42px;
      }
      .ss-stat-header td {
        font-size: 10px;
        color: var(--text2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 2px;
        font-weight: 600;
        text-align: center;
      }
      .ss-stat-header td:first-child {
        text-align: left;
      }

      /* Remaining points */
      .ss-points-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding: 10px 14px;
        background: var(--bg3);
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      .ss-points-label {
        font-size: 13px;
        color: var(--text2);
        font-weight: 600;
      }
      .ss-points-value {
        font-size: 20px;
        font-weight: 800;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
        transition: color 0.2s;
      }
      .ss-points-value.negative {
        color: #e74c3c;
      }
      .ss-points-detail {
        font-size: 11px;
        color: var(--text2);
        margin-top: 2px;
      }

      /* Reset button */
      .ss-reset-btn {
        margin-top: 10px;
        width: 100%;
        padding: 9px 0;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text2);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .ss-reset-btn:hover {
        border-color: #e74c3c;
        color: #e74c3c;
        background: rgba(231,76,60,0.08);
      }

      /* Results panel */
      .ss-results-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .ss-result-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: var(--bg3);
        border-radius: 8px;
        border: 1px solid var(--border);
        transition: border-color 0.2s;
      }
      .ss-result-item:hover {
        border-color: var(--accent);
      }
      .ss-result-label {
        font-size: 12px;
        color: var(--text2);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .ss-result-value {
        font-size: 18px;
        font-weight: 800;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
      }
      .ss-result-item.highlight .ss-result-value {
        color: var(--gold);
      }
      .ss-result-item.wide {
        grid-column: 1 / -1;
      }

      /* HP/SP bar visuals */
      .ss-bar-wrap {
        grid-column: 1 / -1;
        padding: 12px 14px;
        background: var(--bg3);
        border-radius: 8px;
        border: 1px solid var(--border);
      }
      .ss-bar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .ss-bar-label {
        font-size: 12px;
        color: var(--text2);
        font-weight: 600;
        text-transform: uppercase;
      }
      .ss-bar-val {
        font-size: 18px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }
      .ss-bar-track {
        width: 100%;
        height: 10px;
        background: var(--bg);
        border-radius: 5px;
        overflow: hidden;
      }
      .ss-bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.4s ease;
      }
      .ss-bar-fill.hp {
        background: linear-gradient(90deg, #e74c3c, #e67e22);
      }
      .ss-bar-fill.sp {
        background: linear-gradient(90deg, #3498db, #5dade2);
      }

      /* Job info */
      .ss-job-info {
        font-size: 11px;
        color: var(--text2);
        margin-top: 8px;
        display: flex;
        gap: 16px;
      }
      .ss-job-info span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .ss-job-info .val {
        color: var(--text);
        font-weight: 600;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .ss-wrap {
          flex-direction: column;
        }
        .ss-left,
        .ss-right {
          max-width: 100%;
          min-width: 0;
        }
        .ss-results-grid {
          grid-template-columns: 1fr;
        }
        .ss-result-item.wide {
          grid-column: 1;
        }
        .ss-bar-wrap {
          grid-column: 1;
        }
        .ss-level-row {
          flex-direction: column;
          gap: 0;
        }
        .ss-stat-val {
          font-size: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Build UI ──────────────────────────────────────────────
  function buildUI(container) {
    // Job options grouped by class tier
    const makeOpts = (group) => Object.entries(JOB_CLASSES)
      .filter(([, j]) => j.group === group)
      .map(([id, j]) => `<option value="${id}">${j.name}</option>`)
      .join('');
    const jobOpts = `<optgroup label="Novice">${makeOpts('novice')}</optgroup>`
      + `<optgroup label="1st Class">${makeOpts('class1')}</optgroup>`
      + `<optgroup label="2nd Class">${makeOpts('class2')}</optgroup>`
      + `<optgroup label="High Class">${makeOpts('trans')}</optgroup>`
      + `<optgroup label="Awakened">${makeOpts('awakened')}</optgroup>`
      + `<optgroup label="Extended">${makeOpts('extended')}</optgroup>`
      + `<optgroup label="Taekwon">${makeOpts('taekwon')}</optgroup>`
      + `<optgroup label="2nd Extended">${makeOpts('extended2')}</optgroup>`;

    container.innerHTML = `
      <div class="ss-wrap">
        <!-- LEFT PANEL -->
        <div class="ss-left">
          <!-- Job & Level -->
          <div class="ss-card">
            <div class="ss-card-title"><span class="ss-icon">&#9876;</span> Character</div>

            <div class="ss-field">
              <label class="ss-label" for="ss-job">Job Class</label>
              <select id="ss-job" class="ss-select">${jobOpts}</select>
            </div>

            <div class="ss-level-row">
              <div class="ss-field">
                <label class="ss-label" for="ss-base-lv">Base Level</label>
                <div class="ss-level-input-wrap">
                  <input type="number" id="ss-base-lv" class="ss-num-input" value="1" min="1" max="99">
                  <input type="range" id="ss-base-slider" class="ss-slider" value="1" min="1" max="99">
                </div>
              </div>
              <div class="ss-field">
                <label class="ss-label" for="ss-job-lv">Job Level</label>
                <div class="ss-level-input-wrap">
                  <input type="number" id="ss-job-lv" class="ss-num-input" value="1" min="1" max="10">
                  <input type="range" id="ss-job-slider" class="ss-slider" value="1" min="1" max="10">
                </div>
              </div>
            </div>

            <div class="ss-job-info" id="ss-job-info">
              <span>HP Factor: <span class="val" id="ss-hp-factor">1.0</span></span>
              <span>SP Factor: <span class="val" id="ss-sp-factor">1.0</span></span>
            </div>
          </div>

          <!-- Stat Allocator -->
          <div class="ss-card">
            <div class="ss-card-title"><span class="ss-icon">&#9733;</span> Status Points</div>
            <table class="ss-stat-table">
              <tr class="ss-stat-header">
                <td>Stat</td>
                <td></td>
                <td>Base</td>
                <td></td>
                <td>Cost</td>
                <td>Bonus</td>
                <td>Total</td>
              </tr>
              ${buildStatRows()}
            </table>

            <div class="ss-points-bar">
              <div>
                <div class="ss-points-label">Remaining Points</div>
                <div class="ss-points-detail" id="ss-points-detail">Used: 0 / 48</div>
              </div>
              <div class="ss-points-value" id="ss-remaining">48</div>
            </div>

            <button class="ss-reset-btn" id="ss-reset">Reset All Stats</button>
          </div>
        </div>

        <!-- RIGHT PANEL -->
        <div class="ss-right">
          <div class="ss-card">
            <div class="ss-card-title"><span class="ss-icon">&#9881;</span> Calculated Stats</div>

            <div class="ss-results-grid" id="ss-results">
              <!-- HP bar -->
              <div class="ss-bar-wrap">
                <div class="ss-bar-header">
                  <span class="ss-bar-label">Max HP</span>
                  <span class="ss-bar-val" style="color:#e74c3c" id="ss-hp-val">0</span>
                </div>
                <div class="ss-bar-track"><div class="ss-bar-fill hp" id="ss-hp-bar" style="width:0%"></div></div>
              </div>

              <!-- SP bar -->
              <div class="ss-bar-wrap">
                <div class="ss-bar-header">
                  <span class="ss-bar-label">Max SP</span>
                  <span class="ss-bar-val" style="color:#5dade2" id="ss-sp-val">0</span>
                </div>
                <div class="ss-bar-track"><div class="ss-bar-fill sp" id="ss-sp-bar" style="width:0%"></div></div>
              </div>

              <!-- Offensive -->
              <div class="ss-result-item highlight">
                <span class="ss-result-label">ATK</span>
                <span class="ss-result-value" id="ss-r-atk">0</span>
              </div>
              <div class="ss-result-item highlight">
                <span class="ss-result-label">MATK</span>
                <span class="ss-result-value" id="ss-r-matk">0</span>
              </div>

              <!-- Accuracy & Evasion -->
              <div class="ss-result-item">
                <span class="ss-result-label">HIT</span>
                <span class="ss-result-value" id="ss-r-hit">0</span>
              </div>
              <div class="ss-result-item">
                <span class="ss-result-label">FLEE</span>
                <span class="ss-result-value" id="ss-r-flee">0</span>
              </div>

              <!-- Defense -->
              <div class="ss-result-item">
                <span class="ss-result-label">DEF (Soft)</span>
                <span class="ss-result-value" id="ss-r-def">0</span>
              </div>
              <div class="ss-result-item">
                <span class="ss-result-label">MDEF (Soft)</span>
                <span class="ss-result-value" id="ss-r-mdef">0</span>
              </div>

              <!-- Critical & PD -->
              <div class="ss-result-item">
                <span class="ss-result-label">Critical</span>
                <span class="ss-result-value" id="ss-r-crit">0</span>
              </div>
              <div class="ss-result-item">
                <span class="ss-result-label">Perfect Dodge</span>
                <span class="ss-result-value" id="ss-r-pd">0</span>
              </div>

              <!-- ASPD -->
              <div class="ss-result-item">
                <span class="ss-result-label">ASPD</span>
                <span class="ss-result-value" id="ss-r-aspd">0</span>
              </div>

              <!-- Carry Weight -->
              <div class="ss-result-item">
                <span class="ss-result-label">Carry Weight</span>
                <span class="ss-result-value" id="ss-r-weight">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildStatRows() {
    const STATS = [
      { key: 'str',  label: 'STR' },
      { key: 'agi',  label: 'AGI' },
      { key: 'vit',  label: 'VIT' },
      { key: 'int_', label: 'INT' },
      { key: 'dex',  label: 'DEX' },
      { key: 'luk',  label: 'LUK' },
    ];

    return STATS.map(s => `
      <tr data-stat="${s.key}">
        <td class="ss-stat-name">${s.label}</td>
        <td><button class="ss-stat-btn" data-action="dec" data-stat="${s.key}" title="Decrease ${s.label}">&#8722;</button></td>
        <td class="ss-stat-val"><input type="number" class="ss-stat-input" id="ss-val-${s.key}" data-stat="${s.key}" value="1" min="1" max="130"></td>
        <td><button class="ss-stat-btn" data-action="inc" data-stat="${s.key}" title="Increase ${s.label}">+</button></td>
        <td class="ss-stat-cost" id="ss-cost-${s.key}">2</td>
        <td class="ss-stat-bonus" id="ss-bonus-${s.key}">+0</td>
        <td class="ss-stat-total" id="ss-total-${s.key}">1</td>
      </tr>
    `).join('');
  }

  // ─── State ─────────────────────────────────────────────────
  const state = {
    jobClass: 0,
    baseLv: 1,
    jobLv: 1,
    stats: { str: 1, agi: 1, vit: 1, int_: 1, dex: 1, luk: 1 },
    bonuses: { str: 0, agi: 0, vit: 0, int_: 0, dex: 0, luk: 0 },
  };

  const STAT_KEYS = ['str', 'agi', 'vit', 'int_', 'dex', 'luk'];
  const MAX_STAT = 130;  // ROC Ep.14.03 stat cap

  // ─── Update All ────────────────────────────────────────────
  function updateAll() {
    const total = getTotalStatPoints(state.baseLv, isTransOrAwakened(JOB_CLASSES[state.jobClass].group));
    const used = getUsedPoints(state.stats);
    const remaining = total - used;

    // Stat values, costs, totals
    for (const key of STAT_KEYS) {
      const val = state.stats[key];
      const bonus = state.bonuses[key];
      document.getElementById('ss-val-' + key).value = val;
      document.getElementById('ss-bonus-' + key).textContent = '+' + bonus;
      document.getElementById('ss-total-' + key).textContent = val + bonus;

      const nextCost = val < MAX_STAT ? getStatCost(val + 1) : '-';
      document.getElementById('ss-cost-' + key).textContent = nextCost;

      // Button states
      const decBtn = document.querySelector(`button[data-action="dec"][data-stat="${key}"]`);
      const incBtn = document.querySelector(`button[data-action="inc"][data-stat="${key}"]`);
      if (decBtn) decBtn.disabled = val <= 1;
      if (incBtn) incBtn.disabled = val >= MAX_STAT || (remaining < getStatCost(val + 1) && remaining >= 0);
    }

    // Remaining points
    const remEl = document.getElementById('ss-remaining');
    remEl.textContent = remaining;
    remEl.classList.toggle('negative', remaining < 0);
    document.getElementById('ss-points-detail').textContent =
      `Used: ${used} / ${total}`;

    // Calculated stats
    const calc = calculateStats(state.baseLv, state.jobLv, state.stats, state.jobClass);

    document.getElementById('ss-r-atk').textContent = calc.atk;
    document.getElementById('ss-r-matk').textContent = calc.matk_min;
    document.getElementById('ss-r-hit').textContent = calc.hit;
    document.getElementById('ss-r-flee').textContent = calc.flee;
    document.getElementById('ss-r-def').textContent = calc.def_soft;
    document.getElementById('ss-r-mdef').textContent = calc.mdef_soft;
    document.getElementById('ss-r-crit').textContent = calc.crit;
    document.getElementById('ss-r-pd').textContent = calc.perfect_dodge;
    document.getElementById('ss-r-aspd').textContent = calc.aspd;
    document.getElementById('ss-r-weight').textContent = calc.carry_weight.toLocaleString();

    // Emit to ROC_BUILD shared state
    if (window.ROC_BUILD) {
      const job = JOB_CLASSES[state.jobClass];
      ROC_BUILD.state.jobClass = state.jobClass;
      ROC_BUILD.state.baseLv = state.baseLv;
      ROC_BUILD.state.jobLv = state.jobLv;
      ROC_BUILD.state.stats = Object.assign({}, state.stats);
      ROC_BUILD.state.computed = Object.assign({}, calc);
      ROC_BUILD.state.jobName = job.name;
      ROC_BUILD.state.jobGroup = job.group;
      ROC_BUILD.emit('stats');
    }

    // HP/SP bars  (max reference: lv99 Knight with 99 VIT ~= 32k)
    const HP_MAX_REF = 50000;  // Lv120 HP reference
    const SP_MAX_REF = 5000;
    document.getElementById('ss-hp-val').textContent = calc.hp.toLocaleString();
    document.getElementById('ss-sp-val').textContent = calc.sp.toLocaleString();
    document.getElementById('ss-hp-bar').style.width = Math.min(100, (calc.hp / HP_MAX_REF) * 100).toFixed(1) + '%';
    document.getElementById('ss-sp-bar').style.width = Math.min(100, (calc.sp / SP_MAX_REF) * 100).toFixed(1) + '%';

    // Job info
    const job = JOB_CLASSES[state.jobClass];
    document.getElementById('ss-hp-factor').textContent = job.hpFactor.toFixed(1);
    document.getElementById('ss-sp-factor').textContent = job.spFactor.toFixed(1);
  }

  // ─── Event Binding ─────────────────────────────────────────
  function bindEvents() {
    const container = document.getElementById('sec-stat-sim');

    // Job class
    const jobSel = document.getElementById('ss-job');
    jobSel.addEventListener('change', function () {
      state.jobClass = parseInt(this.value);
      const job = JOB_CLASSES[state.jobClass];
      // Adjust job level max
      const jobLvInput = document.getElementById('ss-job-lv');
      const jobSlider = document.getElementById('ss-job-slider');
      jobLvInput.max = job.maxJobLv;
      jobSlider.max = job.maxJobLv;
      if (state.jobLv > job.maxJobLv) {
        state.jobLv = job.maxJobLv;
        jobLvInput.value = state.jobLv;
        jobSlider.value = state.jobLv;
      }
      // Adjust base level max per class
      const baseLvInput = document.getElementById('ss-base-lv');
      const baseSlider = document.getElementById('ss-base-slider');
      baseLvInput.max = job.maxBaseLv;
      baseSlider.max = job.maxBaseLv;
      if (state.baseLv > job.maxBaseLv) {
        state.baseLv = job.maxBaseLv;
        baseLvInput.value = state.baseLv;
        baseSlider.value = state.baseLv;
      }
      updateAll();
    });

    // Base level
    const baseLvInput = document.getElementById('ss-base-lv');
    const baseSlider = document.getElementById('ss-base-slider');
    baseLvInput.addEventListener('input', function () {
      let v = parseInt(this.value) || 1;
      const maxBLv = JOB_CLASSES[state.jobClass].maxBaseLv;
      v = Math.max(1, Math.min(maxBLv, v));
      state.baseLv = v;
      baseSlider.value = v;
      updateAll();
    });
    baseLvInput.addEventListener('blur', function () {
      this.value = state.baseLv;
    });
    baseSlider.addEventListener('input', function () {
      state.baseLv = parseInt(this.value);
      baseLvInput.value = state.baseLv;
      updateAll();
    });

    // Job level
    const jobLvInput = document.getElementById('ss-job-lv');
    const jobSlider = document.getElementById('ss-job-slider');
    jobLvInput.addEventListener('input', function () {
      const max = JOB_CLASSES[state.jobClass].maxJobLv;
      let v = parseInt(this.value) || 1;
      v = Math.max(1, Math.min(max, v));
      state.jobLv = v;
      jobSlider.value = v;
      updateAll();
    });
    jobLvInput.addEventListener('blur', function () {
      this.value = state.jobLv;
    });
    jobSlider.addEventListener('input', function () {
      state.jobLv = parseInt(this.value);
      jobLvInput.value = state.jobLv;
      updateAll();
    });

    // Direct stat input (type value directly)
    container.addEventListener('change', function (e) {
      const input = e.target.closest('.ss-stat-input');
      if (!input) return;
      const key = input.dataset.stat;
      let v = parseInt(input.value) || 1;
      v = Math.max(1, Math.min(MAX_STAT, v));
      state.stats[key] = v;
      // Check if over-allocated, cap if needed
      const total = getTotalStatPoints(state.baseLv, isTransOrAwakened(JOB_CLASSES[state.jobClass].group));
      const used = getUsedPoints(state.stats);
      if (used > total) {
        // Roll back to max affordable
        while (getUsedPoints(state.stats) > total && state.stats[key] > 1) {
          state.stats[key]--;
        }
      }
      updateAll();
    });

    // Stat buttons
    container.addEventListener('click', function (e) {
      const btn = e.target.closest('.ss-stat-btn');
      if (!btn || btn.disabled) return;

      const key = btn.dataset.stat;
      const action = btn.dataset.action;

      if (action === 'inc' && state.stats[key] < MAX_STAT) {
        state.stats[key]++;
      } else if (action === 'dec' && state.stats[key] > 1) {
        state.stats[key]--;
      }
      updateAll();
    });

    // Long-press for rapid increment/decrement
    let longPressTimer = null;
    let longPressInterval = null;
    container.addEventListener('mousedown', function (e) {
      const btn = e.target.closest('.ss-stat-btn');
      if (!btn || btn.disabled) return;

      const key = btn.dataset.stat;
      const action = btn.dataset.action;

      longPressTimer = setTimeout(function () {
        longPressInterval = setInterval(function () {
          if (action === 'inc' && state.stats[key] < MAX_STAT) {
            const total = getTotalStatPoints(state.baseLv, isTransOrAwakened(JOB_CLASSES[state.jobClass].group));
            const used = getUsedPoints(state.stats);
            const remaining = total - used;
            const cost = getStatCost(state.stats[key] + 1);
            if (remaining >= cost) {
              state.stats[key]++;
              updateAll();
            } else {
              clearInterval(longPressInterval);
            }
          } else if (action === 'dec' && state.stats[key] > 1) {
            state.stats[key]--;
            updateAll();
          } else {
            clearInterval(longPressInterval);
          }
        }, 60);
      }, 400);
    });

    function clearLongPress() {
      clearTimeout(longPressTimer);
      clearInterval(longPressInterval);
      longPressTimer = null;
      longPressInterval = null;
    }
    container.addEventListener('mouseup', clearLongPress);
    container.addEventListener('mouseleave', clearLongPress);

    // Touch support for long press
    container.addEventListener('touchstart', function (e) {
      const btn = e.target.closest('.ss-stat-btn');
      if (!btn || btn.disabled) return;

      const key = btn.dataset.stat;
      const action = btn.dataset.action;

      longPressTimer = setTimeout(function () {
        longPressInterval = setInterval(function () {
          if (action === 'inc' && state.stats[key] < MAX_STAT) {
            const total = getTotalStatPoints(state.baseLv, isTransOrAwakened(JOB_CLASSES[state.jobClass].group));
            const used = getUsedPoints(state.stats);
            const remaining = total - used;
            const cost = getStatCost(state.stats[key] + 1);
            if (remaining >= cost) {
              state.stats[key]++;
              updateAll();
            } else {
              clearInterval(longPressInterval);
            }
          } else if (action === 'dec' && state.stats[key] > 1) {
            state.stats[key]--;
            updateAll();
          } else {
            clearInterval(longPressInterval);
          }
        }, 60);
      }, 400);
    }, { passive: true });
    container.addEventListener('touchend', clearLongPress);
    container.addEventListener('touchcancel', clearLongPress);

    // Reset button
    document.getElementById('ss-reset').addEventListener('click', function () {
      for (const key of STAT_KEYS) {
        state.stats[key] = 1;
      }
      updateAll();
    });
  }

  // ─── Public init function ──────────────────────────────────
  window.initStatSimulator = function () {
    const container = document.getElementById('sec-stat-sim');
    if (!container) {
      console.warn('[Stat Simulator] #sec-stat-sim not found');
      return;
    }

    injectStyles();
    buildUI(container);
    bindEvents();

    // Register save/load hooks
    if (window.ROC_BUILD) {
      ROC_BUILD._statSim = {
        getState: function () {
          return {
            jobClass: state.jobClass,
            baseLv: state.baseLv,
            jobLv: state.jobLv,
            stats: Object.assign({}, state.stats)
          };
        },
        setState: function (saved) {
          if (!saved) return;
          if (saved.jobClass !== undefined) state.jobClass = saved.jobClass;
          if (saved.baseLv !== undefined) {
            const maxBLv = (JOB_CLASSES[state.jobClass] || {}).maxBaseLv || 120;
            state.baseLv = Math.max(1, Math.min(maxBLv, saved.baseLv));
          }
          if (saved.jobLv !== undefined) state.jobLv = saved.jobLv;
          if (saved.stats) {
            for (const key of STAT_KEYS) {
              if (saved.stats[key] !== undefined) {
                state.stats[key] = Math.max(1, Math.min(MAX_STAT, saved.stats[key]));
              }
            }
          }
          // Update UI inputs
          const jobSel = document.getElementById('ss-job');
          if (jobSel) jobSel.value = state.jobClass;
          const baseLvInput = document.getElementById('ss-base-lv');
          const baseSlider = document.getElementById('ss-base-slider');
          if (baseLvInput) baseLvInput.value = state.baseLv;
          if (baseSlider) baseSlider.value = state.baseLv;
          const jobLvInput = document.getElementById('ss-job-lv');
          const jobSlider = document.getElementById('ss-job-slider');
          const job = JOB_CLASSES[state.jobClass];
          if (job && jobLvInput) { jobLvInput.max = job.maxJobLv; jobLvInput.value = state.jobLv; }
          if (job && jobSlider) { jobSlider.max = job.maxJobLv; jobSlider.value = state.jobLv; }
          updateAll();
        }
      };
      // Try auto-load
      ROC_BUILD.loadFromStorage();
    }

    updateAll();
  };
})();
