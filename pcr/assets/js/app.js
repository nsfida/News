(() => {
  const W = window;

  const NAV = [
    { page: "index", label: "Dashboard", icon: "⌂" },
    { page: "vehicles", label: "Vehicles", icon: "🚘" },
    { page: "customers", label: "Customers", icon: "👤" },
    { page: "contracts", label: "Contracts", icon: "📄" },
    { page: "renewals", label: "Renewals", icon: "🔁" },
    { page: "accounts", label: "Accounts", icon: "💳" },
    { page: "ledger", label: "Ledger", icon: "📒" },
    { page: "maintenance", label: "Maintenance", icon: "🛠️" },
    { page: "fines", label: "Traffic Fines", icon: "🚨" },
    { page: "charges", label: "Other Charges", icon: "🧾" },
    { page: "reports", label: "Reports", icon: "📊" },
    { page: "json", label: "JSON Sync", icon: "⬇️" },
    { page: "settings", label: "Settings", icon: "⚙️" },
  ];

  const MODULE_PAGES = ["vehicles", "customers", "contracts", "renewals", "accounts", "ledger", "maintenance", "fines", "charges"];

  const state = {
    search: "",
    filter: "all",
    sort: "newest",
    lastSavedLabel: "Saved locally",
    activeSection: document.body.dataset.page || "index",
    editing: null,
  };

  function shell() {
    const settings = W.PCR_STORE.settings || W.PCR_DEFAULT_DATA.settings;
    return `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">PCR</div>
            <div>
              <h1>${W.PCR.escapeHTML(settings.companyName || "Premium Car Rental UAE")}</h1>
              <p>${W.PCR.escapeHTML(settings.brandTagline || "Luxury mobility, precise operations.")}</p>
            </div>
          </div>

          <nav class="nav">
            ${NAV.map((item) => `
              <a class="nav-link ${item.page === state.activeSection ? "active" : ""}" href="${item.page === "index" ? "index.html" : item.page + ".html"}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join("")}
          </nav>

          <div class="sidebar-footer">
            <div class="contact-line">Phone: <a href="tel:${W.PCR.escapeHTML(settings.phone || "")}">${W.PCR.escapeHTML(settings.phone || "")}</a></div>
            <div class="contact-line"><a href="mailto:${W.PCR.escapeHTML(settings.emailPrimary || "")}">${W.PCR.escapeHTML(settings.emailPrimary || "")}</a></div>
            <div class="contact-line"><a href="mailto:${W.PCR.escapeHTML(settings.emailOperations || "")}">${W.PCR.escapeHTML(settings.emailOperations || "")}</a></div>
            <div class="contact-line"><a href="mailto:${W.PCR.escapeHTML(settings.emailAccounts || "")}">${W.PCR.escapeHTML(settings.emailAccounts || "")}</a></div>
          </div>
        </aside>

        <div class="content">
          <header class="topbar">
            <div class="topbar-left">
              <div class="page-kicker">${W.PCR.getModuleConfig(state.activeSection).icon || "✨"} ${W.PCR.escapeHTML(W.PCR.getModuleConfig(state.activeSection).title || "Dashboard")}</div>
              <div class="page-subtitle">${W.PCR.escapeHTML(settings.brandTagline || "Luxury mobility, precise operations.")}</div>
            </div>
            <div class="topbar-right">
              <div class="search-box ${["reports", "json", "settings", "index"].includes(state.activeSection) ? "search-box-hidden" : ""}">
                <input id="global-search" type="search" placeholder="${W.PCR.escapeHTML(W.PCR.getModuleConfig(state.activeSection).searchPlaceholder || "Search...")}" value="${W.PCR.escapeHTML(state.search)}" />
              </div>
              <div id="session-status" class="session-status">${W.PCR.escapeHTML(state.lastSavedLabel)}</div>
            </div>
          </header>

          <main id="page-root" class="page-root"></main>
        </div>
      </div>

      <div id="modal-host"></div>
      <div id="toast-host" class="toast-host"></div>
    `;
  }

  function setStatus(text, dirty = false) {
    const node = document.getElementById("session-status");
    if (node) {
      node.textContent = text;
      node.classList.toggle("dirty", dirty);
    }
  }

  function updateSavedLabel() {
    const t = new Date();
    state.lastSavedLabel = `Saved locally • ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setStatus(state.lastSavedLabel, false);
  }

  function markDirty() {
    setStatus("Unsaved changes", true);
  }

  function render() {
    document.getElementById("app").innerHTML = shell();
    bindTopbar();
    renderActivePage();
  }

  function bindTopbar() {
    const search = document.getElementById("global-search");
    if (search) {
      search.addEventListener("input", W.PCR.debounce((e) => {
        state.search = e.target.value || "";
        renderActivePage();
      }, 150));
    }
  }

  function getSectionItems(section) {
    return W.PCR_STORE[section] || [];
  }

  function getSearchFields(section) {
    const map = {
      vehicles: ["vehicleId", "vehicleNumber", "plateNumber", "make", "model", "chassisVin", "status"],
      customers: ["customerId", "fullName", "passportNumber", "emiratesId", "mobileNumber", "email"],
      contracts: ["contractNumber", "customerId", "vehicleId", "contractStatus", "rateType"],
      renewals: ["renewalNumber", "contractId", "status"],
      accounts: ["accountNumber", "customerId", "status"],
      ledger: ["ledgerNumber", "customerId", "contractId", "entryType", "reference"],
      maintenance: ["maintenanceId", "vehicleId", "serviceType", "garage", "status"],
      fines: ["fineNumber", "customerId", "vehicleId", "authority", "fineType", "status"],
      charges: ["chargeNumber", "customerId", "contractId", "chargeType", "status"],
    };
    return map[section] || [];
  }

  function recordText(record, field) {
    const value = record[field];
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "yes" : "no";
    return String(value).toLowerCase();
  }

  function buildSearchText(section, record) {
    const fields = getSearchFields(section);
    const raw = fields.map((field) => recordText(record, field)).join(" ");
    if (section === "contracts") {
      return [
        raw,
        W.PCR_CALC.resolveRelation("customers", record.customerId),
        W.PCR_CALC.resolveRelation("vehicles", record.vehicleId),
      ].join(" ").toLowerCase();
    }
    if (section === "renewals") {
      return [raw, W.PCR_CALC.resolveRelation("contracts", record.contractId)].join(" ").toLowerCase();
    }
    if (section === "ledger") {
      return [raw, W.PCR_CALC.resolveRelation("customers", record.customerId), W.PCR_CALC.resolveRelation("contracts", record.contractId)].join(" ").toLowerCase();
    }
    if (section === "maintenance") {
      return [raw, W.PCR_CALC.resolveRelation("vehicles", record.vehicleId)].join(" ").toLowerCase();
    }
    if (section === "fines" || section === "charges") {
      return [
        raw,
        W.PCR_CALC.resolveRelation("customers", record.customerId),
        W.PCR_CALC.resolveRelation("vehicles", record.vehicleId),
        W.PCR_CALC.resolveRelation("contracts", record.contractId),
      ].join(" ").toLowerCase();
    }
    return raw.toLowerCase();
  }

  function filterRecords(section, records) {
    const query = state.search.trim().toLowerCase();
    const statusFilter = state.filter;
    let out = [...records];

    if (statusFilter && statusFilter !== "all") {
      out = out.filter((record) => {
        const statusValue = Object.entries(record).find(([k]) => k.toLowerCase().endsWith("status"))?.[1];
        return String(statusValue || "").toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (query) {
      out = out.filter((record) => buildSearchText(section, record).includes(query));
    }

    const sortKeyMap = {
      vehicles: "vehicleNumber",
      customers: "fullName",
      contracts: "rentalStartDate",
      renewals: "newEndDate",
      accounts: "lastTransactionDate",
      ledger: "entryDate",
      maintenance: "serviceDate",
      fines: "issueDate",
      charges: "chargeDate",
    };
    const sortKey = sortKeyMap[section] || "id";
    out.sort((a, b) => {
      if (state.sort === "oldest") return String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""));
      if (state.sort === "name") return String(a.fullName || a.vehicleNumber || a.contractNumber || a.accountNumber || a.ledgerNumber || a.maintenanceId || a.fineNumber || a.chargeNumber || "").localeCompare(String(b.fullName || b.vehicleNumber || b.contractNumber || b.accountNumber || b.ledgerNumber || b.maintenanceId || b.fineNumber || b.chargeNumber || ""));
      if (state.sort === "amount") return Number(b.amount || b.totalAmount || b.currentBalance || 0) - Number(a.amount || a.totalAmount || a.currentBalance || 0);
      return String(b[sortKey] || "").localeCompare(String(a[sortKey] || ""));
    });
    return out;
  }

  function renderPageHeader(title, subtitle, actionsHtml = "") {
    return `
      <section class="page-head">
        <div>
          <h2>${W.PCR.escapeHTML(title)}</h2>
          <p>${W.PCR.escapeHTML(subtitle)}</p>
        </div>
        <div class="page-head-actions">${actionsHtml}</div>
      </section>
    `;
  }

  function actionButtons(section, cfg) {
    if (!cfg.storageKey) return "";
    return `
      <button class="btn btn-primary" data-action="add-record" data-section="${section}">Add New</button>
      <button class="btn btn-ghost" data-action="export-section" data-section="${section}">Download JSON</button>
      <label class="btn btn-ghost file-btn">
        Import JSON
        <input type="file" accept="application/json" data-action="import-file" data-section="${section}" hidden>
      </label>
    `;
  }

  function renderModuleStats(section, records) {
    const settings = W.PCR_STORE.settings || {};
    const currency = settings.currencySymbol || settings.currency || "AED";
    const stats = [];
    if (section === "vehicles") {
      stats.push(["Available", records.filter((r) => String(r.availability).toLowerCase() === "available").length]);
      stats.push(["Rented", records.filter((r) => String(r.status).toLowerCase() === "rented").length]);
      stats.push(["Under Maintenance", records.filter((r) => String(r.status).toLowerCase() === "maintenance").length]);
    } else if (section === "customers") {
      stats.push(["Active", records.filter((r) => String(r.activeContractStatus).toLowerCase() === "active").length]);
      stats.push(["Outstanding", W.PCR.formatCurrency(records.reduce((a, r) => a + Number(r.outstandingBalance || 0), 0), settings)]);
      stats.push(["Total", records.length]);
    } else if (section === "contracts") {
      stats.push(["Active", records.filter((r) => ["Active", "Overdue"].includes(r.contractStatus)).length]);
      stats.push(["Closed", records.filter((r) => ["Closed", "Completed"].includes(r.contractStatus)).length]);
      stats.push(["Open Due", W.PCR.formatCurrency(records.reduce((a, r) => a + Number(r.dueAmount || 0), 0), settings)]);
    } else if (section === "ledger") {
      stats.push(["Entries", records.length]);
      stats.push(["Debits", W.PCR.formatCurrency(records.filter((r) => ["invoice", "debit", "fine", "toll", "adjustment"].includes(String(r.entryType || "").toLowerCase())).reduce((a, r) => a + Number(r.amount || 0), 0), settings)]);
      stats.push(["Credits", W.PCR.formatCurrency(records.filter((r) => ["payment", "credit", "deposit", "refund"].includes(String(r.entryType || "").toLowerCase())).reduce((a, r) => a + Number(r.amount || 0), 0), settings)]);
    } else {
      stats.push(["Total Records", records.length]);
      stats.push(["Open", records.filter((r) => String(r.status || "").toLowerCase() === "open").length]);
      stats.push(["Value", W.PCR.formatCurrency(records.reduce((a, r) => a + Number(r.amount || r.cost || r.currentBalance || 0), 0), settings)]);
    }
    return `
      <section class="stats-strip">
        ${stats.map(([label, value]) => `
          <div class="stat-pill">
            <span>${W.PCR.escapeHTML(label)}</span>
            <strong>${W.PCR.escapeHTML(String(value))}</strong>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderModulePage(section) {
    const cfg = W.PCR.getModuleConfig(section);
    const items = filterRecords(section, getSectionItems(section));
    const statusValues = [...new Set(getSectionItems(section).map((r) => Object.entries(r).find(([k]) => k.toLowerCase().endsWith("status"))?.[1]).filter(Boolean))];
    const sortOptions = [
      ["newest", "Newest"],
      ["oldest", "Oldest"],
      ["name", "Name / Number"],
      ["amount", "Amount"],
    ];
    const controls = `
      <div class="toolbar">
        <div class="toolbar-left">
          <select data-control="filter-status">
            <option value="all">All statuses</option>
            ${statusValues.map((v) => `<option value="${W.PCR.escapeHTML(v)}" ${state.filter === v ? "selected" : ""}>${W.PCR.escapeHTML(v)}</option>`).join("")}
          </select>
          <select data-control="sort">
            ${sortOptions.map(([value, label]) => `<option value="${value}" ${state.sort === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="toolbar-right">
          <span class="toolbar-hint">Use the actions in the page header.</span>
        </div>
      </div>
    `;

    return `
      ${renderPageHeader(cfg.title, cfg.searchPlaceholder || "Manage records, keep browser storage in sync, and export clean JSON files.", actionButtons(section, cfg))}
      ${controls}
      ${renderModuleStats(section, items)}
      <section class="panel">
        ${W.PCR_TABLE.renderTable(section, items, cfg)}
      </section>
    `;
  }

  function renderDashboard() {
    const summary = W.PCR.getDashboardSummary(W.PCR_STORE);
    const settings = W.PCR_STORE.settings || {};
    const recentContracts = W.PCR.getRecent(W.PCR_STORE, "contracts", 4);
    const recentVehicles = W.PCR.getRecent(W.PCR_STORE, "vehicles", 4);
    const recentLedger = W.PCR.getRecent(W.PCR_STORE, "ledger", 5);

    return `
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Premium Car Rental UAE</div>
          <h2>Elegant rental operations for a premium UAE fleet.</h2>
          <p>Manage vehicles, customers, contracts, renewals, accounts, maintenance, fines, Salik, and JSON sync from a polished static browser app.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="contracts.html">Create Contract</a>
            <a class="btn btn-ghost" href="json.html">Import / Export JSON</a>
          </div>
        </div>
        <div class="hero-panel">
          <div class="hero-badge">Saved locally in browser storage</div>
          <div class="hero-stat">
            <span>Current month income</span>
            <strong>${W.PCR.formatCurrency(summary.monthlyIncome, settings)}</strong>
          </div>
          <div class="hero-stat">
            <span>Outstanding balance</span>
            <strong>${W.PCR.formatCurrency(summary.outstandingBalance, settings)}</strong>
          </div>
        </div>
      </section>

      <section class="metrics-grid">
        ${W.PCR_TABLE.renderSummaryCards(summary)}
      </section>

      <section class="grid-two">
        ${W.PCR_TABLE.renderMiniList("Recent Contracts", recentContracts, (r) => `
          <article class="mini-item">
            <div>
              <strong>${W.PCR.escapeHTML(r.contractNumber || "—")}</strong>
              <div>${W.PCR.escapeHTML(W.PCR_CALC.resolveRelation("customers", r.customerId))} • ${W.PCR.escapeHTML(W.PCR_CALC.resolveRelation("vehicles", r.vehicleId))}</div>
            </div>
            <span class="${W.PCR.statusBadgeClass(r.contractStatus)}">${W.PCR.escapeHTML(r.contractStatus || "—")}</span>
          </article>
        `)}
        ${W.PCR_TABLE.renderMiniList("Fleet Snapshot", recentVehicles, (r) => `
          <article class="mini-item">
            <div>
              <strong>${W.PCR.escapeHTML(r.vehicleNumber || "—")}</strong>
              <div>${W.PCR.escapeHTML(r.make || "")} ${W.PCR.escapeHTML(r.model || "")}</div>
            </div>
            <span class="${W.PCR.statusBadgeClass(r.status)}">${W.PCR.escapeHTML(r.status || "—")}</span>
          </article>
        `)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Latest Ledger Activity</h3>
            <p>Recent invoices, payments, and adjustments.</p>
          </div>
          <a class="btn btn-ghost btn-sm" href="ledger.html">Open Ledger</a>
        </div>
        <div class="mini-list">
          ${recentLedger.map((r) => `
            <article class="mini-item">
              <div>
                <strong>${W.PCR.escapeHTML(r.ledgerNumber || "—")}</strong>
                <div>${W.PCR.escapeHTML(r.narration || "")} • ${W.PCR.escapeHTML(W.PCR.formatDate(r.entryDate))}</div>
              </div>
              <div class="mini-right">
                <span class="${W.PCR.statusBadgeClass(r.entryType)}">${W.PCR.escapeHTML(r.entryType || "—")}</span>
                <strong>${W.PCR.formatCurrency(r.amount, settings)}</strong>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderReports() {
    const s = W.PCR.getDashboardSummary(W.PCR_STORE);
    const settings = W.PCR_STORE.settings || {};
    const contracts = W.PCR_STORE.contracts || [];
    const customers = [...W.PCR_STORE.customers].sort((a, b) => Number(b.outstandingBalance || 0) - Number(a.outstandingBalance || 0)).slice(0, 5);
    const vehicleStatus = [
      ["Available", W.PCR_STORE.vehicles.filter((v) => String(v.availability).toLowerCase() === "available").length],
      ["Rented", W.PCR_STORE.vehicles.filter((v) => String(v.status).toLowerCase() === "rented").length],
      ["Maintenance", W.PCR_STORE.vehicles.filter((v) => String(v.status).toLowerCase() === "maintenance").length],
    ];
    const maxVehicle = Math.max(...vehicleStatus.map(([, v]) => v), 1);
    const incomeByType = ["payment", "invoice", "fine", "toll", "adjustment"].map((type) => [
      type,
      W.PCR_STORE.ledger.filter((r) => String(r.entryType || "").toLowerCase() === type).reduce((a, r) => a + Number(r.amount || 0), 0)
    ]);
    const maxIncome = Math.max(...incomeByType.map(([, v]) => v), 1);

    return `
      ${renderPageHeader("Reports", "Operational snapshots, balance exposure, and fleet performance.")}

      <section class="metrics-grid">
        ${W.PCR_TABLE.renderSummaryCards(s)}
      </section>

      <section class="grid-two">
        <div class="panel">
          <div class="panel-head"><h3>Fleet Mix</h3></div>
          <div class="bar-list">
            ${vehicleStatus.map(([label, value]) => `
              <div class="bar-row">
                <div class="bar-top"><span>${label}</span><strong>${value}</strong></div>
                <div class="bar-track"><div class="bar-fill" style="width:${(value / maxVehicle) * 100}%"></div></div>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Income Profile</h3></div>
          <div class="bar-list">
            ${incomeByType.map(([label, value]) => `
              <div class="bar-row">
                <div class="bar-top"><span>${label}</span><strong>${W.PCR.formatCurrency(value, settings)}</strong></div>
                <div class="bar-track"><div class="bar-fill" style="width:${(value / maxIncome) * 100}%"></div></div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="grid-two">
        <div class="panel">
          <div class="panel-head"><h3>Top Outstanding Customers</h3></div>
          <div class="mini-list">
            ${customers.map((c) => `
              <article class="mini-item">
                <div>
                  <strong>${W.PCR.escapeHTML(c.fullName)}</strong>
                  <div>${W.PCR.escapeHTML(c.customerId)} • ${W.PCR.escapeHTML(c.mobileNumber || "")}</div>
                </div>
                <strong>${W.PCR.formatCurrency(c.outstandingBalance || 0, settings)}</strong>
              </article>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Contract Snapshot</h3></div>
          <div class="mini-list">
            ${contracts.slice(0, 5).map((c) => `
              <article class="mini-item">
                <div>
                  <strong>${W.PCR.escapeHTML(c.contractNumber)}</strong>
                  <div>${W.PCR.escapeHTML(W.PCR_CALC.resolveRelation("customers", c.customerId))}</div>
                </div>
                <span class="${W.PCR.statusBadgeClass(c.contractStatus)}">${W.PCR.escapeHTML(c.contractStatus)}</span>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderJsonPage() {
    const sections = ["vehicles", "customers", "contracts", "renewals", "accounts", "ledger", "maintenance", "fines", "charges", "settings"];
    return `
      ${renderPageHeader("JSON Import / Export", "Download clean JSON files per module, or import JSON back into the browser to continue working.")}

      <section class="json-grid">
        ${sections.map((section) => {
          const cfg = W.PCR.getModuleConfig(section);
          return `
            <article class="json-card">
              <div class="json-head">
                <div>
                  <h3>${cfg.icon || "⬇️"} ${W.PCR.escapeHTML(cfg.title)}</h3>
                  <p>${section === "settings" ? "Export settings.json" : `Export ${cfg.exportFile}`}</p>
                </div>
                <span class="badge">Static</span>
              </div>
              <div class="json-actions">
                ${cfg.exportFile ? `<button class="btn btn-primary" data-action="export-section" data-section="${section}">Download JSON</button>` : ""}
                <label class="btn btn-ghost file-btn">
                  Import JSON
                  <input type="file" accept="application/json" data-action="import-file" data-section="${section}" hidden>
                </label>
              </div>
            </article>
          `;
        }).join("")}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Full Backup</h3>
            <p>Download or restore the entire project store in one file.</p>
          </div>
          <div class="json-actions">
            <button class="btn btn-primary" data-action="export-backup">Download Backup</button>
            <label class="btn btn-ghost file-btn">
              Import Backup
              <input type="file" accept="application/json" data-action="import-backup" hidden>
            </label>
          </div>
        </div>
      </section>
    `;
  }

  function renderSettingsPage() {
    const settings = W.PCR_STORE.settings || {};
    return `
      ${renderPageHeader("Settings", "Company branding, theme, and browser storage controls.")}

      <section class="grid-two">
        <div class="panel">
          <div class="panel-head"><h3>Company Details</h3></div>
          <div class="settings-info">
            <div><span>Phone</span><strong>${W.PCR.escapeHTML(settings.phone || "")}</strong></div>
            <div><span>Primary Email</span><strong>${W.PCR.escapeHTML(settings.emailPrimary || "")}</strong></div>
            <div><span>Operations Email</span><strong>${W.PCR.escapeHTML(settings.emailOperations || "")}</strong></div>
            <div><span>Accounts Email</span><strong>${W.PCR.escapeHTML(settings.emailAccounts || "")}</strong></div>
          </div>
          <div class="note-box">
            All working data is kept in browser storage and updated automatically when you save records or import JSON.
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Local Data Tools</h3></div>
          <div class="stacked-actions">
            <button class="btn btn-ghost" data-action="export-backup">Download Full Backup</button>
            <button class="btn btn-ghost" data-action="reset-session">Reset Local Data</button>
            <a class="btn btn-ghost" href="json.html">Open JSON Import / Export</a>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Edit Settings</h3></div>
        ${W.PCR_FORMS.renderSettingsForm(settings)}
      </section>
    `;
  }

  function renderActivePage() {
    const root = document.getElementById("page-root");
    if (!root) return;
    state.activeSection = document.body.dataset.page || "index";

    if (state.activeSection === "index") root.innerHTML = renderDashboard();
    else if (MODULE_PAGES.includes(state.activeSection)) root.innerHTML = renderModulePage(state.activeSection);
    else if (state.activeSection === "reports") root.innerHTML = renderReports();
    else if (state.activeSection === "json") root.innerHTML = renderJsonPage();
    else if (state.activeSection === "settings") root.innerHTML = renderSettingsPage();
    else root.innerHTML = renderDashboard();

    bindPageControls();
  }

  function bindPageControls() {
    document.querySelectorAll('[data-control="filter-status"]').forEach((el) => {
      el.addEventListener("change", (e) => {
        state.filter = e.target.value || "all";
        renderActivePage();
      });
    });
    document.querySelectorAll('[data-control="sort"]').forEach((el) => {
      el.addEventListener("change", (e) => {
        state.sort = e.target.value || "newest";
        renderActivePage();
      });
    });
  }

  function openModal(html) {
    const host = document.getElementById("modal-host");
    host.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <div class="modal">
        <div class="modal-body">${html}</div>
      </div>
    `;
    host.querySelectorAll("[data-action='close-modal']").forEach((el) => {
      el.addEventListener("click", closeModal);
    });
  }

  function closeModal() {
    const host = document.getElementById("modal-host");
    if (host) host.innerHTML = "";
  }

  function getRecord(section, id) {
    return (W.PCR_STORE[section] || []).find((r) => r.id === id);
  }

  function buildAutoLedgerEntries(section, record) {
    const settings = W.PCR_STORE.settings || {};
    const entries = [];
    const now = W.PCR.today();
    if (section === "contracts") {
      entries.push({
        id: `${record.id}_inv`,
        ledgerNumber: `LED-${record.contractNumber}-INV`,
        customerId: record.customerId,
        contractId: record.id,
        entryDate: record.rentalStartDate || now,
        entryType: "invoice",
        amount: Number(record.totalAmount || 0),
        narration: `Contract invoice ${record.contractNumber}`,
        reference: record.contractNumber,
        balanceAfter: Number(record.dueAmount || 0),
        notes: "Auto-generated from contract save.",
      });
      const totalPaid = Number(record.paidAmount || 0) + Number(record.advancePayment || 0);
      if (totalPaid > 0) {
        entries.push({
          id: `${record.id}_pay`,
          ledgerNumber: `LED-${record.contractNumber}-PAY`,
          customerId: record.customerId,
          contractId: record.id,
          entryDate: record.rentalStartDate || now,
          entryType: "payment",
          amount: totalPaid,
          narration: `Advance payment ${record.contractNumber}`,
          reference: `${record.contractNumber}-PAY`,
          balanceAfter: Number(record.dueAmount || 0),
          notes: "Auto-generated from contract save.",
        });
      }
    } else if (section === "renewals") {
      entries.push({
        id: `${record.id}_inv`,
        ledgerNumber: `LED-${record.renewalNumber}-INV`,
        customerId: W.PCR_STORE.contracts.find((c) => c.id === record.contractId)?.customerId || "",
        contractId: record.contractId,
        entryDate: record.newEndDate || now,
        entryType: "invoice",
        amount: Number(record.amount || 0),
        narration: `Renewal invoice ${record.renewalNumber}`,
        reference: record.renewalNumber,
        balanceAfter: Number(record.dueAmount || 0),
        notes: "Auto-generated renewal entry.",
      });
      if (Number(record.paidAmount || 0) > 0) {
        entries.push({
          id: `${record.id}_pay`,
          ledgerNumber: `LED-${record.renewalNumber}-PAY`,
          customerId: W.PCR_STORE.contracts.find((c) => c.id === record.contractId)?.customerId || "",
          contractId: record.contractId,
          entryDate: record.newEndDate || now,
          entryType: "payment",
          amount: Number(record.paidAmount || 0),
          narration: `Renewal payment ${record.renewalNumber}`,
          reference: `${record.renewalNumber}-PAY`,
          balanceAfter: Number(record.dueAmount || 0),
          notes: "Auto-generated renewal payment.",
        });
      }
    } else if (section === "fines") {
      entries.push({
        id: `${record.id}_fine`,
        ledgerNumber: `LED-${record.fineNumber}-FINE`,
        customerId: record.customerId,
        contractId: record.contractId || "",
        entryDate: record.issueDate || now,
        entryType: "fine",
        amount: Number(record.amount || 0),
        narration: `${record.fineType || "Fine"} ${record.fineNumber}`,
        reference: record.fineNumber,
        balanceAfter: Number(record.amount || 0),
        notes: "Auto-generated fine entry.",
      });
    } else if (section === "charges") {
      const type = String(record.chargeType || "").toLowerCase().includes("salik") ? "toll" : "debit";
      entries.push({
        id: `${record.id}_${type}`,
        ledgerNumber: `LED-${record.chargeNumber}-${type.toUpperCase()}`,
        customerId: record.customerId,
        contractId: record.contractId || "",
        entryDate: record.chargeDate || now,
        entryType: type,
        amount: Number(record.amount || 0) + Number(record.tax || 0),
        narration: `${record.chargeType || "Charge"} ${record.chargeNumber}`,
        reference: record.chargeNumber,
        balanceAfter: Number(record.amount || 0),
        notes: "Auto-generated charge entry.",
      });
    }
    return entries;
  }

  function upsertAutoLedgerEntries(entries) {
    const ledger = W.PCR_STORE.ledger || [];
    entries.forEach((entry) => {
      const idx = ledger.findIndex((row) => row.reference === entry.reference && row.entryType === entry.entryType);
      if (idx >= 0) ledger[idx] = { ...ledger[idx], ...entry };
      else ledger.unshift(entry);
    });
    W.PCR_STORE.ledger = ledger;
  }

  function removeAutoLedgerEntries(prefix) {
    W.PCR_STORE.ledger = (W.PCR_STORE.ledger || []).filter((row) => !String(row.reference || "").startsWith(prefix));
  }

  function afterSave(section, record, isNew) {
    const store = W.PCR_STORE;
    if (section === "vehicles") {
      const linkedContracts = store.contracts.filter((c) => c.vehicleId === record.id && ["Active", "Overdue"].includes(c.contractStatus));
      record.status = linkedContracts.length ? "Rented" : record.status || "Available";
      record.availability = linkedContracts.length ? "Unavailable" : "Available";
      if (record.maintenanceHistory && !Array.isArray(record.maintenanceHistory)) record.maintenanceHistory = [];
    }

    if (section === "contracts") {
      const vehicle = store.vehicles.find((v) => v.id === record.vehicleId);
      const customer = store.customers.find((c) => c.id === record.customerId);
      const active = ["Active", "Overdue"].includes(record.contractStatus);
      if (vehicle) {
        vehicle.status = active ? "Rented" : "Available";
        vehicle.availability = active ? "Unavailable" : "Available";
        vehicle.rentalHistory = Array.isArray(vehicle.rentalHistory) ? vehicle.rentalHistory : [];
        if (!vehicle.rentalHistory.includes(record.id)) vehicle.rentalHistory.push(record.id);
      }
      if (customer) {
        customer.activeContractStatus = active ? "Active" : (store.contracts.some((c) => c.customerId === customer.id && c.id !== record.id && ["Active", "Overdue"].includes(c.contractStatus)) ? "Active" : "Inactive");
      }
      removeAutoLedgerEntries(record.contractNumber);
      const entries = buildAutoLedgerEntries(section, record);
      upsertAutoLedgerEntries(entries);
    }

    if (section === "renewals") {
      const contract = store.contracts.find((c) => c.id === record.contractId);
      if (contract && record.newEndDate) contract.rentalEndDate = record.newEndDate;
      removeAutoLedgerEntries(record.renewalNumber);
      upsertAutoLedgerEntries(buildAutoLedgerEntries(section, record));
    }

    if (section === "fines" || section === "charges") {
      removeAutoLedgerEntries(record[section === "fines" ? "fineNumber" : "chargeNumber"]);
      upsertAutoLedgerEntries(buildAutoLedgerEntries(section, record));
    }

    if (section === "maintenance") {
      const vehicle = store.vehicles.find((v) => v.id === record.vehicleId);
      if (vehicle) {
        vehicle.maintenanceHistory = Array.isArray(vehicle.maintenanceHistory) ? vehicle.maintenanceHistory : [];
        if (!vehicle.maintenanceHistory.includes(record.id)) vehicle.maintenanceHistory.unshift(record.id);
        if (record.nextServiceDue) vehicle.serviceDueDate = record.nextServiceDue;
      }
    }

    if (section === "settings") {
      document.body.dataset.theme = record.theme || "pink-premium";
      applyThemeClass(record.theme || "pink-premium");
    }

    W.PCR_STORE = W.PCR_CALC.refreshDerivedData(W.PCR_STORE);
    W.PCR_STORAGE.setStore(W.PCR_STORE);
    updateSavedLabel();
    renderActivePage();
  }

  function saveRecord(section, recordId, form) {
    const cfg = W.PCR.getModuleConfig(section);
    let data = W.PCR_FORMS.collectFormData(section, form);
    const existing = recordId ? getRecord(section, recordId) : null;
    if (existing) data.id = existing.id;
    else data.id = W.PCR.uid(section.slice(0, 3));
    if (section === "settings") {
      data = { ...W.PCR_STORE.settings, ...data };
      W.PCR_STORE.settings = data;
      afterSave(section, data, !existing);
      return;
    }

    if (existing) {
      const merged = { ...existing, ...data };
      const calc = section === "contracts" ? W.PCR_CALC.calcRateAmount(merged)
        : section === "renewals" ? W.PCR_CALC.calcRenewalAmount(merged, W.PCR_STORE.contracts.find((c) => c.id === merged.contractId))
        : {};
      data = { ...merged, ...calc };
    } else {
      data = { ...data };
    }

    if (section === "contracts") {
      const calc = W.PCR_CALC.calcRateAmount(data);
      data = { ...data, rentalDays: calc.rentalDays, baseAmount: calc.baseAmount, serviceAmount: calc.serviceAmount, totalAmount: calc.totalAmount, dueAmount: calc.dueAmount };
      data.paidAmount = Number(data.paidAmount || 0);
    }
    if (section === "renewals") {
      const calc = W.PCR_CALC.calcRenewalAmount(data, W.PCR_STORE.contracts.find((c) => c.id === data.contractId));
      data = { ...data, ...calc };
    }

    const errors = W.PCR_FORMS.validateRecord(section, data);
    if (errors.length) {
      W.PCR.toast(errors[0], "danger");
      return;
    }

    const list = W.PCR_STORE[section] || [];
    const idx = list.findIndex((r) => r.id === data.id);
    if (idx >= 0) list[idx] = data;
    else list.unshift(data);
    W.PCR_STORE[section] = list;
    afterSave(section, data, !existing);
  }

  function deleteRecord(section, id) {
    const record = getRecord(section, id);
    if (!record) return;
    if (!confirm(`Delete this ${section.slice(0, -1)} record?`)) return;
    if (section === "contracts") removeAutoLedgerEntries(record.contractNumber);
    if (section === "renewals") removeAutoLedgerEntries(record.renewalNumber);
    if (section === "fines") removeAutoLedgerEntries(record.fineNumber);
    if (section === "charges") removeAutoLedgerEntries(record.chargeNumber);
    W.PCR_STORE[section] = (W.PCR_STORE[section] || []).filter((r) => r.id !== id);
    W.PCR_STORE = W.PCR_CALC.refreshDerivedData(W.PCR_STORE);
    W.PCR_STORAGE.setStore(W.PCR_STORE);
    updateSavedLabel();
    W.PCR.toast("Record deleted.", "success");
    renderActivePage();
  }

  function printContract(id) {
    const c = getRecord("contracts", id);
    if (!c) return;
    const customer = W.PCR_CALC.resolveRelation("customers", c.customerId);
    const vehicle = W.PCR_CALC.resolveRelation("vehicles", c.vehicleId);
    const settings = W.PCR_STORE.settings || {};
    const html = `
      <!doctype html>
      <html><head><title>${W.PCR.escapeHTML(c.contractNumber)}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#222}
        h1,h2{margin:0 0 12px}
        .box{border:1px solid #ddd;border-radius:14px;padding:16px;margin:16px 0}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #eee}
        .row:last-child{border-bottom:0}
      </style></head>
      <body>
        <h1>${W.PCR.escapeHTML(settings.companyName || "Premium Car Rental UAE")}</h1>
        <p>${W.PCR.escapeHTML(settings.phone || "")} • ${W.PCR.escapeHTML(settings.emailPrimary || "")}</p>
        <h2>Contract ${W.PCR.escapeHTML(c.contractNumber)}</h2>
        <div class="box grid">
          <div><strong>Customer</strong><br>${W.PCR.escapeHTML(customer)}</div>
          <div><strong>Vehicle</strong><br>${W.PCR.escapeHTML(vehicle)}</div>
          <div><strong>Start</strong><br>${W.PCR.escapeHTML(W.PCR.formatDate(c.rentalStartDate))}</div>
          <div><strong>End</strong><br>${W.PCR.escapeHTML(W.PCR.formatDate(c.rentalEndDate))}</div>
        </div>
        <div class="box">
          <div class="row"><span>Total</span><strong>${W.PCR.formatCurrency(c.totalAmount, settings)}</strong></div>
          <div class="row"><span>Paid</span><strong>${W.PCR.formatCurrency(c.paidAmount, settings)}</strong></div>
          <div class="row"><span>Due</span><strong>${W.PCR.formatCurrency(c.dueAmount, settings)}</strong></div>
        </div>
        <div class="box">
          <strong>Notes</strong>
          <p>${W.PCR.escapeHTML(c.contractNotes || "")}</p>
          <p>${W.PCR.escapeHTML(c.closureSummary || "")}</p>
        </div>
        <script>window.print();</script>
      </body></html>
    `;
    const win = window.open("", "_blank", "width=900,height=900");
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function applyThemeClass(theme) {
    document.body.classList.remove("theme-pink-premium", "theme-rose-white", "theme-blush-dark");
    document.body.classList.add(theme || "theme-pink-premium");
  }

  function applyTheme() {
    const settings = W.PCR_STORE.settings || W.PCR_DEFAULT_DATA.settings;
    applyThemeClass(settings.theme || "pink-premium");
  }

  function handleAdd(section) {
    const modal = W.PCR_FORMS.makeDefaultRecord(section, W.PCR_STORE);
    openModal(`
      <div class="modal-head">
        <h3>Add ${W.PCR.escapeHTML(W.PCR.getModuleConfig(section).title)}</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      ${W.PCR_FORMS.buildForm(section, modal, W.PCR_STORE)}
    `);
    bindModal(section, modal.id);
  }

  function handleEdit(section, id) {
    const record = getRecord(section, id);
    if (!record) return;
    openModal(`
      <div class="modal-head">
        <h3>Edit ${W.PCR.escapeHTML(W.PCR.getModuleConfig(section).title)}</h3>
        <button class="icon-btn" data-action="close-modal">×</button>
      </div>
      ${section === "settings" ? W.PCR_FORMS.renderSettingsForm(record) : W.PCR_FORMS.buildForm(section, record, W.PCR_STORE)}
    `);
    bindModal(section, id);
  }

  function bindModal(section, id) {
    const host = document.getElementById("modal-host");
    const form = host.querySelector("form");
    if (!form) return;
    form.addEventListener("input", () => {
      markDirty();
      if (section === "contracts") {
        const data = W.PCR_FORMS.collectFormData(section, form);
        const preview = host.querySelector("[data-contract-preview]");
        if (preview) preview.innerHTML = W.PCR_FORMS.renderContractPreview(data, W.PCR_STORE);
      }
      if (section === "settings") {
        // no live preview required
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveRecord(section, id, form);
      closeModal();
    });
    if (section === "settings") {
      const resetBtn = host.querySelector("[data-action='reset-settings']");
      if (resetBtn) {
        resetBtn.addEventListener("click", async () => {
          if (confirm("Reset local data to the default JSON files?")) {
            W.PCR_STORAGE.resetStore();
            location.reload();
          }
        });
      }
    }
  }

  function bindGlobalEvents() {
    document.body.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const section = target.dataset.section;

      if (action === "close-modal") {
        closeModal();
        return;
      }
      if (action === "add-record") {
        handleAdd(section);
        return;
      }
      if (action === "edit-record") {
        handleEdit(section, target.dataset.id);
        return;
      }
      if (action === "delete-record") {
        deleteRecord(section, target.dataset.id);
        return;
      }
      if (action === "print-contract") {
        printContract(target.dataset.id);
        return;
      }
      if (action === "export-section") {
        W.PCR_EXPORT.exportSection(section);
        return;
      }
      if (action === "export-backup") {
        W.PCR_EXPORT.exportAll();
        return;
      }
      if (action === "reset-session" || action === "reset-settings") {
        if (confirm("Reset all local browser data and reload the default files?")) {
          W.PCR_STORAGE.resetStore();
          location.reload();
        }
        return;
      }
    });

    document.body.addEventListener("change", async (e) => {
      const target = e.target;
      if (target.matches('[data-action="import-file"]')) {
        const section = target.dataset.section;
        const file = target.files && target.files[0];
        if (!file) return;
        try {
          await W.PCR_IMPORT.importSection(section, file);
          W.PCR_STORE = W.PCR_STORAGE.getStore();
          updateSavedLabel();
          W.PCR.toast(`${W.PCR.getModuleConfig(section).title} imported.`, "success");
          renderActivePage();
        } catch (err) {
          W.PCR.toast(err.message || "Import failed.", "danger");
        } finally {
          target.value = "";
        }
      }
      if (target.matches('[data-action="import-backup"]')) {
        const file = target.files && target.files[0];
        if (!file) return;
        try {
          await W.PCR_IMPORT.importBackup(file);
          W.PCR_STORE = W.PCR_STORAGE.getStore();
          updateSavedLabel();
          W.PCR.toast("Backup imported successfully.", "success");
          renderActivePage();
        } catch (err) {
          W.PCR.toast(err.message || "Backup import failed.", "danger");
        } finally {
          target.value = "";
        }
      }
    });
  }

  async function init() {
    await W.PCR_STORAGE.boot();
    W.PCR_STORE = W.PCR_CALC.refreshDerivedData(W.PCR_STORE);
    W.PCR_STORAGE.setStore(W.PCR_STORE);
    applyTheme();
    document.getElementById("app").innerHTML = shell();
    bindTopbar();
    bindGlobalEvents();
    renderActivePage();
    updateSavedLabel();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
