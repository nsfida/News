const CONFIG = {
  zipBaseUrl: "https://livenews.live/Finance/Assets/app/",
  table: "loan_ledger_entries"
};

const BACKUP_STORAGE_KEY = "loanledger-json-backup-v1";
const IMPORT_SESSION_KEY = "loanledger-imported-file-v1";
const FLOAT_CURRENCY_PATHS = ["currency-float-path-1", "currency-float-path-2", "currency-float-path-3", "currency-float-path-4"];

const SUPPORTED_CURRENCIES = ["AED", "SAR", "PKR"];

let runtimeConfig = null;

const state = {
  entries: [],
  dataSource: "backup",
  hasImportedFile: false,
  dbEntryIds: new Set(),
  dbSignatures: new Set(),
  dbSignaturesById: new Map(),
  unlocked: false,
  search: { given: "", received: "", taken: "", returned: "", installments: "", goods: "", expenses: "" },
  statusFilter: { given: "All", received: "All", taken: "All", returned: "All", installments: "All", goods: "All", expenses: "All" },
  currencyFilter: { given: "All", received: "All", taken: "All", returned: "All", installments: "All", goods: "All", expenses: "All" },
  lastCurrency: "AED",
  modalDirection: "given",
  editId: null,
  editKind: null
};

const els = {
  app: document.getElementById("app"),
  logoutBtn: document.getElementById("logoutBtn"),
  mainOverview: document.getElementById("mainOverview"),
  statsGrid: document.getElementById("statsGrid"),
  givenList: document.getElementById("givenList"),
  openGivenCount: document.getElementById("openGivenCount"),
  openTakenCount: document.getElementById("openTakenCount"),
  receivedCount: document.getElementById("receivedCount"),
  returnedCount: document.getElementById("returnedCount"),
  connectSupabaseBtn: document.getElementById("connectSupabaseBtn"),
  importJsonInput: document.getElementById("importJsonInput"),
  importCsvInput: document.getElementById("importCsvInput"),
  downloadAllDataJsonBtn: document.getElementById("downloadAllDataJsonBtn"),
  downloadAllDataCsvBtn: document.getElementById("downloadAllDataCsvBtn"),
  uploadBackupBtn: document.getElementById("uploadBackupBtn"),
  downloadAllSectionsPdfBtn: document.getElementById("downloadAllSectionsPdfBtn"),
  downloadGivenPdfBtn: document.getElementById("downloadGivenPdfBtn"),
  entryModal: document.getElementById("entryModal"),
  editModal: document.getElementById("editModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalDesc: document.getElementById("modalDesc"),
  principalModalForm: document.getElementById("principalModalForm"),
  paymentModalForm: document.getElementById("paymentModalForm"),
  editForm: document.getElementById("editForm"),
  modalLoanSelect: document.getElementById("modalLoanSelect"),
  searchGiven: document.getElementById("searchGiven"),
  toggleMainOverviewBtn: document.getElementById("toggleMainOverviewBtn"),
  mainOverviewBanner: document.getElementById("mainOverviewBanner"),
  mainOverviewContent: document.getElementById("mainOverviewContent"),
  downloadReportMenuBtn: document.getElementById("downloadReportMenuBtn")
};

function initFloatingCurrencyBackground(){
  const root = document.getElementById("pageCurrencyBg");
  if (!root) return;
  root.replaceChildren();
  const specs = [
    { type: "aed", cls: "float-currency-aed", html: '<span class="symbol symbol-dirham">~</span>' },
    { type: "sar", cls: "float-currency-sar", html: '<span class="symbol symbol-riyal">$</span>' },
    { type: "pkr", cls: "float-currency-pkr", html: '<span class="symbol">Rs.</span>' }
  ];
  const colorPools = {
    aed: ["rgba(36,87,214,", "rgba(99,140,235,", "rgba(55,105,200,", "rgba(130,160,240,"],
    sar: ["rgba(6,118,71,", "rgba(46,160,110,", "rgba(20,90,65,", "rgba(80,175,120,"],
    pkr: ["rgba(181,71,8,", "rgba(210,110,35,", "rgba(160,85,20,", "rgba(200,95,45,"]
  };
  const count = 16;
  for (let i = 0; i < count; i++){
    const spec = specs[i % 3];
    const el = document.createElement("span");
    el.className = `float-currency ${spec.cls}`;
    el.innerHTML = spec.html;
    el.style.left = `${5 + Math.random() * 90}%`;
    el.style.top = `${3 + Math.random() * 88}%`;
    const fsMin = 2.4;
    const fsMax = 9.5;
    el.style.fontSize = `${fsMin + Math.random() * (fsMax - fsMin)}rem`;
    const pool = colorPools[spec.type];
    const alpha = 0.055 + Math.random() * 0.055;
    el.style.color = `${pool[Math.floor(Math.random() * pool.length)]}${alpha})`;
    const dur = 24 + Math.random() * 32;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${-Math.random() * dur}s`;
    el.style.animationName = FLOAT_CURRENCY_PATHS[Math.floor(Math.random() * FLOAT_CURRENCY_PATHS.length)];
    root.appendChild(el);
  }
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function displayDate(value){
  if (!value) return "—";
  const str = String(value);
  if (str.length >= 10) {
    const yyyy = str.slice(0, 4);
    const mm = str.slice(5, 7);
    const dd = str.slice(8, 10);
    if (yyyy && mm && dd && yyyy.length === 4) {
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return str;
}

function dateStamp(value){
  if (!value) return 0;
  const str = String(value).trim();
  const normalized = str.length === 10 ? `${str}T23:59:59` : str;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeDateForDb(value){
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch){
    const dd = slashMatch[1].padStart(2, "0");
    const mm = slashMatch[2].padStart(2, "0");
    const yyyy = slashMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const dotMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch){
    const dd = dotMatch[1].padStart(2, "0");
    const mm = dotMatch[2].padStart(2, "0");
    const yyyy = dotMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function currencySymbol(currency){
  return currency === "AED" ? "~" : currency === "SAR" ? "$" : currency === "PKR" ? "Rs." : currency || "";
}

function currencySymbolHtml(currency){
  const symbol = currencySymbol(currency);
  if (currency === "AED") return `<span class="symbol symbol-dirham">${escapeHtml(symbol)}</span>`;
  if (currency === "SAR") return `<span class="symbol symbol-riyal">${escapeHtml(symbol)}</span>`;
  return `<span class="symbol">${escapeHtml(symbol)}</span>`;
}

function moneyText(amount, currency){
  const n = Number(amount || 0);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = currencySymbol(currency);
  return `${symbol ? symbol + " " : ""}${formatted}`;
}

function money(amount, currency){
  const n = Number(amount || 0);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<span class="money">${currencySymbolHtml(currency)}<span class="amount">${formatted}</span></span>`;
}

function shortId(id){
  return id ? `#${String(id).slice(0,8).toUpperCase()}` : "";
}

function getSupabaseConfig(){
  if (!runtimeConfig?.supabaseUrl || !runtimeConfig?.supabaseKey){
    throw new Error("Supabase config is locked. Please unlock the ZIP file first.");
  }
  return runtimeConfig;
}

function apiHeaders(extra = {}){
  const dbConfig = getSupabaseConfig();
  return {
    "apikey": dbConfig.supabaseKey,
    "Authorization": `Bearer ${dbConfig.supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...extra
  };
}

async function supabase(path, options = {}){
  const dbConfig = getSupabaseConfig();
  let res;
  try{
    res = await fetch(`${dbConfig.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: apiHeaders(options.headers || {})
    });
  }catch{
    throw new Error("Database request failed. Please check connection and unlock again.");
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || data?.error || text || `Request failed (${res.status})`);
  return data;
}

function matchesSearch(entry, searchTerm){
  if (!searchTerm) return true;
  const term = String(searchTerm).toLowerCase();
  const fields = [
    entry.person_name,
    entry.notes,
    entry.group_id,
    entry.currency,
    entry.principal_amount,
    entry.action_amount,
    entry.loan_date,
    entry.action_date
  ];
  return fields.some(field => String(field || "").toLowerCase().includes(term));
}

function groupByLoan(entries){
  const groups = new Map();

  for (const entry of entries){
    if (!entry.group_id) continue;

    if (!groups.has(entry.group_id)){
      groups.set(entry.group_id, {
        group_id: entry.group_id,
        direction: entry.direction,
        person_name: entry.person_name,
        currency: entry.currency,
        principal: null,
        actions: [],
        notes: entry.notes || "",
        loan_date: entry.loan_date || null,
        activityStamp: 0,
        lastActivity: null
      });
    }

    const g = groups.get(entry.group_id);

    if (entry.entry_kind === "principal"){
      g.principal = entry;
      g.loan_date = entry.loan_date || g.loan_date;
    } else {
      g.actions.push(entry);
    }

    const candidateStamp = Math.max(dateStamp(entry.loan_date), dateStamp(entry.action_date));
    if (candidateStamp >= g.activityStamp){
      g.activityStamp = candidateStamp;
      g.lastActivity = entry.action_date || entry.loan_date || g.lastActivity;
    }
  }

  for (const g of groups.values()){
    if (!g.principal && g.actions.length){
      const first = g.actions[0];
      g.principal = {
        id: first.id,
        group_id: first.group_id,
        direction: first.direction,
        entry_kind: "principal",
        person_name: first.person_name,
        currency: first.currency,
        principal_amount: first.principal_amount,
        action_amount: null,
        loan_date: first.loan_date,
        action_date: null,
        notes: first.notes || null
      };
    }

    const principalStamp = dateStamp(g.principal?.loan_date || g.loan_date);
    const actionStamps = g.actions.map(a => dateStamp(a.action_date)).filter(Boolean);
    const latestActionStamp = actionStamps.length ? Math.max(...actionStamps) : 0;

    g.activityStamp = Math.max(g.activityStamp, principalStamp, latestActionStamp);

    if (!g.lastActivity){
      g.lastActivity =
        g.actions.length
          ? g.actions.slice().sort((a, b) => dateStamp(b.action_date) - dateStamp(a.action_date))[0]?.action_date
          : g.principal?.loan_date || g.loan_date || null;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const diff = (b.activityStamp || 0) - (a.activityStamp || 0);
    if (diff !== 0) return diff;
    return String(b.group_id || "").localeCompare(String(a.group_id || ""));
  });
}

function calculateLoan(group){
  const principal = Number(group.principal?.principal_amount || 0);
  const actions = group.actions
    .slice()
    .sort((a, b) => {
      const ad = dateStamp(a.action_date);
      const bd = dateStamp(b.action_date);
      if (ad !== bd) return ad - bd;
      return 0;
    });

  let remaining = principal;
  const rows = [];

  rows.push({
    kind: "principal",
    date: group.principal?.loan_date || group.loan_date || "—",
    amount: principal,
    remainingAfter: principal,
    note: group.principal?.notes || group.notes || "—",
    entryId: group.principal?.id || ""
  });

  for (const a of actions){
    remaining = Math.max(remaining - Number(a.action_amount || 0), 0);
    rows.push({
      kind: a.entry_kind === "partial" ? "partial" : "full",
      date: a.action_date || "—",
      amount: Number(a.action_amount || 0),
      remainingAfter: remaining,
      note: a.notes || "—",
      entryId: a.id
    });
  }

  const paid = principal - remaining;
  const status = remaining <= 0 ? "Closed" : paid > 0 ? "Partial" : "Open";
  return { principal, paid, remaining, status, rows };
}

function groupByPerson(direction, searchKey = direction){
  const personMap = new Map();
  const directionEntries = state.entries.filter(e => e.direction === direction);
  const searchTerm = state.search[searchKey];
  const selectedCurrency = state.currencyFilter[searchKey] || "All";

  for (const entry of directionEntries){
    if (!matchesSearch(entry, searchTerm)) continue;
    if (selectedCurrency !== "All" && entry.currency !== selectedCurrency) continue;

    const personKey = String(entry.person_name || "").trim();
    if (!personMap.has(personKey)){
      personMap.set(personKey, {
        person_name: personKey,
        entries: [],
        groupIds: new Set(),
        activityStamp: 0,
        lastActivity: null
      });
    }

    const person = personMap.get(personKey);
    person.entries.push(entry);
    if (entry.group_id) person.groupIds.add(entry.group_id);

    const stamp = Math.max(dateStamp(entry.loan_date), dateStamp(entry.action_date));
    if (stamp >= person.activityStamp){
      person.activityStamp = stamp;
      person.lastActivity = entry.action_date || entry.loan_date || person.lastActivity;
    }
  }

  const people = [];
  for (const person of personMap.values()){
    const principalRows = person.entries.filter(e => e.entry_kind === "principal");
    const actionRows = person.entries.filter(e => e.entry_kind !== "principal");

    const principalTotal = principalRows.reduce((sum, e) => sum + Number(e.principal_amount || 0), 0);
    const paidTotal = actionRows.reduce((sum, e) => sum + Number(e.action_amount || 0), 0);
    const remaining = Math.max(principalTotal - paidTotal, 0);
    const status = remaining <= 0 ? "Closed" : paidTotal > 0 ? "Partial" : "Open";

    const currency = principalRows[0]?.currency || actionRows[0]?.currency || "";

    const timeline = person.entries
      .slice()
      .sort((a, b) => {
        const aStamp = dateStamp(a.entry_kind === "principal" ? a.loan_date : a.action_date);
        const bStamp = dateStamp(b.entry_kind === "principal" ? b.loan_date : b.action_date);
        if (aStamp !== bStamp) return aStamp - bStamp;
        return (a.entry_kind === "principal" ? -1 : 1) - (b.entry_kind === "principal" ? -1 : 1);
      });

    let runningRemaining = 0;
    const rows = timeline.map(entry => {
      const isPrincipal = entry.entry_kind === "principal";
      const amount = Number(isPrincipal ? entry.principal_amount : entry.action_amount || 0);
      runningRemaining = isPrincipal
        ? runningRemaining + amount
        : Math.max(runningRemaining - amount, 0);

      return {
        kind: isPrincipal ? "principal" : (entry.entry_kind === "partial" ? "partial" : "full"),
        date: isPrincipal ? (entry.loan_date || "—") : (entry.action_date || "—"),
        amount,
        remainingAfter: runningRemaining,
        note: entry.notes || "—",
        entryId: entry.id
      };
    });

    const firstDate = timeline[0]
      ? (timeline[0].entry_kind === "principal" ? timeline[0].loan_date : timeline[0].action_date)
      : null;

    people.push({
      person_name: person.person_name,
      currency,
      principalTotal,
      paidTotal,
      remaining,
      status,
      rows,
      loan_date: firstDate || null,
      activityStamp: person.activityStamp,
      lastActivity: person.lastActivity,
      groupCount: person.groupIds.size,
      primaryGroupId: principalRows[0]?.group_id || actionRows[0]?.group_id || ""
    });
  }

  return people.sort((a, b) => {
    const diff = (b.activityStamp || 0) - (a.activityStamp || 0);
    if (diff !== 0) return diff;
    return String(a.person_name || "").localeCompare(String(b.person_name || ""));
  });
}

function getFilteredGroups(direction, searchKey, options = {}){
  let groups = groupByPerson(direction, searchKey);
  if (typeof options.groupFilter === "function"){
    groups = groups.filter(options.groupFilter);
  }
  const filterValue = state.statusFilter[searchKey];
  if (filterValue !== "All"){
    if (filterValue === "Active"){
      groups = groups.filter(g => g.status === "Open" || g.status === "Partial");
    } else {
      groups = groups.filter(g => g.status.toLowerCase() === filterValue.toLowerCase());
    }
  }
  return groups;
}

function renderLoanCards(container, direction, searchKey = direction, options = {}){
  let groups = getFilteredGroups(direction, searchKey, options);

  if (!groups.length){
    container.innerHTML = `<div class="empty">No entries found.</div>`;
    return;
  }

  container.innerHTML = groups.map(group => {
    const statusClass = group.status === "Closed" ? "green" : group.status === "Partial" ? "orange" : "blue";
    const directionLabel = direction === "given" ? "Given" : "Taken";
    const movementLabel = direction === "given" ? "Received back" : "Returned back";
    const openOnly = group.remaining > 0;

    return `
      <details class="loan">
        <summary>
          <div class="loan-top">
            <div class="lt-main">
              <div class="loan-name">${escapeHtml(group.person_name || "Unnamed")}</div>
              <div class="loan-sub">
                <span>${escapeHtml(directionLabel)}</span>
                <span>Opened ${escapeHtml(displayDate(group.loan_date || "—"))}</span>
                <span>Updated ${escapeHtml(displayDate(group.lastActivity || group.loan_date || "—"))}</span>
                <span>${currencySymbolHtml(group.currency || "")}</span>
                <span>${escapeHtml(`${group.groupCount || 1} loan${(group.groupCount || 1) > 1 ? "s" : ""}`)}</span>
                ${openOnly ? '<span class="badge orange">Open</span>' : '<span class="badge green">Closed</span>'}
              </div>
            </div>
            <div class="cell lt-status"><small>Status</small><strong><span class="badge ${statusClass}">${escapeHtml(group.status)}</span></strong></div>
            <div class="cell lt-principal"><small>Principal</small><strong>${money(group.principalTotal, group.currency)}</strong></div>
            <div class="cell lt-movement"><small>${escapeHtml(movementLabel)}</small><strong>${money(group.paidTotal, group.currency)}</strong></div>
            <div class="cell lt-remaining"><small>Remaining</small><strong>${money(group.remaining, group.currency)}</strong></div>
            <div class="lt-action">
              <div class="menu-wrap">
                <button class="icon-btn ghost menu-trigger person-menu-btn" type="button" aria-label="More actions" data-person-menu="${escapeHtml(group.primaryGroupId || group.person_name || "menu")}">☰</button>
                <div class="menu-dropdown" data-person-menu-panel="${escapeHtml(group.primaryGroupId || group.person_name || "menu")}">
                  <button class="menu-item personActionBtn" type="button" data-action="pdf" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Download PDF</button>
                  <button class="menu-item personActionBtn" type="button" data-action="edit-name" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Edit Name</button>
                  <button class="menu-item danger personActionBtn" type="button" data-action="delete" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Delete Record</button>
                </div>
              </div>
            </div>
          </div>
        </summary>
        <div class="detail">
          <div class="detail-head">
            <div>
              <h4>Timeline</h4>
              <p>Oldest to newest inside each loan. New activity still brings the loan card to the top.</p>
            </div>
            <div class="badge ${statusClass}">${currencySymbolHtml(group.currency || "")}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Remaining</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${group.rows.map((row, index) => `
                  <tr>
                    <td>${escapeHtml(displayDate(row.date))}</td>
                    <td><span class="badge ${row.kind === "principal" ? "blue" : row.kind === "partial" ? "orange" : "green"}">${row.kind === "principal" ? "Principal" : row.kind === "partial" ? "Partial" : "Full"}</span></td>
                    <td>${money(row.amount, group.currency)}</td>
                    <td><strong>${money(row.remainingAfter, group.currency)}</strong></td>
                    <td>
                      <div class="note-wrap">
                        <button type="button" class="note-toggle" data-note-toggle style="color:var(--primary);cursor:pointer;font-weight:600;font-size:.72rem;line-height:1.1;background:none;border:none;padding:0;font-family:inherit;">Note ▾</button>
                        <div class="hide note-popover" style="margin-top:4px;padding:6px;background:var(--bg);border-radius:6px;font-size:.76rem;">
                          <button class="note-close" type="button" data-note-close aria-label="Close note">×</button>
                          ${escapeHtml(row.note)}
                          <div style="color:var(--muted);font-size:.7rem;margin-top:3px">${index === 0 ? "Opening row" : `Linked ${escapeHtml(shortId(row.entryId))}`}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                       <div style="display:flex;gap:4px;">
                         <button class="tiny ghost editRowBtn" data-id="${escapeHtml(row.entryId)}" title="Edit entry">✎</button>
                         <button class="tiny danger delRowBtn" data-id="${escapeHtml(row.entryId)}" title="Delete entry">✕</button>
                       </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    `;
  }).join("");

  container.querySelectorAll(".editRowBtn").forEach(btn => btn.addEventListener("click", () => openEditModal(btn.dataset.id)));
  container.querySelectorAll(".delRowBtn").forEach(btn => btn.addEventListener("click", () => deleteEntry(btn.dataset.id)));
  container.querySelectorAll(".personActionBtn").forEach(btn => btn.addEventListener("click", async e => {
    e.preventDefault();
    const action = btn.dataset.action;
    const person = btn.dataset.person;
    const dir = btn.dataset.direction;
    if (action === "pdf") {
      await downloadPersonPDF(person, dir);
    } else if (action === "delete") {
      await deletePersonRecords(person, dir);
    } else if (action === "edit-name") {
      await renamePersonRecords(person, dir);
    }
  }));
  container.querySelectorAll("[data-note-toggle]").forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    const popover = btn.parentElement?.querySelector(".note-popover");
    if (!popover) return;
    document.querySelectorAll(".note-popover").forEach(p => {
      if (p !== popover) p.classList.add("hide");
    });
    popover.classList.toggle("hide");
  }));
  container.querySelectorAll(".note-close").forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    const popover = btn.closest(".note-popover");
    if (popover) popover.classList.add("hide");
  }));
}

function openEntryModal(modalType, direction){
  state.modalDirection = direction;
  const modal = els.entryModal;
  const title = els.modalTitle;
  const desc = els.modalDesc;
  
  // Hide all forms first
  els.principalModalForm.classList.add("hide");
  els.paymentModalForm.classList.add("hide");
  
  if (modalType === "principal"){
    title.textContent = direction === "given" ? "Loan Given" : "Loan Taken";
    desc.textContent = direction === "given" ? "Record a new loan given to someone." : "Record a new loan taken from someone.";
    els.principalModalForm.classList.remove("hide");
  } else if (modalType === "payment"){
    title.textContent = direction === "given" ? "Received Back" : "Returned Back";
    desc.textContent = direction === "given" ? "Record a payment received back." : "Record a payment returned back.";
    els.paymentModalForm.classList.remove("hide");
    populateLoanSelect(direction);
  }
  
  modal.classList.remove("hide");
  modal.setAttribute("aria-hidden", "false");
}

function populateLoanSelect(direction){
  const groups = groupByLoan(state.entries.filter(e => e.direction === direction));
  const options = groups.map(group => 
    `<option value="${group.group_id}">${escapeHtml(group.person_name)} (${escapeHtml(group.currency)}) - Remaining: ${money(calculateLoan(group).remaining, group.currency)}</option>`
  ).join("");
  
  els.modalLoanSelect.innerHTML = `<option value="">Select a loan...</option>${options}`;
}

function closeEntryModal(){
  els.entryModal.classList.add("hide");
  els.entryModal.setAttribute("aria-hidden", "true");
  
  // Reset forms
  els.principalModalForm.reset();
  els.paymentModalForm.reset();
}

function openEditModal(entryId){
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  
  state.editId = entryId;
  state.editKind = entry.entry_kind;
  
  const modal = els.editModal;
  const form = els.editForm;
  
  // Populate form fields
  form.elements.date.value = entry.action_date || entry.loan_date || todayISO();
  form.elements.amount.value = entry.action_amount || entry.principal_amount || "";
  form.elements.name.value = entry.person_name || "";
  form.elements.notes.value = entry.notes || "";
  
  modal.classList.remove("hide");
  modal.setAttribute("aria-hidden", "false");
}

function closeEditModal(){
  els.editModal.classList.add("hide");
  els.editModal.setAttribute("aria-hidden", "true");
  els.editForm.reset();
  state.editId = null;
  state.editKind = null;
}

async function savePrincipalEntry(formData){
  const personName = formData.get("person_name").trim();
  const currency = formData.get("currency");
  const principalAmount = Number(formData.get("principal_amount"));
  const loanDate = formData.get("loan_date");
  const notes = formData.get("notes").trim();
  
  if (!personName) {
    alert("Please enter a person name.");
    return false;
  }
  
  if (!principalAmount || principalAmount <= 0) {
    alert("Please enter a valid principal amount.");
    return false;
  }
  
  const groupId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const entry = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    group_id: groupId,
    direction: state.modalDirection,
    entry_kind: "principal",
    person_name: personName,
    currency: currency,
    principal_amount: principalAmount,
    action_amount: null,
    loan_date: loanDate,
    action_date: null,
    notes: notes
  };
  
  state.entries.push(entry);
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
  closeEntryModal();
  
  return true;
}

async function savePaymentEntry(formData){
  const groupId = formData.get("group_id");
  const actionAmount = Number(formData.get("action_amount"));
  const entryKind = formData.get("entry_kind");
  const actionDate = formData.get("action_date");
  const notes = formData.get("notes").trim();
  
  if (!groupId) {
    alert("Please select a loan.");
    return false;
  }
  
  if (!actionAmount || actionAmount <= 0) {
    alert("Please enter a valid payment amount.");
    return false;
  }
  
  const entry = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    group_id: groupId,
    direction: state.modalDirection,
    entry_kind: entryKind,
    person_name: "", // Will be filled from the group
    currency: "", // Will be filled from the group
    principal_amount: null,
    action_amount: actionAmount,
    loan_date: null,
    action_date: actionDate,
    notes: notes
  };
  
  // Get person name and currency from the group
  const group = groupByLoan(state.entries.filter(e => e.direction === state.modalDirection)).find(g => g.group_id === groupId);
  if (group) {
    entry.person_name = group.person_name;
    entry.currency = group.currency;
  }
  
  state.entries.push(entry);
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
  closeEntryModal();
  
  return true;
}

async function saveEditEntry(formData){
  if (!state.editId) return false;
  
  const entry = state.entries.find(e => e.id === state.editId);
  if (!entry) return false;
  
  const date = formData.get("date");
  const amount = Number(formData.get("amount"));
  const name = formData.get("name").trim();
  const notes = formData.get("notes").trim();
  
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return false;
  }
  
  if (!name) {
    alert("Please enter a name/description.");
    return false;
  }
  
  // Update entry
  if (entry.entry_kind === "principal") {
    entry.principal_amount = amount;
    entry.loan_date = date;
  } else {
    entry.action_amount = amount;
    entry.action_date = date;
  }
  
  entry.person_name = name;
  entry.notes = notes;
  
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
  closeEditModal();
  
  return true;
}

async function deleteEntry(id){
  if (!id) return;
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  
  if (entry.entry_kind === "principal"){
    if (!confirm(`Delete the entire loan for ${entry.person_name}? This will also remove ALL linked repayments.`)) return;
    state.entries = state.entries.filter(e => e.group_id !== entry.group_id);
  } else {
    if (!confirm(`Delete this specific entry?`)) return;
    state.entries = state.entries.filter(e => e.id !== id);
  }
  
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
}

async function deletePersonRecords(personNameEncoded, direction){
  const personName = decodeURIComponent(personNameEncoded || "").trim();
  if (!personName || !direction) return;

  const recordsCount = state.entries.filter(e =>
    e.direction === direction && String(e.person_name || "").trim() === personName
  ).length;

  if (!recordsCount) {
    alert("No records found for this person.");
    return;
  }

  const directionLabel = direction === "given" ? "given" : "taken";
  if (!confirm(`Delete full record for ${personName}? This will remove ${recordsCount} entr${recordsCount === 1 ? "y" : "ies"} from ${directionLabel}.`)) return;

  state.entries = state.entries.filter(e => !(e.direction === direction && String(e.person_name || "").trim() === personName));
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
}

async function renamePersonRecords(personNameEncoded, direction){
  const currentName = decodeURIComponent(personNameEncoded || "").trim();
  if (!currentName || !direction) return;
  const nextName = prompt("Enter new person name:", currentName);
  if (nextName === null) return;
  const cleanedName = nextName.trim();
  if (!cleanedName) {
    alert("Name cannot be empty.");
    return;
  }
  if (cleanedName === currentName) return;

  state.entries = state.entries.map(entry => (
    entry.direction === direction && String(entry.person_name || "").trim() === currentName
      ? { ...entry, person_name: cleanedName }
      : entry
  ));
  updateSessionStorage();
  renderGiven();
  updateQuickCounters();
}

async function downloadPersonPDF(personNameEncoded, direction) {
  alert('PDF download functionality to be implemented');
}

function updateSessionStorage(){
  sessionStorage.setItem("loanledger-entries", JSON.stringify(state.entries));
}

function renderGiven(){
  renderLoanCards(els.givenList, "given", "given");
}

function updateQuickCounters(){
  const givenGroups = groupByLoan(state.entries.filter(e => e.direction === "given"));
  const takenGroups = groupByLoan(state.entries.filter(e => e.direction === "taken"));
  
  const openGiven = givenGroups.filter(g => calculateLoan(g).status !== "Closed").length;
  const openTaken = takenGroups.filter(g => calculateLoan(g).status !== "Closed").length;
  
  const receivedRows = state.entries.filter(e => e.direction === "given" && e.entry_kind !== "principal").length;
  const returnedRows = state.entries.filter(e => e.direction === "taken" && e.entry_kind !== "principal").length;
  
  els.openGivenCount.textContent = openGiven;
  els.openTakenCount.textContent = openTaken;
  els.receivedCount.textContent = receivedRows;
  els.returnedCount.textContent = returnedRows;
}

function renderOverviewCards(){
  const currencies = ["AED", "SAR", "PKR"];
  let cards = "";
  
  for (const currency of currencies){
    const givenGroups = groupByLoan(state.entries.filter(e =>
      e.currency === currency && e.direction === "given"
    ));
    const takenGroups = groupByLoan(state.entries.filter(e =>
      e.currency === currency && e.direction === "taken"
    ));
    
    const givenPrincipal = givenGroups.reduce((s, g) => s + Number(g.principal?.principal_amount || 0), 0);
    const givenOpen = givenGroups.reduce((s, g) => s + calculateLoan(g).remaining, 0);
    const takenPrincipal = takenGroups.reduce((s, g) => s + Number(g.principal?.principal_amount || 0), 0);
    const takenOpen = takenGroups.reduce((s, g) => s + calculateLoan(g).remaining, 0);
    
    cards += `
      <div class="summary currency-summary">
        <div class="summary-watermark" aria-hidden="true">${currencySymbolHtml(currency)}</div>
        <div class="currency-head">
          ${currencySymbolHtml(currency)}${currency}
        </div>
        <div class="summary-line">
          <span>Given Principal</span>
          <strong>${money(givenPrincipal, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Given Open</span>
          <strong>${money(givenOpen, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Taken Principal</span>
          <strong>${money(takenPrincipal, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Taken Open</span>
          <strong>${money(takenOpen, currency)}</strong>
        </div>
      </div>
    `;
  }
  
  els.statsGrid.innerHTML = cards;
}

function logout(){
  sessionStorage.clear();
  window.location.href = "/index.html";
}

function bindEvents(){
  // Logout
  els.logoutBtn.addEventListener("click", logout);
  
  // Search
  els.searchGiven.addEventListener("input", (e) => {
    state.search.given = e.target.value;
    renderGiven();
  });
  
  // Filters
  document.querySelectorAll('[data-filter="given"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.statusFilter.given = e.target.value;
      renderGiven();
    });
  });
  
  document.querySelectorAll('[data-currency-filter="given"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.currencyFilter.given = e.target.value;
      renderGiven();
    });
  });
  
  // Modal buttons
  document.querySelectorAll('[data-open-modal="principal"]').forEach(btn => {
    btn.addEventListener("click", () => openEntryModal("principal", "given"));
  });
  
  document.querySelectorAll('[data-open-modal="payment"]').forEach(btn => {
    btn.addEventListener("click", () => openEntryModal("payment", "given"));
  });
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal="entryModal"]').forEach(btn => {
    btn.addEventListener("click", closeEntryModal);
  });
  
  document.querySelectorAll('[data-close-modal="editModal"]').forEach(btn => {
    btn.addEventListener("click", closeEditModal);
  });
  
  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        const modalId = backdrop.getAttribute('data-close-modal');
        if (modalId === 'entryModal') closeEntryModal();
        if (modalId === 'editModal') closeEditModal();
      }
    });
  });
  
  // Form submissions
  els.principalModalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await savePrincipalEntry(new FormData(e.target));
  });
  
  els.paymentModalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await savePaymentEntry(new FormData(e.target));
  });
  
  els.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveEditEntry(new FormData(e.target));
  });
  
  // Currency pickers
  document.querySelectorAll('.currency-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const picker = chip.parentElement;
      picker.querySelectorAll('.currency-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const hiddenInput = picker.parentElement.querySelector('input[type="hidden"]');
      if (hiddenInput) hiddenInput.value = chip.dataset.currency;
    });
  });
  
  // Overview toggle
  els.toggleMainOverviewBtn.addEventListener('click', () => {
    els.mainOverview.classList.toggle('collapsed');
  });
  
  // Download buttons (placeholder functionality)
  els.downloadGivenPdfBtn.addEventListener('click', () => {
    alert('PDF download functionality to be implemented');
  });
  
  els.downloadAllDataJsonBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(state.entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'loan_ledger_backup.json';
    link.click();
    URL.revokeObjectURL(url);
  });
  
  els.downloadAllDataCsvBtn.addEventListener('click', () => {
    alert('CSV download functionality to be implemented');
  });
  
  // Import inputs
  els.importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            state.entries = imported;
            updateSessionStorage();
            renderGiven();
            updateQuickCounters();
            renderOverviewCards();
            alert('Data imported successfully!');
          } else {
            alert('Invalid file format');
          }
        } catch (error) {
          alert('Error importing file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  });
  
  // Menu dropdowns
  document.querySelectorAll('.menu-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuPanel = trigger.parentElement.querySelector('.menu-dropdown');
      const isOpen = menuPanel.classList.contains('open');
      
      // Close all other menus
      document.querySelectorAll('.menu-dropdown').forEach(menu => {
        menu.classList.remove('open');
      });
      
      if (!isOpen) {
        menuPanel.classList.add('open');
      }
    });
  });
  
  // Close menus when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach(menu => {
      menu.classList.remove('open');
    });
  });
  
  // Set default dates
  document.querySelectorAll('[data-default-today="true"]').forEach(input => {
    if (!input.value) {
      input.value = todayISO();
    }
  });
}

function boot(){
  // Check authentication
  const stored = sessionStorage.getItem("loanledger-runtime-config");
  if (!stored || sessionStorage.getItem("loanledger-unlocked") !== "true") {
    window.location.href = "/index.html";
    return;
  }
  
  runtimeConfig = JSON.parse(stored);
  state.unlocked = true;
  
  // Load entries from sessionStorage
  const entriesStored = sessionStorage.getItem("loanledger-entries");
  if (entriesStored) {
    try {
      state.entries = JSON.parse(entriesStored);
    } catch (e) {
      console.error("Error loading entries:", e);
      state.entries = [];
    }
  }
  
  // Initialize UI
  initFloatingCurrencyBackground();
  renderGiven();
  updateQuickCounters();
  renderOverviewCards();
  bindEvents();
  
  // Show app
  els.app.classList.remove("hide");
}

boot();
