/**
 * ROC Classic Renewal Skill Database
 * ~46 farming/damage skills with per-level data
 *
 * Schema:
 *   skillId: {
 *     name, class[], type, maxLv, element, target, aoe,
 *     ignoresDef, ignoresFlee,
 *     perLevel: [[level, damagePercent, hitCount, castTime(ms), afterDelay(ms), spCost], ...]
 *   }
 *   Note: damagePercent is TOTAL damage %. hitCount = actual damage packets.
 *   For "split" skills (visual multi-hit but total damage), use hitCount=1.
 *
 * Class IDs (rAthena):
 *   0=Novice 1=Swordman 2=Mage 3=Archer 4=Acolyte 5=Merchant 6=Thief
 *   7=Knight 8=Priest 9=Wizard 10=Blacksmith 11=Hunter 12=Assassin
 *   14=Crusader 15=Monk 16=Sage 17=Rogue 18=Alchemist 19=Bard 20=Dancer
 *   4008=Lord Knight 4009=High Priest 4010=High Wizard 4011=Whitesmith
 *   4012=Sniper 4013=Assassin Cross 4015=Paladin 4016=Champion
 *   4017=Professor 4018=Stalker 4019=Creator 4020=Clown 4021=Gypsy
 *
 * Reference: rAthena skill_db.yml / renewal formulas (battle.cpp)
 */
