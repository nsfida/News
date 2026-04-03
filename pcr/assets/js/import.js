
(() => {
  const PCR = window.PCR = window.PCR || {};

  PCR.parseImportedJSON = async (file) => {
    const text = await file.text();
    return JSON.parse(text);
  };

  PCR.validateImportedModule = (module, payload) => {
    if (module === "settings") {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Settings file must be a JSON object.");
      }
      return payload;
    }

    let data = payload;
    if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.data)) {
      data = data.data;
    }

    if (!Array.isArray(data)) {
      throw new Error(`${module}.json must contain an array of records.`);
    }

    return data.map((record) => ({ ...record }));
  };

  PCR.importModuleFile = async (module, inputEl) => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    try {
      const payload = await PCR.parseImportedJSON(file);
      const data = PCR.validateImportedModule(module, payload);
      if (module === "settings") {
        PCR.setModuleData("settings", data);
      } else {
        PCR.setModuleData(module, data);
      }
      PCR.refresh?.();
      PCR.toast?.(`Imported ${file.name} into ${module}.`);
      inputEl.value = "";
    } catch (err) {
      console.error(err);
      alert(`Import failed: ${err.message}`);
      inputEl.value = "";
    }
  };

  PCR.importBundleFile = async (inputEl) => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    try {
      const payload = await PCR.parseImportedJSON(file);
      if (!payload || typeof payload !== "object" || !payload.data) {
        throw new Error("Bundle must contain a data object.");
      }
      Object.entries(payload.data).forEach(([module, value]) => {
        if (module in window.PCR_CONFIG.modules) {
          const clean = PCR.validateImportedModule(module, value);
          PCR.setModuleData(module, clean);
        }
      });
      PCR.refresh?.();
      PCR.toast?.("Imported full backup successfully.");
      inputEl.value = "";
    } catch (err) {
      console.error(err);
      alert(`Import failed: ${err.message}`);
      inputEl.value = "";
    }
  };
})();
