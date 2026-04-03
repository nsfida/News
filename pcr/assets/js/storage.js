(() => {
  const W = window;
  const STORAGE_KEY = "pcr_uae_static_store_v1";
  const VERSION = "1.0";
  const SECTION_FILES = {
    vehicles: "data/vehicles.json",
    customers: "data/customers.json",
    contracts: "data/contracts.json",
    renewals: "data/renewals.json",
    accounts: "data/accounts.json",
    ledger: "data/ledger.json",
    maintenance: "data/maintenance.json",
    fines: "data/fines.json",
    charges: "data/charges.json",
    settings: "data/settings.json",
  };

  const SECTION_DEFAULTS = W.PCR_DEFAULT_DATA || {};

  async function loadSectionFromFile(section) {
    const file = SECTION_FILES[section];
    try {
      const res = await fetch(file, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load ${file}`);
      const json = await res.json();
      if (section === "settings") return json.settings || json;
      return Array.isArray(json.items) ? json.items : [];
    } catch {
      return W.PCR.clone(SECTION_DEFAULTS[section] || (section === "settings" ? {} : []));
    }
  }

  async function loadInitialStore() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return normalizeStore(parsed);
      } catch {}
    }
    const store = {};
    for (const section of Object.keys(SECTION_FILES)) {
      store[section] = await loadSectionFromFile(section);
    }
    store.meta = { version: VERSION, updatedAt: new Date().toISOString() };
    persistStore(store);
    return normalizeStore(store);
  }

  function normalizeStore(store) {
    const normalized = {
      vehicles: Array.isArray(store.vehicles) ? store.vehicles : [],
      customers: Array.isArray(store.customers) ? store.customers : [],
      contracts: Array.isArray(store.contracts) ? store.contracts : [],
      renewals: Array.isArray(store.renewals) ? store.renewals : [],
      accounts: Array.isArray(store.accounts) ? store.accounts : [],
      ledger: Array.isArray(store.ledger) ? store.ledger : [],
      maintenance: Array.isArray(store.maintenance) ? store.maintenance : [],
      fines: Array.isArray(store.fines) ? store.fines : [],
      charges: Array.isArray(store.charges) ? store.charges : [],
      settings: store.settings && typeof store.settings === "object" ? store.settings : W.PCR.clone(SECTION_DEFAULTS.settings || {}),
      meta: store.meta || { version: VERSION, updatedAt: new Date().toISOString() },
    };
    return normalized;
  }

  function persistStore(store) {
    const normalized = normalizeStore(store);
    normalized.meta = { version: VERSION, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function getStore() {
    return W.PCR.clone(W.PCR_STORE);
  }

  function setStore(store) {
    W.PCR_STORE = persistStore(store);
    return W.PCR_STORE;
  }

  function getSection(section) {
    return W.PCR.clone(W.PCR_STORE[section] || (section === "settings" ? {} : []));
  }

  function setSection(section, value) {
    W.PCR_STORE[section] = W.PCR.clone(value);
    persistStore(W.PCR_STORE);
    return getSection(section);
  }

  function upsertRecord(section, record) {
    const list = getSection(section);
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    setSection(section, list);
    return record;
  }

  function removeRecord(section, recordId) {
    const list = getSection(section).filter((item) => item.id !== recordId);
    setSection(section, list);
    return list;
  }

  function resetStore() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function boot() {
    W.PCR_STORE = await loadInitialStore();
    return W.PCR_STORE;
  }

  W.PCR_STORAGE = {
    boot,
    getStore,
    setStore,
    getSection,
    setSection,
    upsertRecord,
    removeRecord,
    resetStore,
    STORAGE_KEY,
    SECTION_FILES,
    normalizeStore,
  };
})();
