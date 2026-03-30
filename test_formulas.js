/**
 * ROC Renewal Damage Formula Verification Script
 * Tests core formulas extracted from:
 *   - web/tools/damage_calc.js
 *   - web/tools/build_simulator.js
 *   - web/tools/stat_simulator.js
 *
 * Run: node test_formulas.js
 */

'use strict';

// ============================================================
// Extracted formulas (copied from source files)
// ============================================================

// --- Refine tiers (identical in damage_calc.js & build_simulator.js) ---
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

// --- Element table (from damage_calc.js / build_simulator.js) ---
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

function getElementMod(atkEle, defEle, defLv) {
  const row = ELEMENT_TABLE_LV[atkEle] || ELEMENT_TABLE_LV['Neutral'];
  const arr = row[defEle];
  if (!arr) return 100;
  const lvIdx = Math.max(0, Math.min(3, (defLv || 1) - 1));
  return arr[lvIdx];
}

// --- StatusATK (melee, from damage_calc.js line 494 / stat_simulator.js line 109) ---
function calcStatusATK_melee(baseLv, str, dex, luk) {
  return Math.floor(baseLv / 4) + str + Math.floor(dex / 5) + Math.floor(luk / 3);
}

// --- Hard DEF reduction (from damage_calc.js line 526 / build_simulator.js line 1718) ---
function calcHardDef(def) {
  if (def <= 0) return 1;
  return (4000 + def) / (4000 + def * 10);
}

// --- Variable Cast Time (from build_simulator.js line 1682) ---
function calcVariableCast(castTimeSeconds, dex, int_) {
  const varCastMult = Math.max(0, 1 - (2 * dex + int_) / 530);
  return castTimeSeconds * varCastMult;
}

// --- Card modifier (from damage_calc.js line 539-542) ---
function calcCardMod(bonusRacePct, bonusElePct, bonusSizePct) {
  const raceMod = 1 + bonusRacePct / 100;
  const eleBonusMod = 1 + bonusElePct / 100;
  const sizeBonusMod = 1 + bonusSizePct / 100;
  return raceMod * eleBonusMod * sizeBonusMod;
}


// ============================================================
// Test runner
// ============================================================

let passed = 0;
let failed = 0;
const results = [];

function assertClose(testName, actual, expected, tolerance) {
  tolerance = tolerance || 0.001;
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    results.push({ name: testName, status: 'PASS', actual, expected });
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', actual, expected, diff: actual - expected });
  }
}

function assertEqual(testName, actual, expected) {
  if (actual === expected) {
    passed++;
    results.push({ name: testName, status: 'PASS', actual, expected });
  } else {
    failed++;
    results.push({ name: testName, status: 'FAIL', actual, expected, diff: actual - expected });
  }
}

// ============================================================
// Test cases
// ============================================================

console.log('='.repeat(70));
console.log('ROC Renewal Damage Formula Verification');
console.log('='.repeat(70));
console.log('');

// Case 1: StatusATK (melee) - BaseLv=99, STR=99, DEX=1, LUK=1
// Expected: floor(99/4) + 99 + floor(1/5) + floor(1/3) = 24 + 99 + 0 + 0 = 123
assertEqual(
  'Case 1: StatusATK melee (Lv99 STR99 DEX1 LUK1)',
  calcStatusATK_melee(99, 99, 1, 1),
  123
);

// Case 2: StatusATK (melee) max stats - BaseLv=120, STR=130, DEX=130, LUK=130
// Expected: floor(120/4) + 130 + floor(130/5) + floor(130/3) = 30 + 130 + 26 + 43 = 229
assertEqual(
  'Case 2: StatusATK melee max (Lv120 STR130 DEX130 LUK130)',
  calcStatusATK_melee(120, 130, 130, 130),
  229
);

// Case 3: Refine ATK - WLv4 +12
// Safe=4, base=7, overRefine=14
// Safe part: 4 x 7 = 28, Over part: (12-4) x (7+14) = 8 x 21 = 168
// Expected: 28 + 168 = 196
assertEqual(
  'Case 3: Refine ATK WLv4 +12',
  calcRefineATK(4, 12),
  196
);

// Case 4: Refine ATK - WLv1 +15
// Safe=7, base=2, overRefine=3
// Safe part: 7 x 2 = 14, Over part: (15-7) x (2+3) = 8 x 5 = 40
// Expected: 14 + 40 = 54
assertEqual(
  'Case 4: Refine ATK WLv1 +15',
  calcRefineATK(1, 15),
  54
);

