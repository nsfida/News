(() => {
  const W = window;

  W.PCR = W.PCR || {};

  W.PCR.uid = (prefix = "id") =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  W.PCR.clone = (value) => JSON.parse(JSON.stringify(value));

  W.PCR.safeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  W.PCR.safeString = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    return String(value);
  };

  W.PCR.escapeHTML = (str = "") =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  W.PCR.formatCurrency = (value, settings = {}) => {
    const symbol = settings.currencySymbol || settings.currency || "AED";
    const num = W.PCR.safeNumber(value, 0);
    return `${symbol} ${num.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  W.PCR.formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toISOString().slice(0, 10);
  };

  W.PCR.today = () => new Date().toISOString().slice(0, 10);

  W.PCR.daysBetween = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
    return Math.round((e.getTime() - s.getTime()) / 86400000);
  };

  W.PCR.monthKey = (dateStr = new Date()) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 7);
  };

  W.PCR.downloadText = (filename, content, type = "application/json") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  W.PCR.slugify = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  W.PCR.sumBy = (items, fn) => items.reduce((a, item) => a + W.PCR.safeNumber(fn(item), 0), 0);

  W.PCR.byId = (items, id) => items.find((item) => item.id === id || item.customerId === id || item.vehicleId === id || item.contractId === id);

  W.PCR.statusBadgeClass = (status = "") => {
    const s = String(status).toLowerCase();
    if (["active", "available", "open", "paid", "closed", "completed"].includes(s)) return "badge badge-success";
    if (["pending", "overdue", "unavailable"].includes(s)) return "badge badge-warning";
    if (["cancelled", "inactive", "rejected"].includes(s)) return "badge badge-danger";
    return "badge";
  };

  W.PCR.getOptionLabel = (items, id, fallback = "—", labelKey = "name") => {
    const rec = items.find((x) => x.id === id);
    return rec ? (rec[labelKey] || rec.fullName || rec.vehicleNumber || rec.contractNumber || rec.accountNumber || fallback) : fallback;
  };

  W.PCR.toInputValue = (value, type) => {
    if (type === "checkbox") return Boolean(value);
    if (type === "date") return value ? String(value).slice(0, 10) : "";
    return value ?? "";
  };

  W.PCR.readFileText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  W.PCR.confirmAction = async (message) => window.confirm(message);

  W.PCR.toast = (message, kind = "info") => {
    const host = document.getElementById("toast-host");
    if (!host) return;
    const item = document.createElement("div");
    item.className = `toast toast-${kind}`;
    item.textContent = message;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add("show"));
    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 250);
    }, 2500);
  };

  W.PCR.debounce = (fn, delay = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  W.PCR.isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

})();
