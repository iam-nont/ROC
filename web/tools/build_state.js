// ============================================================
//  ROC_BUILD — Shared Build State + Event Bus
//  Central state for communication between:
//    Status Simulator → Equipment Planner → Skill Simulator → Zeny Calc
//  Loaded before other tools via <script src="tools/build_state.js">
// ============================================================

(function () {
  'use strict';

  window.ROC_BUILD = {
    // ── State ──
    state: {
      // From Status Simulator
      jobClass: 0,
      baseLv: 1,
      jobLv: 1,
      stats: { str: 1, agi: 1, vit: 1, int_: 1, dex: 1, luk: 1 },
      computed: { atk: 0, matk_min: 0, matk_max: 0, hit: 0, flee: 0, aspd: 0, hp: 0, sp: 0 },
      jobName: 'Novice',
      jobGroup: 'normal',

      // From Equipment Planner
      equip: {
        weapon:  null,  // { item, refine, cards[] }
        shield:  null,
        armor:   null,
        garment: null,
        shoes:   null,
        headTop: null,
        headMid: null,
        headLow: null,
        acc1:    null,
        acc2:    null,
      },
      equipBonus: {
        totalATK: 0,
        totalDEF: 0,
        refineATK: 0,
        weaponElement: 'Neutral',
        bonusRace: {},
        bonusEle: {},
        bonusSize: {},
      },

      // From Skill Simulator
      activeSkill: null,
      // { id, name, level, damagePercent, hitCount, element, castTime, afterDelay, spCost, aoe, type }
    },

    // ── Event Bus ──
    _listeners: {},

    set: function (key, value) {
      this.state[key] = value;
      this.emit(key);
    },

    get: function (key) {
      return key ? this.state[key] : this.state;
    },

    on: function (event, fn) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
    },

    off: function (event, fn) {
      if (!this._listeners[event]) return;
      this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
    },

    emit: function (event) {
      var self = this;
      var fns = this._listeners[event] || [];
      fns.forEach(function (fn) { fn(self.state); });
      // Also emit wildcard
      var wildcardFns = this._listeners['*'] || [];
      wildcardFns.forEach(function (fn) { fn(event, self.state); });
      // Auto-save (debounced)
      this._queueSave();
    },

    // ── Save / Load ──
    _saveTimer: null,
    _queueSave: function () {
      var self = this;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(function () { self.saveToStorage(); }, 800);
    },

    saveToStorage: function () {
      try {
        var data = {};
        // Collect stat simulator state
        if (this._statSim) data.statSim = this._statSim.getState();
        // Collect build simulator state
        if (this._buildSim) data.buildSim = this._buildSim.getState();
        data._ts = Date.now();
        localStorage.setItem('roc_build', JSON.stringify(data));
      } catch (e) { /* quota exceeded or private mode */ }
    },

    loadFromStorage: function () {
      try {
        var raw = localStorage.getItem('roc_build');
        if (!raw) return false;
        var data = JSON.parse(raw);
        if (data.statSim && this._statSim) this._statSim.setState(data.statSim);
        if (data.buildSim && this._buildSim) this._buildSim.setState(data.buildSim);
        return true;
      } catch (e) { return false; }
    },

    exportBuild: function () {
      var data = {};
      if (this._statSim) data.statSim = this._statSim.getState();
      if (this._buildSim) data.buildSim = this._buildSim.getState();
      data._exported = new Date().toISOString();
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var name = (this.state.jobName || 'build').replace(/\s+/g, '_');
      a.download = 'ROC_Build_' + name + '.json';
      a.click();
      URL.revokeObjectURL(url);
    },

    importBuild: function (jsonStr) {
      try {
        var data = JSON.parse(jsonStr);
        if (data.statSim && this._statSim) this._statSim.setState(data.statSim);
        if (data.buildSim && this._buildSim) this._buildSim.setState(data.buildSim);
        this.saveToStorage();
        return true;
      } catch (e) { return false; }
    },

    clearBuild: function () {
      localStorage.removeItem('roc_build');
    },

    // Registry for sub-modules
    _statSim: null,
    _buildSim: null,
  };
})();