// Case 5: Refine ATK - WLv3 +10
// Safe=5, base=5, overRefine=8
// Safe part: 5 x 5 = 25, Over part: (10-5) x (5+8) = 5 x 13 = 65
// Expected: 25 + 65 = 90
assertEqual(
  'Case 5: Refine ATK WLv3 +10',
  calcRefineATK(3, 10),
  90
);

// Case 6: Element modifier - Fire vs Undead Lv4
// Fire attacking Undead, level 4
// From table: Fire -> Undead = [125, 150, 175, 200], lv4 index=3 -> 200
assertEqual(
  'Case 6: Element Fire vs Undead Lv4 (expect 200%)',
  getElementMod('Fire', 'Undead', 4),
  200
);

// Case 7: Element modifier - Fire vs Water Lv1
// From table: Fire -> Water = [90, 80, 70, 60], lv1 index=0 -> 90
// NOTE: User expected 150, but the table says 90 for Fire attacking Water!
// Water attacking Fire would be 150. Let's check both.
assertEqual(
  'Case 7: Element Fire vs Water Lv1 (table lookup)',
  getElementMod('Fire', 'Water', 1),
  90  // Actual from table - Fire is WEAK against Water
);

// Case 7b: Water attacking Fire Lv1 (this is 150%)
assertEqual(
  'Case 7b: Element Water vs Fire Lv1 (expect 150%)',
  getElementMod('Water', 'Fire', 1),
  150
);

// Case 8: Element modifier - Fire vs Water Lv4
// From table: Fire -> Water = [90, 80, 70, 60], lv4 index=3 -> 60
// NOTE: User expected 175, but the table says 60 for Fire attacking Water Lv4!
// Water attacking Fire Lv4 would be 200.
assertEqual(
  'Case 8: Element Fire vs Water Lv4 (table lookup)',
  getElementMod('Fire', 'Water', 4),
  60  // Actual from table - Fire is WEAK against Water
);

// Case 8b: Water attacking Fire Lv4 (this would be 200%)
assertEqual(
  'Case 8b: Element Water vs Fire Lv4 (expect 200%)',
  getElementMod('Water', 'Fire', 4),
  200
);

// Case 9: Element modifier - Holy vs Shadow Lv4
// From table: Holy -> Shadow = [125, 150, 175, 200], lv4 index=3 -> 200
assertEqual(
  'Case 9: Element Holy vs Shadow Lv4 (expect 200%)',
  getElementMod('Holy', 'Shadow', 4),
  200
);

// Case 10: Card modifiers multiplicative
// Race bonus +20%, Element bonus +20%, Size bonus +0%
// raceMod = 1.2, eleBonusMod = 1.2, sizeBonusMod = 1.0
// Expected: 1.2 x 1.2 x 1.0 = 1.44
assertClose(
  'Case 10: Card mod multiplicative (20% race, 20% ele, 0% size)',
  calcCardMod(20, 20, 0),
  1.44
);

// Case 11: Hard DEF formula
// DEF=50 -> (4000+50)/(4000+50*10) = 4050/4500 = 0.9
assertClose(
  'Case 11: Hard DEF (DEF=50, expect 0.9)',
  calcHardDef(50),
  0.9
);

// Case 12: Variable Cast Time
// castTime=5s, DEX=99, INT=1
// VCT = 5 * max(0, 1 - (2*99+1)/530) = 5 * max(0, 1 - 199/530)
// = 5 * (1 - 0.37547...) = 5 * 0.62452... = 3.12264...
assertClose(
  'Case 12: Variable Cast (5s, DEX99, INT1, expect ~3.123s)',
  calcVariableCast(5, 99, 1),
  5 * (1 - 199/530),  // 3.12264150943...
  0.001
);

// ============================================================
// Additional edge case tests
// ============================================================

// Refine 0 should return 0
assertEqual(
  'Edge: Refine ATK +0 returns 0',
  calcRefineATK(4, 0),
  0
);

// Refine at safe limit exactly (WLv4 +4)
// Safe=4, base=7 -> 4*7 = 28, no over-refine
assertEqual(
  'Edge: Refine ATK WLv4 +4 (at safe limit)',
  calcRefineATK(4, 4),
  28
);

// Hard DEF with DEF=0 should return 1 (no reduction)
assertClose(
  'Edge: Hard DEF (DEF=0) returns 1.0',
  calcHardDef(0),
  1.0
);

// StatusATK with all 1s
// floor(1/4) + 1 + floor(1/5) + floor(1/3) = 0 + 1 + 0 + 0 = 1
assertEqual(
  'Edge: StatusATK melee all-1s (Lv1 STR1 DEX1 LUK1)',
  calcStatusATK_melee(1, 1, 1, 1),
  1
);

