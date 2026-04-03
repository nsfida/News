
(() => {
  const PCR = window.PCR = window.PCR || {};

  PCR.modalRoot = () => document.getElementById("modalRoot");

  PCR.closeModal = () => {
    const root = PCR.modalRoot();
    if (root) root.innerHTML = "";
  };

  PCR.openModal = (title, bodyHTML, footerHTML = "") => {
    const root = PCR.modalRoot();
    if (!root) return;
    root.innerHTML = `
      <div class="modal-backdrop" role="presentation">
        <div class="modal-panel">
          <div class="modal-head">
            <div>
              <div class="modal-kicker">Premium Car Rental UAE</div>
              <h3>${PCR.escapeHTML(title)}</h3>
            </div>
            <button class="icon-btn" type="button" data-close-modal aria-label="Close">✕</button>
          </div>
          <div class="modal-body">${bodyHTML}</div>
          <div class="modal-foot">${footerHTML || ""}</div>
        </div>
      </div>
    `;
    root.querySelector("[data-close-modal]")?.addEventListener("click", PCR.closeModal);
    root.querySelector(".modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) PCR.closeModal();
    });
  };

  PCR.renderField = (field, value = "", extra = {}) => {
    const name = field.name;
    const label = field.label || name;
    const required = field.required ? "required" : "";
    const disabled = field.disabled ? "disabled" : "";
    const placeholder = field.placeholder || "";
    const common = `name="${PCR.escapeHTML(name)}" id="${PCR.escapeHTML(name)}" ${required} ${disabled} placeholder="${PCR.escapeHTML(placeholder)}"`;
    const current = value ?? "";
    const options = field.options || [];
    let control = "";

    if (field.type === "textarea") {
      control = `<textarea class="input" ${common} rows="3">${PCR.escapeHTML(current)}</textarea>`;
    } else if (field.type === "select") {
      const opts = options.map((opt) => {
        const ov = typeof opt === "object" ? opt.value : opt;
        const ol = typeof opt === "object" ? opt.label : opt;
        return `<option value="${PCR.escapeHTML(ov)}" ${String(ov) === String(current) ? "selected" : ""}>${PCR.escapeHTML(ol)}</option>`;
      }).join("");
      control = `<select class="input" ${common}><option value="">Select ${PCR.escapeHTML(label)}</option>${opts}</select>`;
    } else {
      const type = field.type || "text";
      const v = current === undefined || current === null ? "" : current;
      control = `<input class="input" type="${PCR.escapeHTML(type)}" value="${PCR.escapeHTML(v)}" ${common}>`;
    }

    return `
      <label class="field ${field.span ? `span-${field.span}` : ""}">
        <span>${PCR.escapeHTML(label)}</span>
        ${control}
      </label>
    `;
  };

  PCR.collectFormData = (form) => {
    const data = {};
    [...form.elements].forEach((el) => {
      if (!el.name || el.disabled) return;
      if (el.type === "checkbox") data[el.name] = el.checked;
      else if (el.type === "number") data[el.name] = el.value === "" ? 0 : Number(el.value);
      else data[el.name] = el.value;
    });
    return data;
  };

  PCR.renderGenericForm = (module, record, onSave) => {
    const conf = window.PCR_CONFIG.modules[module];
    const fields = conf.formFields || [];
    const current = record || {};
    const formId = `form-${module}`;
    const body = `
      <form id="${formId}" class="form-grid">
        ${fields.map((field) => PCR.renderField(field, current[field.name])).join("")}
      </form>
    `;
    const footer = `
      <button class="btn secondary" type="button" data-close-modal>Cancel</button>
      <button class="btn primary" type="button" data-save-form>Save Record</button>
    `;
    PCR.openModal(`${record ? "Edit" : "Add"} ${conf.title}`, body, footer);
    const form = document.getElementById(formId);
    const saveBtn = document.querySelector("[data-save-form]");
    saveBtn?.addEventListener("click", () => {
      const data = PCR.collectFormData(form);
      data.id = current.id || PCR.uid(module.slice(0, 3));
      if (module === "vehicles") data.rentalHistory = current.rentalHistory || [];
      if (module === "customers") data.linkedContracts = current.linkedContracts || [];
      onSave?.(data);
      PCR.closeModal();
    });
  };

  PCR.contractDefaults = (record = {}) => {
    const s = PCR.state.settings || window.PCR_SEED.settings || {};
    return {
      id: record.id || PCR.uid("con"),
      contractNumber: record.contractNumber || `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      contractDate: record.contractDate || new Date().toISOString().slice(0, 10),
      startDate: record.startDate || new Date().toISOString().slice(0, 10),
      startTime: record.startTime || "10:00",
      endDate: record.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      endTime: record.endTime || "10:00",
      rateType: record.rateType || "daily",
      dailyRate: record.dailyRate || 0,
      weeklyRate: record.weeklyRate || 0,
      monthlyRate: record.monthlyRate || 0,
      deposit: record.deposit ?? s.depositDefault ?? 1000,
      depositWaiver: record.depositWaiver || 0,
      cdw: record.cdw || 0,
      pickup: record.pickup || 0,
      delivery: record.delivery || 0,
      salikTotal: record.salikTotal || 0,
      darbTotal: record.darbTotal || 0,
      trafficFines: record.trafficFines || 0,
      fuelCharges: record.fuelCharges || 0,
      cleaningCharges: record.cleaningCharges || 0,
      damageCharges: record.damageCharges || 0,
      lateReturnCharges: record.lateReturnCharges || 0,
      otherCharges: record.otherCharges || 0,
      advancePayment: record.advancePayment || 0,
      discount: record.discount || 0,
      paidAmount: record.paidAmount || 0,
      customerId: record.customerId || "",
      vehicleId: record.vehicleId || "",
      customerName: record.customerName || "",
      customerPhone: record.customerPhone || "",
      customerEmail: record.customerEmail || "",
      companyName: record.companyName || "",
      vehicleNumber: record.vehicleNumber || "",
      plateNumber: record.plateNumber || "",
      vehicleMakeModel: record.vehicleMakeModel || "",
      signerName: record.signerName || "",
      signerId: record.signerId || "",
      termsAccepted: Boolean(record.termsAccepted),
      notes: record.notes || "",
      status: record.status || "Active"
    };
  };

  PCR.contractCalc = (data) => {
    const settings = PCR.state.settings || window.PCR_SEED.settings || {};
    const rental = PCR.calcRentalBase(data, settings);
    const rentalVat = rental.vat;
    const rentalSubtotal = rental.base + rentalVat;
    const salikVat = PCR.ROUND(PCR.toNumber(data.salikTotal) * (settings.salikVatRate ?? settings.vatRate ?? 0.05));
    const darbVat = PCR.ROUND(PCR.toNumber(data.darbTotal) * (settings.darbVatRate ?? settings.vatRate ?? 0.05));
    const fines = PCR.toNumber(data.trafficFines);
    const fineServiceFee = PCR.ROUND(fines * PCR.toNumber(settings.fineServiceRate ?? 0.10));
    const fineServiceVat = PCR.ROUND(fineServiceFee * PCR.toNumber(settings.fineServiceVatRate ?? 0.05));
    const fineTotal = PCR.ROUND(fines + fineServiceFee + fineServiceVat);
    const other = PCR.toNumber(data.fuelCharges) + PCR.toNumber(data.cleaningCharges) + PCR.toNumber(data.damageCharges) + PCR.toNumber(data.lateReturnCharges) + PCR.toNumber(data.otherCharges);
    const extras = PCR.toNumber(data.cdw) + PCR.toNumber(data.pickup) + PCR.toNumber(data.delivery);
    const total = PCR.ROUND(rentalSubtotal + data.salikTotal + salikVat + data.darbTotal + darbVat + fineTotal + other + extras - PCR.toNumber(data.discount) - PCR.toNumber(data.advancePayment));
    const due = PCR.ROUND(total - PCR.toNumber(data.paidAmount));
    return {
      days: rental.days,
      rentalBase: rental.base,
      rentalVat,
      rentalSubtotal,
      salikVat,
      darbVat,
      fineServiceFee,
      fineServiceVat,
      fineTotal,
      extras,
      other,
      total,
      due
    };
  };

  PCR.renderContractModal = (record, onSave) => {
    const data = PCR.contractDefaults(record || {});
    const customers = PCR.getModuleData("customers");
    const vehicles = PCR.getModuleData("vehicles");

    const customerOptions = customers.map(c => `<option value="${PCR.escapeHTML(c.id)}" ${String(data.customerId) === String(c.id) ? "selected" : ""}>${PCR.escapeHTML(c.fullName)} — ${PCR.escapeHTML(c.mobile || "")}</option>`).join("");
    const vehicleOptions = vehicles.map(v => `<option value="${PCR.escapeHTML(v.id)}" ${String(data.vehicleId) === String(v.id) ? "selected" : ""}>${PCR.escapeHTML(v.vehicleNumber)} — ${PCR.escapeHTML(v.make)} ${PCR.escapeHTML(v.model)}</option>`).join("");

    const body = `
      <form id="contractForm" class="contract-layout">
        <div class="contract-main">
          <section class="form-section">
            <div class="section-head"><h4>Core Contract Details</h4><span>Customer, vehicle, and dates</span></div>
            <div class="form-grid">
              ${PCR.renderField({name:"contractNumber", label:"Contract Number", type:"text", required:true}, data.contractNumber)}
              ${PCR.renderField({name:"contractDate", label:"Contract Date", type:"date", required:true}, data.contractDate)}
              <label class="field span-2"><span>Customer</span><select class="input" name="customerId" id="customerId" required><option value="">Select customer</option>${customerOptions}</select></label>
              ${PCR.renderField({name:"customerName", label:"Customer Name", type:"text"}, data.customerName)}
              ${PCR.renderField({name:"customerPhone", label:"Customer Mobile", type:"text"}, data.customerPhone)}
              ${PCR.renderField({name:"customerEmail", label:"Customer Email", type:"email"}, data.customerEmail)}
              ${PCR.renderField({name:"companyName", label:"Company Name", type:"text"}, data.companyName)}
              <label class="field span-2"><span>Vehicle</span><select class="input" name="vehicleId" id="vehicleId" required><option value="">Select vehicle</option>${vehicleOptions}</select></label>
              ${PCR.renderField({name:"vehicleNumber", label:"Vehicle Number", type:"text"}, data.vehicleNumber)}
              ${PCR.renderField({name:"plateNumber", label:"Plate Number", type:"text"}, data.plateNumber)}
              ${PCR.renderField({name:"vehicleMakeModel", label:"Vehicle Make / Model", type:"text"}, data.vehicleMakeModel)}
              ${PCR.renderField({name:"status", label:"Status", type:"select", options:["Active","Draft","Closed","Overdue","Cancelled"]}, data.status)}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head"><h4>Rental Period & Rates</h4><span>Use daily, weekly, or monthly pricing</span></div>
            <div class="form-grid">
              ${PCR.renderField({name:"startDate", label:"Start Date", type:"date", required:true}, data.startDate)}
              ${PCR.renderField({name:"startTime", label:"Start Time", type:"time", required:true}, data.startTime)}
              ${PCR.renderField({name:"endDate", label:"End Date", type:"date", required:true}, data.endDate)}
              ${PCR.renderField({name:"endTime", label:"End Time", type:"time", required:true}, data.endTime)}
              ${PCR.renderField({name:"rateType", label:"Rate Type", type:"select", options:["daily","weekly","monthly"]}, data.rateType)}
              ${PCR.renderField({name:"dailyRate", label:"Daily Rate", type:"number"}, data.dailyRate)}
              ${PCR.renderField({name:"weeklyRate", label:"Weekly Rate", type:"number"}, data.weeklyRate)}
              ${PCR.renderField({name:"monthlyRate", label:"Monthly Rate", type:"number"}, data.monthlyRate)}
              ${PCR.renderField({name:"deposit", label:"Deposit", type:"number"}, data.deposit)}
              ${PCR.renderField({name:"depositWaiver", label:"Deposit Waiver", type:"number"}, data.depositWaiver)}
              ${PCR.renderField({name:"cdw", label:"CDW", type:"number"}, data.cdw)}
              ${PCR.renderField({name:"pickup", label:"Pickup", type:"number"}, data.pickup)}
              ${PCR.renderField({name:"delivery", label:"Delivery", type:"number"}, data.delivery)}
            </div>
          </section>

          <section class="form-section">
            <div class="section-head"><h4>Charges</h4><span>Tolls, fines, and extras</span></div>
            <div class="form-grid">
              ${PCR.renderField({name:"salikTotal", label:"Salik Charges", type:"number"}, data.salikTotal)}
              ${PCR.renderField({name:"darbTotal", label:"Darb Charges", type:"number"}, data.darbTotal)}
              ${PCR.renderField({name:"trafficFines", label:"Traffic Fines", type:"number"}, data.trafficFines)}
              ${PCR.renderField({name:"fuelCharges", label:"Fuel Charges", type:"number"}, data.fuelCharges)}
              ${PCR.renderField({name:"cleaningCharges", label:"Cleaning Charges", type:"number"}, data.cleaningCharges)}
              ${PCR.renderField({name:"damageCharges", label:"Damage Charges", type:"number"}, data.damageCharges)}
              ${PCR.renderField({name:"lateReturnCharges", label:"Late Return Charges", type:"number"}, data.lateReturnCharges)}
              ${PCR.renderField({name:"otherCharges", label:"Other Charges", type:"number"}, data.otherCharges)}
              ${PCR.renderField({name:"discount", label:"Discount", type:"number"}, data.discount)}
              ${PCR.renderField({name:"advancePayment", label:"Advance Payment", type:"number"}, data.advancePayment)}
              ${PCR.renderField({name:"paidAmount", label:"Paid Amount", type:"number"}, data.paidAmount)}
              ${PCR.renderField({name:"signerName", label:"Signer Name", type:"text"}, data.signerName)}
              ${PCR.renderField({name:"signerId", label:"Signer ID", type:"text"}, data.signerId)}
              <label class="field span-2"><span>Notes</span><textarea class="input" name="notes" rows="4">${PCR.escapeHTML(data.notes)}</textarea></label>
              <label class="checkbox-field span-2"><input type="checkbox" name="termsAccepted" ${data.termsAccepted ? "checked" : ""}> <span>I confirm that the customer accepts the rental terms and conditions, toll policy, and damage responsibilities.</span></label>
            </div>
          </section>

          <input type="hidden" name="id" value="${PCR.escapeHTML(data.id)}">
        </div>
        <aside class="contract-side">
          <div class="summary-card">
            <div class="section-head"><h4>Live Invoice Preview</h4><span>Auto-calculated</span></div>
            <div id="contractPreview" class="preview-stack"></div>
          </div>
          <div class="summary-card">
            <div class="section-head"><h4>Required Policies</h4><span>UAE rental operation</span></div>
            <ul class="doc-list">
              <li>5% VAT on rental charges</li>
              <li>5% VAT on Salik and Darb lines</li>
              <li>10% fine service fee + VAT on service fee</li>
              <li>Vehicle check card and signature before handover</li>
              <li>Unmatched toll/fine records must be reviewed manually</li>
            </ul>
          </div>
        </aside>
      </form>
    `;

    const footer = `
      <button class="btn secondary" type="button" data-close-modal>Cancel</button>
      <button class="btn ghost" type="button" data-print-contract>Print Preview</button>
      <button class="btn primary" type="button" data-save-contract>Save Contract</button>
    `;

    PCR.openModal(`${record ? "Edit" : "Create New"} Rental Contract`, body, footer);

    const form = document.getElementById("contractForm");
    const preview = document.getElementById("contractPreview");

    const syncCustomerVehicle = () => {
      const customer = PCR.findCustomer(PCR.state, form.customerId.value);
      const vehicle = PCR.findVehicle(PCR.state, form.vehicleId.value);
      if (customer) {
        form.customerName.value = customer.fullName || "";
        form.customerPhone.value = customer.mobile || "";
        form.customerEmail.value = customer.email || "";
        form.companyName.value = customer.companyName || "";
      }
      if (vehicle) {
        form.vehicleNumber.value = vehicle.vehicleNumber || "";
        form.plateNumber.value = vehicle.plateNumber || "";
        form.vehicleMakeModel.value = `${vehicle.make || ""} ${vehicle.model || ""}`.trim();
        form.dailyRate.value = vehicle.dailyRate ?? 0;
        form.weeklyRate.value = vehicle.weeklyRate ?? 0;
        form.monthlyRate.value = vehicle.monthlyRate ?? 0;
        form.deposit.value = vehicle.deposit ?? data.deposit ?? 0;
      }
      renderPreview();
    };

    const renderPreview = () => {
      const values = PCR.collectFormData(form);
      const calc = PCR.contractCalc(values);
      preview.innerHTML = `
        <div class="mini-metric"><span>Rental base</span><strong>${PCR.formatCurrency(calc.rentalBase)}</strong></div>
        <div class="mini-metric"><span>Rental VAT 5%</span><strong>${PCR.formatCurrency(calc.rentalVat)}</strong></div>
        <div class="mini-metric"><span>Salik + VAT</span><strong>${PCR.formatCurrency(PCR.toNumber(values.salikTotal) + calc.salikVat)}</strong></div>
        <div class="mini-metric"><span>Darb + VAT</span><strong>${PCR.formatCurrency(PCR.toNumber(values.darbTotal) + calc.darbVat)}</strong></div>
        <div class="mini-metric"><span>Fine total</span><strong>${PCR.formatCurrency(calc.fineTotal)}</strong></div>
        <div class="mini-metric"><span>Grand total</span><strong>${PCR.formatCurrency(calc.total)}</strong></div>
        <div class="mini-metric highlight"><span>Amount due</span><strong>${PCR.formatCurrency(calc.due)}</strong></div>
      `;
    };

    form.addEventListener("input", renderPreview);
    form.customerId.addEventListener("change", syncCustomerVehicle);
    form.vehicleId.addEventListener("change", syncCustomerVehicle);
    syncCustomerVehicle();
    renderPreview();

    document.querySelector("[data-save-contract]")?.addEventListener("click", () => {
      const values = PCR.collectFormData(form);
      values.id = data.id;
      values.contractNumber = values.contractNumber || data.contractNumber;
      values.status = values.status || "Active";
      const calc = PCR.contractCalc(values);
      values.rentalDays = calc.days;
      values.baseRental = calc.rentalBase;
      values.vatRental = calc.rentalVat;
      values.salikVat = calc.salikVat;
      values.darbVat = calc.darbVat;
      values.fineServiceFee = calc.fineServiceFee;
      values.fineServiceVat = calc.fineServiceVat;
      values.totalAmount = calc.total;
      values.dueAmount = calc.due;
      values.customerName = form.customerName.value || values.customerName;
      values.customerPhone = form.customerPhone.value || values.customerPhone;
      values.customerEmail = form.customerEmail.value || values.customerEmail;
      values.companyName = form.companyName.value || values.companyName;
      values.vehicleNumber = form.vehicleNumber.value || values.vehicleNumber;
      values.plateNumber = form.plateNumber.value || values.plateNumber;
      values.vehicleMakeModel = form.vehicleMakeModel.value || values.vehicleMakeModel;
      values.termsAccepted = form.termsAccepted.checked;
      values.createdAt = record?.createdAt || new Date().toISOString();
      onSave?.(values);
      PCR.closeModal();
    });

    document.querySelector("[data-print-contract]")?.addEventListener("click", () => {
      const values = PCR.collectFormData(form);
      const calc = PCR.contractCalc(values);
      const customer = PCR.findCustomer(PCR.state, values.customerId);
      const vehicle = PCR.findVehicle(PCR.state, values.vehicleId);
      const html = PCR.buildContractPrintHTML(values, calc, customer, vehicle);
      PCR.openPrintWindow(`Contract ${values.contractNumber}`, html);
    });
  };
})();
