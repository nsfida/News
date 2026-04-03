(() => {
  const W = window;

  function makeDefaultRecord(section, store) {
    const cfg = W.PCR.getModuleConfig(section);
    const record = { id: W.PCR.uid(section.slice(0, 3)) };
    (cfg.fields || []).forEach((field) => {
      if (field.name === "id") return;
      if (field.type === "checkbox") record[field.name] = false;
      else if (field.type === "number") record[field.name] = 0;
      else if (field.type === "select" && Array.isArray(field.options) && field.options.length) record[field.name] = String(field.options[0]);
      else record[field.name] = "";
    });

    if (section === "vehicles") {
      const serial = (store.vehicles || []).length + 1;
      record.vehicleId = `V-${String(serial).padStart(4, "0")}`;
      record.status = "Available";
      record.availability = "Available";
    } else if (section === "customers") {
      const serial = (store.customers || []).length + 1;
      record.customerId = `C-${String(serial).padStart(4, "0")}`;
      record.activeContractStatus = "Inactive";
      record.outstandingBalance = 0;
    } else if (section === "contracts") {
      const serial = (store.contracts || []).length + 1;
      record.contractNumber = `CTR-${new Date().getFullYear()}-${String(serial).padStart(4, "0")}`;
      record.contractStatus = "Draft";
      record.rateType = "monthly";
      record.rentalDuration = 30;
      record.totalAmount = 0;
      record.paidAmount = 0;
      record.dueAmount = 0;
    } else if (section === "renewals") {
      const serial = (store.renewals || []).length + 1;
      record.renewalNumber = `REN-${new Date().getFullYear()}-${String(serial).padStart(4, "0")}`;
      record.status = "Open";
      record.amount = 0;
      record.paidAmount = 0;
      record.dueAmount = 0;
    } else if (section === "accounts") {
      const serial = (store.accounts || []).length + 1;
      record.accountNumber = `ACC-${String(serial).padStart(4, "0")}`;
      record.currentBalance = 0;
      record.openingBalance = 0;
      record.status = "Open";
    } else if (section === "ledger") {
      const serial = (store.ledger || []).length + 1;
      record.ledgerNumber = `LED-${new Date().getFullYear()}-${String(serial).padStart(4, "0")}`;
      record.entryType = "invoice";
      record.amount = 0;
      record.balanceAfter = 0;
    } else if (section === "maintenance") {
      const serial = (store.maintenance || []).length + 1;
      record.maintenanceId = `MNT-${String(serial).padStart(4, "0")}`;
      record.status = "Open";
    } else if (section === "fines") {
      const serial = (store.fines || []).length + 1;
      record.fineNumber = `FIN-${String(serial).padStart(4, "0")}`;
      record.status = "Open";
      record.amount = 0;
    } else if (section === "charges") {
      const serial = (store.charges || []).length + 1;
      record.chargeNumber = `CHG-${String(serial).padStart(4, "0")}`;
      record.status = "Pending";
      record.amount = 0;
    } else if (section === "settings") {
      Object.assign(record, store.settings || {});
    }
    return record;
  }

  function optionHtml(value, label, selected) {
    const selectedAttr = String(value) === String(selected) ? "selected" : "";
    return `<option value="${W.PCR.escapeHTML(value)}" ${selectedAttr}>${W.PCR.escapeHTML(label)}</option>`;
  }

  function renderOptions(field, value) {
    if (field.relation) {
      const opts = W.PCR.moduleOptions(field.relation);
      return [`<option value="">Select ${W.PCR.escapeHTML(field.label)}</option>`]
        .concat(opts.map(([v, l]) => optionHtml(v, l, value)))
        .join("");
    }
    if (Array.isArray(field.options)) {
      return [`<option value="">Select ${W.PCR.escapeHTML(field.label)}</option>`]
        .concat(field.options.map((opt) => {
          if (typeof opt === "object") return optionHtml(opt.value, opt.label, value);
          return optionHtml(opt, opt, value);
        }))
        .join("");
    }
    return "";
  }

  function renderField(section, field, record, store) {
    const value = record[field.name];
    const id = `${section}_${field.name}`;
    const required = field.required ? "required" : "";
    const readonly = field.readonly ? "readonly disabled" : "";
    const help = field.help ? `<div class="field-help">${W.PCR.escapeHTML(field.help)}</div>` : "";
    const label = `<label for="${id}">${W.PCR.escapeHTML(field.label)}${field.required ? " *" : ""}</label>`;

    if (field.type === "textarea") {
      return `<div class="field">${label}<textarea id="${id}" name="${field.name}" rows="${field.rows || 3}" ${required} ${readonly}>${W.PCR.escapeHTML(value || "")}</textarea>${help}</div>`;
    }

    if (field.type === "select") {
      return `<div class="field">${label}<select id="${id}" name="${field.name}" ${required} ${readonly}>${renderOptions(field, value)}</select>${help}</div>`;
    }

    if (field.type === "checkbox") {
      return `<div class="field field-inline"><label class="checkbox"><input id="${id}" name="${field.name}" type="checkbox" ${value ? "checked" : ""} ${readonly}/> <span>${W.PCR.escapeHTML(field.label)}</span></label>${help}</div>`;
    }

    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
    const step = field.type === "number" ? 'step="0.01"' : "";
    const val = value === null || value === undefined ? "" : value;
    return `<div class="field">${label}<input id="${id}" name="${field.name}" type="${inputType}" value="${W.PCR.escapeHTML(val)}" ${step} ${required} ${readonly} placeholder="${W.PCR.escapeHTML(field.placeholder || "")}"/>${help}</div>`;
  }

  function renderContractPreview(record, store) {
    const c = record;
    const calc = W.PCR_CALC.calcRateAmount(c);
    const customer = W.PCR_CALC.resolveRelation("customers", c.customerId);
    const vehicle = W.PCR_CALC.resolveRelation("vehicles", c.vehicleId);
    return `
      <div class="preview-card">
        <div class="preview-grid">
          <div><span>Contract</span><strong>${W.PCR.escapeHTML(c.contractNumber || "—")}</strong></div>
          <div><span>Customer</span><strong>${W.PCR.escapeHTML(customer)}</strong></div>
          <div><span>Vehicle</span><strong>${W.PCR.escapeHTML(vehicle)}</strong></div>
          <div><span>Rate Type</span><strong>${W.PCR.escapeHTML(c.rateType || "—")}</strong></div>
          <div><span>Rental Days</span><strong>${calc.rentalDays}</strong></div>
          <div><span>Total Amount</span><strong>${W.PCR.formatCurrency(calc.totalAmount, store.settings || {})}</strong></div>
          <div><span>Paid</span><strong>${W.PCR.formatCurrency(calc.paidAmount, store.settings || {})}</strong></div>
          <div><span>Due</span><strong>${W.PCR.formatCurrency(calc.dueAmount, store.settings || {})}</strong></div>
        </div>
      </div>
    `;
  }

  function buildForm(section, record, store) {
    const cfg = W.PCR.getModuleConfig(section);
    const fields = (cfg.fields || []).map((field) => renderField(section, field, record, store)).join("");
    const extra = section === "contracts" ? `<div class="form-preview" data-contract-preview>${renderContractPreview(record, store)}</div>` : "";
    return `
      <form class="record-form" data-section="${section}">
        <div class="form-grid">${fields}</div>
        ${extra}
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>
    `;
  }

  function collectFormData(section, form) {
    const cfg = W.PCR.getModuleConfig(section);
    const record = {};
    (cfg.fields || []).forEach((field) => {
      const el = form.elements[field.name];
      if (!el) return;
      if (field.type === "checkbox") {
        record[field.name] = el.checked;
      } else if (field.type === "number") {
        record[field.name] = el.value === "" ? 0 : Number(el.value);
      } else {
        record[field.name] = el.value.trim();
      }
    });
    return record;
  }

  function validateRecord(section, record) {
    const cfg = W.PCR.getModuleConfig(section);
    const errors = [];
    (cfg.fields || []).forEach((field) => {
      if (!field.required) return;
      const value = record[field.name];
      const empty = value === null || value === undefined || value === "";
      if (empty) errors.push(`${field.label} is required.`);
    });
    if (section === "contracts") {
      if (record.rentalStartDate && record.rentalEndDate && record.rentalStartDate > record.rentalEndDate) {
        errors.push("Rental end date must be on or after the start date.");
      }
    }
    return errors;
  }

  function renderSettingsForm(record) {
    const fields = W.PCR.getModuleConfig("settings").fields.map((field) => renderField("settings", field, record, window.PCR_STORE)).join("");
    return `
      <form class="record-form" data-section="settings">
        <div class="form-grid">${fields}</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-action="reset-settings">Reset Local Data</button>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
    `;
  }

  W.PCR_FORMS = {
    makeDefaultRecord,
    buildForm,
    collectFormData,
    validateRecord,
    renderSettingsForm,
    renderContractPreview,
  };
})();
