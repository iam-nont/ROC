// =====================================================================
//  ROC Build Simulator — build_simulator.js
//  Combined Equipment Planner + Skill Selection + DPS Output
//  Vanilla JS IIFE, self-contained with injected CSS.
//  Depends on: ROC_BUILD (build_state.js), SKILL_DB (skill_data.js),
//              ITEMS (data.js), MONSTERS (monster_data.js)
//  Call initBuildSimulator() after DOM ready. Renders into #sec-build-sim.
// =====================================================================

(function () {
  'use strict';

  // ==================== CONSTANTS ====================

  // Renewal refine bonus tiers: { weaponLevel: { base, overRefine, safeLimit } }
  // Up to safe limit: +base per refine. Above safe: +(base+overRefine) per refine.
  var REFINE_TIERS = {
    1: { base: 2,  overRefine: 3,  safeLimit: 7 },
    2: { base: 3,  overRefine: 5,  safeLimit: 6 },
    3: { base: 5,  overRefine: 8,  safeLimit: 5 },
    4: { base: 7,  overRefine: 14, safeLimit: 4 }
  };

  function calcRefineATK(weaponLevel, refineLevel) {
    var tier = REFINE_TIERS[weaponLevel] || REFINE_TIERS[1];
    if (refineLevel <= 0) return 0;
    var safe = Math.min(refineLevel, tier.safeLimit);
    var over = Math.max(0, refineLevel - tier.safeLimit);
    return safe * tier.base + over * (tier.base + tier.overRefine);
  }

  // Level-aware element table: [atkElement][defElement] = [lv1, lv2, lv3, lv4]
  var ELEMENT_TABLE_LV = {
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

  function getElementMod(atkEle, defEle, defLv) {
    var row = ELEMENT_TABLE_LV[atkEle] || ELEMENT_TABLE_LV['Neutral'];
    var arr = row[defEle];
    if (!arr) return 100;
    var lvIdx = Math.max(0, Math.min(3, (defLv || 1) - 1));
    return arr[lvIdx];
  }

  var ELEMENTS = ['Neutral','Water','Earth','Fire','Wind','Poison','Holy','Shadow','Ghost','Undead'];

  // Awakened → Transcendent sprite fallback (same visual)
  var AWAKENED_TO_TRANS = {
    5008:4008, 5009:4009, 5010:4010, 5011:4011,
    5012:4012, 5013:4013, 5015:4015, 5016:4016,
    5017:4017, 5018:4018, 5019:4019, 5020:4020, 5021:4021
  };

  // Size penalty by weapon type -> target size (% values)
  var SIZE_PENALTY = {
    Dagger:      { Small:100, Medium:75,  Large:50  },
    Sword:       { Small:75,  Medium:100, Large:75  },
    '2H Sword':  { Small:75,  Medium:75,  Large:100 },
    Spear:       { Small:75,  Medium:75,  Large:100 },
    Axe:         { Small:50,  Medium:75,  Large:100 },
    Mace:        { Small:75,  Medium:100, Large:100 },
    Rod:         { Small:100, Medium:100, Large:100 },
    Staff:       { Small:100, Medium:100, Large:100 },
    Book:        { Small:100, Medium:100, Large:100 },
    Bow:         { Small:100, Medium:100, Large:75  },
    Katar:       { Small:75,  Medium:100, Large:75  },
    Knuckle:     { Small:100, Medium:75,  Large:50  },
    Instrument:  { Small:75,  Medium:100, Large:75  },
    Whip:        { Small:75,  Medium:100, Large:75  }
  };

  // Weapon variance by weapon level
  var WEAPON_VARIANCE = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.25 };

  // Race names
  var RACES = ['Formless','Undead','Brute','Plant','Insect','Fish','Demon','Demi-Human','Angel','Dragon'];

  // Equipment Option types (ROC Awakening random options)
  var OPTION_TYPES = [
    { key: '',           label: '-- None --' },
    { key: 'ATK',        label: 'ATK +',        unit: '',  step: 1 },
    { key: 'MATK',       label: 'MATK +',       unit: '',  step: 1 },
    { key: 'STR',        label: 'STR +',        unit: '',  step: 1 },
    { key: 'AGI',        label: 'AGI +',        unit: '',  step: 1 },
    { key: 'VIT',        label: 'VIT +',        unit: '',  step: 1 },
    { key: 'INT',        label: 'INT +',        unit: '',  step: 1 },
    { key: 'DEX',        label: 'DEX +',        unit: '',  step: 1 },
    { key: 'LUK',        label: 'LUK +',        unit: '',  step: 1 },
    { key: 'HP',         label: 'MaxHP +',      unit: '',  step: 100 },
    { key: 'SP',         label: 'MaxSP +',      unit: '',  step: 10 },
    { key: 'ASPD',       label: 'ASPD +',       unit: '',  step: 1 },
    { key: 'CRIT',       label: 'CRI +',        unit: '',  step: 1 },
    { key: 'HIT',        label: 'HIT +',        unit: '',  step: 1 },
    { key: 'FLEE',       label: 'FLEE +',       unit: '',  step: 1 },
    { key: 'DEF',        label: 'DEF +',        unit: '',  step: 1 },
    { key: 'MDEF',       label: 'MDEF +',       unit: '',  step: 1 },
    { key: 'castReduce', label: 'Cast Time -',  unit: '%', step: 1 },
    { key: 'fixedCast',  label: 'Fixed Cast -', unit: '%', step: 1 },
    { key: 'afterDelay', label: 'After Delay -',unit: '%', step: 1 },
    { key: 'lifesteal',  label: 'HP Drain',     unit: '%', step: 1 },
    { key: 'spDrain',    label: 'SP Drain',     unit: '%', step: 1 },
    { key: 'hpRegen',    label: 'HP Regen +',   unit: '',  step: 1 },
    { key: 'spRegen',    label: 'SP Regen +',   unit: '',  step: 1 },
    { key: 'ranged',     label: 'Ranged Dmg +', unit: '%', step: 1 },
    { key: 'melee',      label: 'Melee Dmg +',  unit: '%', step: 1 },
    { key: 'critical',   label: 'Crit Dmg +',   unit: '%', step: 1 },
    { key: 'magic',      label: 'Magic Dmg +',  unit: '%', step: 1 },
    { key: 'allDmg',     label: 'All Dmg +',    unit: '%', step: 1 },
  ];

  // Popular card presets (auto-fill bonuses)
  var CARD_PRESETS = {
    4005: { name: 'Skeleton Worker Card', atk: 5, desc: 'ATK +5, CRIT +1' },
    4015: { name: 'Hydra Card',           raceBonus: 'Demi-Human', raceVal: 20, desc: '+20% vs Demi-Human' },
    4029: { name: 'Strouf Card',          raceBonus: 'Demon',      raceVal: 20, desc: '+20% vs Demon' },
    4030: { name: 'Minorous Card',        raceBonus: 'Brute',      raceVal: 15, sizeBonus: 'Large', sizeVal: 15, desc: '+15% Brute, +15% Large' },
    4025: { name: 'Vadon Card',           eleBonus: 'Fire',        eleVal: 20, desc: '+20% vs Fire' },
    4019: { name: 'Peco Peco Egg Card',   raceBonus: 'Formless',   raceVal: 20, desc: '+20% vs Formless' },
    4027: { name: 'Drainliar Card',       eleBonus: 'Water',       eleVal: 20, desc: '+20% vs Water' },
    4020: { name: 'Picky Card',           atk: 10, desc: 'ATK +10' },
    4036: { name: 'Santa Poring Card',    eleBonus: 'Shadow',      eleVal: 20, desc: '+20% vs Shadow' },
    4035: { name: 'Orc Skeleton Card',    raceBonus: 'Undead',     raceVal: 20, desc: '+20% vs Undead' },
    4048: { name: 'Flora Card',           raceBonus: 'Fish',       raceVal: 20, desc: '+20% vs Fish' },
    4049: { name: 'Caramel Card',         raceBonus: 'Insect',     raceVal: 20, desc: '+20% vs Insect' },
    4034: { name: 'Goblin Card',          raceBonus: 'Brute',      raceVal: 20, desc: '+20% vs Brute' },
    4046: { name: 'Magnolia Card',        raceBonus: 'Plant',      raceVal: 20, desc: '+20% vs Plant' },
    4050: { name: 'Skeleton Soldier Card', sizeBonus: 'Medium', sizeVal: 15, desc: '+15% vs Medium' },
    4044: { name: 'Desert Wolf Card',     sizeBonus: 'Small',      sizeVal: 15, desc: '+15% vs Small' },
    4028: { name: 'Drainliar Card',       eleBonus: 'Water',       eleVal: 20, desc: '+20% vs Water' },
    4051: { name: 'Skel Worker Card',     atk: 5, desc: 'ATK +5, +15% vs Medium' },
    4095: { name: 'Sidewinder Card',      desc: 'Double Attack Lv1' },
    4001: { name: 'Andre Card',           atk: 20, desc: 'ATK +20' },
    4092: { name: 'Turtle General Card',  allDmg: 20, desc: '+20% All Physical Damage' }
  };

  // Helper: check if item is a headgear (not costume)
  function isHeadgear(i) {
    if (i.cat === 'Headgear' && !/costume/i.test(i.wtype)) return true;
    if (i.cat === 'Armor' && /headgear|helm/i.test(i.wtype)) return true;
    return false;
  }

  // Equipment slot definitions
  var EQUIP_SLOTS = [
    { key: 'weapon',  label: 'Weapon',   filter: function(i) { return i.cat === 'Weapon'; }, hasRefine: true, maxCards: 4 },
    { key: 'shield',  label: 'Shield',   filter: function(i) { return i.cat === 'Armor' && /shield/i.test(i.wtype); }, hasRefine: true, maxCards: 1 },
    { key: 'armor',   label: 'Armor',    filter: function(i) { return i.cat === 'Armor' && !/shield|headgear|helm/i.test(i.wtype); }, hasRefine: true, maxCards: 1 },
    { key: 'garment', label: 'Garment',  filter: function(i) { return i.cat === 'Armor' && !/shield|headgear|helm/i.test(i.wtype); }, hasRefine: true, maxCards: 1 },
    { key: 'shoes',   label: 'Shoes',    filter: function(i) { return i.cat === 'Armor' && !/shield|headgear|helm/i.test(i.wtype); }, hasRefine: true, maxCards: 1 },
    { key: 'headTop', label: 'Head Top', filter: function(i) { return isHeadgear(i) && (!i.eloc || /upper|all/i.test(i.eloc)); }, hasRefine: true, maxCards: 1 },
    { key: 'headMid', label: 'Head Mid', filter: function(i) { return isHeadgear(i) && /middle/i.test(i.eloc); }, hasRefine: false, maxCards: 1 },
    { key: 'headLow', label: 'Head Low', filter: function(i) { return isHeadgear(i) && /lower/i.test(i.eloc); }, hasRefine: false, maxCards: 1 },
    { key: 'acc1',    label: 'Accessory 1', filter: function(i) { return i.cat === 'Accessory'; }, hasRefine: false, maxCards: 1 },
    { key: 'acc2',    label: 'Accessory 2', filter: function(i) { return i.cat === 'Accessory'; }, hasRefine: false, maxCards: 1 }
  ];

  // ==================== STATE ====================

  var bsState = {
    equip: {
      weapon:  null, // { item: {...}, refine: 0, cards: [null, null, null, null] }
      shield:  null,
      armor:   null,
      garment: null,
      shoes:   null,
      headTop: null,
      headMid: null,
      headLow: null,
      acc1:    null,
      acc2:    null
    },
    bonusRace: 0,
    bonusEle: 0,
    bonusSize: 0,
    bonusATK: 0,
    bonusAllDmg: 0,
    // Costume / Option / Enchant bonuses (separate slot system)
    costumeATK: 0,
    costumeMATK: 0,
    costumeSTR: 0,
    costumeAGI: 0,
    costumeVIT: 0,
    costumeINT: 0,
    costumeDEX: 0,
    costumeLUK: 0,
    costumeASPD: 0,
    costumeCrit: 0,
    weaponElement: 'Neutral',
    activeSkillId: null,
    activeSkillLv: 1,
    targetMonster: null
  };

  var searchTimers = {};

  // ==================== HELPERS ====================

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function parseElement(eleStr) {
    if (!eleStr) return { name: 'Neutral', level: 1 };
    var m = String(eleStr).match(/^(\w+)\s*(\d*)$/);
    if (!m) return { name: 'Neutral', level: 1 };
    return { name: m[1], level: parseInt(m[2] || '1', 10) };
  }

  function normalizeWtype(wtype) {
    if (!wtype) return 'Dagger';
    var t = wtype.trim();
    if (/dagger/i.test(t)) return 'Dagger';
    if (/two.?hand.*sword|2h\s*sword/i.test(t)) return '2H Sword';
    if (/sword/i.test(t)) return 'Sword';
    if (/spear/i.test(t)) return 'Spear';
    if (/axe/i.test(t)) return 'Axe';
    if (/mace/i.test(t)) return 'Mace';
    if (/rod|staff/i.test(t)) return 'Rod';
    if (/bow/i.test(t)) return 'Bow';
    if (/katar/i.test(t)) return 'Katar';
    if (/knuckle/i.test(t)) return 'Knuckle';
    if (/book/i.test(t)) return 'Book';
    if (/instrument/i.test(t)) return 'Instrument';
    if (/whip/i.test(t)) return 'Whip';
    if (/huuma/i.test(t)) return 'Katar';
    return 'Dagger';
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function num(v) { return parseInt(v, 10) || 0; }
  function fmt(n) { return n.toLocaleString(); }

  // ==================== ITEM SEARCH ====================

  function searchItems(query, filterFn) {
    if (typeof ITEMS === 'undefined') return [];
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];
    for (var idx = 0; idx < ITEMS.length; idx++) {
      var i = ITEMS[idx];
      if (!filterFn(i)) continue;
      if (i.name.toLowerCase().indexOf(q) !== -1 || String(i.id).indexOf(q) !== -1) {
        results.push(i);
        if (results.length >= 15) break;
      }
    }
    return results;
  }

  function searchMonsters(query) {
    if (typeof MONSTERS === 'undefined') return [];
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];
    for (var idx = 0; idx < MONSTERS.length; idx++) {
      var m = MONSTERS[idx];
      if (m.name.toLowerCase().indexOf(q) !== -1 || String(m.id).indexOf(q) !== -1) {
        results.push(m);
        if (results.length >= 10) break;
      }
    }
    return results;
  }

  function getCards() {
    if (typeof ITEMS === 'undefined') return [];
    return ITEMS.filter(function (i) { return i.cat === 'Card'; });
  }

  // ==================== CSS INJECTION ====================

  function injectStyles() {
    if (document.getElementById('bs-sim-styles')) return;
    var style = document.createElement('style');
    style.id = 'bs-sim-styles';
    style.textContent = '\
      /* ====== Build Simulator Styles ====== */\n\
      .bs-main-title {\n\
        font-size: 20px;\n\
        font-weight: 800;\n\
        color: var(--gold);\n\
        margin-bottom: 20px;\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 10px;\n\
      }\n\
      .bs-main-title .bs-icon { font-size: 22px; }\n\
      \n\
      /* Section layout */\n\
      .bs-section {\n\
        background: var(--bg2);\n\
        border: 1px solid var(--border);\n\
        border-radius: 12px;\n\
        padding: 20px;\n\
        margin-bottom: 16px;\n\
      }\n\
      .bs-section-title {\n\
        font-size: 15px;\n\
        font-weight: 700;\n\
        color: var(--gold);\n\
        margin-bottom: 14px;\n\
        letter-spacing: 0.5px;\n\
        text-transform: uppercase;\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 8px;\n\
        padding-bottom: 10px;\n\
        border-bottom: 1px solid var(--border);\n\
      }\n\
      .bs-section-title .bs-icon { font-size: 18px; opacity: 0.85; }\n\
      \n\
      /* Equipment + Bonuses top row */\n\
      .bs-equip-wrap {\n\
        display: grid;\n\
        grid-template-columns: 1fr 1fr;\n\
        gap: 16px;\n\
      }\n\
      \n\
      /* Equipment slot */\n\
      .bs-equip-slot {\n\
        display: flex;\n\
        flex-wrap: wrap;\n\
        align-items: center;\n\
        gap: 8px;\n\
        margin-bottom: 10px;\n\
        padding: 8px 10px;\n\
        background: var(--bg3);\n\
        border-radius: 8px;\n\
        border: 1px solid var(--border);\n\
        transition: border-color 0.2s;\n\
      }\n\
      .bs-equip-slot:hover { border-color: var(--accent); }\n\
      .bs-equip-slot .bs-slot-label {\n\
        font-size: 11px;\n\
        font-weight: 700;\n\
        color: var(--text2);\n\
        text-transform: uppercase;\n\
        letter-spacing: 0.5px;\n\
        width: 80px;\n\
        flex-shrink: 0;\n\
      }\n\
      .bs-equip-slot .bs-slot-body {\n\
        flex: 1;\n\
        min-width: 0;\n\
      }\n\
      \n\
      /* Search input in equip slot */\n\
      .bs-search-wrap {\n\
        position: relative;\n\
        width: 100%;\n\
      }\n\
      .bs-search-input {\n\
        width: 100%;\n\
        padding: 6px 10px;\n\
        border-radius: 6px;\n\
        border: 1px solid var(--border);\n\
        background: var(--bg2);\n\
        color: var(--text);\n\
        font-size: 13px;\n\
        font-family: inherit;\n\
        outline: none;\n\
        transition: border-color 0.2s;\n\
        box-sizing: border-box;\n\
      }\n\
      .bs-search-input:focus { border-color: var(--accent); }\n\
      .bs-search-input::placeholder { color: var(--text2); opacity: 0.6; }\n\
      \n\
      /* Dropdown */\n\
      .bs-dropdown {\n\
        position: absolute;\n\
        top: 100%;\n\
        left: 0;\n\
        right: 0;\n\
        z-index: 300;\n\
        background: var(--bg2);\n\
        border: 1px solid var(--accent);\n\
        border-radius: 0 0 8px 8px;\n\
        max-height: 220px;\n\
        overflow-y: auto;\n\
        display: none;\n\
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);\n\
        scrollbar-width: thin;\n\
        scrollbar-color: var(--accent) transparent;\n\
      }\n\
      .bs-dropdown.open { display: block; }\n\
      .bs-dd-item {\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 8px;\n\
        padding: 6px 10px;\n\
        cursor: pointer;\n\
        border-bottom: 1px solid var(--border);\n\
        font-size: 12px;\n\
        transition: background 0.15s;\n\
      }\n\
      .bs-dd-item:last-child { border-bottom: none; }\n\
      .bs-dd-item:hover { background: rgba(46,204,113,0.12); }\n\
      .bs-dd-item .dd-name { color: var(--text); flex: 1; }\n\
      .bs-dd-item .dd-sub { color: var(--text2); font-size: 10px; white-space: nowrap; }\n\
      \n\
      /* Selected item display */\n\
      .bs-selected {\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 8px;\n\
        padding: 4px 0;\n\
      }\n\
      .bs-sel-icon {\n\
        width: 24px;\n\
        height: 24px;\n\
        object-fit: contain;\n\
        flex-shrink: 0;\n\
        image-rendering: auto;\n\
        border-radius: 3px;\n\
        background: var(--bg2);\n\
      }\n\
      .bs-sel-info {\n\
        flex: 1;\n\
        min-width: 0;\n\
        display: flex;\n\
        flex-direction: column;\n\
        gap: 1px;\n\
      }\n\
      .bs-selected .bs-sel-name {\n\
        font-size: 13px;\n\
        font-weight: 600;\n\
        color: var(--accent);\n\
      }\n\
      .bs-sel-cards {\n\
        font-size: 10px;\n\
        color: var(--gold);\n\
        font-style: italic;\n\
      }\n\
      .bs-selected .bs-sel-detail {\n\
        font-size: 10px;\n\
        color: var(--text2);\n\
      }\n\
      .bs-sel-clear {\n\
        background: none;\n\
        border: 1px solid var(--border);\n\
        color: var(--text2);\n\
        border-radius: 4px;\n\
        padding: 2px 6px;\n\
        cursor: pointer;\n\
        font-size: 10px;\n\
        font-family: inherit;\n\
        transition: all 0.15s;\n\
        flex-shrink: 0;\n\
      }\n\
      .bs-sel-clear:hover { border-color: #e74c3c; color: #e74c3c; }\n\
      \n\
      /* Refine + cards row */\n\
      .bs-refine-row {\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 6px;\n\
        margin-top: 4px;\n\
        flex-wrap: wrap;\n\
      }\n\
      .bs-refine-input {\n\
        width: 50px;\n\
        padding: 4px 6px;\n\
        border-radius: 4px;\n\
        border: 1px solid var(--border);\n\
        background: var(--bg2);\n\
        color: var(--gold);\n\
        font-size: 13px;\n\
        font-weight: 700;\n\
        text-align: center;\n\
        font-family: inherit;\n\
        outline: none;\n\
      }\n\
      .bs-refine-input:focus { border-color: var(--accent); }\n\
      .bs-refine-label {\n\
        font-size: 10px;\n\
        color: var(--text2);\n\
        font-weight: 600;\n\
      }\n\
      \n\
      /* Card search in equipment */\n\
      .bs-cards-label { font-size: 11px; color: var(--text2); font-weight: 600; margin-bottom: 4px; }\n\
      .bs-card-slot { margin-bottom: 4px; }\n\
      .bs-card-slot .bs-search-input { font-size: 11px; padding: 4px 8px; }\n\
      .bs-card-selected {\n\
        display: flex; align-items: center; gap: 6px;\n\
        padding: 3px 8px; background: var(--bg2); border-radius: 4px;\n\
        border: 1px solid var(--border); font-size: 12px;\n\
      }\n\
      .bs-card-icon {\n\
        width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;\n\
        image-rendering: auto; border-radius: 2px;\n\
      }\n\
      .bs-dd-icon {\n\
        width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;\n\
        image-rendering: auto;\n\
      }\n\
      .bs-card-clear {\n\
        background: none; border: none; color: var(--accent); cursor: pointer;\n\
        font-size: 14px; font-weight: bold; padding: 0 4px; line-height: 1;\n\
      }\n\
      .bs-card-clear:hover { color: #e74c3c; }\n\
      /* Equipment Options */\n\
      .bs-options-wrap { margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border); }\n\
      .bs-option-row {\n\
        display: flex; align-items: center; gap: 4px; margin-bottom: 3px;\n\
      }\n\
      .bs-opt-type {\n\
        flex: 1; padding: 3px 4px; font-size: 11px; border-radius: 3px;\n\
        border: 1px solid var(--border); background: var(--bg2); color: var(--text);\n\
        font-family: inherit; outline: none; cursor: pointer;\n\
      }\n\
      .bs-opt-type:focus { border-color: var(--accent); }\n\
      .bs-opt-val {\n\
        width: 50px; padding: 3px 4px; font-size: 11px; border-radius: 3px;\n\
        border: 1px solid var(--border); background: var(--bg2); color: var(--gold);\n\
        font-family: inherit; outline: none; text-align: center; font-weight: 700;\n\
      }\n\
      .bs-opt-val:focus { border-color: var(--accent); }\n\
      \n\
      /* Bonuses panel */\n\
      .bs-bonus-grid {\n\
        display: grid;\n\
        grid-template-columns: 1fr 1fr;\n\
        gap: 8px;\n\
      }\n\
      .bs-bonus-item {\n\
        display: flex;\n\
        justify-content: space-between;\n\
        align-items: center;\n\
        padding: 8px 12px;\n\
        background: var(--bg3);\n\
        border-radius: 6px;\n\
        border: 1px solid var(--border);\n\
      }\n\
      .bs-bonus-label {\n\
        font-size: 11px;\n\
        color: var(--text2);\n\
        font-weight: 600;\n\
        text-transform: uppercase;\n\
      }\n\
      .bs-bonus-value {\n\
        font-size: 15px;\n\
        font-weight: 700;\n\
        color: var(--accent);\n\
        font-variant-numeric: tabular-nums;\n\
      }\n\
      .bs-bonus-value.gold { color: var(--gold); }\n\
      .bs-bonus-item.wide { grid-column: 1 / -1; }\n\
      \n\
      /* Manual bonus inputs */\n\
      .bs-manual-bonuses {\n\
        margin-top: 12px;\n\
        padding-top: 12px;\n\
        border-top: 1px solid var(--border);\n\
      }\n\
      .bs-manual-bonuses h4 {\n\
        font-size: 12px;\n\
        color: var(--text2);\n\
        margin-bottom: 8px;\n\
        font-weight: 600;\n\
        text-transform: uppercase;\n\
      }\n\
      .bs-costume-section {\n\
        border-top: 1px dashed rgba(224,160,255,.3);\n\
        margin-top: 14px;\n\
        padding-top: 14px;\n\
      }\n\
      .bs-bonus-inputs {\n\
        display: flex;\n\
        gap: 8px;\n\
        flex-wrap: wrap;\n\
      }\n\
      .bs-bonus-field {\n\
        display: flex;\n\
        flex-direction: column;\n\
        gap: 2px;\n\
        flex: 1;\n\
        min-width: 80px;\n\
      }\n\
      .bs-bonus-field label {\n\
        font-size: 10px;\n\
        color: var(--text2);\n\
        text-transform: uppercase;\n\
        letter-spacing: 0.4px;\n\
      }\n\
      .bs-bonus-field input,\n\
      .bs-bonus-field select {\n\
        padding: 6px 8px;\n\
        border-radius: 4px;\n\
        border: 1px solid var(--border);\n\
        background: var(--bg2);\n\
        color: var(--text);\n\
        font-size: 13px;\n\
        font-family: inherit;\n\
        outline: none;\n\
        width: 100%;\n\
        box-sizing: border-box;\n\
      }\n\
      .bs-bonus-field input:focus,\n\
      .bs-bonus-field select:focus { border-color: var(--accent); }\n\
      \n\
      /* Skill section */\n\
      .bs-skill-wrap {\n\
        display: grid;\n\
        grid-template-columns: 1fr 1fr;\n\
        gap: 16px;\n\
        align-items: start;\n\
      }\n\
      .bs-skill-selector {\n\
        display: flex;\n\
        flex-direction: column;\n\
        gap: 10px;\n\
      }\n\
      .bs-skill-info {\n\
        padding: 12px;\n\
        background: var(--bg3);\n\
        border-radius: 8px;\n\
        border: 1px solid var(--border);\n\
      }\n\
      .bs-skill-info-row {\n\
        display: flex;\n\
        justify-content: space-between;\n\
        padding: 3px 0;\n\
        font-size: 12px;\n\
      }\n\
      .bs-skill-info-row .si-label { color: var(--text2); }\n\
      .bs-skill-info-row .si-value { color: var(--text); font-weight: 600; }\n\
      .bs-skill-info-row .si-value.gold { color: var(--gold); }\n\
      \n\
      .bs-skill-level-wrap {\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 10px;\n\
      }\n\
      .bs-skill-slider {\n\
        flex: 1;\n\
        -webkit-appearance: none;\n\
        appearance: none;\n\
        height: 6px;\n\
        background: var(--bg3);\n\
        border-radius: 3px;\n\
        outline: none;\n\
        cursor: pointer;\n\
      }\n\
      .bs-skill-slider::-webkit-slider-thumb {\n\
        -webkit-appearance: none;\n\
        appearance: none;\n\
        width: 18px;\n\
        height: 18px;\n\
        border-radius: 50%;\n\
        background: var(--accent);\n\
        border: 2px solid var(--bg);\n\
        cursor: pointer;\n\
      }\n\
      .bs-skill-slider::-moz-range-thumb {\n\
        width: 18px;\n\
        height: 18px;\n\
        border-radius: 50%;\n\
        background: var(--accent);\n\
        border: 2px solid var(--bg);\n\
        cursor: pointer;\n\
      }\n\
      .bs-skill-lv-num {\n\
        font-size: 20px;\n\
        font-weight: 800;\n\
        color: var(--gold);\n\
        width: 36px;\n\
        text-align: center;\n\
        font-variant-numeric: tabular-nums;\n\
      }\n\
      \n\
      /* Skill class label */\n\
      .bs-class-label {\n\
        font-size: 12px;\n\
        color: var(--text2);\n\
        margin-bottom: 4px;\n\
      }\n\
      .bs-class-label .cls-val {\n\
        color: var(--gold);\n\
        font-weight: 700;\n\
      }\n\
      \n\
      /* SP sustain */\n\
      .bs-sp-sustain {\n\
        font-size: 12px;\n\
        color: var(--text2);\n\
        margin-top: 6px;\n\
        padding: 6px 10px;\n\
        background: var(--bg3);\n\
        border-radius: 6px;\n\
      }\n\
      .bs-sp-sustain .sp-val { color: var(--blue, #5dade2); font-weight: 600; }\n\
      \n\
      /* Damage output section */\n\
      .bs-dmg-wrap {\n\
        display: grid;\n\
        grid-template-columns: 1fr 300px;\n\
        gap: 16px;\n\
        align-items: start;\n\
      }\n\
      .bs-dmg-grid {\n\
        display: grid;\n\
        grid-template-columns: repeat(3, 1fr);\n\
        gap: 10px;\n\
        margin-bottom: 14px;\n\
      }\n\
      .bs-dmg-card {\n\
        background: var(--bg3);\n\
        border-radius: 8px;\n\
        padding: 14px;\n\
        text-align: center;\n\
        border: 1px solid var(--border);\n\
      }\n\
      .bs-dmg-card .dmc-label {\n\
        font-size: 10px;\n\
        color: var(--text2);\n\
        text-transform: uppercase;\n\
        letter-spacing: 0.5px;\n\
        margin-bottom: 4px;\n\
      }\n\
      .bs-dmg-card .dmc-value {\n\
        font-size: 22px;\n\
        font-weight: 700;\n\
        color: var(--gold);\n\
        font-variant-numeric: tabular-nums;\n\
      }\n\
      .bs-dmg-card .dmc-value.accent { color: var(--accent); }\n\
      .bs-dmg-card .dmc-value.blue { color: var(--blue, #5dade2); }\n\
      .bs-dmg-card .dmc-value.red { color: #e74c3c; }\n\
      .bs-dmg-card.wide { grid-column: 1 / -1; }\n\
      \n\
      /* Target monster panel */\n\
      .bs-target-panel {\n\
        padding: 14px;\n\
        background: var(--bg3);\n\
        border-radius: 8px;\n\
        border: 1px solid var(--border);\n\
      }\n\
      .bs-target-panel h4 {\n\
        font-size: 12px;\n\
        color: var(--text2);\n\
        text-transform: uppercase;\n\
        margin-bottom: 10px;\n\
        font-weight: 600;\n\
      }\n\
      .bs-target-selected {\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 10px;\n\
        margin-top: 10px;\n\
        padding: 10px;\n\
        background: var(--bg2);\n\
        border-radius: 6px;\n\
      }\n\
      .bs-target-selected img {\n\
        width: 44px;\n\
        height: 44px;\n\
        object-fit: contain;\n\
      }\n\
      .bs-target-info { flex: 1; }\n\
      .bs-target-info .ti-name { font-size: 14px; font-weight: 600; color: var(--text); }\n\
      .bs-target-info .ti-detail { font-size: 11px; color: var(--text2); margin-top: 2px; }\n\
      .bs-target-stats {\n\
        display: grid;\n\
        grid-template-columns: 1fr 1fr;\n\
        gap: 4px;\n\
        margin-top: 8px;\n\
      }\n\
      .bs-target-stat {\n\
        font-size: 11px;\n\
        color: var(--text2);\n\
        display: flex;\n\
        justify-content: space-between;\n\
        padding: 3px 6px;\n\
        background: var(--bg3);\n\
        border-radius: 4px;\n\
      }\n\
      .bs-target-stat .ts-val { color: var(--text); font-weight: 600; }\n\
      \n\
      /* Breakdown */\n\
      .bs-breakdown {\n\
        margin-top: 12px;\n\
        padding-top: 12px;\n\
        border-top: 1px solid var(--border);\n\
      }\n\
      .bs-breakdown summary {\n\
        cursor: pointer;\n\
        font-size: 13px;\n\
        color: var(--text2);\n\
        user-select: none;\n\
      }\n\
      .bs-breakdown summary:hover { color: var(--text); }\n\
      .bs-breakdown-table {\n\
        width: 100%;\n\
        margin-top: 8px;\n\
        font-size: 12px;\n\
        border-collapse: collapse;\n\
      }\n\
      .bs-breakdown-table td {\n\
        padding: 3px 8px;\n\
        border-bottom: 1px solid var(--border);\n\
      }\n\
      .bs-breakdown-table td:first-child {\n\
        color: var(--text2);\n\
        width: 200px;\n\
      }\n\
      .bs-breakdown-table td:last-child {\n\
        color: var(--text);\n\
        font-weight: 600;\n\
      }\n\
      .bs-breakdown-table tr.sep td {\n\
        padding: 1px;\n\
        border-bottom: 2px solid var(--border);\n\
      }\n\
      \n\
      /* Select (shared) */\n\
      .bs-select {\n\
        width: 100%;\n\
        padding: 6px 10px;\n\
        background: var(--bg3);\n\
        border: 1px solid var(--border);\n\
        border-radius: 6px;\n\
        color: var(--text);\n\
        font-size: 13px;\n\
        font-family: inherit;\n\
        cursor: pointer;\n\
        outline: none;\n\
        appearance: none;\n\
        -webkit-appearance: none;\n\
        background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'7\' fill=\'%2398a8a0\'%3E%3Cpath d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E");\n\
        background-repeat: no-repeat;\n\
        background-position: right 10px center;\n\
      }\n\
      .bs-select:hover { border-color: var(--accent); }\n\
      .bs-select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(46,204,113,0.15); }\n\
      \n\
      /* Character Preview (Paper Doll) */\n\
      .bs-chara {\n\
        background: var(--bg3);\n\
        border: 1px solid var(--border);\n\
        border-radius: 10px;\n\
        padding: 14px;\n\
        margin-bottom: 14px;\n\
      }\n\
      .bs-chara-title {\n\
        text-align: center;\n\
        font-size: 13px;\n\
        font-weight: 700;\n\
        color: var(--gold);\n\
        text-transform: uppercase;\n\
        letter-spacing: 0.5px;\n\
        margin-bottom: 10px;\n\
      }\n\
      .bs-chara-job {\n\
        text-align: center;\n\
        font-size: 16px;\n\
        font-weight: 700;\n\
        color: var(--accent);\n\
        margin-bottom: 2px;\n\
      }\n\
      .bs-chara-lv {\n\
        text-align: center;\n\
        font-size: 11px;\n\
        color: var(--text2);\n\
        margin-bottom: 10px;\n\
      }\n\
      .bs-chara-doll {\n\
        display: grid;\n\
        grid-template-columns: 1fr auto 1fr;\n\
        grid-template-rows: auto auto auto auto auto;\n\
        gap: 4px 8px;\n\
        align-items: center;\n\
      }\n\
      .bs-chara-body {\n\
        grid-column: 2;\n\
        grid-row: 1 / 6;\n\
        display: flex;\n\
        flex-direction: column;\n\
        align-items: center;\n\
        justify-content: center;\n\
        min-height: 160px;\n\
        min-width: 80px;\n\
        user-select: none;\n\
        position: relative;\n\
      }\n\
      .bs-chara-sprite {\n\
        height: 140px;\n\
        width: auto;\n\
        object-fit: contain;\n\
        image-rendering: pixelated;\n\
        -ms-interpolation-mode: nearest-neighbor;\n\
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));\n\
        transition: opacity 0.3s ease;\n\
      }\n\
      .bs-chara-fallback {\n\
        font-size: 48px;\n\
        color: var(--text2);\n\
        opacity: 0.3;\n\
      }\n\
      .bs-doll-slot {\n\
        font-size: 10px;\n\
        padding: 3px 6px;\n\
        border-radius: 4px;\n\
        background: var(--bg2);\n\
        border: 1px solid transparent;\n\
        color: var(--text2);\n\
        white-space: nowrap;\n\
        overflow: hidden;\n\
        text-overflow: ellipsis;\n\
        max-width: 130px;\n\
        text-align: center;\n\
        transition: all 0.2s;\n\
        display: flex;\n\
        align-items: center;\n\
        gap: 3px;\n\
      }\n\
      .bs-doll-slot.equipped {\n\
        color: var(--text);\n\
        border-color: var(--accent);\n\
        background: rgba(46,204,113,0.1);\n\
      }\n\
      .bs-doll-icon {\n\
        width: 18px; height: 18px; object-fit: contain; flex-shrink: 0;\n\
      }\n\
      .bs-doll-slot.left { justify-self: end; }\n\
      .bs-doll-slot.right { justify-self: start; }\n\
      \n\
      /* No-data message */\n\
      .bs-no-data {\n\
        text-align: center;\n\
        padding: 30px;\n\
        color: var(--text2);\n\
        font-size: 13px;\n\
      }\n\
      \n\
      /* Responsive */\n\
      @media (max-width: 900px) {\n\
        .bs-equip-wrap { grid-template-columns: 1fr; }\n\
        .bs-skill-wrap { grid-template-columns: 1fr; }\n\
        .bs-dmg-wrap { grid-template-columns: 1fr; }\n\
      }\n\
      @media (max-width: 640px) {\n\
        .bs-dmg-grid { grid-template-columns: 1fr 1fr; }\n\
        .bs-bonus-grid { grid-template-columns: 1fr; }\n\
        .bs-equip-slot .bs-slot-label { width: 60px; font-size: 10px; }\n\
        .bs-equip-slot { padding: 6px 8px; }\n\
        .bs-target-stats { grid-template-columns: 1fr; }\n\
        .bs-chara-sprite { height: 100px; }\n\
      }\n\
    ';
    document.head.appendChild(style);
  }

  // ==================== BUILD UI ====================

  function buildUI(container) {
    container.innerHTML = '\
      <div class="bs-main-title"><span class="bs-icon">&#9876;</span> BUILD SIMULATOR</div>\
      \
      <!-- SECTION 1: Equipment + Bonuses -->\
      <div class="bs-section">\
        <div class="bs-section-title"><span class="bs-icon">&#128737;</span> Equipment</div>\
        <div class="bs-equip-wrap">\
          <div id="bs-equip-left"></div>\
          <div id="bs-equip-right">\
            <!-- Character Preview -->\
            <div class="bs-chara" id="bs-chara-panel">\
              <div class="bs-chara-title">&#128100; Character</div>\
              <div class="bs-chara-job" id="bs-chara-job">Novice</div>\
              <div class="bs-chara-lv" id="bs-chara-lv">Base Lv 1 / Job Lv 1</div>\
              <div class="bs-chara-doll">\
                <div class="bs-doll-slot left" id="bs-doll-headTop" title="Head Top">-</div>\
                <div class="bs-chara-body" id="bs-chara-body"></div>\
                <div class="bs-doll-slot right" id="bs-doll-headMid" title="Head Mid">-</div>\
                <div class="bs-doll-slot left" id="bs-doll-weapon" title="Weapon">-</div>\
                <div class="bs-doll-slot right" id="bs-doll-shield" title="Shield">-</div>\
                <div class="bs-doll-slot left" id="bs-doll-armor" title="Armor">-</div>\
                <div class="bs-doll-slot right" id="bs-doll-garment" title="Garment">-</div>\
                <div class="bs-doll-slot left" id="bs-doll-acc1" title="Accessory 1">-</div>\
                <div class="bs-doll-slot right" id="bs-doll-acc2" title="Accessory 2">-</div>\
                <div class="bs-doll-slot left" id="bs-doll-shoes" title="Shoes">-</div>\
                <div class="bs-doll-slot right" id="bs-doll-headLow" title="Head Low">-</div>\
              </div>\
            </div>\
            <div class="bs-section-title" style="margin-top:0"><span class="bs-icon">&#9733;</span> Bonuses Summary</div>\
            <div class="bs-bonus-grid" id="bs-bonus-grid">\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Total ATK</span><span class="bs-bonus-value gold" id="bs-b-atk">+0</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Total DEF</span><span class="bs-bonus-value" id="bs-b-def">+0</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Refine ATK</span><span class="bs-bonus-value gold" id="bs-b-refine">+0</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Weapon Element</span><span class="bs-bonus-value" id="bs-b-ele">Neutral</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Race Bonus</span><span class="bs-bonus-value" id="bs-b-race">+0%</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Element Bonus</span><span class="bs-bonus-value" id="bs-b-elebns">+0%</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">Size Bonus</span><span class="bs-bonus-value" id="bs-b-size">+0%</span></div>\
              <div class="bs-bonus-item"><span class="bs-bonus-label">All Dmg %</span><span class="bs-bonus-value" id="bs-b-alldmg">+0%</span></div>\
              <div class="bs-bonus-item bs-bonus-separator" style="grid-column:1/-1;border-top:1px solid rgba(255,255,255,.1);padding-top:6px;margin-top:4px"><span class="bs-bonus-label" style="color:#e0a0ff">Costume/Option</span><span class="bs-bonus-value" style="color:#e0a0ff" id="bs-b-costume">-</span></div>\
            </div>\
            \
            <!-- Manual bonus inputs -->\
            <div class="bs-manual-bonuses">\
              <h4>Card / Equipment Bonuses (manual)</h4>\
              <div class="bs-bonus-inputs">\
                <div class="bs-bonus-field">\
                  <label>Weapon Element</label>\
                  <select id="bs-weapon-ele" class="bs-select">\
                    ' + ELEMENTS.map(function(e) { return '<option value="' + e + '"' + (e === 'Neutral' ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '\
                  </select>\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+% vs Race</label>\
                  <input type="number" id="bs-bonus-race" min="0" max="500" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+% vs Element</label>\
                  <input type="number" id="bs-bonus-ele" min="0" max="500" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+% vs Size</label>\
                  <input type="number" id="bs-bonus-size" min="0" max="500" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+ATK (cards)</label>\
                  <input type="number" id="bs-bonus-atk" min="0" max="500" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+% All Dmg</label>\
                  <input type="number" id="bs-bonus-alldmg" min="0" max="500" value="0">\
                </div>\
              </div>\
            </div>\
            \
            <!-- Costume / Option / Enchant bonuses (separate system) -->\
            <div class="bs-manual-bonuses bs-costume-section">\
              <h4 style="color:#e0a0ff">&#128092; Costume / Option / Enchant</h4>\
              <div class="bs-bonus-inputs">\
                <div class="bs-bonus-field">\
                  <label>+ATK</label>\
                  <input type="number" id="bs-cos-atk" min="0" max="200" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+MATK</label>\
                  <input type="number" id="bs-cos-matk" min="0" max="200" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+STR</label>\
                  <input type="number" id="bs-cos-str" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+AGI</label>\
                  <input type="number" id="bs-cos-agi" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+VIT</label>\
                  <input type="number" id="bs-cos-vit" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+INT</label>\
                  <input type="number" id="bs-cos-int" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+DEX</label>\
                  <input type="number" id="bs-cos-dex" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+LUK</label>\
                  <input type="number" id="bs-cos-luk" min="0" max="50" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+ASPD</label>\
                  <input type="number" id="bs-cos-aspd" min="0" max="15" value="0">\
                </div>\
                <div class="bs-bonus-field">\
                  <label>+Critical</label>\
                  <input type="number" id="bs-cos-crit" min="0" max="50" value="0">\
                </div>\
              </div>\
            </div>\
          </div>\
        </div>\
      </div>\
      \
      <!-- SECTION 2: Skill Selection -->\
      <div class="bs-section">\
        <div class="bs-section-title"><span class="bs-icon">&#10036;</span> Skill Selection</div>\
        <div class="bs-skill-wrap">\
          <div class="bs-skill-selector">\
            <div class="bs-class-label">Class: <span class="cls-val" id="bs-class-name">Novice</span></div>\
            <div class="bs-bonus-field">\
              <label>Active Skill</label>\
              <select id="bs-skill-select" class="bs-select">\
                <option value="">-- Normal Attack --</option>\
              </select>\
            </div>\
            <div>\
              <label class="bs-refine-label">Skill Level</label>\
              <div class="bs-skill-level-wrap">\
                <input type="range" id="bs-skill-slider" class="bs-skill-slider" min="1" max="10" value="1">\
                <span class="bs-skill-lv-num" id="bs-skill-lv-num">1</span>\
              </div>\
            </div>\
            <div class="bs-sp-sustain" id="bs-sp-sustain">\
              SP Cost: <span class="sp-val" id="bs-sp-cost">0</span>\
              &nbsp;|&nbsp; Casts: <span class="sp-val" id="bs-sp-casts">-</span>\
            </div>\
          </div>\
          <div class="bs-skill-info" id="bs-skill-info">\
            <div class="bs-skill-info-row"><span class="si-label">Damage</span><span class="si-value gold" id="bs-si-dmg">100% x 1 hit</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">Type</span><span class="si-value" id="bs-si-type">Physical</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">Element</span><span class="si-value" id="bs-si-ele">Weapon</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">AOE</span><span class="si-value" id="bs-si-aoe">Single</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">Cast Time</span><span class="si-value" id="bs-si-cast">0ms</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">After Delay</span><span class="si-value" id="bs-si-delay">0ms</span></div>\
            <div class="bs-skill-info-row"><span class="si-label">Actual Cast (DEX)</span><span class="si-value gold" id="bs-si-actual-cast">0ms</span></div>\
          </div>\
        </div>\
      </div>\
      \
      <!-- SECTION 3: Damage Output -->\
      <div class="bs-section">\
        <div class="bs-section-title"><span class="bs-icon">&#128165;</span> Damage Output</div>\
        <div class="bs-dmg-wrap">\
          <div>\
            <div class="bs-dmg-grid" id="bs-dmg-grid">\
              <div class="bs-dmg-card"><div class="dmc-label">Per Hit</div><div class="dmc-value" id="bs-d-hit">0</div></div>\
              <div class="bs-dmg-card"><div class="dmc-label">Per Skill Use</div><div class="dmc-value accent" id="bs-d-skill">0</div></div>\
              <div class="bs-dmg-card"><div class="dmc-label">DPS</div><div class="dmc-value blue" id="bs-d-dps">0</div></div>\
              <div class="bs-dmg-card"><div class="dmc-label">Kills / min</div><div class="dmc-value" id="bs-d-kpm">-</div></div>\
              <div class="bs-dmg-card"><div class="dmc-label">Kills / hr</div><div class="dmc-value accent" id="bs-d-kph">-</div></div>\
              <div class="bs-dmg-card"><div class="dmc-label">Est. Zeny / hr</div><div class="dmc-value gold" id="bs-d-zph">-</div></div>\
            </div>\
            \
            <!-- Breakdown -->\
            <div class="bs-breakdown">\
              <details>\
                <summary>Calculation Breakdown</summary>\
                <table class="bs-breakdown-table">\
                  <tbody id="bs-breakdown-body"></tbody>\
                </table>\
              </details>\
            </div>\
          </div>\
          \
          <!-- Target Monster -->\
          <div class="bs-target-panel">\
            <h4>Target Monster</h4>\
            <div class="bs-search-wrap">\
              <input type="text" id="bs-monster-search" class="bs-search-input" placeholder="Search monster..." autocomplete="off">\
              <div class="bs-dropdown" id="bs-monster-dd"></div>\
            </div>\
            <div id="bs-target-display" style="display:none"></div>\
          </div>\
        </div>\
      </div>\
    ';

    // Build equipment slots
    buildEquipmentSlots();
  }

  // ==================== EQUIPMENT SLOTS ====================

  function buildEquipmentSlots() {
    var leftEl = document.getElementById('bs-equip-left');
    if (!leftEl) return;

    var html = '';
    for (var i = 0; i < EQUIP_SLOTS.length; i++) {
      var slot = EQUIP_SLOTS[i];
      var maxCards = slot.maxCards;
      // Weapon gets card count based on item slots when selected
      // For the initial render, show slot structure
      html += '<div class="bs-equip-slot" data-slot="' + slot.key + '">';
      html += '  <span class="bs-slot-label">' + esc(slot.label) + '</span>';
      html += '  <div class="bs-slot-body">';
      html += '    <div class="bs-search-wrap">';
      html += '      <input type="text" class="bs-search-input bs-equip-search" data-slot="' + slot.key + '" placeholder="Search ' + slot.label.toLowerCase() + '..." autocomplete="off">';
      html += '      <div class="bs-dropdown" id="bs-dd-' + slot.key + '"></div>';
      html += '    </div>';
      html += '    <div id="bs-sel-' + slot.key + '" style="display:none"></div>';
      if (slot.hasRefine) {
        html += '    <div class="bs-refine-row" id="bs-ref-' + slot.key + '" style="display:none">';
        html += '      <span class="bs-refine-label">+</span>';
        html += '      <input type="number" class="bs-refine-input" data-slot="' + slot.key + '" min="0" max="15" value="0">';
        html += '      <span class="bs-refine-label">refine</span>';
        html += '    </div>';
      }
      // Card slot placeholders (populated on item select)
      html += '    <div class="bs-refine-row" id="bs-cards-' + slot.key + '" style="display:none"></div>';
      // Option 1/2/3 rows
      html += '    <div class="bs-options-wrap" id="bs-opts-' + slot.key + '" style="display:none">';
      html += '      <div class="bs-cards-label">Options:</div>';
      for (var oi = 0; oi < 3; oi++) {
        html += '      <div class="bs-option-row">';
        html += '        <select class="bs-opt-type" data-slot="' + slot.key + '" data-opt-idx="' + oi + '">';
        for (var ot = 0; ot < OPTION_TYPES.length; ot++) {
          html += '<option value="' + OPTION_TYPES[ot].key + '">' + OPTION_TYPES[ot].label + '</option>';
        }
        html += '        </select>';
        html += '        <input type="number" class="bs-opt-val" data-slot="' + slot.key + '" data-opt-idx="' + oi + '" value="0" min="0" max="100" style="width:50px">';
        html += '      </div>';
      }
      html += '    </div>';
      html += '  </div>';
      html += '</div>';
    }
    leftEl.innerHTML = html;
  }

  // ==================== EQUIP DISPLAY HELPERS ====================

  var ITEM_ICON_URL = 'https://static.divine-pride.net/images/items/collection/';
  var CARD_ICON_URL = 'https://static.divine-pride.net/images/items/cards/';

  function getEquipFullName(slotKey) {
    var eq = bsState.equip[slotKey];
    if (!eq || !eq.item) return '';
    var refStr = (eq.refine && eq.refine > 0) ? '+' + eq.refine + ' ' : '';
    var name = eq.item.name || '';
    var cardNames = [];
    var emptySlots = 0;
    if (eq.cards) {
      for (var i = 0; i < eq.cards.length; i++) {
        if (eq.cards[i]) {
          var card = (typeof ITEMS !== 'undefined') ? ITEMS.find(function (x) { return x.id === eq.cards[i]; }) : null;
          cardNames.push(card ? card.name : 'Card');
        } else {
          emptySlots++;
        }
      }
    }
    var slotStr = '';
    if (eq.item.slots > 0) {
      slotStr = ' [' + (cardNames.length > 0 ? cardNames.join(', ') : '') + (emptySlots > 0 ? (cardNames.length > 0 ? ', ' : '') + emptySlots : '') + ']';
    }
    return refStr + name + slotStr;
  }

  function updateEquipDisplay(slotKey) {
    var eq = bsState.equip[slotKey];
    if (!eq || !eq.item) return;
    var selEl = document.getElementById('bs-sel-' + slotKey);
    if (!selEl) return;

    var item = eq.item;
    var detail = '';
    if (item.cat === 'Weapon') {
      detail = 'ATK ' + (item.atk || 0) + ' | ' + esc(item.wtype) + ' | Lv' + (item.wlv || 1) + ' | Slots ' + (item.slots || 0);
    } else {
      detail = 'DEF ' + (item.def || 0) + (item.slots ? ' | Slots ' + item.slots : '');
    }

    // Card summary
    var cardNames = [];
    if (eq.cards) {
      for (var i = 0; i < eq.cards.length; i++) {
        if (eq.cards[i]) {
          var card = (typeof ITEMS !== 'undefined') ? ITEMS.find(function (x) { return x.id === eq.cards[i]; }) : null;
          cardNames.push(card ? card.name : 'Card #' + eq.cards[i]);
        }
      }
    }
    var cardText = cardNames.length > 0 ? cardNames.join(', ') : '';
    var refStr = (eq.refine && eq.refine > 0) ? '+' + eq.refine + ' ' : '';

    selEl.innerHTML = '<div class="bs-selected">' +
      '<img class="bs-sel-icon" src="' + ITEM_ICON_URL + item.id + '.png" onerror="this.style.display=\'none\'">' +
      '<div class="bs-sel-info">' +
        '<span class="bs-sel-name">' + esc(refStr + item.name) + '</span>' +
        (cardText ? '<span class="bs-sel-cards">' + esc(cardText) + '</span>' : '') +
        '<span class="bs-sel-detail">' + detail + '</span>' +
      '</div>' +
      '<button class="bs-sel-clear" data-slot="' + slotKey + '">X</button>' +
      '</div>';

    // Re-attach clear handler
    var clearBtn = selEl.querySelector('.bs-sel-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () { clearEquipItem(slotKey); });
    }

    updateCharaPreview();
  }

  // ==================== EQUIP SELECT/CLEAR ====================

  function selectEquipItem(slotKey, item) {
    var slotDef = EQUIP_SLOTS.find(function (s) { return s.key === slotKey; });
    if (!slotDef) return;

    // Max card slots: use item.slots if available, else slot default
    var numCards = slotKey === 'weapon' ? (item.slots || 0) : Math.min(item.slots || 0, slotDef.maxCards);

    bsState.equip[slotKey] = {
      item: item,
      refine: 0,
      cards: [],
      options: [{type:'',value:0},{type:'',value:0},{type:'',value:0}]
    };
    for (var c = 0; c < numCards; c++) {
      bsState.equip[slotKey].cards.push(null);
    }

    // Update UI - hide search, show selected
    var searchInput = document.querySelector('.bs-equip-search[data-slot="' + slotKey + '"]');
    if (searchInput) {
      searchInput.value = '';
      searchInput.parentElement.style.display = 'none';
    }

    var selEl = document.getElementById('bs-sel-' + slotKey);
    selEl.style.display = 'block';
    updateEquipDisplay(slotKey);

    // Show refine row
    var refRow = document.getElementById('bs-ref-' + slotKey);
    if (refRow) {
      refRow.style.display = 'flex';
      var refInput = refRow.querySelector('.bs-refine-input');
      if (refInput) refInput.value = '0';
    }

    // Show card dropdowns
    if (numCards > 0) {
      renderCardDropdowns(slotKey, numCards);
    } else {
      var cardsEl = document.getElementById('bs-cards-' + slotKey);
      if (cardsEl) cardsEl.style.display = 'none';
    }

    // Show options
    var optsWrap = document.getElementById('bs-opts-' + slotKey);
    if (optsWrap) optsWrap.style.display = 'block';

    updateBonusSummary();
    recalcDPS();
    emitEquipToROCBuild();
  }

  function clearEquipItem(slotKey) {
    bsState.equip[slotKey] = null;

    // Show search again
    var searchInput = document.querySelector('.bs-equip-search[data-slot="' + slotKey + '"]');
    if (searchInput) {
      searchInput.parentElement.style.display = '';
    }

    // Hide selected
    var selEl = document.getElementById('bs-sel-' + slotKey);
    if (selEl) { selEl.style.display = 'none'; selEl.innerHTML = ''; }

    // Hide refine
    var refRow = document.getElementById('bs-ref-' + slotKey);
    if (refRow) refRow.style.display = 'none';

    // Hide cards
    var cardsEl = document.getElementById('bs-cards-' + slotKey);
    if (cardsEl) { cardsEl.style.display = 'none'; cardsEl.innerHTML = ''; }

    // Hide & reset options
    var optsWrap = document.getElementById('bs-opts-' + slotKey);
    if (optsWrap) {
      optsWrap.style.display = 'none';
      optsWrap.querySelectorAll('.bs-opt-type').forEach(function (s) { s.value = ''; });
      optsWrap.querySelectorAll('.bs-opt-val').forEach(function (inp) { inp.value = '0'; });
    }

    updateBonusSummary();
    recalcDPS();
    emitEquipToROCBuild();
  }

  // ==================== CARD DROPDOWNS ====================

  function searchCards(query) {
    if (typeof ITEMS === 'undefined') return [];
    if (!query || query.length < 1) return [];
    var q = query.toLowerCase();
    var results = [];
    for (var idx = 0; idx < ITEMS.length; idx++) {
      var i = ITEMS[idx];
      if (i.cat !== 'Card') continue;
      if (i.name.toLowerCase().indexOf(q) !== -1 || String(i.id).indexOf(q) !== -1) {
        results.push(i);
        if (results.length >= 10) break;
      }
    }
    return results;
  }

  function renderCardDropdowns(slotKey, numCards) {
    var cardsEl = document.getElementById('bs-cards-' + slotKey);
    if (!cardsEl) return;

    cardsEl.style.display = 'block';
    var html = '<div class="bs-cards-label">Cards:</div>';
    for (var i = 0; i < numCards; i++) {
      html += '<div class="bs-card-slot" data-slot="' + slotKey + '" data-card-idx="' + i + '">';
      html += '  <div class="bs-search-wrap">';
      html += '    <input type="text" class="bs-search-input bs-card-search" data-slot="' + slotKey + '" data-card-idx="' + i + '" placeholder="Search card..." autocomplete="off">';
      html += '    <div class="bs-dropdown bs-card-dd" id="bs-cdd-' + slotKey + '-' + i + '"></div>';
      html += '  </div>';
      html += '  <div class="bs-card-selected" id="bs-csel-' + slotKey + '-' + i + '" style="display:none"></div>';
      html += '</div>';
    }
    cardsEl.innerHTML = html;

    // Bind card search events
    var cardInputs = cardsEl.querySelectorAll('.bs-card-search');
    for (var ci = 0; ci < cardInputs.length; ci++) {
      (function (inp) {
        var sk = inp.dataset.slot;
        var idx = num(inp.dataset.cardIdx);
        var ddId = 'bs-cdd-' + sk + '-' + idx;

        inp.addEventListener('input', debounce(function () {
          var results = searchCards(inp.value);
          renderCardSearchDD(ddId, sk, idx, results);
        }, 150));

        inp.addEventListener('focus', function () {
          if (inp.value.length >= 1) {
            var results = searchCards(inp.value);
            renderCardSearchDD(ddId, sk, idx, results);
          }
        });
      })(cardInputs[ci]);
    }
  }

  function renderCardSearchDD(ddId, slotKey, cardIdx, cards) {
    var dd = document.getElementById(ddId);
    if (!dd) return;
    if (!cards || cards.length === 0) { dd.classList.remove('open'); return; }

    dd.innerHTML = cards.map(function (c) {
      var desc = (c.desc || '').substring(0, 60);
      return '<div class="bs-dd-item bs-cdd-item" data-card-id="' + c.id + '" data-slot="' + slotKey + '" data-card-idx="' + cardIdx + '">' +
        '<img class="bs-dd-icon" src="' + CARD_ICON_URL + c.id + '.png" onerror="this.style.display=\'none\'">' +
        '<span class="dd-name">' + esc(c.name) + '</span>' +
        '<span class="dd-sub">' + esc(desc) + '</span>' +
        '</div>';
    }).join('');
    dd.classList.add('open');

    var ddItems = dd.querySelectorAll('.bs-cdd-item');
    for (var i = 0; i < ddItems.length; i++) {
      ddItems[i].addEventListener('click', function () {
        var cardId = num(this.dataset.cardId);
        var sk = this.dataset.slot;
        var ci = num(this.dataset.cardIdx);
        selectCard(sk, ci, cardId);
        dd.classList.remove('open');
      });
    }
  }

  function selectCard(slotKey, cardIdx, cardId) {
    if (bsState.equip[slotKey] && bsState.equip[slotKey].cards) {
      bsState.equip[slotKey].cards[cardIdx] = cardId;
    }
    // Find card name
    var card = (typeof ITEMS !== 'undefined') ? ITEMS.find(function (x) { return x.id === cardId; }) : null;
    var cardName = card ? card.name : 'Card #' + cardId;

    // Hide search, show selected
    var inp = document.querySelector('.bs-card-search[data-slot="' + slotKey + '"][data-card-idx="' + cardIdx + '"]');
    if (inp) { inp.value = ''; inp.parentElement.style.display = 'none'; }

    var selEl = document.getElementById('bs-csel-' + slotKey + '-' + cardIdx);
    if (selEl) {
      selEl.style.display = 'flex';
      selEl.innerHTML = '<img class="bs-card-icon" src="' + CARD_ICON_URL + cardId + '.png" onerror="this.style.display=\'none\'">' +
        '<span class="bs-sel-name" style="font-size:12px">' + esc(cardName) + '</span>' +
        '<button class="bs-card-clear" data-slot="' + slotKey + '" data-card-idx="' + cardIdx + '">X</button>';

      selEl.querySelector('.bs-card-clear').addEventListener('click', function () {
        clearCard(slotKey, cardIdx);
      });
    }

    updateEquipDisplay(slotKey);
    emitEquipToROCBuild();
    recalcDPS();
  }

  function clearCard(slotKey, cardIdx) {
    if (bsState.equip[slotKey] && bsState.equip[slotKey].cards) {
      bsState.equip[slotKey].cards[cardIdx] = null;
    }
    var inp = document.querySelector('.bs-card-search[data-slot="' + slotKey + '"][data-card-idx="' + cardIdx + '"]');
    if (inp) inp.parentElement.style.display = '';
    var selEl = document.getElementById('bs-csel-' + slotKey + '-' + cardIdx);
    if (selEl) { selEl.style.display = 'none'; selEl.innerHTML = ''; }

    updateEquipDisplay(slotKey);
    emitEquipToROCBuild();
    recalcDPS();
  }

  // ==================== EQUIPMENT OPTIONS AGGREGATION ====================

  function getEquipOptionTotals() {
    var totals = {};
    for (var i = 0; i < EQUIP_SLOTS.length; i++) {
      var eq = bsState.equip[EQUIP_SLOTS[i].key];
      if (!eq || !eq.options) continue;
      for (var oi = 0; oi < eq.options.length; oi++) {
        var opt = eq.options[oi];
        if (opt.type && opt.value) {
          totals[opt.type] = (totals[opt.type] || 0) + opt.value;
        }
      }
    }
    return totals;
  }

  // ==================== CHARACTER PREVIEW ====================

  function getJobSpriteUrl(jobClassId) {
    return 'sprites/' + jobClassId + '.gif';
  }

  function getJobSpriteFallbackUrl(jobClassId) {
    if (AWAKENED_TO_TRANS[jobClassId]) {
      return getJobSpriteUrl(AWAKENED_TO_TRANS[jobClassId]);
    }
    return getJobSpriteUrl(0);
  }

  function updateCharaPreview() {
    // Job name & level from ROC_BUILD
    var jobEl = document.getElementById('bs-chara-job');
    var lvEl = document.getElementById('bs-chara-lv');
    var jobClassId = 0;
    if (jobEl && window.ROC_BUILD) {
      jobEl.textContent = ROC_BUILD.state.jobName || 'Novice';
      lvEl.textContent = 'Base Lv ' + (ROC_BUILD.state.baseLv || 1) + ' / Job Lv ' + (ROC_BUILD.state.jobLv || 1);
      jobClassId = ROC_BUILD.state.jobClass || 0;
    }

    // Update character sprite
    var bodyEl = document.getElementById('bs-chara-body');
    if (bodyEl) {
      var spriteUrl = getJobSpriteUrl(jobClassId);
      var fallbackUrl = getJobSpriteFallbackUrl(jobClassId);
      var img = bodyEl.querySelector('.bs-chara-sprite');

      if (!img) {
        bodyEl.textContent = '';
        img = document.createElement('img');
        img.className = 'bs-chara-sprite';
        img.alt = '';
        img.draggable = false;
        bodyEl.appendChild(img);
      }

      if (img.getAttribute('data-job-id') !== String(jobClassId)) {
        img.setAttribute('data-job-id', String(jobClassId));
        img.onerror = function () {
          if (this.src !== fallbackUrl) {
            this.src = fallbackUrl;
          } else {
            this.style.display = 'none';
            if (!bodyEl.querySelector('.bs-chara-fallback')) {
              var fb = document.createElement('div');
              fb.className = 'bs-chara-fallback';
              fb.textContent = '\u2694';
              bodyEl.appendChild(fb);
            }
          }
        };
        img.onload = function () {
          this.style.display = '';
          var fb = bodyEl.querySelector('.bs-chara-fallback');
          if (fb) fb.remove();
        };
        img.src = spriteUrl;
      }
    }

    // Equipment slots
    var dollSlots = {
      weapon: 'bs-doll-weapon', shield: 'bs-doll-shield',
      armor: 'bs-doll-armor', garment: 'bs-doll-garment',
      shoes: 'bs-doll-shoes', headTop: 'bs-doll-headTop',
      headMid: 'bs-doll-headMid', headLow: 'bs-doll-headLow',
      acc1: 'bs-doll-acc1', acc2: 'bs-doll-acc2'
    };
    for (var slotKey in dollSlots) {
      var el = document.getElementById(dollSlots[slotKey]);
      if (!el) continue;
      var eq = bsState.equip[slotKey];
      if (eq && eq.item) {
        var fullName = getEquipFullName(slotKey);
        var shortName = fullName.length > 16 ? fullName.substring(0, 15) + '\u2026' : fullName;
        el.innerHTML = '<img class="bs-doll-icon" src="' + ITEM_ICON_URL + eq.item.id + '.png" onerror="this.style.display=\'none\'">' +
          '<span>' + esc(shortName) + '</span>';
        el.title = fullName;
        el.classList.add('equipped');
      } else {
        el.innerHTML = '-';
        el.title = slotKey;
        el.classList.remove('equipped');
      }
    }
  }

  // ==================== BONUS SUMMARY ====================

  function updateBonusSummary() {
    var totalATK = 0;
    var totalDEF = 0;
    var refineATK = 0;

    // Sum equipment stats
    for (var i = 0; i < EQUIP_SLOTS.length; i++) {
      var slotKey = EQUIP_SLOTS[i].key;
      var eq = bsState.equip[slotKey];
      if (!eq) continue;
      totalATK += eq.item.atk || 0;
      totalDEF += eq.item.def || 0;

      // Refine ATK (only for weapon)
      if (slotKey === 'weapon' && eq.refine > 0) {
        var wlv = eq.item.wlv || 1;
        refineATK = calcRefineATK(wlv, eq.refine);
      }
    }

    // Manual bonuses
    totalATK += bsState.bonusATK;

    document.getElementById('bs-b-atk').textContent = '+' + totalATK;
    document.getElementById('bs-b-def').textContent = '+' + totalDEF;
    document.getElementById('bs-b-refine').textContent = '+' + refineATK;
    document.getElementById('bs-b-ele').textContent = bsState.weaponElement;
    document.getElementById('bs-b-race').textContent = '+' + bsState.bonusRace + '%';
    document.getElementById('bs-b-elebns').textContent = '+' + bsState.bonusEle + '%';
    document.getElementById('bs-b-size').textContent = '+' + bsState.bonusSize + '%';
    document.getElementById('bs-b-alldmg').textContent = '+' + bsState.bonusAllDmg + '%';

    // Costume summary
    var cosEl = document.getElementById('bs-b-costume');
    if (cosEl) {
      var cosParts = [];
      if (bsState.costumeATK) cosParts.push('+' + bsState.costumeATK + ' ATK');
      if (bsState.costumeMATK) cosParts.push('+' + bsState.costumeMATK + ' MATK');
      if (bsState.costumeSTR) cosParts.push('+' + bsState.costumeSTR + ' STR');
      if (bsState.costumeAGI) cosParts.push('+' + bsState.costumeAGI + ' AGI');
      if (bsState.costumeVIT) cosParts.push('+' + bsState.costumeVIT + ' VIT');
      if (bsState.costumeINT) cosParts.push('+' + bsState.costumeINT + ' INT');
      if (bsState.costumeDEX) cosParts.push('+' + bsState.costumeDEX + ' DEX');
      if (bsState.costumeLUK) cosParts.push('+' + bsState.costumeLUK + ' LUK');
      if (bsState.costumeASPD) cosParts.push('+' + bsState.costumeASPD + ' ASPD');
      if (bsState.costumeCrit) cosParts.push('+' + bsState.costumeCrit + ' CRI');
      cosEl.textContent = cosParts.length > 0 ? cosParts.join(', ') : '-';
    }

    // Store for DPS calc
    bsState._totalEquipATK = totalATK;
    bsState._totalEquipDEF = totalDEF;
    bsState._refineATK = refineATK;

    // Sync character preview
    updateCharaPreview();
  }

  // ==================== SKILL DISPLAY ====================

  function updateSkillList() {
    var select = document.getElementById('bs-skill-select');
    if (!select) return;

    // Get current class from ROC_BUILD
    var jobName = 'Novice';
    var jobClass = 0;
    if (window.ROC_BUILD) {
      jobName = window.ROC_BUILD.state.jobName || 'Novice';
      jobClass = window.ROC_BUILD.state.jobClass || 0;
    }
    document.getElementById('bs-class-name').textContent = jobName;

    // Clear options
    select.innerHTML = '<option value="">-- Normal Attack --</option>';

    // Use SKILL_DB._byClass() to get skills for current job
    if (window.SKILL_DB && typeof window.SKILL_DB._byClass === 'function') {
      var skills = SKILL_DB._byClass(Number(jobClass));
      for (var i = 0; i < skills.length; i++) {
        var sk = skills[i];
        select.innerHTML += '<option value="' + sk.id + '">' + esc(sk.name) + '</option>';
      }
    }
  }

  function getSelectedSkill() {
    var select = document.getElementById('bs-skill-select');
    if (!select || !select.value) return null;
    var skillId = Number(select.value);
    if (!window.SKILL_DB || !window.SKILL_DB[skillId]) return null;
    var sk = window.SKILL_DB[skillId];
    return Object.assign({ id: skillId }, sk);
  }

  function updateSkillInfo() {
    var skill = getSelectedSkill();
    var lv = bsState.activeSkillLv;

    if (!skill) {
      // Normal attack
      document.getElementById('bs-si-dmg').textContent = '100% x 1 hit';
      document.getElementById('bs-si-type').textContent = 'Physical';
      document.getElementById('bs-si-ele').textContent = bsState.weaponElement;
      document.getElementById('bs-si-aoe').textContent = 'Single';
      document.getElementById('bs-si-cast').textContent = '0ms';
      document.getElementById('bs-si-delay').textContent = '0ms';
      document.getElementById('bs-si-actual-cast').textContent = '0ms';
      document.getElementById('bs-sp-cost').textContent = '0';
      document.getElementById('bs-sp-casts').textContent = '-';
      return;
    }

    // Get per-level data
    var perLv = skill.perLevel ? skill.perLevel[lv - 1] : null;
    var dmgPct = 100;
    var hitCount = 1;
    var castTime = 0;
    var afterDelay = 0;
    var spCost = 0;
    var aoe = 'Single';
    var skillType = skill.type || 'Physical';
    var skillEle = skill.element || 'Weapon';

    // perLevel is array: [lv, dmg%, hits, cast(ms), delay(ms), sp]
    if (perLv && Array.isArray(perLv)) {
      dmgPct = perLv[1] || 100;
      hitCount = perLv[2] || 1;
      castTime = perLv[3] || 0;
      afterDelay = perLv[4] || 0;
      spCost = perLv[5] || 0;
    }
    aoe = skill.aoe || 0;
    var aoeLabel = aoe > 0 ? (aoe + 'x' + aoe) : 'Single';

    // Renewal cast time: Variable = castTime * max(0, 1 - (2*DEX+INT)/530)
    var dex = 1, int_sk = 1;
    if (window.ROC_BUILD && window.ROC_BUILD.state.stats) {
      dex = window.ROC_BUILD.state.stats.dex || 1;
      int_sk = window.ROC_BUILD.state.stats.int_ || 1;
    }
    var varCastMult = Math.max(0, 1 - (2 * dex + int_sk) / 530);
    var actualCast = Math.max(0, Math.floor(castTime * varCastMult));

    document.getElementById('bs-si-dmg').textContent = dmgPct + '% x ' + hitCount + ' hit' + (hitCount > 1 ? 's' : '');
    document.getElementById('bs-si-type').textContent = skillType;
    document.getElementById('bs-si-ele').textContent = skillEle;
    document.getElementById('bs-si-aoe').textContent = aoeLabel;
    document.getElementById('bs-si-cast').textContent = castTime + 'ms';
    document.getElementById('bs-si-delay').textContent = afterDelay + 'ms';
    document.getElementById('bs-si-actual-cast').textContent = actualCast + 'ms (2DEX+INT=' + (2*dex+int_sk) + '/530)';

    // SP info
    document.getElementById('bs-sp-cost').textContent = spCost;
    var totalSP = 0;
    if (window.ROC_BUILD && window.ROC_BUILD.state.computed) {
      totalSP = window.ROC_BUILD.state.computed.sp || 0;
    }
    if (spCost > 0 && totalSP > 0) {
      document.getElementById('bs-sp-casts').textContent = Math.floor(totalSP / spCost) + ' (' + totalSP + ' SP)';
    } else {
      document.getElementById('bs-sp-casts').textContent = '-';
    }

    // Update skill slider max
    var maxLv = skill.maxLv || 10;
    var slider = document.getElementById('bs-skill-slider');
    if (slider) {
      slider.max = maxLv;
      if (bsState.activeSkillLv > maxLv) {
        bsState.activeSkillLv = maxLv;
        slider.value = maxLv;
        document.getElementById('bs-skill-lv-num').textContent = maxLv;
      }
    }
  }

  // ==================== DPS CALCULATION ====================

  function recalcDPS() {
    var result = calcDPS();
    displayDPSResult(result);
    displayBreakdown(result);
    emitSkillToROCBuild(result);
  }

  function calcDPS() {
    // ── Aggregate equipment options ──
    var opts = getEquipOptionTotals();

    // 1. Base stats from ROC_BUILD
    var statusATK = 0;
    var aspd = 0;
    var str = 1, agi = 1, vit = 1, int_ = 1, dex = 1, luk = 1;
    var baseLv = 1;
    var totalSP = 0;
    var totalHP = 0;
    if (window.ROC_BUILD && window.ROC_BUILD.state.computed) {
      statusATK = window.ROC_BUILD.state.computed.atk || 0;
      aspd = window.ROC_BUILD.state.computed.aspd || 0;
      totalSP = window.ROC_BUILD.state.computed.sp || 0;
      totalHP = window.ROC_BUILD.state.computed.hp || 0;
      baseLv = window.ROC_BUILD.state.baseLv || 1;
    }
    if (window.ROC_BUILD && window.ROC_BUILD.state.stats) {
      str = window.ROC_BUILD.state.stats.str || 1;
      agi = window.ROC_BUILD.state.stats.agi || 1;
      vit = window.ROC_BUILD.state.stats.vit || 1;
      int_ = window.ROC_BUILD.state.stats.int_ || 1;
      dex = window.ROC_BUILD.state.stats.dex || 1;
      luk = window.ROC_BUILD.state.stats.luk || 1;
    }

    // Costume bonuses
    var cosATK = bsState.costumeATK || 0;
    var cosSTR = bsState.costumeSTR || 0;
    var cosAGI = bsState.costumeAGI || 0;
    var cosINT = bsState.costumeINT || 0;
    var cosDEX = bsState.costumeDEX || 0;
    var cosASPD = bsState.costumeASPD || 0;

    // Equipment option stat bonuses
    str += cosSTR + (opts.STR || 0);
    agi += cosAGI + (opts.AGI || 0);
    vit += (bsState.costumeVIT || 0) + (opts.VIT || 0);
    int_ += cosINT + (opts.INT || 0);
    dex += cosDEX + (opts.DEX || 0);
    luk += (bsState.costumeLUK || 0) + (opts.LUK || 0);

    // Recalculate StatusATK with Renewal formula:
    // Melee: floor(BaseLv/4) + STR + floor(DEX/5) + floor(LUK/3)
    statusATK = Math.floor(baseLv / 4) + str + Math.floor(dex / 5) + Math.floor(luk / 3);

    // ASPD + option/costume bonus
    aspd = Math.min(190, aspd + cosASPD + (opts.ASPD || 0));

    // HP/SP bonuses from options
    totalHP += (opts.HP || 0);
    totalSP += (opts.SP || 0);

    // 2. Weapon ATK
    var weaponATK = 0;
    var weaponLevel = 1;
    var weaponSlots = 0;
    var weaponWtype = 'Dagger';
    var isRanged = false;
    var weaponItem = bsState.equip.weapon;
    if (weaponItem) {
      weaponATK = weaponItem.item.atk || 0;
      weaponLevel = weaponItem.item.wlv || 1;
      weaponSlots = weaponItem.item.slots || 0;
      weaponWtype = normalizeWtype(weaponItem.item.wtype);
      isRanged = /bow|gun|instrument|whip/i.test(weaponWtype);
    }

    // Ranged weapons: StatusATK uses DEX as main stat
    if (isRanged) {
      statusATK = Math.floor(baseLv / 4) + Math.floor(str / 5) + dex + Math.floor(luk / 3);
    }

    // 3. Refine ATK
    var refineATK = bsState._refineATK || 0;

    // 4. Equipment/Card/Costume ATK bonuses
    var bonusATK = (bsState.bonusATK || 0) + cosATK + (opts.ATK || 0);

    // 5. Weapon variance
    var variancePct = WEAPON_VARIANCE[weaponLevel] || 0.10;

    // 6. Renewal ATK: StatusATK x2 is fixed, WeaponATK has variance
    // Total = StatusATK*2 + WeaponATK(+-variance) + RefineATK + BonusATK
    var minTotalATK = statusATK * 2 + Math.floor(weaponATK * (1 - variancePct)) + refineATK + bonusATK;
    var maxTotalATK = statusATK * 2 + Math.floor(weaponATK * (1 + variancePct)) + refineATK + bonusATK;
    var avgTotalATK = Math.floor((minTotalATK + maxTotalATK) / 2);

    // 7. Get skill data
    var skill = getSelectedSkill();
    var lv = bsState.activeSkillLv;
    var dmgPct = 100;
    var hitCount = 1;
    var castTime = 0;
    var afterDelay = 0;
    var spCost = 0;
    var skillType = 'Physical';
    var skillEle = bsState.weaponElement;
    var isMagic = false;

    if (skill) {
      var perLv = skill.perLevel ? skill.perLevel[lv - 1] : null;
      if (perLv && Array.isArray(perLv)) {
        dmgPct = perLv[1] || 100;
        hitCount = perLv[2] || 1;
        castTime = perLv[3] || 0;
        afterDelay = perLv[4] || 0;
        spCost = perLv[5] || 0;
      }
      skillType = skill.type || 'physical';
      if (skill.element) skillEle = skill.element;
      isMagic = /magical/i.test(skillType);
    }

    // Magic: recalc with MATK formula
    if (isMagic) {
      var cosMATK = bsState.costumeMATK || 0;
      // Renewal MATK: floor(BaseLv/4) + INT + floor(INT/2) + floor(DEX/5) + floor(LUK/3)
      var statusMATK = Math.floor(baseLv / 4) + int_ + Math.floor(int_ / 2) + Math.floor(dex / 5) + Math.floor(luk / 3);
      var weaponMATK = weaponATK; // weapon MATK = weapon ATK for staff
      bonusATK = (bsState.bonusATK || 0) + cosMATK + (opts.MATK || 0);
      minTotalATK = statusMATK * 2 + Math.floor(weaponMATK * (1 - variancePct)) + refineATK + bonusATK;
      maxTotalATK = statusMATK * 2 + Math.floor(weaponMATK * (1 + variancePct)) + refineATK + bonusATK;
      avgTotalATK = Math.floor((minTotalATK + maxTotalATK) / 2);
    }

    // Cast time reduction from options
    var castReducePct = (opts.castReduce || 0) / 100;
    var fixedCastReducePct = (opts.fixedCast || 0) / 100;
    var afterDelayReducePct = (opts.afterDelay || 0) / 100;

    // Renewal cast: Variable = castTime * max(0, 1 - (2*DEX+INT)/530) * (1 - castReduce%)
    var varCastMult = Math.max(0, 1 - (2 * dex + int_) / 530);
    var actualCast = Math.max(0, Math.floor(castTime * varCastMult * (1 - castReducePct)));

    // After delay reduction
    afterDelay = Math.max(0, Math.floor(afterDelay * (1 - afterDelayReducePct)));

    // 8. Target monster stats
    var targetDef = 0;
    var targetMDef = 0;
    var targetSize = 'Medium';
    var targetRace = 'Formless';
    var targetEle = 'Neutral';
    var targetEleLv = 1;
    var targetHP = 0;
    var targetName = '';
    var targetBaseExp = 0;

    if (bsState.targetMonster) {
      var m = bsState.targetMonster;
      targetDef = m.def || 0;
      targetMDef = m.mdef || 0;
      targetSize = m.size || 'Medium';
      targetRace = m.race || 'Formless';
      var parsedEle = parseElement(m.element);
      targetEle = parsedEle.name;
      targetEleLv = parsedEle.level;
      targetHP = m.hp || 0;
      targetName = m.name;
      targetBaseExp = m.baseExp || 0;
    }

    // 9. Hard DEF/MDEF reduction (Renewal formula)
    var defReduction;
    if (isMagic) {
      defReduction = targetMDef > 0 ? (1000 + targetMDef) / (1000 + targetMDef * 10) : 1;
    } else {
      defReduction = targetDef > 0 ? (4000 + targetDef) / (4000 + targetDef * 10) : 1;
    }

    // 10. Size penalty (physical only)
    var sizeMod = 1;
    if (!isMagic) {
      var sizePenaltyMap = SIZE_PENALTY[weaponWtype] || SIZE_PENALTY['Dagger'];
      sizeMod = (sizePenaltyMap[targetSize] || 100) / 100;
    }

    // 11. Element modifier (level-aware)
    var atkEle = skillEle;
    if (atkEle === 'Weapon' || atkEle === 'weapon') atkEle = bsState.weaponElement;
    var eleModPct = getElementMod(atkEle, targetEle, targetEleLv);
    var eleMod = Math.max(0, eleModPct) / 100;

    // 12. Damage bonus multipliers (multiplicative)
    var raceMod = 1 + bsState.bonusRace / 100;
    var rangedMeleeMod = 1;
    if (isRanged && opts.ranged) {
      rangedMeleeMod = 1 + opts.ranged / 100;
    } else if (!isRanged && opts.melee) {
      rangedMeleeMod = 1 + opts.melee / 100;
    }
    var eleBonusMod = 1 + bsState.bonusEle / 100;
    var sizeBonusMod = 1 + bsState.bonusSize / 100;
    var allDmgMod = 1 + (bsState.bonusAllDmg + (opts.allDmg || 0)) / 100;

    // Crit/Magic damage bonus from options
    var critDmgMod = 1 + (opts.critical || 0) / 100;
    var magicDmgMod = isMagic ? (1 + (opts.magic || 0) / 100) : 1;

    var totalMod = defReduction * sizeMod * eleMod * raceMod * eleBonusMod * sizeBonusMod * rangedMeleeMod * allDmgMod * magicDmgMod;

    // 13. Per-hit damage
    var perHitMin = Math.max(1, Math.floor(minTotalATK * dmgPct / 100 * totalMod));
    var perHitMax = Math.max(1, Math.floor(maxTotalATK * dmgPct / 100 * totalMod));
    var perHitAvg = Math.floor((perHitMin + perHitMax) / 2);

    // 14. Per skill use
    var perSkillMin = perHitMin * hitCount;
    var perSkillMax = perHitMax * hitCount;
    var perSkillAvg = perHitAvg * hitCount;

    // 15. DPS calculation
    var dps = 0;
    var cycleSec = 0;
    if (skill) {
      var cycleMs = actualCast + afterDelay;
      if (cycleMs <= 0) cycleMs = 500;
      cycleSec = cycleMs / 1000;
      dps = Math.floor(perSkillAvg / cycleSec);
    } else {
      var atkPerSec = aspd > 0 && aspd < 200 ? 50 / (200 - aspd) : 0;
      cycleSec = atkPerSec > 0 ? 1 / atkPerSec : 0;
      dps = Math.floor(perHitAvg * atkPerSec);
    }

    // 16. Kills/min, Kills/hr
    var timeToKill = 0;
    var killsPerMin = 0;
    var killsPerHr = 0;
    if (targetHP > 0 && perSkillAvg > 0) {
      if (skill) {
        var skillsToKill = Math.ceil(targetHP / perSkillAvg);
        timeToKill = skillsToKill * cycleSec;
      } else {
        timeToKill = cycleSec > 0 ? (targetHP / perHitAvg) * cycleSec : 0;
      }
      var totalTimePerKill = timeToKill + 1.0;
      if (totalTimePerKill > 0) {
        killsPerMin = 60 / totalTimePerKill;
        killsPerHr = 3600 / totalTimePerKill;
      }
    }

    // 17. Lifesteal / SP drain info
    var lifestealPct = opts.lifesteal || 0;
    var spDrainPct = opts.spDrain || 0;
    var hpPerHit = lifestealPct > 0 ? Math.floor(perHitAvg * lifestealPct / 100) : 0;
    var spPerHit = spDrainPct > 0 ? Math.floor(perHitAvg * spDrainPct / 100) : 0;

    // 18. Estimated Zeny/hr
    var zenyPerHr = 0;
    if (killsPerHr > 0 && bsState.targetMonster) {
      var mobZenyValue = Math.floor((targetBaseExp || 50) * 1.5);
      zenyPerHr = Math.floor(killsPerHr * mobZenyValue);
    }

    return {
      statusATK: statusATK,
      weaponATK: weaponATK,
      weaponLevel: weaponLevel,
      refineATK: refineATK,
      bonusATK: bonusATK,
      variancePct: variancePct,
      minTotalATK: minTotalATK,
      maxTotalATK: maxTotalATK,
      avgTotalATK: avgTotalATK,
      weaponWtype: weaponWtype,
      skillName: skill ? skill.name : 'Normal Attack',
      dmgPct: dmgPct,
      hitCount: hitCount,
      castTime: castTime,
      actualCast: actualCast,
      afterDelay: afterDelay,
      spCost: spCost,
      cycleSec: cycleSec,
      skillType: skillType,
      skillEle: atkEle,
      isMagic: isMagic,
      defReduction: defReduction,
      sizeMod: sizeMod,
      eleMod: eleMod,
      raceMod: raceMod,
      eleBonusMod: eleBonusMod,
      sizeBonusMod: sizeBonusMod,
      rangedMeleeMod: rangedMeleeMod,
      allDmgMod: allDmgMod,
      totalMod: totalMod,
      targetDef: isMagic ? targetMDef : targetDef,
      targetSize: targetSize,
      targetRace: targetRace,
      targetEle: targetEle,
      targetEleLv: targetEleLv,
      targetHP: targetHP,
      targetName: targetName,
      perHitMin: perHitMin,
      perHitMax: perHitMax,
      perHitAvg: perHitAvg,
      perSkillMin: perSkillMin,
      perSkillMax: perSkillMax,
      perSkillAvg: perSkillAvg,
      dps: dps,
      aspd: aspd,
      dex: dex,
      totalSP: totalSP,
      killsPerMin: killsPerMin,
      killsPerHr: killsPerHr,
      zenyPerHr: zenyPerHr,
      costumeATK: cosATK,
      costumeSTR: cosSTR,
      costumeAGI: cosAGI,
      costumeINT: cosINT,
      costumeDEX: cosDEX,
      costumeASPD: cosASPD,
      hpPerHit: hpPerHit,
      spPerHit: spPerHit,
      lifestealPct: lifestealPct,
      spDrainPct: spDrainPct,
      equipOptions: opts
    };
  }

  function displayDPSResult(r) {
    document.getElementById('bs-d-hit').textContent = fmt(r.perHitAvg);
    document.getElementById('bs-d-skill').textContent = fmt(r.perSkillAvg);
    document.getElementById('bs-d-dps').textContent = fmt(r.dps);

    if (r.killsPerMin > 0) {
      document.getElementById('bs-d-kpm').textContent = r.killsPerMin.toFixed(1);
      document.getElementById('bs-d-kph').textContent = fmt(Math.floor(r.killsPerHr));
    } else {
      document.getElementById('bs-d-kpm').textContent = '-';
      document.getElementById('bs-d-kph').textContent = '-';
    }

    if (r.zenyPerHr > 0) {
      document.getElementById('bs-d-zph').textContent = fmt(r.zenyPerHr);
    } else {
      document.getElementById('bs-d-zph').textContent = '-';
    }
  }

  function displayBreakdown(r) {
    var tbody = document.getElementById('bs-breakdown-body');
    if (!tbody) return;

    var rows = [
      ['Status ATK (from Stats)', r.statusATK],
      ['Weapon ATK', r.weaponATK],
      ['Weapon Level', r.weaponLevel],
      ['Weapon Type', r.weaponWtype],
      ['Refine ATK', '+' + r.refineATK],
      ['Bonus ATK (cards+costume)', '+' + r.bonusATK],
      ['Weapon Variance', (r.variancePct * 100).toFixed(0) + '%'],
      ['Min Total ATK', r.minTotalATK],
      ['Max Total ATK', r.maxTotalATK],
      ['---', ''],
      ['Skill', r.skillName],
      ['Damage %', r.dmgPct + '%'],
      ['Hit Count', r.hitCount],
      ['Skill Element', r.skillEle],
      ['Cast Time', r.castTime + 'ms -> ' + r.actualCast + 'ms'],
      ['After Delay', r.afterDelay + 'ms'],
      ['---', ''],
      ['Target DEF' + (r.isMagic ? ' (MDEF)' : ''), r.targetDef],
      ['DEF Reduction', (r.defReduction * 100).toFixed(1) + '%'],
      ['Target Size', r.targetSize],
      ['Size Penalty', (r.sizeMod * 100).toFixed(0) + '%'],
      ['Target Element', r.targetEle + ' Lv' + r.targetEleLv],
      ['Element Modifier', (r.eleMod * 100).toFixed(0) + '% (Lv' + r.targetEleLv + ')'],
      ['Race Bonus', (r.raceMod * 100).toFixed(0) + '%'],
      ['Element Bonus', (r.eleBonusMod * 100).toFixed(0) + '%'],
      ['Size Bonus', (r.sizeBonusMod * 100).toFixed(0) + '%'],
      ['Ranged/Melee Bonus', (r.rangedMeleeMod * 100).toFixed(0) + '%'],
      ['All Dmg Bonus', (r.allDmgMod * 100).toFixed(0) + '%'],
    ];

    // Costume breakdown (only if any costume bonus is set)
    if (r.costumeATK || r.costumeSTR || r.costumeAGI || r.costumeINT || r.costumeDEX || r.costumeASPD) {
      rows.push(['---', '']);
      rows.push(['Costume/Option Bonuses', '']);
      if (r.costumeATK) rows.push(['  +ATK', '+' + r.costumeATK]);
      if (r.costumeSTR) rows.push(['  +STR (-> +ATK)', '+' + r.costumeSTR]);
      if (r.costumeINT) rows.push(['  +INT (-> +MATK)', '+' + r.costumeINT]);
      if (r.costumeDEX) rows.push(['  +DEX (-> cast)', '+' + r.costumeDEX]);
      if (r.costumeASPD) rows.push(['  +ASPD', '+' + r.costumeASPD]);
    }

    rows = rows.concat([
      ['---', ''],
      ['Per Hit (avg)', fmt(r.perHitAvg) + ' (' + fmt(r.perHitMin) + '~' + fmt(r.perHitMax) + ')'],
      ['Per Skill Use (avg)', fmt(r.perSkillAvg)],
      ['DPS', fmt(r.dps)]
    ]);

    if (r.targetHP > 0) {
      rows.push(['Target HP', fmt(r.targetHP)]);
      rows.push(['Kills/min', r.killsPerMin.toFixed(1)]);
      rows.push(['Kills/hr', fmt(Math.floor(r.killsPerHr))]);
    }

    tbody.innerHTML = rows.map(function (row) {
      if (row[0] === '---') {
        return '<tr class="sep"><td colspan="2"></td></tr>';
      }
      return '<tr><td>' + esc(row[0]) + '</td><td>' + esc(String(row[1])) + '</td></tr>';
    }).join('');
  }

  // ==================== TARGET MONSTER ====================

  function selectTargetMonster(mon) {
    bsState.targetMonster = mon;

    var display = document.getElementById('bs-target-display');
    display.style.display = 'block';

    var spriteUrl = 'https://static.divine-pride.net/images/mobs/png/' + mon.id + '.png';
    var fallback = mon.spriteUrl ? ("this.src='" + mon.spriteUrl + "';this.onerror=function(){this.style.display='none'}") : "this.style.display='none'";

    display.innerHTML = '\
      <div class="bs-target-selected">\
        <img src="' + spriteUrl + '" onerror="' + fallback + '">\
        <div class="bs-target-info">\
          <div class="ti-name">' + esc(mon.name) + '</div>\
          <div class="ti-detail">Lv ' + mon.level + ' | ' + esc(mon.element) + '</div>\
        </div>\
        <button class="bs-sel-clear" id="bs-target-clear">X</button>\
      </div>\
      <div class="bs-target-stats">\
        <div class="bs-target-stat"><span>HP</span><span class="ts-val">' + fmt(mon.hp || 0) + '</span></div>\
        <div class="bs-target-stat"><span>DEF</span><span class="ts-val">' + (mon.def || 0) + '</span></div>\
        <div class="bs-target-stat"><span>MDEF</span><span class="ts-val">' + (mon.mdef || 0) + '</span></div>\
        <div class="bs-target-stat"><span>Size</span><span class="ts-val">' + esc(mon.size) + '</span></div>\
        <div class="bs-target-stat"><span>Race</span><span class="ts-val">' + esc(mon.race) + '</span></div>\
        <div class="bs-target-stat"><span>Element</span><span class="ts-val">' + esc(mon.element) + '</span></div>\
      </div>\
    ';

    document.getElementById('bs-target-clear').addEventListener('click', function () {
      bsState.targetMonster = null;
      display.style.display = 'none';
      display.innerHTML = '';
      recalcDPS();
    });

    // Hide search input
    var searchInput = document.getElementById('bs-monster-search');
    if (searchInput) searchInput.value = '';

    recalcDPS();
  }

  // ==================== ROC_BUILD INTEGRATION ====================

  function emitEquipToROCBuild() {
    if (!window.ROC_BUILD) return;

    // Copy equip state
    var equipState = {};
    for (var i = 0; i < EQUIP_SLOTS.length; i++) {
      var key = EQUIP_SLOTS[i].key;
      var eq = bsState.equip[key];
      if (eq) {
        equipState[key] = {
          item: eq.item,
          refine: eq.refine,
          cards: eq.cards.slice()
        };
      } else {
        equipState[key] = null;
      }
    }
    ROC_BUILD.state.equip = equipState;

    ROC_BUILD.state.equipBonus = {
      totalATK: bsState._totalEquipATK || 0,
      totalDEF: bsState._totalEquipDEF || 0,
      refineATK: bsState._refineATK || 0,
      weaponElement: bsState.weaponElement,
      bonusRace: bsState.bonusRace,
      bonusEle: bsState.bonusEle,
      bonusSize: bsState.bonusSize
    };

    ROC_BUILD.emit('equip');
  }

  function emitSkillToROCBuild(result) {
    if (!window.ROC_BUILD) return;

    var skill = getSelectedSkill();
    if (skill) {
      ROC_BUILD.state.activeSkill = {
        id: skill.id,
        name: skill.name,
        level: bsState.activeSkillLv,
        damagePercent: result.dmgPct,
        hitCount: result.hitCount,
        element: result.skillEle,
        castTime: result.actualCast,
        afterDelay: result.afterDelay,
        spCost: result.spCost,
        type: result.skillType
      };
    } else {
      ROC_BUILD.state.activeSkill = null;
    }

    ROC_BUILD.emit('skill');
  }

  // ==================== EVENT BINDING ====================

  function bindEvents() {
    var container = document.getElementById('sec-build-sim');
    if (!container) return;

    // ── Equipment search inputs ──
    var equipInputs = container.querySelectorAll('.bs-equip-search');
    for (var ei = 0; ei < equipInputs.length; ei++) {
      (function (input) {
        var slotKey = input.dataset.slot;
        var slotDef = EQUIP_SLOTS.find(function (s) { return s.key === slotKey; });
        if (!slotDef) return;

        var ddId = 'bs-dd-' + slotKey;

        var debouncedSearch = debounce(function () {
          var results = searchItems(input.value, slotDef.filter);
          renderEquipDropdown(ddId, slotKey, results);
        }, 200);

        input.addEventListener('input', debouncedSearch);
        input.addEventListener('focus', function () {
          if (input.value.length >= 2) {
            var results = searchItems(input.value, slotDef.filter);
            renderEquipDropdown(ddId, slotKey, results);
          }
        });
      })(equipInputs[ei]);
    }

    // Close dropdowns on outside click
    document.addEventListener('click', function (e) {
      var dropdowns = container.querySelectorAll('.bs-dropdown');
      for (var d = 0; d < dropdowns.length; d++) {
        var dd = dropdowns[d];
        var parentWrap = dd.closest('.bs-search-wrap');
        if (parentWrap && !parentWrap.contains(e.target)) {
          dd.classList.remove('open');
        }
      }
    });

    // ── Delegated click events ──
    container.addEventListener('click', function (e) {
      // Clear equipment
      var clearBtn = e.target.closest('.bs-sel-clear');
      if (clearBtn && clearBtn.dataset.slot) {
        clearEquipItem(clearBtn.dataset.slot);
        return;
      }
    });

    // ── Refine inputs ──
    container.addEventListener('input', function (e) {
      var refInput = e.target.closest('.bs-refine-input');
      if (refInput) {
        var slotKey = refInput.dataset.slot;
        var val = num(refInput.value);
        val = Math.max(0, Math.min(15, val));
        if (bsState.equip[slotKey]) {
          bsState.equip[slotKey].refine = val;
          updateEquipDisplay(slotKey);
          updateBonusSummary();
          recalcDPS();
          emitEquipToROCBuild();
        }
        return;
      }
    });

    // ── Equipment option selects ──
    container.addEventListener('change', function (e) {
      var optType = e.target.closest('.bs-opt-type');
      if (optType) {
        var slotKey = optType.dataset.slot;
        var idx = num(optType.dataset.optIdx);
        if (bsState.equip[slotKey] && bsState.equip[slotKey].options) {
          bsState.equip[slotKey].options[idx].type = optType.value;
          updateBonusSummary(); recalcDPS(); emitEquipToROCBuild();
        }
        return;
      }
    });
    container.addEventListener('input', function (e) {
      var optVal = e.target.closest('.bs-opt-val');
      if (optVal) {
        var slotKey = optVal.dataset.slot;
        var idx = num(optVal.dataset.optIdx);
        if (bsState.equip[slotKey] && bsState.equip[slotKey].options) {
          bsState.equip[slotKey].options[idx].value = num(optVal.value);
          updateBonusSummary(); recalcDPS(); emitEquipToROCBuild();
        }
        return;
      }
    });

    // ── Manual bonus inputs ──
    var bonusMap = {
      'bs-weapon-ele':   function (v) { bsState.weaponElement = v; },
      'bs-bonus-race':   function (v) { bsState.bonusRace = num(v); },
      'bs-bonus-ele':    function (v) { bsState.bonusEle = num(v); },
      'bs-bonus-size':   function (v) { bsState.bonusSize = num(v); },
      'bs-bonus-atk':    function (v) { bsState.bonusATK = num(v); },
      'bs-bonus-alldmg': function (v) { bsState.bonusAllDmg = num(v); }
    };

    Object.keys(bonusMap).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var evtType = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evtType, function () {
        bonusMap[id](this.value);
        updateBonusSummary();
        recalcDPS();
        emitEquipToROCBuild();
      });
    });

    // ── Costume / Option / Enchant bonus inputs ──
    var costumeMap = {
      'bs-cos-atk':  function (v) { bsState.costumeATK = num(v); },
      'bs-cos-matk': function (v) { bsState.costumeMATK = num(v); },
      'bs-cos-str':  function (v) { bsState.costumeSTR = num(v); },
      'bs-cos-agi':  function (v) { bsState.costumeAGI = num(v); },
      'bs-cos-vit':  function (v) { bsState.costumeVIT = num(v); },
      'bs-cos-int':  function (v) { bsState.costumeINT = num(v); },
      'bs-cos-dex':  function (v) { bsState.costumeDEX = num(v); },
      'bs-cos-luk':  function (v) { bsState.costumeLUK = num(v); },
      'bs-cos-aspd': function (v) { bsState.costumeASPD = num(v); },
      'bs-cos-crit': function (v) { bsState.costumeCrit = num(v); }
    };

    Object.keys(costumeMap).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        costumeMap[id](this.value);
        updateBonusSummary();
        recalcDPS();
        emitEquipToROCBuild();
      });
    });

    // ── Skill select ──
    var skillSel = document.getElementById('bs-skill-select');
    if (skillSel) {
      skillSel.addEventListener('change', function () {
        bsState.activeSkillId = this.value || null;
        bsState.activeSkillLv = 1;
        var slider = document.getElementById('bs-skill-slider');
        if (slider) slider.value = 1;
        document.getElementById('bs-skill-lv-num').textContent = '1';
        updateSkillInfo();
        recalcDPS();
      });
    }

    // ── Skill level slider ──
    var skillSlider = document.getElementById('bs-skill-slider');
    if (skillSlider) {
      skillSlider.addEventListener('input', function () {
        bsState.activeSkillLv = num(this.value);
        document.getElementById('bs-skill-lv-num').textContent = this.value;
        updateSkillInfo();
        recalcDPS();
      });
    }

    // ── Monster search ──
    var monSearch = document.getElementById('bs-monster-search');
    var monDD = document.getElementById('bs-monster-dd');
    if (monSearch && monDD) {
      var debouncedMonSearch = debounce(function () {
        var results = searchMonsters(monSearch.value);
        renderMonsterDropdown(monDD, results);
      }, 200);

      monSearch.addEventListener('input', debouncedMonSearch);
      monSearch.addEventListener('focus', function () {
        if (monSearch.value.length >= 2) {
          var results = searchMonsters(monSearch.value);
          renderMonsterDropdown(monDD, results);
        }
      });
    }

    // ── Listen for ROC_BUILD events ──
    if (window.ROC_BUILD) {
      ROC_BUILD.on('stats', function () {
        updateSkillList();
        updateSkillInfo();
        recalcDPS();
      });
    }
  }

  // ==================== DROPDOWN RENDERERS ====================

  function renderEquipDropdown(ddId, slotKey, items) {
    var dd = document.getElementById(ddId);
    if (!dd) return;

    if (!items || items.length === 0) {
      dd.classList.remove('open');
      return;
    }

    dd.innerHTML = items.map(function (item) {
      var sub = '';
      if (item.cat === 'Weapon') {
        sub = 'ATK ' + (item.atk || 0) + ' | ' + esc(item.wtype) + ' | Lv' + (item.wlv || 1) + ' | S' + (item.slots || 0);
      } else if (isHeadgear(item)) {
        sub = 'DEF ' + (item.def || 0) + (item.eloc ? ' | ' + esc(item.eloc) : '') + (item.slots ? ' | S' + item.slots : '');
      } else {
        sub = 'DEF ' + (item.def || 0) + (item.slots ? ' | S' + item.slots : '');
      }
      return '<div class="bs-dd-item" data-item-id="' + item.id + '" data-slot="' + slotKey + '">' +
        '<img class="bs-dd-icon" src="' + ITEM_ICON_URL + item.id + '.png" onerror="this.style.display=\'none\'">' +
        '<span class="dd-name">' + esc(item.name) + '</span>' +
        '<span class="dd-sub">' + sub + '</span>' +
        '</div>';
    }).join('');

    dd.classList.add('open');

    // Click handlers
    var ddItems = dd.querySelectorAll('.bs-dd-item');
    for (var i = 0; i < ddItems.length; i++) {
      ddItems[i].addEventListener('click', function () {
        var itemId = num(this.dataset.itemId);
        var slot = this.dataset.slot;
        var item = ITEMS.find(function (x) { return x.id === itemId; });
        if (item) {
          selectEquipItem(slot, item);
        }
        dd.classList.remove('open');
      });
    }
  }

  function renderMonsterDropdown(dd, monsters) {
    if (!dd) return;

    if (!monsters || monsters.length === 0) {
      dd.classList.remove('open');
      return;
    }

    dd.innerHTML = monsters.map(function (m) {
      var spriteUrl = 'https://static.divine-pride.net/images/mobs/png/' + m.id + '.png';
      var fallback = m.spriteUrl ? ("this.src='" + m.spriteUrl + "';this.onerror=function(){this.style.display='none'}") : "this.style.display='none'";
      return '<div class="bs-dd-item bs-mob-item" data-mob-id="' + m.id + '">' +
        '<img src="' + spriteUrl + '" onerror="' + fallback + '" style="width:24px;height:24px;object-fit:contain">' +
        '<span class="dd-name">' + esc(m.name) + '</span>' +
        '<span class="dd-sub">Lv' + m.level + ' | HP ' + fmt(m.hp || 0) + '</span>' +
        '</div>';
    }).join('');

    dd.classList.add('open');

    var ddItems = dd.querySelectorAll('.bs-mob-item');
    for (var i = 0; i < ddItems.length; i++) {
      ddItems[i].addEventListener('click', function () {
        var mobId = num(this.dataset.mobId);
        var mon = MONSTERS.find(function (x) { return x.id === mobId; });
        if (mon) {
          selectTargetMonster(mon);
        }
        dd.classList.remove('open');
      });
    }
  }

  // ==================== PUBLIC INIT ====================

  window.initBuildSimulator = function () {
    var container = document.getElementById('sec-build-sim');
    if (!container) {
      console.warn('[Build Simulator] #sec-build-sim not found');
      return;
    }

    // Check for required globals
    if (typeof ITEMS === 'undefined') {
      console.warn('[Build Simulator] ITEMS not loaded');
    }
    if (typeof MONSTERS === 'undefined') {
      console.warn('[Build Simulator] MONSTERS not loaded');
    }
    if (!window.ROC_BUILD) {
      console.warn('[Build Simulator] ROC_BUILD not available, will work in standalone mode');
    }
    if (!window.SKILL_DB) {
      console.warn('[Build Simulator] SKILL_DB not loaded, skill selection will be limited');
    }

    injectStyles();
    buildUI(container);
    bindEvents();

    // Initial updates
    updateSkillList();
    updateSkillInfo();
    updateBonusSummary();
    updateCharaPreview();
    recalcDPS();

    // Listen for job/level changes from Status Simulator
    if (window.ROC_BUILD) {
      ROC_BUILD.on('stats', function () { updateCharaPreview(); updateSkillList(); });
    }

    // Expose DPS calculator for Zeny Calc integration
    if (window.ROC_BUILD) {
      ROC_BUILD.calcDamageVsMonster = function (monster) {
        if (!monster) return 0;
        var savedTarget = bsState.targetMonster;
        bsState.targetMonster = monster;
        var result = calcDPS();
        bsState.targetMonster = savedTarget;
        return result.dps || 0;
      };

      // Register save/load hooks
      ROC_BUILD._buildSim = {
        getState: function () {
          // Serialize equipment as IDs only
          var equipSave = {};
          for (var i = 0; i < EQUIP_SLOTS.length; i++) {
            var k = EQUIP_SLOTS[i].key;
            var eq = bsState.equip[k];
            if (eq && eq.item) {
              equipSave[k] = {
                itemId: eq.item.id,
                refine: eq.refine || 0,
                cardIds: (eq.cards || []).map(function (c) { return c; }),
                options: (eq.options || []).map(function (o) { return {type: o.type, value: o.value}; })
              };
            }
          }
          return {
            equip: equipSave,
            bonusRace: bsState.bonusRace,
            bonusEle: bsState.bonusEle,
            bonusSize: bsState.bonusSize,
            bonusATK: bsState.bonusATK,
            bonusAllDmg: bsState.bonusAllDmg,
            costumeATK: bsState.costumeATK,
            costumeMATK: bsState.costumeMATK,
            costumeSTR: bsState.costumeSTR,
            costumeAGI: bsState.costumeAGI,
            costumeVIT: bsState.costumeVIT,
            costumeINT: bsState.costumeINT,
            costumeDEX: bsState.costumeDEX,
            costumeLUK: bsState.costumeLUK,
            costumeASPD: bsState.costumeASPD,
            costumeCrit: bsState.costumeCrit,
            weaponElement: bsState.weaponElement,
            activeSkillId: bsState.activeSkillId,
            activeSkillLv: bsState.activeSkillLv,
            targetMonsterId: bsState.targetMonster ? bsState.targetMonster.id : null
          };
        },
        setState: function (saved) {
          if (!saved) return;

          // Restore equipment
          if (saved.equip) {
            Object.keys(saved.equip).forEach(function (k) {
              var eq = saved.equip[k];
              if (!eq || !eq.itemId) return;
              var item = (typeof ITEMS !== 'undefined') ? ITEMS.find(function (x) { return x.id === eq.itemId; }) : null;
              if (item) {
                selectEquipItem(k, item);
                // Set refine
                if (eq.refine && bsState.equip[k]) {
                  bsState.equip[k].refine = eq.refine;
                  var refInput = document.querySelector('.bs-refine-input[data-slot="' + k + '"]');
                  if (refInput) refInput.value = eq.refine;
                }
                // Set cards
                if (eq.cardIds && bsState.equip[k]) {
                  for (var ci = 0; ci < eq.cardIds.length; ci++) {
                    if (eq.cardIds[ci]) {
                      selectCard(k, ci, eq.cardIds[ci]);
                    }
                  }
                }
                // Set options
                if (eq.options && bsState.equip[k] && bsState.equip[k].options) {
                  for (var oi = 0; oi < eq.options.length && oi < 3; oi++) {
                    var o = eq.options[oi];
                    bsState.equip[k].options[oi] = {type: o.type || '', value: o.value || 0};
                    var optType = document.querySelector('.bs-opt-type[data-slot="' + k + '"][data-opt-idx="' + oi + '"]');
                    var optVal = document.querySelector('.bs-opt-val[data-slot="' + k + '"][data-opt-idx="' + oi + '"]');
                    if (optType) optType.value = o.type || '';
                    if (optVal) optVal.value = o.value || 0;
                  }
                }
              }
            });
          }

          // Restore bonuses
          var bonusFields = {
            'bs-bonus-race': 'bonusRace', 'bs-bonus-ele': 'bonusEle',
            'bs-bonus-size': 'bonusSize', 'bs-bonus-atk': 'bonusATK',
            'bs-bonus-alldmg': 'bonusAllDmg'
          };
          Object.keys(bonusFields).forEach(function (elId) {
            var key = bonusFields[elId];
            if (saved[key] !== undefined) {
              bsState[key] = saved[key];
              var el = document.getElementById(elId);
              if (el) el.value = saved[key];
            }
          });

          // Restore costume
          var cosFields = {
            'bs-cos-atk': 'costumeATK', 'bs-cos-matk': 'costumeMATK',
            'bs-cos-str': 'costumeSTR', 'bs-cos-agi': 'costumeAGI',
            'bs-cos-vit': 'costumeVIT', 'bs-cos-int': 'costumeINT',
            'bs-cos-dex': 'costumeDEX', 'bs-cos-luk': 'costumeLUK',
            'bs-cos-aspd': 'costumeASPD', 'bs-cos-crit': 'costumeCrit'
          };
          Object.keys(cosFields).forEach(function (elId) {
            var key = cosFields[elId];
            if (saved[key] !== undefined) {
              bsState[key] = saved[key];
              var el = document.getElementById(elId);
              if (el) el.value = saved[key];
            }
          });

          // Weapon element
          if (saved.weaponElement) {
            bsState.weaponElement = saved.weaponElement;
            var wEleEl = document.getElementById('bs-weapon-ele');
            if (wEleEl) wEleEl.value = saved.weaponElement;
          }

          // Skill
          if (saved.activeSkillId) {
            bsState.activeSkillId = saved.activeSkillId;
            var skillSel = document.getElementById('bs-skill-select');
            if (skillSel) skillSel.value = saved.activeSkillId;
          }
          if (saved.activeSkillLv) {
            bsState.activeSkillLv = saved.activeSkillLv;
            var slider = document.getElementById('bs-skill-slider');
            if (slider) slider.value = saved.activeSkillLv;
            var lvNum = document.getElementById('bs-skill-lv-num');
            if (lvNum) lvNum.textContent = saved.activeSkillLv;
          }

          // Target monster
          if (saved.targetMonsterId && typeof MONSTERS !== 'undefined') {
            var mon = MONSTERS.find(function (x) { return x.id === saved.targetMonsterId; });
            if (mon) selectTargetMonster(mon);
          }

          updateBonusSummary();
          updateSkillInfo();
          recalcDPS();
        }
      };

      // Auto-load (stat_sim loads first, build_sim loads here)
      ROC_BUILD.loadFromStorage();
    }
  };

})();
