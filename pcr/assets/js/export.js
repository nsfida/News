(() => {
  const W = window;

  function sectionPayload(section, store) {
    if (section === "settings") {
      return { version: "1.0", settings: W.PCR.clone(store.settings || {}) };
    }
    return {
      version: "1.0",
      updatedAt: new Date().toISOString(),
      items: W.PCR.clone(store[section] || []),
    };
  }

  function exportSection(section) {
    const store = W.PCR_STORE;
    const cfg = W.PCR.getModuleConfig(section);
    if (!cfg.exportFile) {
      W.PCR.toast("This page does not export a section file.", "warning");
      return;
    }
    const payload = sectionPayload(section, store);
    W.PCR.downloadText(cfg.exportFile, JSON.stringify(payload, null, 2));
    W.PCR.toast(`${cfg.title} JSON downloaded.`, "success");
  }

  function exportAll() {
    const store = W.PCR_STORE;
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      store: W.PCR.clone(store),
    };
    W.PCR.downloadText("premium-car-rental-uae-backup.json", JSON.stringify(payload, null, 2));
    W.PCR.toast("Full backup downloaded.", "success");
  }

  function exportTextFile(filename, content, type = "text/plain") {
    W.PCR.downloadText(filename, content, type);
  }

  W.PCR_EXPORT = {
    exportSection,
    exportAll,
    exportTextFile,
    sectionPayload,
  };
})();
