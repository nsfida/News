(() => {
  const W = window;

  function relationLabel(section, value) {
    const store = W.PCR_STORE || W.PCR_DEFAULT_DATA;
    const list = store[section] || [];
    if (!value) return "—";
    const item = list.find((row) => row.id === value);
    if (!item) return value;
    if (section === "customers") return `${item.fullName || item.customerId || value}`;
    if (section === "vehicles") return `${item.vehicleNumber || item.vehicleId || value}`;
    if (section === "contracts") return `${item.contractNumber || value}`;
    if (section === "accounts") return `${item.accountNumber || value}`;
    return item.name || value;
  }

  function formatCellValue(key, value, store) {
    if (value === null || value === undefined || value === "") return "—";
    const text = String(key || "").toLowerCase();
    if (typeof value === "boolean") {
      return `<span class="badge ${value ? "badge-success" : "badge-soft"}">${value ? "Yes" : "No"}</span>`;
    }
    if (["customerid", "vehicleid", "contractid", "accountid"].includes(text)) {
      const section = text.replace("id", "s");
      return relationLabel(section, value);
    }
    if ((text.includes("date") || text.includes("expiry") || text.endsWith("due")) && !text.includes("servicetype")) {
      return W.PCR.formatDate(value);
    }
    if (["status", "availability", "contractstatus", "entrytype"].includes(text) || text.endsWith("status")) {
      return `<span class="${W.PCR.statusBadgeClass(value)}">${W.PCR.escapeHTML(value)}</span>`;
    }
    if (["amount", "rate", "balance", "cost", "deposit", "charges", "fine", "total", "paid", "due", "dailyrate", "weeklyrate", "monthlyrate"].some((frag) => text.includes(frag))) {
      return W.PCR.formatCurrency(value, W.PCR_STORE.settings || {});
    }
    if (Array.isArray(value)) return value.join(", ");
    return W.PCR.escapeHTML(value);
  }

  function renderColumns(section, columns, rows, store) {
    return columns.map((key) => `<th>${W.PCR.escapeHTML(key)}</th>`).join("");
  }

  function renderTable(section, records, config, state = {}) {
    const store = W.PCR_STORE || W.PCR_DEFAULT_DATA;
    const columns = config.columns || [];
    const rows = records || [];
    if (!rows.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon">${config.icon || "✨"}</div>
          <h3>No ${W.PCR.escapeHTML(config.title || section)} yet</h3>
          <p>${W.PCR.escapeHTML(config.emptyMessage || "Use Add New to create the first record.")}</p>
        </div>
      `;
    }
    const head = columns.map((key) => `<th>${W.PCR.escapeHTML(key)}</th>`).join("");
    const body = rows.map((record) => {
      const cells = columns.map((key) => {
        const value = record[key];
        let rendered = formatCellValue(key, value, store);
        if (key === "contractNumber" && record.closureSummary) rendered += `<div class="mini-note">${W.PCR.escapeHTML(record.closureSummary)}</div>`;
        return `<td data-label="${W.PCR.escapeHTML(key)}">${rendered}</td>`;
      }).join("");
      const actions = `
        <td data-label="Actions">
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-action="edit-record" data-section="${section}" data-id="${record.id}">Edit</button>
            <button class="btn btn-ghost btn-sm" data-action="delete-record" data-section="${section}" data-id="${record.id}">Delete</button>
            ${section === "contracts" ? `<button class="btn btn-primary btn-sm" data-action="print-contract" data-section="${section}" data-id="${record.id}">Print</button>` : ""}
          </div>
        </td>
      `;
      return `<tr>${cells}${actions}</tr>`;
    }).join("");

    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${head}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSummaryCards(summary) {
    const cards = [
      ["Total Vehicles", summary.totalVehicles, "Fleet overview"],
      ["Available Vehicles", summary.availableVehicles, "Ready for rental"],
      ["Rented Vehicles", summary.rentedVehicles, "Currently out"],
      ["Active Customers", summary.activeCustomers, "Verified profiles"],
      ["Active Contracts", summary.activeContracts, "Live agreements"],
      ["Renewals Due", summary.renewalDue, "Extension queue"],
      ["Pending Maintenance", summary.pendingMaintenance, "Workshop watch"],
      ["Pending Fines", summary.pendingFines, "Open penalties"],
      ["Outstanding Balance", W.PCR.formatCurrency(summary.outstandingBalance, W.PCR_STORE.settings || {}), "Receivables"],
      ["Monthly Income", W.PCR.formatCurrency(summary.monthlyIncome, W.PCR_STORE.settings || {}), "Current month"],
    ];
    return cards.map(([title, value, note], idx) => `
      <article class="metric-card">
        <div class="metric-label">${W.PCR.escapeHTML(title)}</div>
        <div class="metric-value">${W.PCR.escapeHTML(String(value))}</div>
        <div class="metric-note">${W.PCR.escapeHTML(note)}</div>
      </article>
    `).join("");
  }

  function renderMiniList(title, items, renderItem) {
    return `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>${W.PCR.escapeHTML(title)}</h3>
          </div>
        </div>
        <div class="mini-list">
          ${items.length ? items.map(renderItem).join("") : `<div class="empty-inline">No records available.</div>`}
        </div>
      </section>
    `;
  }

  W.PCR_TABLE = {
    renderTable,
    renderSummaryCards,
    renderMiniList,
    formatCellValue,
  };
})();
