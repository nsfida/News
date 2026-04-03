(() => {
  const W = window;

  function normalizeItems(section, payload) {
    if (section === "settings") {
      if (!payload || typeof payload !== "object") throw new Error("Invalid settings JSON.");
      const settings = payload.settings || payload;
      if (typeof settings !== "object" || Array.isArray(settings)) throw new Error("Settings file must contain a settings object.");
      return settings;
    }
    const items = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : null;
    if (!items) throw new Error("Section file must contain an items array.");
    return items;
  }

  function ensureIds(section, items) {
    const cfg = W.PCR.getModuleConfig(section);
    const seen = new Set();
    return items.map((item, index) => {
      const out = { ...item };
      if (!out.id) out.id = W.PCR.uid(section.slice(0, 3));
      if (seen.has(out.id)) out.id = `${out.id}_${index + 1}`;
      seen.add(out.id);
      if (cfg && cfg.fields) {
        cfg.fields.forEach((field) => {
          if (field.type === "number" && out[field.name] !== undefined && out[field.name] !== null && out[field.name] !== "") out[field.name] = Number(out[field.name]);
          if (field.type === "checkbox") out[field.name] = Boolean(out[field.name]);
        });
      }
      return out;
    });
  }

  async function importSection(section, file) {
    const text = await W.PCR.readFileText(file);
    const payload = JSON.parse(text);
    const normalized = normalizeItems(section, payload);
    if (section === "settings") {
      const merged = { ...W.PCR_STORE.settings, ...normalized };
      W.PCR_STORE.settings = merged;
      W.PCR_STORAGE.setStore(W.PCR_CALC.refreshDerivedData(W.PCR_STORE));
      return;
    }
    const items = ensureIds(section, normalized);
    W.PCR_STORE[section] = items;
    W.PCR_STORAGE.setStore(W.PCR_CALC.refreshDerivedData(W.PCR_STORE));
  }

  async function importBackup(file) {
    const text = await W.PCR.readFileText(file);
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || !payload.store) {
      throw new Error("Invalid backup file.");
    }
    const store = W.PCR_STORAGE.normalizeStore(payload.store);
    W.PCR_STORAGE.setStore(W.PCR_CALC.refreshDerivedData(store));
  }

  W.PCR_IMPORT = {
    importSection,
    importBackup,
  };
})();
