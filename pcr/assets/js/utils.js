
(() => {
  const PCR = window.PCR = window.PCR || {};

  PCR.ROUND = (value, digits = 2) => {
    const num = Number(value || 0);
    const p = Math.pow(10, digits);
    return Math.round(num * p) / p;
  };

  PCR.uid = (prefix = "id") => {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${t}-${r}`;
  };

  PCR.clone = (value) => JSON.parse(JSON.stringify(value));

  PCR.sum = (arr, key) => (Array.isArray(arr) ? arr.reduce((a, b) => a + Number((key ? b?.[key] : b) || 0), 0) : 0);

  PCR.safeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  PCR.formatDate = (value) => {
    const d = PCR.safeDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit" }).format(d);
  };

  PCR.formatDateTime = (value) => {
    const d = PCR.safeDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  };

  PCR.formatTime = (value) => {
    if (!value) return "—";
    const d = PCR.safeDate(value);
    if (!d) return String(value);
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(d);
  };

  PCR.formatCurrency = (value, currency = "AED") => {
    const n = Number(value || 0);
    return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  PCR.toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  PCR.escapeHTML = (str) => String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  PCR.slug = (text) => String(text || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  PCR.overlap = (aStart, aEnd, bStart, bEnd) => {
    const s1 = PCR.safeDate(aStart);
    const e1 = PCR.safeDate(aEnd);
    const s2 = PCR.safeDate(bStart);
    const e2 = PCR.safeDate(bEnd);
    if (!s1 || !e1 || !s2 || !e2) return false;
    return s1 <= e2 && s2 <= e1;
  };

  PCR.daysBetween = (start, end) => {
    const s = PCR.safeDate(start);
    const e = PCR.safeDate(end);
    if (!s || !e) return 0;
    const diff = e - s;
    return Math.max(1, Math.ceil(diff / 86400000));
  };

  PCR.monthsBetween = (start, end) => {
    const s = PCR.safeDate(start);
    const e = PCR.safeDate(end);
    if (!s || !e) return 0;
    return Math.max(1, Math.ceil((e - s) / 86400000 / 30));
  };

  PCR.calcRentalBase = (contract, settings = {}) => {
    const dailyRate = PCR.toNumber(contract.dailyRate);
    const weeklyRate = PCR.toNumber(contract.weeklyRate);
    const monthlyRate = PCR.toNumber(contract.monthlyRate);
    const days = PCR.daysBetween(contract.startDate, contract.endDate);
    const type = String(contract.rateType || "daily").toLowerCase();

    let base = 0;
    if (type === "weekly") {
      base = weeklyRate * Math.ceil(days / 7);
    } else if (type === "monthly") {
      base = monthlyRate * Math.ceil(days / 30);
    } else {
      base = dailyRate * days;
    }

    return {
      days,
      base: PCR.ROUND(base),
      vat: PCR.ROUND(base * PCR.toNumber(settings.rentalVatRate ?? settings.vatRate ?? 0.05))
    };
  };

  PCR.fineTotal = (fine, settings = {}) => {
    const amount = PCR.toNumber(fine.amount);
    const serviceFeeRate = PCR.toNumber(settings.fineServiceRate ?? 0.10);
    const serviceFeeVatRate = PCR.toNumber(settings.fineServiceVatRate ?? 0.05);
    const serviceFee = PCR.ROUND(amount * serviceFeeRate);
    const serviceFeeVat = PCR.ROUND(serviceFee * serviceFeeVatRate);
    const total = PCR.ROUND(amount + serviceFee + serviceFeeVat);
    return { amount, serviceFee, serviceFeeVat, total };
  };

  PCR.tollTotal = (toll, vatRate = 0.05) => {
    const amount = PCR.toNumber(toll.amount);
    const vat = PCR.ROUND(amount * vatRate);
    return { amount, vat, total: PCR.ROUND(amount + vat) };
  };

  PCR.currencyInput = (n) => PCR.formatCurrency(n);

  PCR.rangeText = (start, end) => `${PCR.formatDate(start)} → ${PCR.formatDate(end)}`;

  PCR.statusClass = (value) => {
    const v = String(value || "").toLowerCase();
    if (["available", "paid", "active", "matched", "completed", "verified"].includes(v)) return "is-success";
    if (["unavailable", "overdue", "unpaid", "pending", "draft", "open", "unmatched"].includes(v)) return "is-warning";
    if (["closed", "cancelled", "inactive", "archived", "deleted"].includes(v)) return "is-muted";
    return "is-info";
  };

  PCR.lookupById = (items, id) => (Array.isArray(items) ? items.find((x) => String(x.id) === String(id)) : null);

  PCR.findCustomer = (state, id) => PCR.lookupById(state.customers || [], id);
  PCR.findVehicle = (state, id) => PCR.lookupById(state.vehicles || [], id);
  PCR.findContract = (state, id) => PCR.lookupById(state.contracts || [], id);
  PCR.findInvoice = (state, id) => PCR.lookupById(state.invoices || [], id);

  PCR.pick = (obj, keys) => keys.reduce((acc, k) => (acc[k] = obj?.[k], acc), {});
})();
