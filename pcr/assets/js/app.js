
(() => {
  const PCR = window.PCR = window.PCR || {};
  const page = document.body.dataset.page || "index";
  const app = document.getElementById("app");
  const pageTitle = document.getElementById("pageTitle");
  const pageMeta = document.getElementById("pageMeta");
  const searchInput = document.getElementById("globalSearch");
  const saveBadge = document.querySelector("[data-save-badge]");
  const navLinks = [...document.querySelectorAll("[data-nav-link]")];

  PCR.toast = (message, kind = "info") => {
    const root = document.getElementById("toastRoot");
    if (!root) return;
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 20);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  };

  PCR.appPage = page;

  PCR.setHeader = (title, meta) => {
    if (pageTitle) pageTitle.textContent = title;
    if (pageMeta) pageMeta.textContent = meta || "";
  };

  PCR.refresh = () => renderPage();

  const moduleForPage = () => {
    const map = {
      index: "dashboard",
      vehicles: "vehicles",
      customers: "customers",
      contracts: "contracts",
      renewals: "renewals",
      invoices: "invoices",
      receipts: "receipts",
      accounts: "accounts",
      ledger: "ledger",
      maintenance: "maintenance",
      fines: "fines",
      tolls: "tolls",
      charges: "charges",
      reports: "reports",
      documents: "documents",
      json: "json",
      settings: "settings"
    };
    return map[page] || "dashboard";
  };

  const currentModule = moduleForPage();

  const ensureState = () => {
    PCR.state = PCR.state || PCR.loadState();
    PCR.state.settings = PCR.state.settings || PCR.clone(window.PCR_SEED.settings);
  };

  const getSettings = () => PCR.state.settings || window.PCR_SEED.settings || {};

  const setActiveNav = () => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href").replace(".html", "") === page;
      link.classList.toggle("active", active);
    });
  };

  const wireTopActions = () => {
    document.getElementById("saveNow")?.addEventListener("click", () => {
      PCR.saveState();
      PCR.toast("Saved locally", "success");
      PCR.setDirty(false);
    });
    document.getElementById("resetLocal")?.addEventListener("click", () => {
      if (confirm("Reset local browser data for all modules?")) {
        PCR.resetLocalData();
        location.reload();
      }
    });
  };

  const sortItems = (module, items) => {
    const conf = window.PCR_CONFIG.modules[module] || {};
    const key = conf.sortBy;
    return [...items].sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (String(av).match(/^\d{4}-\d{2}/) || String(bv).match(/^\d{4}-\d{2}/)) {
        return String(av).localeCompare(String(bv));
      }
      return String(av).localeCompare(String(bv));
    });
  };

  const filterItems = (module, items, query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items;
    const conf = window.PCR_CONFIG.modules[module] || {};
    const fields = conf.searchFields || [];
    return items.filter((item) => {
      return fields.some((field) => String(item?.[field] ?? "").toLowerCase().includes(q)) ||
        Object.values(item || {}).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  };

  PCR.buildInvoiceFromContract = (contract) => {
    const settings = getSettings();
    const calc = PCR.contractCalc(contract);
    const vatRate = PCR.toNumber(settings.vatRate ?? 0.05);
    const lineItems = [];
    const pushLine = (label, amount, vat = 0, note = "") => {
      const a = PCR.toNumber(amount);
      const v = PCR.ROUND(PCR.toNumber(vat));
      if (!a && !v) return;
      lineItems.push({ label, amount: PCR.ROUND(a), vat: PCR.ROUND(v), total: PCR.ROUND(a + v), note });
    };

    pushLine(`Rental charge (${contract.rateType || "daily"})`, calc.rentalBase, calc.rentalVat, `${calc.days} day(s)`);
    pushLine("Salik tolls", contract.salikTotal, calc.salikVat);
    pushLine("Darb tolls", contract.darbTotal, calc.darbVat);
    pushLine("Traffic fine principal", contract.trafficFines, 0, "Pass-through fine amount");
    pushLine("Traffic fine service fee", calc.fineServiceFee, calc.fineServiceVat, "10% service fee + VAT");
    pushLine("CDW", contract.cdw, PCR.ROUND(PCR.toNumber(contract.cdw) * vatRate));
    pushLine("Pickup service", contract.pickup, PCR.ROUND(PCR.toNumber(contract.pickup) * vatRate));
    pushLine("Delivery service", contract.delivery, PCR.ROUND(PCR.toNumber(contract.delivery) * vatRate));
    pushLine("Fuel charges", contract.fuelCharges, PCR.ROUND(PCR.toNumber(contract.fuelCharges) * vatRate));
    pushLine("Cleaning charges", contract.cleaningCharges, PCR.ROUND(PCR.toNumber(contract.cleaningCharges) * vatRate));
    pushLine("Damage charges", contract.damageCharges, PCR.ROUND(PCR.toNumber(contract.damageCharges) * vatRate));
    pushLine("Late return charges", contract.lateReturnCharges, PCR.ROUND(PCR.toNumber(contract.lateReturnCharges) * vatRate));
    pushLine("Other charges", contract.otherCharges, PCR.ROUND(PCR.toNumber(contract.otherCharges) * vatRate));

    const subtotal = PCR.ROUND(lineItems.reduce((s, line) => s + Number(line.amount || 0), 0));
    const vat = PCR.ROUND(lineItems.reduce((s, line) => s + Number(line.vat || 0), 0));
    const gross = PCR.ROUND(subtotal + vat);
    const discount = PCR.toNumber(contract.discount);
    const total = PCR.ROUND(gross - discount);
    const paid = PCR.toNumber(contract.paidAmount);
    const balance = PCR.ROUND(total - paid);

    return {
      id: contract.invoiceId || PCR.uid("inv"),
      invoiceNumber: contract.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      contractId: contract.id,
      customerId: contract.customerId,
      issueDate: contract.contractDate || new Date().toISOString().slice(0, 10),
      status: balance <= 0 ? "Paid" : paid > 0 ? "Part Paid" : "Issued",
      subtotal,
      vat,
      total,
      paid,
      balance,
      lineItems,
      notes: contract.notes || "",
      createdAt: contract.createdAt || new Date().toISOString()
    };
  };

  PCR.ensureContractLinks = () => {
    const vehicles = PCR.getModuleData("vehicles");
    const customers = PCR.getModuleData("customers");
    const contracts = PCR.getModuleData("contracts");
    const invoices = PCR.getModuleData("invoices");
    const invoiceMap = new Map(invoices.map((i) => [String(i.contractId), i]));

    contracts.forEach((contract) => {
      const vehicle = vehicles.find((v) => String(v.id) === String(contract.vehicleId));
      const customer = customers.find((c) => String(c.id) === String(contract.customerId));
      const invoice = PCR.buildInvoiceFromContract(contract);

      contract.customerName = customer?.fullName || contract.customerName || "";
      contract.customerPhone = customer?.mobile || contract.customerPhone || "";
      contract.customerEmail = customer?.email || contract.customerEmail || "";
      contract.companyName = customer?.companyName || contract.companyName || "";
      contract.vehicleNumber = vehicle?.vehicleNumber || contract.vehicleNumber || "";
      contract.plateNumber = vehicle?.plateNumber || contract.plateNumber || "";
      contract.vehicleMakeModel = `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim() || contract.vehicleMakeModel || "";

      contract.status = contract.status || "Active";
      const calc = PCR.contractCalc(contract);
      contract.rentalDays = calc.days;
      contract.baseRental = calc.rentalBase;
      contract.vatRental = calc.rentalVat;
      contract.salikVat = calc.salikVat;
      contract.darbVat = calc.darbVat;
      contract.fineServiceFee = calc.fineServiceFee;
      contract.fineServiceVat = calc.fineServiceVat;
      contract.totalAmount = invoice.total;
      contract.dueAmount = invoice.balance;

      if (vehicle) {
        vehicle.availability = (contract.status === "Closed" || contract.status === "Cancelled") ? "Available" : "Unavailable";
        vehicle.status = (contract.status === "Closed" || contract.status === "Cancelled") ? "Available" : "Rented";
        vehicle.rentalHistory = Array.isArray(vehicle.rentalHistory) ? vehicle.rentalHistory : [];
        if (!vehicle.rentalHistory.includes(contract.id)) vehicle.rentalHistory.push(contract.id);
      }

      if (customer) {
        customer.activeContractStatus = (contract.status === "Closed" || contract.status === "Cancelled") ? "Inactive" : "Active";
        customer.linkedContracts = Array.isArray(customer.linkedContracts) ? customer.linkedContracts : [];
        if (!customer.linkedContracts.includes(contract.id)) customer.linkedContracts.push(contract.id);
      }

      const existing = invoiceMap.get(String(contract.id));
      if (existing) {
        Object.assign(existing, invoice);
        existing.id = existing.id || invoice.id;
        contract.invoiceId = existing.id || invoice.id;
      } else {
        invoices.push(invoice);
        contract.invoiceId = invoice.id;
      }
    });

    PCR.state.vehicles = vehicles;
    PCR.state.customers = customers;
    PCR.state.contracts = contracts;
    PCR.state.invoices = invoices;
  };

  PCR.reassignTollsAndFines = () => {
    const contracts = PCR.getModuleData("contracts");
    const fines = PCR.getModuleData("fines");
    const tolls = PCR.getModuleData("tolls");

    const matchByVehicleTime = (record, type) => {
      const hasTime = Boolean(record.time);
      const hasDate = Boolean(record.date);
      if (!hasDate || !hasTime) {
        record.assignmentStatus = "Unmatched";
        record.matchMessage = `No rental contract found for this ${type} record during the selected time window.`;
        return;
      }
      const vehicleId = record.vehicleId;
      const stamp = `${record.date}T${record.time.length === 5 ? `${record.time}:00` : record.time}`;
      const matched = contracts.find((contract) => {
        const sameVehicle = String(contract.vehicleId) === String(vehicleId);
        return sameVehicle && PCR.overlap(contract.startDate, contract.endDate, contract.startDate, contract.endDate) && PCR.safeDate(stamp) >= PCR.safeDate(contract.startDate) && PCR.safeDate(stamp) <= PCR.safeDate(contract.endDate);
      });
      if (matched) {
        record.contractId = matched.id;
        record.customerId = matched.customerId;
        record.assignmentStatus = "Matched";
        record.matchMessage = "";
      } else {
        record.assignmentStatus = "Unmatched";
        record.matchMessage = `No rental contract found for this ${type} record during the selected time window.`;
      }
    };

    fines.forEach((fine) => {
      if (!fine.time || !fine.date) {
        fine.assignmentStatus = "Unmatched";
        fine.matchMessage = "No rental contract found for this fine record during the selected time window.";
      } else if (String(fine.assignmentStatus || "").toLowerCase() !== "matched") {
        matchByVehicleTime(fine, "fine");
      }
      if (String(fine.assignmentStatus).toLowerCase() === "matched") {
        const calc = PCR.fineTotal(fine, getSettings());
        fine.serviceFee = calc.serviceFee;
        fine.serviceFeeVat = calc.serviceFeeVat;
        fine.total = calc.total;
      }
    });

    tolls.forEach((toll) => {
      if (!toll.time || !toll.date) {
        toll.assignmentStatus = "Unmatched";
        toll.matchMessage = `No rental contract found for this toll record during the selected time window.`;
      } else if (String(toll.assignmentStatus || "").toLowerCase() !== "matched") {
        matchByVehicleTime(toll, "toll");
      }
      const rate = 0.05;
      const calc = PCR.tollTotal(toll, rate);
      toll.vat = calc.vat;
      toll.total = calc.total;
    });
  };

  PCR.rebuildLedger = () => {
    const settings = getSettings();
    const ledger = [];
    const push = (entry) => ledger.push(entry);

    const contracts = PCR.getModuleData("contracts");
    const invoices = PCR.getModuleData("invoices");
    const receipts = PCR.getModuleData("receipts");
    const fines = PCR.getModuleData("fines");
    const tolls = PCR.getModuleData("tolls");
    const charges = PCR.getModuleData("charges");
    const renewals = PCR.getModuleData("renewals");

    contracts.forEach((contract) => {
      const invoice = invoices.find((i) => String(i.contractId) === String(contract.id)) || PCR.buildInvoiceFromContract(contract);
      push({
        id: `led-${contract.id}`,
        date: contract.contractDate || new Date().toISOString().slice(0, 10),
        time: contract.startTime || "10:00",
        customerId: contract.customerId,
        contractId: contract.id,
        refType: "Invoice",
        reference: invoice.invoiceNumber,
        debit: PCR.ROUND(invoice.total),
        credit: 0,
        balance: PCR.ROUND(invoice.total - PCR.toNumber(contract.paidAmount || 0)),
        narration: `Rental invoice for ${contract.vehicleNumber || contract.vehicleId}`
      });
    });

    renewals.forEach((renewal) => {
      if (renewal.amount || renewal.total) {
        push({
          id: `led-${renewal.id}`,
          date: renewal.createdAt ? String(renewal.createdAt).slice(0, 10) : renewal.fromDate,
          time: renewal.createdAt ? String(renewal.createdAt).slice(11, 16) : "10:00",
          customerId: PCR.findContract(PCR.state, renewal.contractId)?.customerId || "",
          contractId: renewal.contractId,
          refType: "Renewal",
          reference: renewal.id,
          debit: PCR.ROUND(renewal.total || renewal.amount || 0),
          credit: 0,
          balance: PCR.ROUND(renewal.total || renewal.amount || 0),
          narration: `Renewal ${renewal.renewalType}`
        });
      }
    });

    fines.forEach((fine) => {
      if (String(fine.assignmentStatus).toLowerCase() !== "matched") return;
      push({
        id: `led-${fine.id}`,
        date: fine.date,
        time: fine.time || "00:00",
        customerId: fine.customerId || "",
        contractId: fine.contractId || "",
        refType: "Fine",
        reference: fine.fineNumber,
        debit: PCR.ROUND(fine.total || 0),
        credit: 0,
        balance: PCR.ROUND(fine.total || 0),
        narration: `${fine.authority} ${fine.violation || ""}`.trim()
      });
    });

    tolls.forEach((toll) => {
      if (String(toll.assignmentStatus).toLowerCase() !== "matched") return;
      push({
        id: `led-${toll.id}`,
        date: toll.date,
        time: toll.time || "00:00",
        customerId: toll.customerId || "",
        contractId: toll.contractId || "",
        refType: toll.tollSystem || "Toll",
        reference: toll.id,
        debit: PCR.ROUND(toll.total || 0),
        credit: 0,
        balance: PCR.ROUND(toll.total || 0),
        narration: `${toll.tollSystem} toll charge`
      });
    });

    charges.forEach((charge) => {
      push({
        id: `led-${charge.id}`,
        date: charge.date,
        time: "00:00",
        customerId: charge.customerId || "",
        contractId: charge.contractId || "",
        refType: charge.type || "Charge",
        reference: charge.id,
        debit: PCR.ROUND(charge.total || charge.amount || 0),
        credit: 0,
        balance: PCR.ROUND(charge.total || charge.amount || 0),
        narration: charge.notes || charge.type
      });
    });

    receipts.forEach((receipt) => {
      push({
        id: `led-${receipt.id}`,
        date: receipt.receivedDate ? String(receipt.receivedDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        time: receipt.receivedDate ? String(receipt.receivedDate).slice(11, 16) : "00:00",
        customerId: receipt.customerId || "",
        contractId: receipt.contractId || "",
        refType: "Receipt",
        reference: receipt.receiptNumber,
        debit: 0,
        credit: PCR.ROUND(receipt.amount || 0),
        balance: PCR.ROUND(receipt.balanceAfter || 0),
        narration: receipt.notes || "Payment received"
      });
    });

    // sort and produce running customer balances
    ledger.sort((a, b) => {
      const aKey = `${a.date}T${a.time || "00:00"}`;
      const bKey = `${b.date}T${b.time || "00:00"}`;
      return aKey.localeCompare(bKey);
    });

    const customerBalances = new Map();
    ledger.forEach((entry) => {
      const prev = customerBalances.get(String(entry.customerId)) || 0;
      const next = PCR.ROUND(prev + PCR.toNumber(entry.debit) - PCR.toNumber(entry.credit));
      entry.balance = next;
      customerBalances.set(String(entry.customerId), next);
    });

    PCR.state.ledger = ledger;
    return ledger;
  };

  PCR.rebuildAccounts = () => {
    const customers = PCR.getModuleData("customers");
    const ledger = PCR.getModuleData("ledger");
    const accounts = customers.map((customer) => {
      const entries = ledger.filter((l) => String(l.customerId) === String(customer.id));
      const debits = PCR.ROUND(entries.reduce((s, e) => s + PCR.toNumber(e.debit), 0));
      const credits = PCR.ROUND(entries.reduce((s, e) => s + PCR.toNumber(e.credit), 0));
      const closingBalance = PCR.ROUND(debits - credits);
      customer.outstandingBalance = closingBalance;
      return {
        id: `acc-${customer.id}`,
        customerId: customer.id,
        openingBalance: 0,
        debits,
        credits,
        closingBalance,
        lastUpdated: new Date().toISOString()
      };
    });
    PCR.state.customers = customers;
    PCR.state.accounts = accounts;
    return accounts;
  };

  PCR.rebuildFinancials = () => {
    PCR.ensureContractLinks();
    PCR.reassignTollsAndFines();
    PCR.rebuildLedger();
    PCR.rebuildAccounts();
    PCR.saveState();
  };

  PCR.saveRecord = (module, data) => {
    if (module === "settings") {
      PCR.setModuleData("settings", data);
      PCR.rebuildFinancials();
      return;
    }

    const list = PCR.getModuleData(module);
    const idx = list.findIndex((item) => String(item.id) === String(data.id));
    if (idx >= 0) list[idx] = { ...list[idx], ...data };
    else list.unshift(data);
    PCR.state[module] = list;
    PCR.setDirty(true);

    if (module === "contracts" || module === "receipts" || module === "fines" || module === "tolls" || module === "charges" || module === "renewals" || module === "vehicles" || module === "customers") {
      PCR.rebuildFinancials();
    } else {
      PCR.saveState();
    }
    PCR.toast(`${window.PCR_CONFIG.modules[module].title} saved.`, "success");
    renderPage();
  };

  PCR.deleteRecord = (module, id) => {
    if (!confirm("Delete this record?")) return;
    PCR.state[module] = PCR.getModuleData(module).filter((x) => String(x.id) !== String(id));
    PCR.setDirty(true);
    PCR.rebuildFinancials();
    PCR.toast(`${window.PCR_CONFIG.modules[module].title} deleted.`, "warning");
    renderPage();
  };

  PCR.closeContract = (contractId) => {
    const contract = PCR.findContract(PCR.state, contractId);
    if (!contract) return;
    contract.status = "Closed";
    contract.closureSummary = `Closed on ${new Date().toLocaleDateString()} after settlement.`;
    const vehicle = PCR.findVehicle(PCR.state, contract.vehicleId);
    if (vehicle) {
      vehicle.availability = "Available";
      vehicle.status = "Available";
    }
    PCR.rebuildFinancials();
    PCR.toast(`Contract ${contract.contractNumber} closed.`, "success");
    renderPage();
  };

  PCR.printContract = (contractId) => {
    const contract = PCR.findContract(PCR.state, contractId);
    if (!contract) return;
    const invoice = PCR.getModuleData("invoices").find((i) => String(i.contractId) === String(contractId)) || PCR.buildInvoiceFromContract(contract);
    const customer = PCR.findCustomer(PCR.state, contract.customerId);
    const vehicle = PCR.findVehicle(PCR.state, contract.vehicleId);
    const html = PCR.buildContractPrintHTML(contract, invoice, customer, vehicle);
    PCR.openPrintWindow(`Contract ${contract.contractNumber}`, html);
  };

  PCR.printInvoice = (invoiceId) => {
    const invoice = PCR.getModuleData("invoices").find((i) => String(i.id) === String(invoiceId));
    if (!invoice) return;
    const contract = PCR.findContract(PCR.state, invoice.contractId);
    const customer = PCR.findCustomer(PCR.state, invoice.customerId);
    const vehicle = PCR.findVehicle(PCR.state, contract?.vehicleId);
    const html = PCR.buildInvoicePrintHTML(invoice, contract, customer, vehicle);
    PCR.openPrintWindow(`Invoice ${invoice.invoiceNumber}`, html);
  };

  PCR.printReceipt = (receiptId) => {
    const receipt = PCR.getModuleData("receipts").find((i) => String(i.id) === String(receiptId));
    if (!receipt) return;
    const contract = PCR.findContract(PCR.state, receipt.contractId);
    const invoice = PCR.getModuleData("invoices").find((i) => String(i.id) === String(receipt.invoiceId));
    const customer = PCR.findCustomer(PCR.state, receipt.customerId);
    const html = PCR.buildReceiptPrintHTML(receipt, invoice, contract, customer);
    PCR.openPrintWindow(`Receipt ${receipt.receiptNumber}`, html);
  };

  PCR.printStatement = (customerId) => {
    const customer = PCR.findCustomer(PCR.state, customerId);
    if (!customer) return;
    const html = PCR.buildStatementPrintHTML(customer);
    PCR.openPrintWindow(`Statement ${customer.fullName}`, html);
  };

  PCR.printVehicleCheck = (contractId) => {
    const contract = PCR.findContract(PCR.state, contractId);
    if (!contract) return;
    const customer = PCR.findCustomer(PCR.state, contract.customerId);
    const vehicle = PCR.findVehicle(PCR.state, contract.vehicleId);
    const html = PCR.buildVehicleCheckHTML(contract, customer, vehicle);
    PCR.openPrintWindow(`Vehicle Check ${contract.contractNumber}`, html);
  };

  PCR.buildContractPrintHTML = (contract, invoice, customer, vehicle) => {
    const calc = PCR.contractCalc(contract);
    const terms = getSettings().terms || [];
    return `
      <div class="doc-head">
        <div class="brand">
          <img src="assets/img/logo.png" alt="Logo">
          <div>
            <h1>${PCR.escapeHTML(getSettings().companyName)}</h1>
            <p>TRN ${PCR.escapeHTML(getSettings().trn)} · ${PCR.escapeHTML(getSettings().phone)}</p>
            <p>${(getSettings().emails || []).map(PCR.escapeHTML).join(" · ")}</p>
          </div>
        </div>
        <div class="meta">
          <div class="pill">Rental Contract</div><br>
          Contract No: <strong>${PCR.escapeHTML(contract.contractNumber)}</strong><br>
          Date: ${PCR.escapeHTML(PCR.formatDate(contract.contractDate))}<br>
          Period: ${PCR.escapeHTML(PCR.rangeText(contract.startDate, contract.endDate))}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Customer Details</h3>
          <div class="muted">${PCR.escapeHTML(customer?.fullName || contract.customerName || "")}</div>
          <div>${PCR.escapeHTML(customer?.mobile || contract.customerPhone || "")}</div>
          <div>${PCR.escapeHTML(customer?.email || contract.customerEmail || "")}</div>
          <div>${PCR.escapeHTML(customer?.companyName || contract.companyName || "")}</div>
        </div>
        <div class="card">
          <h3>Vehicle Details</h3>
          <div class="muted">${PCR.escapeHTML(vehicle?.vehicleNumber || contract.vehicleNumber || "")}</div>
          <div>${PCR.escapeHTML(vehicle?.make || "")} ${PCR.escapeHTML(vehicle?.model || "")}</div>
          <div>Plate: ${PCR.escapeHTML(vehicle?.plateNumber || contract.plateNumber || "")}</div>
          <div>VIN: ${PCR.escapeHTML(vehicle?.vin || "")}</div>
        </div>
      </div>

      <div class="section">
        <h2>Pricing Breakdown</h2>
        <table>
          <thead><tr><th>Description</th><th>Amount</th><th>VAT</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td>Rental base (${PCR.escapeHTML(contract.rateType || "daily")}, ${calc.days} day(s))</td><td>${PCR.formatCurrency(calc.rentalBase)}</td><td>${PCR.formatCurrency(calc.rentalVat)}</td><td>${PCR.formatCurrency(calc.rentalBase + calc.rentalVat)}</td></tr>
            <tr><td>Salik</td><td>${PCR.formatCurrency(PCR.toNumber(contract.salikTotal))}</td><td>${PCR.formatCurrency(calc.salikVat)}</td><td>${PCR.formatCurrency(PCR.toNumber(contract.salikTotal) + calc.salikVat)}</td></tr>
            <tr><td>Darb</td><td>${PCR.formatCurrency(PCR.toNumber(contract.darbTotal))}</td><td>${PCR.formatCurrency(calc.darbVat)}</td><td>${PCR.formatCurrency(PCR.toNumber(contract.darbTotal) + calc.darbVat)}</td></tr>
            <tr><td>Traffic fines</td><td>${PCR.formatCurrency(PCR.toNumber(contract.trafficFines))}</td><td>${PCR.formatCurrency(0)}</td><td>${PCR.formatCurrency(PCR.toNumber(contract.trafficFines))}</td></tr>
            <tr><td>Fine service fee</td><td>${PCR.formatCurrency(calc.fineServiceFee)}</td><td>${PCR.formatCurrency(calc.fineServiceVat)}</td><td>${PCR.formatCurrency(calc.fineServiceFee + calc.fineServiceVat)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Invoice Summary</h2>
        <table>
          <thead><tr><th>Subtotal</th><th>VAT</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
          <tbody>
            <tr><td>${PCR.formatCurrency(invoice?.subtotal ?? calc.rentalBase)}</td><td>${PCR.formatCurrency(invoice?.vat ?? calc.rentalVat)}</td><td>${PCR.formatCurrency(invoice?.total ?? calc.total)}</td><td>${PCR.formatCurrency(contract.paidAmount || invoice?.paid || 0)}</td><td>${PCR.formatCurrency(contract.dueAmount || invoice?.balance || 0)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Terms and Conditions</h2>
        <ul class="terms">
          ${terms.map((t) => `<li>${PCR.escapeHTML(t)}</li>`).join("")}
        </ul>
      </div>

      <div class="section">
        <h2>Vehicle Check Card</h2>
        <div class="check-card">
          <div class="vehicle-view"><strong>Front View</strong><br><br>Mark scratches, dents, and glass issues here.</div>
          <div class="vehicle-view"><strong>Rear View</strong><br><br>Mark scratches, dents, and bumper damage here.</div>
          <div class="vehicle-view"><strong>Left Side</strong><br><br>Mark panel, wheel, and mirror issues here.</div>
          <div class="vehicle-view"><strong>Right Side</strong><br><br>Mark panel, wheel, and mirror issues here.</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;">
          <div class="vehicle-view">Fuel Level<br><br>□ Full □ 3/4 □ 1/2 □ 1/4</div>
          <div class="vehicle-view">Odometer<br><br>${PCR.escapeHTML(String(vehicle?.odometer || ""))}</div>
          <div class="vehicle-view">Interior<br><br>Seat / dashboard / AC checks</div>
          <div class="vehicle-view">Remarks<br><br>________________________</div>
        </div>
      </div>

      <div class="signature">
        <div class="sign-box">Customer Signature<br><br>Name: ${PCR.escapeHTML(customer?.fullName || "")}</div>
        <div class="sign-box">Company Representative<br><br>Name: __________________</div>
        <div class="sign-box">Vehicle Handover<br><br>Date/Time: __________________</div>
      </div>
    `;
  };

  PCR.buildInvoicePrintHTML = (invoice, contract, customer, vehicle) => {
    const settings = getSettings();
    return `
      <div class="doc-head">
        <div class="brand">
          <img src="assets/img/logo.png" alt="Logo">
          <div>
            <h1>${PCR.escapeHTML(settings.companyName)}</h1>
            <p>TRN ${PCR.escapeHTML(settings.trn)} · ${PCR.escapeHTML(settings.phone)}</p>
            <p>${(settings.emails || []).map(PCR.escapeHTML).join(" · ")}</p>
          </div>
        </div>
        <div class="meta">
          <div class="pill">Tax Invoice</div><br>
          Invoice No: <strong>${PCR.escapeHTML(invoice.invoiceNumber)}</strong><br>
          Contract No: ${PCR.escapeHTML(contract?.contractNumber || invoice.contractId)}<br>
          Issue Date: ${PCR.escapeHTML(PCR.formatDate(invoice.issueDate))}<br>
          Status: ${PCR.escapeHTML(invoice.status)}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Billed To</h3>
          <div><strong>${PCR.escapeHTML(customer?.fullName || "")}</strong></div>
          <div>${PCR.escapeHTML(customer?.mobile || "")}</div>
          <div>${PCR.escapeHTML(customer?.email || "")}</div>
          <div>${PCR.escapeHTML(customer?.companyName || "")}</div>
        </div>
        <div class="card">
          <h3>Vehicle</h3>
          <div><strong>${PCR.escapeHTML(vehicle?.vehicleNumber || "")}</strong></div>
          <div>${PCR.escapeHTML(vehicle?.make || "")} ${PCR.escapeHTML(vehicle?.model || "")}</div>
          <div>Plate: ${PCR.escapeHTML(vehicle?.plateNumber || "")}</div>
          <div>VIN: ${PCR.escapeHTML(vehicle?.vin || "")}</div>
        </div>
      </div>

      <div class="section">
        <table>
          <thead><tr><th>Description</th><th>Amount</th><th>VAT</th><th>Total</th></tr></thead>
          <tbody>
            ${(invoice.lineItems || []).map((line) => `<tr><td>${PCR.escapeHTML(line.label)}${line.note ? `<div class="muted">${PCR.escapeHTML(line.note)}</div>` : ""}</td><td>${PCR.formatCurrency(line.amount)}</td><td>${PCR.formatCurrency(line.vat)}</td><td>${PCR.formatCurrency(line.total)}</td></tr>`).join("")}
          </tbody>
          <tfoot>
            <tr><th>Subtotal</th><th>${PCR.formatCurrency(invoice.subtotal)}</th><th>${PCR.formatCurrency(invoice.vat)}</th><th>${PCR.formatCurrency(invoice.total)}</th></tr>
            <tr><th>Paid</th><th>${PCR.formatCurrency(invoice.paid)}</th><th>Balance</th><th>${PCR.formatCurrency(invoice.balance)}</th></tr>
          </tfoot>
        </table>
      </div>

      <div class="section card">
        <h3>Invoice Notes</h3>
        <div>${PCR.escapeHTML(invoice.notes || "Thank you for choosing Premium Car Rental UAE.")}</div>
      </div>

      <div class="signature">
        <div class="sign-box">Prepared By<br><br>Accounts Department</div>
        <div class="sign-box">Authorized Signature<br><br>__________________</div>
        <div class="sign-box">Company Stamp<br><br>__________________</div>
      </div>
    `;
  };

  PCR.buildReceiptPrintHTML = (receipt, invoice, contract, customer) => {
    const settings = getSettings();
    return `
      <div class="doc-head">
        <div class="brand">
          <img src="assets/img/logo.png" alt="Logo">
          <div>
            <h1>${PCR.escapeHTML(settings.companyName)}</h1>
            <p>TRN ${PCR.escapeHTML(settings.trn)} · ${PCR.escapeHTML(settings.phone)}</p>
            <p>${(settings.emails || []).map(PCR.escapeHTML).join(" · ")}</p>
          </div>
        </div>
        <div class="meta">
          <div class="pill">Payment Receipt</div><br>
          Receipt No: <strong>${PCR.escapeHTML(receipt.receiptNumber)}</strong><br>
          Invoice No: ${PCR.escapeHTML(invoice?.invoiceNumber || receipt.invoiceId)}<br>
          Contract No: ${PCR.escapeHTML(contract?.contractNumber || receipt.contractId)}<br>
          Date: ${PCR.escapeHTML(PCR.formatDateTime(receipt.receivedDate))}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Received From</h3>
          <div><strong>${PCR.escapeHTML(customer?.fullName || "")}</strong></div>
          <div>${PCR.escapeHTML(customer?.mobile || "")}</div>
          <div>${PCR.escapeHTML(customer?.email || "")}</div>
        </div>
        <div class="card">
          <h3>Payment Details</h3>
          <div>Method: <strong>${PCR.escapeHTML(receipt.method)}</strong></div>
          <div>Amount: <strong>${PCR.formatCurrency(receipt.amount)}</strong></div>
          <div>Balance After: <strong>${PCR.formatCurrency(receipt.balanceAfter)}</strong></div>
        </div>
      </div>

      <div class="section card">
        <h3>Notes</h3>
        <div>${PCR.escapeHTML(receipt.notes || "Payment received and posted to account.")}</div>
      </div>

      <div class="signature">
        <div class="sign-box">Cashier / Accounts<br><br>__________________</div>
        <div class="sign-box">Customer Signature<br><br>__________________</div>
        <div class="sign-box">Stamp<br><br>__________________</div>
      </div>
    `;
  };

  PCR.buildStatementPrintHTML = (customer) => {
    const ledger = PCR.getModuleData("ledger").filter((l) => String(l.customerId) === String(customer.id));
    const account = PCR.getModuleData("accounts").find((a) => String(a.customerId) === String(customer.id));
    return `
      <div class="doc-head">
        <div class="brand">
          <img src="assets/img/logo.png" alt="Logo">
          <div>
            <h1>${PCR.escapeHTML(getSettings().companyName)}</h1>
            <p>Statement of Account · TRN ${PCR.escapeHTML(getSettings().trn)}</p>
          </div>
        </div>
        <div class="meta">
          Customer: <strong>${PCR.escapeHTML(customer.fullName)}</strong><br>
          Mobile: ${PCR.escapeHTML(customer.mobile || "")}<br>
          Closing Balance: ${PCR.formatCurrency(account?.closingBalance || 0)}
        </div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Ref Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Narration</th></tr></thead>
        <tbody>
          ${ledger.map((row) => `<tr><td>${PCR.escapeHTML(row.date)} ${PCR.escapeHTML(row.time || "")}</td><td>${PCR.escapeHTML(row.refType)}</td><td>${PCR.escapeHTML(row.reference)}</td><td>${PCR.formatCurrency(row.debit)}</td><td>${PCR.formatCurrency(row.credit)}</td><td>${PCR.formatCurrency(row.balance)}</td><td>${PCR.escapeHTML(row.narration || "")}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  };

  PCR.buildVehicleCheckHTML = (contract, customer, vehicle) => {
    return `
      <div class="doc-head">
        <div class="brand">
          <img src="assets/img/logo.png" alt="Logo">
          <div>
            <h1>${PCR.escapeHTML(getSettings().companyName)}</h1>
            <p>Vehicle Check Card · Contract ${PCR.escapeHTML(contract.contractNumber)}</p>
          </div>
        </div>
        <div class="meta">
          Customer: <strong>${PCR.escapeHTML(customer?.fullName || "")}</strong><br>
          Vehicle: ${PCR.escapeHTML(vehicle?.vehicleNumber || "")}<br>
          Plate: ${PCR.escapeHTML(vehicle?.plateNumber || "")}
        </div>
      </div>
      <div class="vehicle-grid">
        <div><strong>Front</strong><br><br>Mark all damage/scratch zones.</div>
        <div><strong>Rear</strong><br><br>Mark all damage/scratch zones.</div>
        <div><strong>Left Side</strong><br><br>Mark all damage/scratch zones.</div>
        <div><strong>Right Side</strong><br><br>Mark all damage/scratch zones.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px;">
        <div class="card">Fuel level: □ Full □ 3/4 □ 1/2 □ 1/4</div>
        <div class="card">Odometer: ${PCR.escapeHTML(String(vehicle?.odometer || ""))}</div>
        <div class="card">Interior / Notes: __________________</div>
      </div>
      <div class="signature">
        <div class="sign-box">Customer signature</div>
        <div class="sign-box">Staff signature</div>
        <div class="sign-box">Date / Time</div>
      </div>
    `;
  };

  PCR.renderDashboard = () => {
    const vehicles = PCR.getModuleData("vehicles");
    const customers = PCR.getModuleData("customers");
    const contracts = PCR.getModuleData("contracts");
    const invoices = PCR.getModuleData("invoices");
    const maintenance = PCR.getModuleData("maintenance");
    const fines = PCR.getModuleData("fines");
    const tolls = PCR.getModuleData("tolls");
    const accounts = PCR.getModuleData("accounts");

    const activeContracts = contracts.filter((c) => String(c.status).toLowerCase() === "active");
    const rentedVehicles = vehicles.filter((v) => String(v.availability).toLowerCase() === "unavailable");
    const availableVehicles = vehicles.filter((v) => String(v.availability).toLowerCase() === "available");
    const pendingMaintenance = maintenance.filter((m) => String(m.status).toLowerCase() !== "closed");
    const unpaidFines = fines.filter((f) => String(f.status).toLowerCase() !== "paid");
    const unpaidTolls = tolls.filter((t) => String(t.status).toLowerCase() !== "paid");
    const outstanding = PCR.ROUND(accounts.reduce((s, a) => s + PCR.toNumber(a.closingBalance), 0));
    const monthlyIncome = PCR.ROUND(invoices.reduce((s, i) => s + PCR.toNumber(i.paid), 0));
    const vatCollected = PCR.ROUND(invoices.reduce((s, i) => s + PCR.toNumber(i.vat), 0));

    const recentContracts = [...contracts].slice(0, 5);
    const recentInvoices = [...invoices].slice(0, 5);
    const latestActivity = [...recentInvoices.map(x => ({ label: `Invoice ${x.invoiceNumber}`, date: x.issueDate })), ...recentContracts.map(x => ({ label: `Contract ${x.contractNumber}`, date: x.contractDate }))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);

    const monthlySeries = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - idx));
      const monthKey = d.toISOString().slice(0, 7);
      const total = invoices.filter((inv) => String(inv.issueDate || "").startsWith(monthKey)).reduce((s, inv) => s + PCR.toNumber(inv.paid), 0);
      return { label: d.toLocaleString("en-GB", { month: "short" }), value: total };
    });
    const maxSeries = Math.max(...monthlySeries.map((x) => x.value), 1);

    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">Premium command center</p>
          <h1>Dashboard</h1>
          <p class="lead">Vehicle fleet, contract pipeline, accounts, invoices, tolls, and fines in one static operations workspace.</p>
        </div>
        <div class="page-actions">
          <button class="btn ghost" id="quickImport">Import JSON</button>
          <button class="btn secondary" id="quickExport">Download Backup</button>
          <button class="btn primary" id="quickContract">New Contract</button>
        </div>
      </section>

      <section class="stats-grid">
        ${[
          ["Total Vehicles", vehicles.length],
          ["Available Vehicles", availableVehicles.length],
          ["Rented Vehicles", rentedVehicles.length],
          ["Active Customers", customers.length],
          ["Active Contracts", activeContracts.length],
          ["Renewals Due", PCR.getModuleData("renewals").length],
          ["Pending Maintenance", pendingMaintenance.length],
          ["Unpaid Fines", unpaidFines.length],
          ["Unpaid Tolls", unpaidTolls.length],
          ["Outstanding Balance", PCR.formatCurrency(outstanding)],
          ["Monthly Income", PCR.formatCurrency(monthlyIncome)],
          ["VAT Collected", PCR.formatCurrency(vatCollected)],
        ].map(([label, value]) => `<div class="stat-card"><span>${PCR.escapeHTML(label)}</span><strong>${PCR.escapeHTML(String(value))}</strong></div>`).join("")}
      </section>

      <section class="dashboard-grid">
        <div class="panel">
          <div class="panel-head"><h3>Revenue Trend</h3><span>Last 6 months</span></div>
          <div class="chart">
            ${monthlySeries.map((m) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(18, (m.value / maxSeries) * 100)}%"></div><small>${PCR.escapeHTML(m.label)}<br>${PCR.formatCurrency(m.value)}</small></div>`).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Recent Activity</h3><span>Latest documents and contracts</span></div>
          <div class="activity-list">
            ${latestActivity.map((a) => `<div class="activity-item"><strong>${PCR.escapeHTML(a.label)}</strong><span>${PCR.escapeHTML(PCR.formatDate(a.date))}</span></div>`).join("")}
          </div>
        </div>
      </section>

      <section class="dashboard-grid">
        <div class="panel">
          <div class="panel-head"><h3>Quick Documents</h3><span>Print-ready views</span></div>
          <div class="quick-grid">
            <button class="doc-btn" data-quick-doc="contract">Latest Contract</button>
            <button class="doc-btn" data-quick-doc="invoice">Latest Invoice</button>
            <button class="doc-btn" data-quick-doc="receipt">Latest Receipt</button>
            <button class="doc-btn" data-quick-doc="statement">Customer Statement</button>
            <button class="doc-btn" data-quick-doc="check">Vehicle Check Card</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Operational Alerts</h3><span>What needs attention</span></div>
          <ul class="alert-list">
            <li>Vehicle maintenance due: <strong>${pendingMaintenance.length}</strong></li>
            <li>Unmatched toll/fine items: <strong>${[...fines, ...tolls].filter(r => String(r.assignmentStatus).toLowerCase() === "unmatched").length}</strong></li>
            <li>Contracts still active: <strong>${activeContracts.length}</strong></li>
          </ul>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Latest Contracts</h3><span>Quick look</span></div>
        ${PCR.renderTable("contracts", recentContracts, { print: true, edit: true, close: true, delete: true })}
      </section>
    `;

    document.getElementById("quickExport")?.addEventListener("click", PCR.exportAllJSON);
    document.getElementById("quickImport")?.addEventListener("click", () => location.href = "json.html");
    document.getElementById("quickContract")?.addEventListener("click", () => PCR.renderContractModal(null, (data) => {
      PCR.saveRecord("contracts", data);
    }));

    document.querySelectorAll("[data-quick-doc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.quickDoc;
        if (key === "contract") {
          const c = PCR.getModuleData("contracts")[0];
          if (c) PCR.printContract(c.id);
        } else if (key === "invoice") {
          const inv = PCR.getModuleData("invoices")[0];
          if (inv) PCR.printInvoice(inv.id);
        } else if (key === "receipt") {
          const rec = PCR.getModuleData("receipts")[0];
          if (rec) PCR.printReceipt(rec.id);
        } else if (key === "statement") {
          const cust = PCR.getModuleData("customers")[0];
          if (cust) PCR.printStatement(cust.id);
        } else if (key === "check") {
          const c = PCR.getModuleData("contracts")[0];
          if (c) PCR.printVehicleCheck(c.id);
        }
      });
    });
  };

  PCR.renderModulePage = (module) => {
    const conf = window.PCR_CONFIG.modules[module];
    const items = sortItems(module, PCR.getModuleData(module));
    const query = searchInput?.value || "";
    const filtered = filterItems(module, items, query);

    const hasForm = Boolean(conf.formFields || conf.formType === "contract");
    const canAdd = !["accounts","ledger","invoices","receipts","settings"].includes(module);

    const summaryText = `${filtered.length} record(s) · ${items.length} total`;
    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">${PCR.escapeHTML(conf.icon)} ${PCR.escapeHTML(conf.title)}</p>
          <h1>${PCR.escapeHTML(conf.title)}</h1>
          <p class="lead">${PCR.escapeHTML(conf.title)} management with browser storage, JSON import/export, and printable business records.</p>
        </div>
        <div class="page-actions">
          <button class="btn ghost" id="importBtn">Import JSON</button>
          <button class="btn secondary" id="exportBtn">Download JSON</button>
          ${canAdd ? `<button class="btn primary" id="addBtn">${module === "contracts" ? "New Contract" : `Add ${conf.title.slice(0,-1)}`}</button>` : ""}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>${PCR.escapeHTML(conf.title)}</h3>
          <span>${PCR.escapeHTML(summaryText)}</span>
        </div>
        <div class="toolbar">
          <input class="input" id="moduleSearch" placeholder="Search ${PCR.escapeHTML(conf.title.toLowerCase())}..." value="${PCR.escapeHTML(query)}">
          <button class="btn ghost" id="clearSearch">Clear</button>
          <button class="btn ghost" id="resetModule">Reset Session</button>
        </div>
        <div id="moduleTable">${PCR.renderTable(module, filtered, {
          print: module === "contracts" || module === "invoices" || module === "receipts",
          edit: canAdd,
          close: module === "contracts",
          delete: canAdd
        })}</div>
      </section>
    `;

    document.getElementById("moduleSearch")?.addEventListener("input", (e) => {
      if (searchInput) searchInput.value = e.target.value;
      renderPage();
    });
    document.getElementById("clearSearch")?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      const local = document.getElementById("moduleSearch");
      if (local) local.value = "";
      renderPage();
    });
    document.getElementById("resetModule")?.addEventListener("click", () => {
      if (confirm("Clear all local data and restore the seed dataset?")) {
        PCR.resetLocalData();
        location.reload();
      }
    });
    document.getElementById("importBtn")?.addEventListener("click", () => document.getElementById("importFile")?.click());
    document.getElementById("exportBtn")?.addEventListener("click", () => {
      if (module === "settings") {
        PCR.downloadBlob("settings.json", JSON.stringify(PCR.getModuleData("settings"), null, 2));
      } else {
        PCR.exportModuleJSON(module);
      }
    });
    document.getElementById("addBtn")?.addEventListener("click", () => {
      if (module === "contracts") {
        PCR.renderContractModal(null, (data) => PCR.saveRecord("contracts", data));
      } else {
        PCR.renderGenericForm(module, null, (data) => PCR.saveRecord(module, data));
      }
    });

    const table = document.getElementById("moduleTable");
    table?.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === "edit") {
          const rec = PCR.getModuleData(module).find((x) => String(x.id) === String(id));
          if (module === "contracts") PCR.renderContractModal(rec, (data) => PCR.saveRecord("contracts", data));
          else PCR.renderGenericForm(module, rec, (data) => PCR.saveRecord(module, data));
        } else if (action === "delete") {
          PCR.deleteRecord(module, id);
        } else if (action === "close") {
          PCR.closeContract(id);
        } else if (action === "print") {
          if (module === "contracts") PCR.printContract(id);
          if (module === "invoices") PCR.printInvoice(id);
          if (module === "receipts") PCR.printReceipt(id);
        }
      });
    });
  };

  PCR.renderSettingsPage = () => {
    const s = getSettings();
    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">⚙️ Company profile</p>
          <h1>Settings</h1>
          <p class="lead">Update legal details, VAT defaults, theme colors, numbering, and document footers.</p>
        </div>
        <div class="page-actions">
          <button class="btn secondary" id="saveSettingsBtn">Save Settings</button>
        </div>
      </section>
      <section class="panel">
        <form id="settingsForm" class="settings-grid">
          ${PCR.renderField({name:"companyName", label:"Company Name", type:"text", required:true}, s.companyName)}
          ${PCR.renderField({name:"trn", label:"TRN", type:"text", required:true}, s.trn)}
          ${PCR.renderField({name:"phone", label:"Phone", type:"text"}, s.phone)}
          ${PCR.renderField({name:"currency", label:"Currency", type:"text"}, s.currency)}
          ${PCR.renderField({name:"vatRate", label:"VAT Rate", type:"number"}, s.vatRate)}
          ${PCR.renderField({name:"rentalVatRate", label:"Rental VAT Rate", type:"number"}, s.rentalVatRate)}
          ${PCR.renderField({name:"salikVatRate", label:"Salik VAT Rate", type:"number"}, s.salikVatRate)}
          ${PCR.renderField({name:"darbVatRate", label:"Darb VAT Rate", type:"number"}, s.darbVatRate)}
          ${PCR.renderField({name:"fineServiceRate", label:"Fine Service Rate", type:"number"}, s.fineServiceRate)}
          ${PCR.renderField({name:"fineServiceVatRate", label:"Fine Service VAT Rate", type:"number"}, s.fineServiceVatRate)}
          ${PCR.renderField({name:"depositDefault", label:"Default Deposit", type:"number"}, s.depositDefault)}
          <label class="field span-2"><span>Email Addresses (comma separated)</span><input class="input" name="emailsText" type="text" value="${PCR.escapeHTML((s.emails || []).join(", "))}"></label>
          <label class="field span-2"><span>Document Footer Text</span><textarea class="input" name="documentFooterText" rows="3">${PCR.escapeHTML(s.documentFooterText || "")}</textarea></label>
          <label class="field span-2"><span>Terms and Conditions</span><textarea class="input" name="termsText" rows="8">${PCR.escapeHTML((s.terms || []).join("\n"))}</textarea></label>
          <label class="field span-2"><span>Theme Accent</span><input class="input" name="accent" type="text" value="${PCR.escapeHTML(s.theme?.accent || "")}"></label>
          <label class="field span-2"><span>Theme Secondary</span><input class="input" name="accent2" type="text" value="${PCR.escapeHTML(s.theme?.accent2 || "")}"></label>
          <label class="field"><span>Theme Background</span><input class="input" name="bg" type="text" value="${PCR.escapeHTML(s.theme?.bg || "")}"></label>
          <label class="field"><span>Theme Panel</span><input class="input" name="panel" type="text" value="${PCR.escapeHTML(s.theme?.panel || "")}"></label>
          <label class="field"><span>Theme Text</span><input class="input" name="text" type="text" value="${PCR.escapeHTML(s.theme?.text || "")}"></label>
        </form>
      </section>
    `;
    document.getElementById("saveSettingsBtn")?.addEventListener("click", () => {
      const form = document.getElementById("settingsForm");
      const values = PCR.collectFormData(form);
      const updated = {
        ...s,
        companyName: values.companyName,
        trn: values.trn,
        phone: values.phone,
        currency: values.currency,
        vatRate: Number(values.vatRate || 0),
        rentalVatRate: Number(values.rentalVatRate || 0),
        salikVatRate: Number(values.salikVatRate || 0),
        darbVatRate: Number(values.darbVatRate || 0),
        fineServiceRate: Number(values.fineServiceRate || 0),
        fineServiceVatRate: Number(values.fineServiceVatRate || 0),
        depositDefault: Number(values.depositDefault || 0),
        emails: String(values.emailsText || "").split(",").map((x) => x.trim()).filter(Boolean),
        documentFooterText: values.documentFooterText,
        terms: String(values.termsText || "").split("\n").map((x) => x.trim()).filter(Boolean),
        theme: {
          ...(s.theme || {}),
          accent: values.accent,
          accent2: values.accent2,
          bg: values.bg,
          panel: values.panel,
          text: values.text
        }
      };
      PCR.saveRecord("settings", updated);
      applyTheme(updated.theme);
      PCR.toast("Settings saved.", "success");
    });
  };

  PCR.renderJSONPage = () => {
    const modules = Object.keys(window.PCR_CONFIG.modules);
    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">JSON Import / Export</p>
          <h1>Data Transfer</h1>
          <p class="lead">Import or export every module individually, or download one full backup file.</p>
        </div>
        <div class="page-actions">
          <button class="btn secondary" id="exportAllBtn">Download Full Backup</button>
          <button class="btn ghost" id="resetAllBtn">Reset Session Data</button>
        </div>
      </section>
      <section class="panel">
        <div class="json-grid">
          ${modules.map((m) => {
            const conf = window.PCR_CONFIG.modules[m];
            return `
              <div class="json-card">
                <div class="json-card-head">
                  <div>
                    <strong>${PCR.escapeHTML(conf.title)}</strong>
                    <div class="muted">${PCR.getModuleData(m).length} record(s)</div>
                  </div>
                  <div class="badge ${PCR.statusClass("available")}">Ready</div>
                </div>
                <div class="json-actions">
                  <button class="btn ghost" data-export-module="${m}">Download JSON</button>
                  <button class="btn secondary" data-import-module="${m}">Import JSON</button>
                </div>
                <input type="file" accept=".json,application/json" hidden data-file-input="${m}">
              </div>
            `;
          }).join("")}
        </div>
        <input type="file" accept=".json,application/json" hidden id="bundleInput">
      </section>
    `;

    document.getElementById("exportAllBtn")?.addEventListener("click", PCR.exportAllJSON);
    document.getElementById("resetAllBtn")?.addEventListener("click", () => {
      if (confirm("Reset all local data?")) {
        PCR.resetLocalData();
        renderPage();
      }
    });
    document.querySelectorAll("[data-export-module]").forEach((btn) => {
      btn.addEventListener("click", () => PCR.exportModuleJSON(btn.dataset.exportModule));
    });
    document.querySelectorAll("[data-import-module]").forEach((btn) => {
      btn.addEventListener("click", () => document.querySelector(`[data-file-input="${btn.dataset.importModule}"]`)?.click());
    });
    document.querySelectorAll("[data-file-input]").forEach((input) => {
      input.addEventListener("change", () => PCR.importModuleFile(input.dataset.fileInput, input));
    });
  };

  PCR.renderReportsPage = () => {
    const contracts = PCR.getModuleData("contracts");
    const invoices = PCR.getModuleData("invoices");
    const fines = PCR.getModuleData("fines");
    const tolls = PCR.getModuleData("tolls");
    const outstanding = PCR.getModuleData("accounts").reduce((s, a) => s + PCR.toNumber(a.closingBalance), 0);
    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">Reports</p>
          <h1>Business Reports</h1>
          <p class="lead">Revenue, VAT, outstanding balances, utilization, and charge summaries.</p>
        </div>
      </section>
      <section class="stats-grid">
        <div class="stat-card"><span>Contracts</span><strong>${contracts.length}</strong></div>
        <div class="stat-card"><span>Invoices</span><strong>${invoices.length}</strong></div>
        <div class="stat-card"><span>Fines</span><strong>${fines.length}</strong></div>
        <div class="stat-card"><span>Tolls</span><strong>${tolls.length}</strong></div>
        <div class="stat-card"><span>Outstanding</span><strong>${PCR.formatCurrency(outstanding)}</strong></div>
        <div class="stat-card"><span>VAT</span><strong>${PCR.formatCurrency(PCR.sum(invoices, "vat"))}</strong></div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Exportable Summary</h3><span>Use print to save as PDF</span></div>
        <table class="data-table">
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Total rental income</td><td>${PCR.formatCurrency(PCR.sum(invoices, "paid"))}</td></tr>
            <tr><td>Invoice balance outstanding</td><td>${PCR.formatCurrency(PCR.sum(invoices, "balance"))}</td></tr>
            <tr><td>Traffic fines total</td><td>${PCR.formatCurrency(PCR.sum(fines, "total"))}</td></tr>
            <tr><td>Salik / Darb total</td><td>${PCR.formatCurrency(PCR.sum(tolls, "total"))}</td></tr>
          </tbody>
        </table>
      </section>
    `;
  };

  PCR.renderDocumentsPage = () => {
    const contracts = PCR.getModuleData("contracts");
    const invoices = PCR.getModuleData("invoices");
    const receipts = PCR.getModuleData("receipts");
    const customers = PCR.getModuleData("customers");

    app.innerHTML = `
      <section class="page-head">
        <div>
          <p class="eyebrow">Documents</p>
          <h1>Print-ready Templates</h1>
          <p class="lead">Contracts, invoices, receipts, statements, and vehicle check cards.</p>
        </div>
      </section>

      <section class="panel">
        <div class="doc-actions-grid">
          <div class="doc-action-card">
            <strong>Rental Contract</strong>
            <select class="input" id="docContract">${contracts.map((c) => `<option value="${PCR.escapeHTML(c.id)}">${PCR.escapeHTML(c.contractNumber)}</option>`).join("")}</select>
            <button class="btn primary" id="printDocContract">Print Contract</button>
          </div>
          <div class="doc-action-card">
            <strong>Invoice</strong>
            <select class="input" id="docInvoice">${invoices.map((c) => `<option value="${PCR.escapeHTML(c.id)}">${PCR.escapeHTML(c.invoiceNumber)}</option>`).join("")}</select>
            <button class="btn primary" id="printDocInvoice">Print Invoice</button>
          </div>
          <div class="doc-action-card">
            <strong>Receipt</strong>
            <select class="input" id="docReceipt">${receipts.map((c) => `<option value="${PCR.escapeHTML(c.id)}">${PCR.escapeHTML(c.receiptNumber)}</option>`).join("")}</select>
            <button class="btn primary" id="printDocReceipt">Print Receipt</button>
          </div>
          <div class="doc-action-card">
            <strong>Statement</strong>
            <select class="input" id="docCustomer">${customers.map((c) => `<option value="${PCR.escapeHTML(c.id)}">${PCR.escapeHTML(c.fullName)}</option>`).join("")}</select>
            <button class="btn primary" id="printDocStatement">Print Statement</button>
          </div>
        </div>
        <div class="doc-action-card" style="margin-top:16px;">
          <strong>Vehicle Check Card</strong>
          <select class="input" id="docCheck">${contracts.map((c) => `<option value="${PCR.escapeHTML(c.id)}">${PCR.escapeHTML(c.contractNumber)} · ${PCR.escapeHTML(c.vehicleNumber || "")}</option>`).join("")}</select>
          <button class="btn primary" id="printDocCheck">Print Check Card</button>
        </div>
      </section>
    `;
    document.getElementById("printDocContract")?.addEventListener("click", () => PCR.printContract(document.getElementById("docContract").value));
    document.getElementById("printDocInvoice")?.addEventListener("click", () => PCR.printInvoice(document.getElementById("docInvoice").value));
    document.getElementById("printDocReceipt")?.addEventListener("click", () => PCR.printReceipt(document.getElementById("docReceipt").value));
    document.getElementById("printDocStatement")?.addEventListener("click", () => PCR.printStatement(document.getElementById("docCustomer").value));
    document.getElementById("printDocCheck")?.addEventListener("click", () => PCR.printVehicleCheck(document.getElementById("docCheck").value));
  };

  const applyTheme = (theme) => {
    const t = theme || getSettings().theme || {};
    const root = document.documentElement;
    if (t.bg) root.style.setProperty("--bg", t.bg);
    if (t.panel) root.style.setProperty("--panel", t.panel);
    if (t.panel2) root.style.setProperty("--panel-2", t.panel2);
    if (t.accent) root.style.setProperty("--accent", t.accent);
    if (t.accent2) root.style.setProperty("--accent-2", t.accent2);
    if (t.text) root.style.setProperty("--text", t.text);
    if (t.muted) root.style.setProperty("--muted", t.muted);
  };

  const renderPage = () => {
    ensureState();
    PCR.ensureContractLinks();
    PCR.reassignTollsAndFines();
    PCR.rebuildLedger();
    PCR.rebuildAccounts();
    PCR.saveState();
    setActiveNav();
    PCR.setDirty(false);
    applyTheme(getSettings().theme);

    const title = window.PCR_CONFIG.modules[currentModule]?.title || "Dashboard";
    PCR.setHeader(title, page === "index" ? "Premium command center" : "Browser-stored static management workspace");

    if (page === "index") PCR.renderDashboard();
    else if (page === "settings") PCR.renderSettingsPage();
    else if (page === "json") PCR.renderJSONPage();
    else if (page === "reports") PCR.renderReportsPage();
    else if (page === "documents") PCR.renderDocumentsPage();
    else if (window.PCR_CONFIG.modules[currentModule]) PCR.renderModulePage(currentModule);
    else PCR.renderDashboard();

    wireTopActions();
  };

  const init = () => {
    ensureState();
    applyTheme(getSettings().theme);
    renderPage();

    if (searchInput && currentModule !== "dashboard" && currentModule !== "settings" && currentModule !== "json" && currentModule !== "reports" && currentModule !== "documents") {
      searchInput.addEventListener("input", () => renderPage());
    }
  };

  window.addEventListener("storage", () => {
    PCR.loadState();
    renderPage();
  });

  document.addEventListener("DOMContentLoaded", init);
})();
