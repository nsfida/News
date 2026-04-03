
(() => {
  const PCR = window.PCR = window.PCR || {};
  const STORE_KEY = "pcr-uae-state-v2";

  PCR.state = PCR.state || {};
  PCR.stateMeta = { dirty: false, savedAt: null };

  PCR.seedState = () => {
    const seed = JSON.parse(JSON.stringify(window.PCR_SEED || {}));
    seed.version = 2;
    seed.savedAt = new Date().toISOString();
    return seed;
  };

  PCR.loadState = () => {
    let state = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch (err) {
      console.warn("Could not load stored state:", err);
    }
    if (!state || typeof state !== "object") {
      state = PCR.seedState();
    }

    const seed = PCR.seedState();
    Object.keys(seed).forEach((key) => {
      if (key === "version" || key === "savedAt") return;
      if (!Array.isArray(state[key]) && typeof state[key] !== "object") state[key] = seed[key];
      if (state[key] == null) state[key] = seed[key];
    });
    state.version = 2;
    state.savedAt = state.savedAt || new Date().toISOString();
    PCR.state = state;
    return state;
  };

  PCR.saveState = () => {
    PCR.state.version = 2;
    PCR.state.savedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(PCR.state));
    PCR.stateMeta.dirty = false;
    PCR.stateMeta.savedAt = PCR.state.savedAt;
    return PCR.state;
  };

  PCR.setDirty = (value = true) => {
    PCR.stateMeta.dirty = !!value;
    const badge = document.querySelector("[data-save-badge]");
    if (badge) {
      badge.textContent = PCR.stateMeta.dirty ? "Unsaved changes" : "Saved locally";
      badge.classList.toggle("danger", PCR.stateMeta.dirty);
      badge.classList.toggle("success", !PCR.stateMeta.dirty);
    }
  };

  PCR.resetLocalData = () => {
    localStorage.removeItem(STORE_KEY);
    PCR.state = PCR.seedState();
    PCR.setDirty(false);
    PCR.saveState();
  };

  PCR.getModuleData = (module) => {
    if (module === "settings") return PCR.state.settings || PCR.clone(window.PCR_SEED.settings || {});
    return Array.isArray(PCR.state[module]) ? PCR.state[module] : [];
  };

  PCR.setModuleData = (module, data) => {
    if (module === "settings") PCR.state.settings = data || {};
    else PCR.state[module] = Array.isArray(data) ? data : [];
    PCR.setDirty(true);
    PCR.saveState();
  };

  PCR.upsertRecord = (module, record) => {
    if (module === "settings") {
      PCR.state.settings = { ...(PCR.state.settings || {}), ...(record || {}) };
      PCR.setDirty(true);
      PCR.saveState();
      return PCR.state.settings;
    }
    const list = PCR.getModuleData(module);
    const idx = list.findIndex((item) => String(item.id) === String(record.id));
    if (idx >= 0) list[idx] = { ...list[idx], ...record };
    else list.unshift(record);
    PCR.state[module] = list;
    PCR.setDirty(true);
    PCR.saveState();
    return record;
  };

  PCR.deleteRecord = (module, id) => {
    if (module === "settings") return;
    PCR.state[module] = PCR.getModuleData(module).filter((x) => String(x.id) !== String(id));
    PCR.setDirty(true);
    PCR.saveState();
  };

  PCR.loadState();
})();
