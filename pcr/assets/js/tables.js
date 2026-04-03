
(() => {
  const PCR = window.PCR = window.PCR || {};

  PCR.enrichRecord = (module, item) => {
    const state = PCR.state || {};
    const rec = { ...item };
    if (module === "contracts") {
      rec.period = `${PCR.formatDate(item.startDate)} → ${PCR.formatDate(item.endDate)}`;
      rec.customerId = item.customerName || item.customerId;
      rec.vehicleId = item.vehicleNumber || item.vehicleId;
    } else if (module === "renewals") {
      rec.period = `${PCR.formatDate(item.fromDate)} → ${PCR.formatDate(item.toDate)}`;
    } else if (module === "ledger") {
      rec.customerId = PCR.findCustomer(state, item.customerId)?.fullName || item.customerId;
    } else if (module === "invoices") {
      rec.customerId = PCR.findCustomer(state, item.customerId)?.fullName || item.customerId;
    } else if (module === "receipts") {
      rec.customerId = PCR.findCustomer(state, item.customerId)?.fullName || item.customerId;
    } else if (module === "maintenance") {
      rec.vehicleId = PCR.findVehicle(state, item.vehicleId)?.vehicleNumber || item.vehicleId;
    } else if (module === "fines" || module === "tolls" || module === "charges") {
      rec.customerId = PCR.findCustomer(state, item.customerId)?.fullName || item.customerId;
      rec.vehicleId = PCR.findVehicle(state, item.vehicleId)?.vehicleNumber || item.vehicleId;
      if (module === "fines") rec.datetime = `${PCR.formatDate(item.date)} ${item.time || ""}`.trim();
      if (module === "tolls") rec.datetime = `${PCR.formatDate(item.date)} ${item.time || ""}`.trim();
    } else if (module === "vehicles") {
      rec.makeModel = `${item.make || ""} ${item.model || ""}`.trim();
    }
    if (module === "settings") {
      rec.themeLabel = `${item.theme?.accent || "#"} / ${item.theme?.accent2 || "#"}`;
    }
    return rec;
  };

  PCR.renderStatus = (value) => {
    const cls = PCR.statusClass(value);
    return `<span class="badge ${cls}">${PCR.escapeHTML(value ?? "—")}</span>`;
  };

  PCR.renderTable = (module, items, actions = {}) => {
    const conf = window.PCR_CONFIG.modules[module];
    const columns = conf.columns || [];
    const rows = items.map((item) => {
      const rec = PCR.enrichRecord(module, item);
      const cells = columns.map((col) => {
        let value = rec[col.key];
        if (col.key === "period") value = rec.period;
        if (col.key === "datetime") value = rec.datetime;
        if (col.money) value = PCR.formatCurrency(value);
        if (col.percent) value = `${PCR.ROUND(Number(value || 0) * 100)}%`;
        if (col.badge) value = PCR.renderStatus(value);
        return `<td>${value ?? "—"}</td>`;
      }).join("");
      const rowActions = [];
      if (actions.print) rowActions.push(`<button class="mini-btn" data-action="print" data-id="${PCR.escapeHTML(item.id)}">Print</button>`);
      if (actions.view) rowActions.push(`<button class="mini-btn" data-action="view" data-id="${PCR.escapeHTML(item.id)}">View</button>`);
      if (actions.edit) rowActions.push(`<button class="mini-btn" data-action="edit" data-id="${PCR.escapeHTML(item.id)}">Edit</button>`);
      if (actions.close) rowActions.push(`<button class="mini-btn" data-action="close" data-id="${PCR.escapeHTML(item.id)}">Close</button>`);
      if (actions.delete) rowActions.push(`<button class="mini-btn danger" data-action="delete" data-id="${PCR.escapeHTML(item.id)}">Delete</button>`);
      const actionCell = rowActions.length ? `<td><div class="row-actions">${rowActions.join("")}</div></td>` : "";
      return `<tr>${cells}${actionCell}</tr>`;
    }).join("");

    const header = columns.map(c => `<th>${PCR.escapeHTML(c.label)}</th>`).join("") + (actions.print || actions.edit || actions.delete || actions.view || actions.close ? "<th>Actions</th>" : "");
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${header}</tr></thead>
          <tbody>${rows || `<tr><td colspan="${columns.length + 1}" class="empty-row">No records found.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  };

  PCR.renderMiniCards = (items, fields) => {
    return items.map((item) => {
      const rec = PCR.enrichRecord("generic", item);
      return `
        <div class="doc-card">
          <div class="doc-card-head">
            <strong>${PCR.escapeHTML(item.title || item.name || item.id || "Document")}</strong>
            <span class="badge ${PCR.statusClass(item.status)}">${PCR.escapeHTML(item.status || "Ready")}</span>
          </div>
          <div class="doc-card-body">
            ${fields.map((f) => `<div><span>${PCR.escapeHTML(f.label)}:</span> <strong>${PCR.escapeHTML(rec[f.key] ?? "—")}</strong></div>`).join("")}
          </div>
        </div>
      `;
    }).join("");
  };
})();