(function () {
  'use strict';

  var SKILL_DB = {

    /* ================================================================
     *  SWORDMAN / KNIGHT / LORD KNIGHT
     * ================================================================ */

    // SM_BASH
    5: {
      name: 'Bash',
      class: [1, 7, 8, 14, 4008, 4015],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        // [lv, dmg%, hits, cast(ms), delay(ms), sp]
        [1,  130, 1, 0, 0,  8],
        [2,  160, 1, 0, 0,  8],
        [3,  190, 1, 0, 0,  8],
        [4,  220, 1, 0, 0,  8],
        [5,  250, 1, 0, 0,  8],
        [6,  280, 1, 0, 0, 15],
        [7,  310, 1, 0, 0, 15],
        [8,  340, 1, 0, 0, 15],
        [9,  370, 1, 0, 0, 15],
        [10, 400, 1, 0, 0, 15]
      ]
    },

    // SM_MAGNUM
    7: {
      name: 'Magnum Break',
      class: [1, 7, 14, 4008, 4015],
      type: 'physical',
      maxLv: 10,
      element: 'fire',
      target: 'self',
      aoe: 3,
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        [1,  120, 1, 0, 2000, 30],
        [2,  140, 1, 0, 2000, 30],
        [3,  160, 1, 0, 2000, 30],
        [4,  180, 1, 0, 2000, 30],
        [5,  200, 1, 0, 2000, 30],
        [6,  220, 1, 0, 2000, 30],
        [7,  240, 1, 0, 2000, 30],
        [8,  260, 1, 0, 2000, 30],
        [9,  280, 1, 0, 2000, 30],
        [10, 300, 1, 0, 2000, 30]
      ]
    },

    // KN_PIERCE
    56: {
      name: 'Pierce',
      class: [7, 14, 4008, 4015],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // hitCount depends on target size: Small=1, Medium=2, Large=3
      // damagePercent is per hit; hits listed as 1 (multiply by size factor)
      perLevel: [
        [1,  110, 1, 0, 700,  7],
        [2,  120, 1, 0, 700,  7],
        [3,  130, 1, 0, 700,  7],
        [4,  140, 1, 0, 700,  7],
        [5,  150, 1, 0, 700,  7],
        [6,  160, 1, 0, 700,  7],
        [7,  170, 1, 0, 700,  7],
        [8,  180, 1, 0, 700,  7],
        [9,  190, 1, 0, 700,  7],
        [10, 200, 1, 0, 700,  7]
      ]
    },

    // KN_BRANDISHSPEAR (Renewal: 400+100*Lv %, split 3 visual hits)
    57: {
      name: 'Brandish Spear',
      class: [7, 4008],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 3, // directional AOE, varies by level
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        // [lv, total dmg%, hits, VCT(ms), cooldown(ms), sp]
        [1,   500, 1, 500, 1000, 24],
        [2,   600, 1, 500, 1000, 24],
        [3,   700, 1, 500, 1000, 24],
        [4,   800, 1, 500, 1000, 24],
        [5,   900, 1, 500, 1000, 24],
        [6,  1000, 1, 500, 1000, 24],
        [7,  1100, 1, 500, 1000, 24],
        [8,  1200, 1, 500, 1000, 24],
        [9,  1300, 1, 500, 1000, 24],
        [10, 1400, 1, 500, 1000, 24]
      ]
    },

    // KN_BOWLINGBASH (Renewal: 100+40*Lv % per hit, 2 hits)
    62: {
      name: 'Bowling Bash',
      class: [7, 4008],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 3, // knockback splash
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        // [lv, dmg% per hit, hits, fixedCast(ms), cooldown(ms), sp]
        [1,  140, 2, 350, 1000, 13],
        [2,  180, 2, 350, 1000, 14],
        [3,  220, 2, 350, 1000, 15],
        [4,  260, 2, 350, 1000, 16],
        [5,  300, 2, 350, 1000, 17],
        [6,  340, 2, 350, 1000, 18],
        [7,  380, 2, 350, 1000, 19],
        [8,  420, 2, 350, 1000, 20],
        [9,  460, 2, 350, 1000, 21],
        [10, 500, 2, 350, 1000, 22]
      ]
    },

    /* ================================================================
     *  MAGE / WIZARD / HIGH WIZARD
     * ================================================================ */

    // MG_NAPALMBEAT
    11: {
      name: 'Napalm Beat',
      class: [2, 9, 16, 4010, 4017],
      type: 'magical',
      maxLv: 10,
      element: 'ghost',
      target: 'single',
      aoe: 3, // damage split among targets in 3x3
      ignoresDef: false,
      ignoresFlee: true,
      perLevel: [
        [1,   80, 1, 0, 1000,  9],
        [2,   90, 1, 0, 1000,  9],
        [3,  100, 1, 0, 1000,  9],
        [4,  110, 1, 0, 1000,  9],
        [5,  120, 1, 0, 1000,  9],
        [6,  130, 1, 0, 1000,  9],
        [7,  140, 1, 0, 1000,  9],
        [8,  150, 1, 0, 1000,  9],
        [9,  160, 1, 0, 1000,  9],
        [10, 170, 1, 0, 1000,  9]
      ]
    },

    // MG_SOULSTRIKE
    13: {
      name: 'Soul Strike',
      class: [2, 9, 16, 4010, 4017],
      type: 'magical',
      maxLv: 10,
      element: 'ghost',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // Hits: lv1=1, lv2=1, lv3=2, lv4=2, lv5=3, lv6=3, lv7=4, lv8=4, lv9=5, lv10=5
      perLevel: [
        [1,  100, 1, 500,  1200,  8],
        [2,  100, 1, 500,  1200, 14],
        [3,  100, 2, 500,  1200, 20],
        [4,  100, 2, 500,  1200, 26],
        [5,  100, 3, 500,  1200, 32],
        [6,  100, 3, 500,  1200, 38],
        [7,  100, 4, 500,  1200, 44],
        [8,  100, 4, 500,  1200, 50],
        [9,  100, 5, 500,  1200, 56],
        [10, 100, 5, 500,  1200, 62]
      ]
    },

    // MG_COLDBOLT
    14: {
      name: 'Cold Bolt',
      class: [2, 9, 16, 4010, 4017],
      type: 'magical',
      maxLv: 10,
      element: 'water',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // 1 hit per level, 100% MATK each
      perLevel: [
        [1,  100,  1,  700, 0, 12],
        [2,  100,  2, 1400, 0, 14],
        [3,  100,  3, 2100, 0, 16],
        [4,  100,  4, 2800, 0, 18],
        [5,  100,  5, 3500, 0, 20],
        [6,  100,  6, 3200, 0, 22],
        [7,  100,  7, 2900, 0, 24],
        [8,  100,  8, 2600, 0, 26],
        [9,  100,  9, 2300, 0, 28],
        [10, 100, 10, 2000, 0, 30]
      ]
    },

    // MG_FIREBOLT
    19: {
      name: 'Fire Bolt',
      class: [2, 9, 16, 4010, 4017],
      type: 'magical',
      maxLv: 10,
      element: 'fire',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      perLevel: [
        [1,  100,  1,  700, 0, 12],
        [2,  100,  2, 1400, 0, 14],
        [3,  100,  3, 2100, 0, 16],
        [4,  100,  4, 2800, 0, 18],
        [5,  100,  5, 3500, 0, 20],
        [6,  100,  6, 3200, 0, 22],
        [7,  100,  7, 2900, 0, 24],
        [8,  100,  8, 2600, 0, 26],
        [9,  100,  9, 2300, 0, 28],
        [10, 100, 10, 2000, 0, 30]
      ]
    },

    // MG_LIGHTNINGBOLT
    20: {
      name: 'Lightning Bolt',
      class: [2, 9, 16, 4010, 4017],
      type: 'magical',
      maxLv: 10,
      element: 'wind',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      perLevel: [
        [1,  100,  1,  700, 0, 12],
        [2,  100,  2, 1400, 0, 14],
        [3,  100,  3, 2100, 0, 16],
        [4,  100,  4, 2800, 0, 18],
        [5,  100,  5, 3500, 0, 20],
        [6,  100,  6, 3200, 0, 22],
        [7,  100,  7, 2900, 0, 24],
        [8,  100,  8, 2600, 0, 26],
        [9,  100,  9, 2300, 0, 28],
        [10, 100, 10, 2000, 0, 30]
      ]
    },

    // WZ_METEOR
    83: {
      name: 'Meteor Storm',
      class: [9, 4010],
      type: 'magical',
      maxLv: 10,
      element: 'fire',
      target: 'ground',
      aoe: 7, // 7x7 cast area, each meteor 3x3
      ignoresDef: false,
      ignoresFlee: true,
      // Each meteor does 100% MATK; number of meteors increases
      // Actual hits depend on meteor placement; listed as average hits
      perLevel: [
        [1,  100,  1, 6000, 2000, 20],
        [2,  100,  2, 5600, 2000, 24],
        [3,  100,  3, 5200, 2000, 28],
        [4,  100,  4, 4800, 2000, 32],
        [5,  100,  5, 4400, 2000, 36],
        [6,  100,  6, 4000, 2000, 40],
        [7,  100,  7, 3600, 2000, 44],
        [8,  100,  8, 3200, 2000, 48],
        [9,  100,  9, 2800, 2000, 52],
        [10, 100, 10, 2400, 2000, 56]
      ]
    },

    // WZ_JUPITEL
    84: {
      name: 'Jupitel Thunder',
      class: [9, 4010],
      type: 'magical',
      maxLv: 10,
      element: 'wind',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // lv1=3 hits, +1 per level -> lv10=12 hits, 100% MATK per hit
      perLevel: [
        [1,  100,  3, 2000, 1000, 20],
        [2,  100,  4, 2500, 1000, 23],
        [3,  100,  5, 3000, 1000, 26],
        [4,  100,  6, 3500, 1000, 29],
        [5,  100,  7, 4000, 1000, 32],
        [6,  100,  8, 4500, 1000, 35],
        [7,  100,  9, 5000, 1000, 38],
        [8,  100, 10, 5500, 1000, 41],
        [9,  100, 11, 6000, 1000, 44],
        [10, 100, 12, 6500, 1000, 47]
      ]
    },

    // WZ_VERMILION
    85: {
      name: 'Lord of Vermilion',
      class: [9, 4010],
      type: 'magical',
      maxLv: 10,
      element: 'wind',
      target: 'ground',
      aoe: 9, // 9x9
      ignoresDef: false,
      ignoresFlee: true,
      // 100% MATK per hit
      perLevel: [
        [1,  100,  4, 8000, 5000, 60],
        [2,  100,  5, 7200, 5000, 64],
        [3,  100,  6, 6400, 5000, 68],
        [4,  100,  7, 5600, 5000, 72],
        [5,  100,  8, 4800, 5000, 76],
        [6,  100,  9, 4000, 5000, 80],
        [7,  100, 10, 3200, 5000, 84],
        [8,  100, 11, 2400, 5000, 88],
        [9,  100, 12, 1600, 5000, 92],
        [10, 100, 14, 800,  5000, 96]
      ]
    },

    // WZ_STORMGUST
    89: {
      name: 'Storm Gust',
      class: [9, 4010],
      type: 'magical',
      maxLv: 10,
      element: 'water',
      target: 'ground',
      aoe: 7, // 7x7
      ignoresDef: false,
      ignoresFlee: true,
      // 100% MATK per hit, 10 hits max at lv10
      perLevel: [
        [1,  100,  1, 6400, 5000, 78],
        [2,  100,  2, 5600, 5000, 78],
        [3,  100,  3, 4800, 5000, 78],
        [4,  100,  4, 4000, 5000, 78],
        [5,  100,  5, 3200, 5000, 78],
        [6,  100,  6, 2400, 5000, 78],
        [7,  100,  7, 1600, 5000, 78],
        [8,  100,  8, 800,  5000, 78],
        [9,  100,  9, 400,  5000, 78],
        [10, 100, 10, 400,  5000, 78]
      ]
    },

    // WZ_HEAVENDRIVE
    91: {
      name: "Heaven's Drive",
      class: [9, 4010],
      type: 'magical',
      maxLv: 5,
      element: 'earth',
      target: 'ground',
      aoe: 5, // 5x5
      ignoresDef: false,
      ignoresFlee: true,
      perLevel: [
        [1, 100, 1, 1000, 1000, 28],
        [2, 100, 2, 2000, 1000, 32],
        [3, 100, 3, 3000, 1000, 36],
        [4, 100, 4, 4000, 1000, 40],
        [5, 100, 5, 5000, 1000, 44]
      ]
    },

    /* ================================================================
     *  ARCHER / HUNTER / SNIPER
     * ================================================================ */

    // AC_DOUBLE
    46: {
      name: 'Double Strafe',
      class: [3, 11, 19, 20, 4012, 4020, 4021],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        [1,  100, 2, 0, 100, 12],
        [2,  110, 2, 0, 100, 12],
        [3,  120, 2, 0, 100, 12],
        [4,  130, 2, 0, 100, 12],
        [5,  140, 2, 0, 100, 12],
        [6,  150, 2, 0, 100, 12],
        [7,  160, 2, 0, 100, 12],
        [8,  170, 2, 0, 100, 12],
        [9,  180, 2, 0, 100, 12],
        [10, 190, 2, 0, 100, 12]
      ]
    },

    // AC_SHOWER (Renewal: 100+50+10*Lv %)
    47: {
      name: 'Arrow Shower',
      class: [3, 11, 19, 20, 4012, 4020, 4021],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'ground',
      aoe: 3, // 3x3, expands to 5x5 at Lv6+
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        [1,  160, 1, 0, 500, 15],
        [2,  170, 1, 0, 500, 15],
        [3,  180, 1, 0, 500, 15],
        [4,  190, 1, 0, 500, 15],
        [5,  200, 1, 0, 500, 15],
        [6,  210, 1, 0, 500, 15],
        [7,  220, 1, 0, 500, 15],
        [8,  230, 1, 0, 500, 15],
        [9,  240, 1, 0, 500, 15],
        [10, 250, 1, 0, 500, 15]
      ]
    },

    // HT_BLITZBEAT
    129: {
      name: 'Blitz Beat',
      class: [11, 4012],
      type: 'misc',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 3, // damage split in 3x3
      ignoresDef: true,
      ignoresFlee: true,
      // Damage = (DEX/10 + INT/2 + Falcon_DMG + BaseLv) * hitCount
      // hitCount per skill level:
      perLevel: [
        [1, 100, 1, 0, 1000, 10],
        [2, 100, 2, 0, 1000, 13],
        [3, 100, 3, 0, 1000, 16],
        [4, 100, 4, 0, 1000, 19],
        [5, 100, 5, 0, 1000, 22]
      ]
    },

    /* ================================================================
     *  ACOLYTE / PRIEST / HIGH PRIEST
     * ================================================================ */

    // PR_TURNUNDEAD
    76: {
      name: 'Turn Undead',
      class: [8, 4009],
      type: 'magical',
      maxLv: 10,
      element: 'holy',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // Chance to insta-kill undead; if fails, deals holy damage
      // Success rate: (20*Lv + BaseLv + INT + LUK) / 1000 %
      perLevel: [
        [1,  100, 1, 1000, 3000, 20],
        [2,  100, 1, 1200, 3000, 20],
        [3,  100, 1, 1400, 3000, 20],
        [4,  100, 1, 1600, 3000, 20],
        [5,  100, 1, 1800, 3000, 20],
        [6,  100, 1, 2000, 3000, 20],
        [7,  100, 1, 2200, 3000, 20],
        [8,  100, 1, 2400, 3000, 20],
        [9,  100, 1, 2600, 3000, 20],
        [10, 100, 1, 2800, 3000, 20]
      ]
    },

    // PR_MAGNUS
    79: {
      name: 'Magnus Exorcismus',
      class: [8, 4009],
      type: 'magical',
      maxLv: 10,
      element: 'holy',
      target: 'ground',
      aoe: 7, // 7x7
      ignoresDef: false,
      ignoresFlee: true,
      // Hits multiple times while target stands in the area; only damages Undead/Shadow
      // Each wave does 100% MATK; waves = 1 per level
      perLevel: [
        [1,  100,  1, 4000, 4000, 40],
        [2,  100,  2, 3500, 4000, 42],
        [3,  100,  3, 3000, 4000, 44],
        [4,  100,  4, 2500, 4000, 46],
        [5,  100,  5, 2000, 4000, 48],
        [6,  100,  6, 2000, 4000, 50],
        [7,  100,  7, 2000, 4000, 52],
        [8,  100,  8, 2000, 4000, 54],
        [9,  100,  9, 2000, 4000, 56],
        [10, 100, 10, 2000, 4000, 58]
      ]
    },

    // PR_HOLYLIGHT (from Acolyte quest skill, also Priest)
    156: {
      name: 'Holy Light',
      class: [4, 8, 4009],
      type: 'magical',
      maxLv: 1,
      element: 'holy',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      perLevel: [
        [1, 125, 1, 2000, 0, 15]
      ]
    },

    /* ================================================================
     *  MERCHANT / BLACKSMITH / WHITESMITH
     * ================================================================ */

    // MC_MAMMONITE
    42: {
      name: 'Mammonite',
      class: [5, 10, 18, 4011, 4019],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Costs zeny: 100z * level
      perLevel: [
        [1,  150, 1, 0, 500, 5],
        [2,  175, 1, 0, 500, 5],
        [3,  200, 1, 0, 500, 5],
        [4,  225, 1, 0, 500, 5],
        [5,  250, 1, 0, 500, 5],
        [6,  275, 1, 0, 500, 5],
        [7,  300, 1, 0, 500, 5],
        [8,  325, 1, 0, 500, 5],
        [9,  350, 1, 0, 500, 5],
        [10, 400, 1, 0, 500, 5]
      ]
    },

    // BS_CARTREVOLUTION (quest skill)
    153: {
      name: 'Cart Revolution',
      class: [10, 18, 4011, 4019],
      type: 'physical',
      maxLv: 1,
      element: 'weapon',
      target: 'single',
      aoe: 3, // 3x3 knockback
      ignoresDef: false,
      ignoresFlee: false,
      // 150% ATK + bonus from cart weight
      perLevel: [
        [1, 150, 1, 0, 800, 12]
      ]
    },

    // WS_CARTTERMINATION
    485: {
      name: 'Cart Termination',
      class: [4011, 4019],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Damage scales with cart weight; percentage shown is base
      perLevel: [
        [1,  100, 1, 0, 0, 15],
        [2,  200, 1, 0, 0, 15],
        [3,  300, 1, 0, 0, 15],
        [4,  400, 1, 0, 0, 15],
        [5,  500, 1, 0, 0, 15],
        [6,  600, 1, 0, 0, 15],
        [7,  700, 1, 0, 0, 15],
        [8,  800, 1, 0, 0, 15],
        [9,  900, 1, 0, 0, 15],
        [10,1000, 1, 0, 0, 15]
      ]
    },

    /* ================================================================
     *  THIEF / ASSASSIN / ASSASSIN CROSS
     * ================================================================ */

    // AS_SONICBLOW (Renewal: 100+100+100*Lv % total, split 8 visual hits)
    136: {
      name: 'Sonic Blow',
      class: [12, 4013],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Total damage split into 8 visual hits; +50% bonus if target HP<50%
      perLevel: [
        // [lv, total dmg%, hits(1=total), cast(ms), cooldown(ms), sp]
        [1,   300, 1, 0, 1000, 16],
        [2,   400, 1, 0, 1000, 18],
        [3,   500, 1, 0, 1000, 20],
        [4,   600, 1, 0, 1000, 22],
        [5,   700, 1, 0, 1000, 24],
        [6,   800, 1, 0, 1000, 26],
        [7,   900, 1, 0, 1000, 28],
        [8,  1000, 1, 0, 1000, 30],
        [9,  1100, 1, 0, 1000, 32],
        [10, 1200, 1, 0, 1000, 34]
      ]
    },

    // AS_GRIMTOOTH
    137: {
      name: 'Grimtooth',
      class: [12, 4013],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 3, // 3x3
      ignoresDef: false,
      ignoresFlee: false,
      // Usable while hiding
      perLevel: [
        [1, 120, 1, 0, 1300,  3],
        [2, 140, 1, 0, 1100,  3],
        [3, 160, 1, 0,  900,  3],
        [4, 180, 1, 0,  700,  3],
        [5, 200, 1, 0,  500,  3]
      ]
    },

    /* ================================================================
     *  CRUSADER / PALADIN
     * ================================================================ */

    // CR_HOLYCROSS (Renewal: 100+35*Lv % per hit, 2 hits; 2H Spear doubles ratio)
    253: {
      name: 'Holy Cross',
      class: [14, 4015],
      type: 'physical',
      maxLv: 10,
      element: 'holy',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      perLevel: [
        [1,  135, 2, 0, 1000, 11],
        [2,  170, 2, 0, 1000, 12],
        [3,  205, 2, 0, 1000, 13],
        [4,  240, 2, 0, 1000, 14],
        [5,  275, 2, 0, 1000, 15],
        [6,  310, 2, 0, 1000, 16],
        [7,  345, 2, 0, 1000, 17],
        [8,  380, 2, 0, 1000, 18],
        [9,  415, 2, 0, 1000, 19],
        [10, 450, 2, 0, 1000, 20]
      ]
    },

    // CR_GRANDCROSS
    254: {
      name: 'Grand Cross',
      class: [14, 4015],
      type: 'magical',
      maxLv: 10,
      element: 'holy',
      target: 'self',
      aoe: 5, // 5x5
      ignoresDef: false,
      ignoresFlee: true,
      // Deals (ATK + MATK) hybrid damage; user takes 20% of damage dealt
      perLevel: [
        [1,  140, 1, 3000, 1500, 37],
        [2,  180, 1, 2800, 1500, 44],
        [3,  220, 1, 2600, 1500, 51],
        [4,  260, 1, 2400, 1500, 58],
        [5,  300, 1, 2200, 1500, 65],
        [6,  340, 1, 2000, 1500, 72],
        [7,  380, 1, 1800, 1500, 79],
        [8,  420, 1, 1600, 1500, 86],
        [9,  460, 1, 1400, 1500, 93],
        [10, 500, 1, 1200, 1500,100]
      ]
    },

    // CR_SHIELDBOOMERANG (Renewal: -20+80*Lv %, + shield weight/refine)
    251: {
      name: 'Shield Boomerang',
      class: [14, 4015],
      type: 'physical',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Damage based on shield weight and refine
      perLevel: [
        [1,  80, 1, 0, 700, 12],
        [2, 160, 1, 0, 700, 12],
        [3, 240, 1, 0, 700, 12],
        [4, 320, 1, 0, 700, 12],
        [5, 400, 1, 0, 700, 12]
      ]
    },

    /* ================================================================
     *  MONK / CHAMPION
     * ================================================================ */

    // MO_TRIPLEATTACK (passive combo starter)
    263: {
      name: 'Raging Trifecta Blow',
      class: [15, 4016],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Passive: chance to trigger 3-hit combo on normal attack
      // Total damage = 120-300% in 3 hits
      perLevel: [
        [1,  120, 3, 0, 0, 0],
        [2,  140, 3, 0, 0, 0],
        [3,  160, 3, 0, 0, 0],
        [4,  180, 3, 0, 0, 0],
        [5,  200, 3, 0, 0, 0],
        [6,  220, 3, 0, 0, 0],
        [7,  240, 3, 0, 0, 0],
        [8,  260, 3, 0, 0, 0],
        [9,  280, 3, 0, 0, 0],
        [10, 300, 3, 0, 0, 0]
      ]
    },

    // MO_INVESTIGATE (Occult Impaction / Investigate)
    267: {
      name: 'Occult Impaction',
      class: [15, 4016],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: true,
      ignoresFlee: false,
      // Damage depends on target DEF: higher DEF = more damage
      perLevel: [
        [1, 175, 1, 500, 500, 10],
        [2, 250, 1, 500, 500, 14],
        [3, 325, 1, 500, 500, 17],
        [4, 400, 1, 500, 500, 19],
        [5, 475, 1, 500, 500, 22]
      ]
    },

    // MO_FINGEROFFENSIVE (Finger Offensive / Throw Spirit Sphere)
    268: {
      name: 'Finger Offensive',
      class: [15, 4016],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Consumes spirit spheres; 1 sphere per level
      perLevel: [
        [1, 150, 1, 0, 1500, 10],
        [2, 200, 2, 0, 1500, 10],
        [3, 250, 3, 0, 1500, 10],
        [4, 300, 4, 0, 1500, 10],
        [5, 350, 5, 0, 1500, 10]
      ]
    },

    // MO_EXTREMITYFIST (Asura Strike / Guillotine Fist)
    271: {
      name: 'Asura Strike',
      class: [15, 4016],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // Massive single hit; consumes ALL SP
      // Base damage = 250-750% + (remaining SP * multiplier)
      perLevel: [
        [1, 250, 1, 4500, 3000, 0],  // SP cost = ALL SP
        [2, 375, 1, 3500, 3000, 0],
        [3, 500, 1, 2500, 3000, 0],
        [4, 625, 1, 1500, 3000, 0],
        [5, 750, 1,  500, 3000, 0]
      ]
    },

    /* ================================================================
     *  SAGE / PROFESSOR
     * ================================================================ */

    // SA_NAPALM_VULCAN (HW_NAPALMVULCAN actually ID 400)
    400: {
      name: 'Napalm Vulcan',
      class: [16, 4010, 4017],
      type: 'magical',
      maxLv: 5,
      element: 'ghost',
      target: 'single',
      aoe: 3, // splash 3x3
      ignoresDef: false,
      ignoresFlee: true,
      // 5 hits per cast, damage increases per level
      perLevel: [
        [1,  70, 5, 1000, 1000, 10],
        [2, 105, 5, 1000, 1000, 15],
        [3, 140, 5, 1000, 1000, 20],
        [4, 175, 5, 1000, 1000, 25],
        [5, 210, 5, 1000, 1000, 30]
      ]
    },

    /* ================================================================
     *  ROGUE / STALKER
     * ================================================================ */

    // RG_BACKSTAP
    52: {
      name: 'Backstab',
      class: [6, 17, 4018],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: true,
      // Must be behind target; always hits
      perLevel: [
        [1,  340, 1, 0, 500,  8],
        [2,  380, 1, 0, 500, 10],
        [3,  420, 1, 0, 500, 12],
        [4,  460, 1, 0, 500, 14],
        [5,  500, 1, 0, 500, 16],
        [6,  540, 1, 0, 500, 18],
        [7,  580, 1, 0, 500, 20],
        [8,  620, 1, 0, 500, 22],
        [9,  660, 1, 0, 500, 24],
        [10, 700, 1, 0, 500, 26]
      ]
    },

    // RG_RAID
    214: {
      name: 'Raid',
      class: [17, 4018],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'self',
      aoe: 7, // 7x7
      ignoresDef: false,
      ignoresFlee: false,
      // Usable from Hiding; chance to blind/stun
      perLevel: [
        [1, 120, 1, 0, 1000, 20],
        [2, 140, 1, 0, 1000, 24],
        [3, 160, 1, 0, 1000, 28],
        [4, 180, 1, 0, 1000, 32],
        [5, 200, 1, 0, 1000, 36]
      ]
    },

    /* ================================================================
     *  ALCHEMIST / CREATOR
     * ================================================================ */

    // AM_ACIDTERROR
    185: {
      name: 'Acid Terror',
      class: [18, 4019],
      type: 'misc',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 0,
      ignoresDef: true,
      ignoresFlee: true,
      // Ignores DEF, chance to break armor
      perLevel: [
        [1, 130, 1, 1000, 500, 15],
        [2, 190, 1, 1000, 500, 15],
        [3, 250, 1, 1000, 500, 15],
        [4, 310, 1, 1000, 500, 15],
        [5, 370, 1, 1000, 500, 15]
      ]
    },

    /* ================================================================
     *  BARD / CLOWN
     * ================================================================ */

    // BA_MUSICALSTRIKE
    394: {
      name: 'Melody Strike',
      class: [19, 4020],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Musical instrument attack skill
      perLevel: [
        [1, 100, 1, 1500, 300, 1],
        [2, 150, 1, 1500, 300, 3],
        [3, 200, 1, 1500, 300, 5],
        [4, 250, 1, 1500, 300, 7],
        [5, 300, 1, 1500, 300, 9]
      ]
    },

    /* ================================================================
     *  DANCER / GYPSY
     * ================================================================ */

    // DC_THROWARROW
    396: {
      name: 'Slinging Arrow',
      class: [20, 4021],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Whip attack skill
      perLevel: [
        [1, 100, 1, 1500, 300, 1],
        [2, 150, 1, 1500, 300, 3],
        [3, 200, 1, 1500, 300, 5],
        [4, 250, 1, 1500, 300, 7],
        [5, 300, 1, 1500, 300, 9]
      ]
    },

    /* ================================================================
     *  TRANS-CLASS EXCLUSIVE SKILLS
     * ================================================================ */

    // LK_SPIRALPIERCE (Renewal: 100+100*Lv % total, split 5 visual hits, +weapon weight)
    397: {
      name: 'Spiral Pierce',
      class: [4008],
      type: 'physical',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Total damage split 5 visual hits; + bonus from weapon weight
      perLevel: [
        [1, 200, 1, 150, 1200, 18],
        [2, 250, 1, 200, 1400, 21],
        [3, 300, 1, 250, 1600, 24],
        [4, 350, 1, 300, 1800, 27],
        [5, 400, 1, 350, 2000, 30]
      ]
    },

    // SN_FALCONASSAULT
    404: {
      name: 'Falcon Assault',
      class: [4012],
      type: 'misc',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 0,
      ignoresDef: true,
      ignoresFlee: true,
      // Damage based on Blitz Beat level, INT, DEX, and BaseLv
      perLevel: [
        [1, 150, 1, 3000, 3000, 30],
        [2, 250, 1, 3000, 3000, 35],
        [3, 350, 1, 3000, 3000, 40],
        [4, 450, 1, 3000, 3000, 45],
        [5, 550, 1, 3000, 3000, 50]
      ]
    },

    // ASC_BREAKER (Renewal: (ATK+MATK) × (300+50*Lv)% × BaseLv/100)
    379: {
      name: 'Soul Breaker',
      class: [4013],
      type: 'misc',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Hybrid ATK+MATK; weapon element for ATK, neutral for MATK
      perLevel: [
        [1,  350, 1, 250, 1000, 20],
        [2,  400, 1, 250, 1000, 20],
        [3,  450, 1, 250, 1000, 20],
        [4,  500, 1, 250, 1000, 20],
        [5,  550, 1, 250, 1000, 20],
        [6,  600, 1, 250, 1000, 20],
        [7,  650, 1, 250, 1000, 20],
        [8,  700, 1, 250, 1000, 20],
        [9,  750, 1, 250, 1000, 20],
        [10, 800, 1, 250, 1000, 20]
      ]
    },

    /* ================================================================
     *  ADDITIONAL USEFUL FARMING SKILLS
     * ================================================================ */

    // MG_FIREWALL (ID:18) - commonly used for farming
    18: {
      name: 'Fire Wall',
      class: [2, 9, 4010],
      type: 'magical',
      maxLv: 10,
      element: 'fire',
      target: 'ground',
      aoe: 3, // 3-cell wall
      ignoresDef: false,
      ignoresFlee: true,
      // Each hit does 50% MATK; targets can be hit multiple times walking through
      perLevel: [
        [1,  50, 1, 0, 1000,  40],
        [2,  50, 1, 0, 1000,  40],
        [3,  50, 1, 0, 1000,  40],
        [4,  50, 1, 0, 1000,  40],
        [5,  50, 1, 0, 1000,  40],
        [6,  50, 1, 0, 1000,  40],
        [7,  50, 1, 0, 1000,  40],
        [8,  50, 1, 0, 1000,  40],
        [9,  50, 1, 0, 1000,  40],
        [10, 50, 1, 0, 1000,  40]
      ]
    },

    // TF_POISON (Envenom, ID:52 is Backstab; Envenom is ID:34)
    34: {
      name: 'Envenom',
      class: [6, 12, 17, 4013, 4018],
      type: 'physical',
      maxLv: 10,
      element: 'poison',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Adds poison element damage + chance to poison
      perLevel: [
        [1,   50, 1, 0, 500, 12],
        [2,  100, 1, 0, 500, 12],
        [3,  150, 1, 0, 500, 12],
        [4,  200, 1, 0, 500, 12],
        [5,  250, 1, 0, 500, 12],
        [6,  300, 1, 0, 500, 12],
        [7,  350, 1, 0, 500, 12],
        [8,  400, 1, 0, 500, 12],
        [9,  450, 1, 0, 500, 12],
        [10, 500, 1, 0, 500, 12]
      ]
    },

    // AM_DEMONSTRATION (ID:229) - Creator AOE farming
    229: {
      name: 'Demonstration',
      class: [18, 4019],
      type: 'misc',
      maxLv: 5,
      element: 'fire',
      target: 'ground',
      aoe: 5, // 5x5
      ignoresDef: true,
      ignoresFlee: true,
      // Fire ground damage over time; chance to break weapon
      perLevel: [
        [1, 100, 1, 1000, 1000, 10],
        [2, 140, 1, 1000, 1000, 10],
        [3, 180, 1, 1000, 1000, 10],
        [4, 220, 1, 1000, 1000, 10],
        [5, 260, 1, 1000, 1000, 10]
      ]
    },

    // HT_LANDMINE (ID:116) - Hunter trap farming
    116: {
      name: 'Land Mine',
      class: [11, 4012],
      type: 'misc',
      maxLv: 5,
      element: 'earth',
      target: 'ground',
      aoe: 3, // 3x3 when triggered
      ignoresDef: true,
      ignoresFlee: true,
      // Trap; damage = DEX * (50+50*Lv)% ... simplified
      perLevel: [
        [1, 100, 1, 0, 1000, 10],
        [2, 150, 1, 0, 1000, 10],
        [3, 200, 1, 0, 1000, 10],
        [4, 250, 1, 0, 1000, 10],
        [5, 300, 1, 0, 1000, 10]
      ]
    },

    // HT_BLASTMINE (ID:117)
    117: {
      name: 'Blast Mine',
      class: [11, 4012],
      type: 'misc',
      maxLv: 5,
      element: 'wind',
      target: 'ground',
      aoe: 3, // 3x3
      ignoresDef: true,
      ignoresFlee: true,
      perLevel: [
        [1, 100, 1, 0, 1000, 10],
        [2, 150, 1, 0, 1000, 10],
        [3, 200, 1, 0, 1000, 10],
        [4, 250, 1, 0, 1000, 10],
        [5, 300, 1, 0, 1000, 10]
      ]
    },

    // HT_CLAYMORETRAP (ID:120)
    120: {
      name: 'Claymore Trap',
      class: [11, 4012],
      type: 'misc',
      maxLv: 5,
      element: 'fire',
      target: 'ground',
      aoe: 5, // 5x5
      ignoresDef: true,
      ignoresFlee: true,
      perLevel: [
        [1, 200, 1, 0, 1000, 15],
        [2, 300, 1, 0, 1000, 15],
        [3, 400, 1, 0, 1000, 15],
        [4, 500, 1, 0, 1000, 15],
        [5, 600, 1, 0, 1000, 15]
      ]
    },

    // SN_SHARPSHOOTING (Renewal: 600-1800%, AoE 5x5, high crit bonus)
    382: {
      name: 'Sharp Shooting',
      class: [4012],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 5, // 5x5 AoE splash
      ignoresDef: false,
      ignoresFlee: false,
      // +200 crit bonus; AoE splash around target
      perLevel: [
        [1,  600, 1, 500, 500, 18],
        [2,  900, 1, 500, 500, 21],
        [3, 1200, 1, 500, 500, 24],
        [4, 1500, 1, 500, 500, 27],
        [5, 1800, 1, 500, 500, 30]
      ]
    },

    // PA_SHIELDCHAIN (Renewal: 5 hits, total 500-1300%, +shield weight/refine)
    421: {
      name: 'Shield Chain',
      class: [4015],
      type: 'physical',
      maxLv: 5,
      element: 'neutral',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // 5 hits; + shield weight + (refine×4) added to ATK
      perLevel: [
        [1, 100, 5, 800, 1000, 28],
        [2, 140, 5, 800, 1000, 31],
        [3, 180, 5, 800, 1000, 34],
        [4, 220, 5, 800, 1000, 37],
        [5, 260, 5, 800, 1000, 40]
      ]
    },

    // PA_GOSPEL (ID:369) - skip, buff/support

    // CH_PALMSTRIKE (ID:268 is Finger Offensive; Palm Push Strike is 272)
    272: {
      name: 'Palm Push Strike',
      class: [4016],
      type: 'physical',
      maxLv: 5,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Knockback + damage
      perLevel: [
        [1, 200, 1, 300, 1000, 2],
        [2, 250, 1, 300, 1000, 4],
        [3, 300, 1, 300, 1000, 6],
        [4, 350, 1, 300, 1000, 8],
        [5, 400, 1, 300, 1000, 10]
      ]
    },

    // CH_CHAINCRUSH (ID:274) - Champion combo skill
    274: {
      name: 'Chain Crush Combo',
      class: [4016],
      type: 'physical',
      maxLv: 10,
      element: 'weapon',
      target: 'single',
      aoe: 0,
      ignoresDef: false,
      ignoresFlee: false,
      // Combo finisher; multi-hit
      perLevel: [
        [1,  200, 1, 0, 1000,  4],
        [2,  250, 2, 0, 1000,  6],
        [3,  300, 2, 0, 1000,  8],
        [4,  350, 3, 0, 1000, 10],
        [5,  400, 3, 0, 1000, 12],
        [6,  450, 4, 0, 1000, 14],
        [7,  500, 4, 0, 1000, 16],
        [8,  550, 5, 0, 1000, 18],
        [9,  600, 5, 0, 1000, 20],
        [10, 650, 6, 0, 1000, 22]
      ]
    }

  };

  /* ----------------------------------------------------------------
   *  Lookup helpers
   * ---------------------------------------------------------------- */

  /**
   * Return all skill entries whose class array includes the given job ID.
   * @param {number} jobId  rAthena job class ID
   * @returns {Object[]}    Array of {id, ...skillData}
   */
  SKILL_DB._byClass = function (jobId) {
    var out = [];
    for (var id in SKILL_DB) {
      if (!SKILL_DB.hasOwnProperty(id) || id.charAt(0) === '_') continue;
      var sk = SKILL_DB[id];
      if (sk.class && sk.class.indexOf(jobId) !== -1) {
        out.push(Object.assign({ id: Number(id) }, sk));
      }
    }
    return out;
  };

  /**
   * Return the per-level row for a given skill ID and level.
   * @param {number} skillId
   * @param {number} lv
   * @returns {number[]|null}  [lv, dmg%, hits, cast, delay, sp] or null
   */
  SKILL_DB._levelData = function (skillId, lv) {
    var sk = SKILL_DB[skillId];
    if (!sk || !sk.perLevel) return null;
    for (var i = 0; i < sk.perLevel.length; i++) {
      if (sk.perLevel[i][0] === lv) return sk.perLevel[i];
    }
    return null;
  };

  // Expose globally
  window.SKILL_DB = SKILL_DB;

})();