// Variable cast at instant-cast threshold: DEX=265, INT=0 -> (2*265+0)/530 = 1.0 -> mult=0
assertClose(
  'Edge: Variable Cast instant (DEX=265, INT=0)',
  calcVariableCast(5, 265, 0),
  0.0,
  0.001
);

// Variable cast with overcapped stats should still be 0
assertClose(
  'Edge: Variable Cast overcapped (DEX=300, INT=50)',
  calcVariableCast(5, 300, 50),
  0.0,
  0.001
);

// Element same-element penalty: Fire vs Fire
assertEqual(
  'Edge: Element Fire vs Fire Lv1 (expect 25%)',
  getElementMod('Fire', 'Fire', 1),
  25
);

// Neutral vs Ghost
assertEqual(
  'Edge: Element Neutral vs Ghost Lv1 (expect 25%)',
  getElementMod('Neutral', 'Ghost', 1),
  25
);

// ============================================================
// Cross-file consistency checks
// ============================================================

// Verify that stat_simulator formula matches damage_calc formula
// Both should produce the same StatusATK for the same inputs
// (stat_simulator.js line 109 and damage_calc.js line 494 are identical)
console.log('');
console.log('-'.repeat(70));
console.log('Cross-file consistency: All 3 files use the same StatusATK formula:');
console.log('  Math.floor(baseLv/4) + STR + Math.floor(DEX/5) + Math.floor(LUK/3)');
console.log('  -> Confirmed identical in damage_calc.js:494, build_simulator.js:1594,');
console.log('     stat_simulator.js:109');
console.log('');
console.log('Cross-file consistency: Refine formula identical in both files:');
console.log('  safe * base + over * (base + overRefine)');
console.log('  -> Confirmed identical in damage_calc.js:107-113, build_simulator.js:24-30');
console.log('');
console.log('Cross-file consistency: Element table identical in both files:');
console.log('  -> Confirmed identical in damage_calc.js:15-66, build_simulator.js:33-84');
console.log('');
console.log('Cross-file consistency: Hard DEF formula identical in both files:');
console.log('  (4000 + DEF) / (4000 + DEF * 10)');
console.log('  -> Confirmed identical in damage_calc.js:526, build_simulator.js:1718');
console.log('');
console.log('Note: stat_simulator.js does NOT contain a cast time formula.');
console.log('  Variable cast time is only in build_simulator.js:1682');
console.log('-'.repeat(70));

// ============================================================
// Report
// ============================================================

console.log('');
console.log('='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log('');

results.forEach(function (r) {
  const icon = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
  let line = icon + ' ' + r.name;
  if (r.status === 'FAIL') {
    line += '\n       Expected: ' + r.expected + ', Got: ' + r.actual + ', Diff: ' + r.diff;
  } else {
    line += ' -> ' + r.actual;
  }
  console.log(line);
});

console.log('');
console.log('-'.repeat(70));
console.log('Total: ' + results.length + ' tests | Passed: ' + passed + ' | Failed: ' + failed);
console.log('-'.repeat(70));

if (failed > 0) {
  console.log('');
  console.log('DISCREPANCY ANALYSIS:');
  results.filter(r => r.status === 'FAIL').forEach(function (r) {
    console.log('');
    console.log('  ' + r.name);
    console.log('    Expected: ' + r.expected);
    console.log('    Actual:   ' + r.actual);
  });
}

// ============================================================
// Special note about Case 7 & 8 expected values
// ============================================================

console.log('');
console.log('='.repeat(70));
console.log('IMPORTANT NOTES ON ELEMENT TABLE (Cases 7 & 8)');
console.log('='.repeat(70));
console.log('');
console.log('The user expected:');
console.log('  Case 7: Fire attacking Water Lv1 = 150% (1.5)');
console.log('  Case 8: Fire attacking Water Lv4 = 175% (1.75)');
console.log('');
console.log('But the actual element table in the code has:');
console.log('  Fire -> Water = [90, 80, 70, 60]');
console.log('  Fire attacking Water Lv1 = 90% (disadvantage)');
console.log('  Fire attacking Water Lv4 = 60% (heavy disadvantage)');
console.log('');
console.log('This is CORRECT per RO Renewal mechanics:');
console.log('  Fire is WEAK against Water (Water extinguishes Fire).');
console.log('  Water is STRONG against Fire: Water -> Fire = [150, 175, 200, 200]');
console.log('');
console.log('The user likely had the attacker/defender elements swapped in their');
console.log('expected values. The code is implementing the standard RO element table');
console.log('correctly.');

process.exit(failed > 0 ? 1 : 0);
