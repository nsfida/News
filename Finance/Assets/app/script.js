const CONFIG = {
  protectedZipPath: "https://livenews.live/Finance/Assets/app/key.zip",
  table: "loan_ledger_entries"
};

let runtimeConfig = null;

const SUPPORTED_CURRENCIES = ["AED", "SAR", "PKR"];

const state = {
  entries: [],
  dataSource: "backup",
  hasImportedFile: false,
  dbEntryIds: new Set(),
  dbSignatures: new Set(),
  unlocked: false,
  search: { given: "", received: "", taken: "", returned: "", installments: "" },
  statusFilter: { given: "All", received: "All", taken: "All", returned: "All", installments: "All" },
  currencyFilter: { given: "All", received: "All", taken: "All", returned: "All", installments: "All" },
  lastCurrency: "AED",
  modalDirection: "given",
  editId: null,
  editKind: null
};

const els = {
  lockScreen: document.getElementById("lockScreen"),
  zipPasswordInput: document.getElementById("zipPasswordInput"),
  unlockBtn: document.getElementById("unlockBtn"),
  lockError: document.getElementById("lockError"),
  app: document.getElementById("app"),
  statsGrid: document.getElementById("statsGrid"),
  givenList: document.getElementById("givenList"),
  receivedList: document.getElementById("receivedList"),
  takenList: document.getElementById("takenList"),
  returnedList: document.getElementById("returnedList"),
  installmentsList: document.getElementById("installmentsList"),
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
  downloadReceivedPdfBtn: document.getElementById("downloadReceivedPdfBtn"),
  downloadTakenPdfBtn: document.getElementById("downloadTakenPdfBtn"),
  downloadReturnedPdfBtn: document.getElementById("downloadReturnedPdfBtn"),
  entryModal: document.getElementById("entryModal"),
  editModal: document.getElementById("editModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalDesc: document.getElementById("modalDesc"),
  principalModalForm: document.getElementById("principalModalForm"),
  paymentModalForm: document.getElementById("paymentModalForm"),
  editForm: document.getElementById("editForm"),
  modalLoanSelect: document.getElementById("modalLoanSelect"),
  principalSubmitBtn: document.getElementById("principalSubmitBtn"),
  paymentSubmitBtn: document.getElementById("paymentSubmitBtn"),
  multiEntryCount: document.getElementById("multiEntryCount"),
  multiEntryContainer: document.getElementById("multiEntryContainer")
};

const INSTALLMENT_TAG = "[INSTALLMENT]";
const BACKUP_STORAGE_KEY = "loanledger-json-backup-v1";

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

function entrySignature(entry){
  const person = String(entry.person_name || "").trim().toLowerCase();
  const notes = String(entry.notes || "").trim().toLowerCase();
  const principal = entry.principal_amount == null || entry.principal_amount === "" ? "" : Number(entry.principal_amount).toFixed(2);
  const action = entry.action_amount == null || entry.action_amount === "" ? "" : Number(entry.action_amount).toFixed(2);
  const loanDate = normalizeDateForDb(entry.loan_date) || "";
  const actionDate = normalizeDateForDb(entry.action_date) || "";
  return [
    String(entry.direction || "").trim().toLowerCase(),
    String(entry.entry_kind || "").trim().toLowerCase(),
    person,
    String(entry.currency || "").trim().toUpperCase(),
    principal,
    action,
    loanDate,
    actionDate,
    notes
  ].join("|");
}

function getSupabaseConfig(){
  if (!runtimeConfig?.supabaseUrl || !runtimeConfig?.supabaseKey){
    throw new Error("Supabase config is locked. Please unlock the ZIP file first.");
  }
  return runtimeConfig;
}

async function readConfigFromZip(file, password){
  if (!window.zip?.ZipReader) throw new Error("ZIP library failed to load.");

  const reader = new zip.ZipReader(new zip.BlobReader(file), { password });
  const entries = await reader.getEntries();
  const configEntry = entries.find(e => /(^|\/)db-config\.json$/i.test(e.filename) || /\.json$/i.test(e.filename));
  if (!configEntry) throw new Error("No JSON config found in ZIP.");
  const jsonText = await configEntry.getData(new zip.TextWriter());
  await reader.close();
  return JSON.parse(jsonText);
}

async function fetchProtectedZipBlob(){
  const zipRes = await fetch(CONFIG.protectedZipPath, { cache: "no-store" });

  if (!zipRes.ok){
    throw new Error(`Unable to load ${CONFIG.protectedZipPath}.`);
  }
  return zipRes.blob();
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
  const res = await fetch(`${dbConfig.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: apiHeaders(options.headers || {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || data?.error || text || `Request failed (${res.status})`);
  return data;
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

function groupSortStamp(group){
  return group.activityStamp || 0;
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
    const diff = groupSortStamp(b) - groupSortStamp(a);
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

function summarizeCurrency(currency){
  const givenGroups = groupByLoan(state.entries.filter(e => e.currency === currency && e.direction === "given"));
  const takenGroups = groupByLoan(state.entries.filter(e => e.currency === currency && e.direction === "taken"));

  const givenPrincipal = givenGroups.reduce((s, g) => s + Number(g.principal?.principal_amount || 0), 0);
  const givenOpen = givenGroups.reduce((s, g) => s + calculateLoan(g).remaining, 0);
  const takenPrincipal = takenGroups.reduce((s, g) => s + Number(g.principal?.principal_amount || 0), 0);
  const takenOpen = takenGroups.reduce((s, g) => s + calculateLoan(g).remaining, 0);

  return { currency, givenPrincipal, givenOpen, takenPrincipal, takenOpen };
}

function renderOverviewCards(){
  const currencies = [...new Set([...SUPPORTED_CURRENCIES, ...state.entries.map(e => e.currency).filter(Boolean)])];

  els.statsGrid.innerHTML = currencies.map(currency => {
    const s = summarizeCurrency(currency);
    return `
      <div class="summary currency-summary">
        <div class="currency-head">
          ${currencySymbolHtml(currency)}
        </div>
        <div class="summary-line">
          <span>Given principal</span>
          <strong>${money(s.givenPrincipal, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Given open</span>
          <strong>${money(s.givenOpen, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Taken principal</span>
          <strong>${money(s.takenPrincipal, currency)}</strong>
        </div>
        <div class="summary-line">
          <span>Taken open</span>
          <strong>${money(s.takenOpen, currency)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function matchesSearch(entry, term){
  if (!term) return true;
  const blob = `${entry.person_name || ""} ${entry.notes || ""} ${entry.currency || ""} ${displayDate(entry.loan_date)} ${displayDate(entry.action_date)}`.toLowerCase();
  return blob.includes(term.toLowerCase());
}

function hasInstallmentTag(noteValue){
  return String(noteValue || "").includes(INSTALLMENT_TAG);
}

function normalizeInstallmentNote(noteValue, markInstallment){
  const base = String(noteValue || "").replace(INSTALLMENT_TAG, "").trim();
  if (!markInstallment) return base || null;
  return base ? `${INSTALLMENT_TAG} ${base}` : INSTALLMENT_TAG;
}

function filterPrincipal(direction, searchKey = direction){
  return groupByLoan(state.entries.filter(e => e.direction === direction))
    .filter(group => matchesSearch(group.principal || group.actions[0] || {}, state.search[searchKey]));
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

    const showInstallmentMove = direction === "taken" && !options.hideMoveToInstallments;
    const personName = String(group.person_name || "").trim();
    const unsyncedEntries = getUnsyncedEntriesForPerson(personName, direction);
    const hasUnsynced = unsyncedEntries.length > 0;
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
                ${hasUnsynced ? `<span class="badge orange">Not in DB (${unsyncedEntries.length})</span>` : ""}
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
                  ${hasUnsynced ? `<button class="menu-item personActionBtn" type="button" data-action="save-db" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Save to Database</button>` : ""}
                  <button class="menu-item personActionBtn" type="button" data-action="edit-name" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Edit Name</button>
                  ${showInstallmentMove ? `<button class="menu-item personActionBtn" type="button" data-action="move-installment" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Move to Installments</button>` : ""}
                  <button class="menu-item danger personActionBtn" type="button" data-action="delete" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">Delete Record</button>
                </div>
              </div>
              ${hasUnsynced ? `<button class="icon-btn savePersonBtn" type="button" title="Save missing records to database" data-person="${encodeURIComponent(group.person_name || "")}" data-direction="${escapeHtml(direction)}">💾</button>` : ""}
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
    } else if (action === "save-db") {
      await savePersonRecordsToDatabase(person, dir);
    } else if (action === "delete") {
      await deletePersonRecords(person, dir);
    } else if (action === "edit-name") {
      await renamePersonRecords(person, dir);
    } else if (action === "move-installment") {
      await movePersonToInstallments(person, dir);
    }
  }));
  container.querySelectorAll(".savePersonBtn").forEach(btn => btn.addEventListener("click", async e => {
    e.preventDefault();
    await savePersonRecordsToDatabase(btn.dataset.person, btn.dataset.direction);
  }));
  container.querySelectorAll("[data-note-toggle]").forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    const popover = btn.parentElement?.querySelector(".note-popover");
    if (!popover) return;
    document.querySelectorAll(".note-popover").forEach(p => {
      if (p !== popover) p.classList.add("hide");
    });
    popover.classList.toggle("hide");
    if (!popover.classList.contains("hide")) {
      positionNotePopover(btn, popover);
    }
  }));
  container.querySelectorAll("[data-note-close]").forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    btn.closest(".note-popover")?.classList.add("hide");
  }));
  container.querySelectorAll("[data-person-menu]").forEach(btn => btn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const key = btn.dataset.personMenu;
    const panel = container.querySelector(`[data-person-menu-panel="${key}"]`);
    if (!panel) return;
    document.querySelectorAll(".menu-dropdown.open").forEach(openPanel => {
      if (openPanel !== panel) openPanel.classList.remove("open");
    });
    document.querySelectorAll(".menu-trigger[aria-expanded='true']").forEach(trigger => {
      if (trigger !== btn) trigger.setAttribute("aria-expanded", "false");
    });
    const nowOpen = panel.classList.toggle("open");
    btn.setAttribute("aria-expanded", nowOpen ? "true" : "false");
  }));
}

function positionNotePopover(toggleBtn, popover){
  if (!toggleBtn || !popover) return;
  const rect = toggleBtn.getBoundingClientRect();
  const viewportPadding = 8;
  const gap = 6;

  popover.style.position = "fixed";
  popover.style.left = `${Math.max(viewportPadding, rect.left)}px`;
  popover.style.top = `${rect.bottom + gap}px`;
  popover.style.right = "auto";
  popover.style.transform = "none";

  let popRect = popover.getBoundingClientRect();
  const overflowRight = popRect.right - (window.innerWidth - viewportPadding);
  if (overflowRight > 0){
    popover.style.left = `${Math.max(viewportPadding, rect.left - overflowRight)}px`;
    popRect = popover.getBoundingClientRect();
  }

  const overflowBottom = popRect.bottom - (window.innerHeight - viewportPadding);
  if (overflowBottom > 0){
    const top = Math.max(viewportPadding, rect.top - popRect.height - gap);
    popover.style.top = `${top}px`;
  }
}

function repositionOpenNotePopovers(){
  document.querySelectorAll(".note-wrap").forEach(wrap => {
    const popover = wrap.querySelector(".note-popover");
    const toggle = wrap.querySelector("[data-note-toggle]");
    if (!popover || !toggle || popover.classList.contains("hide")) return;
    positionNotePopover(toggle, popover);
  });
}

function renderLoanSelectors(){
  const givenGroups = groupByLoan(state.entries.filter(e => e.direction === "given")).filter(g => calculateLoan(g).remaining > 0);
  const takenGroups = groupByLoan(state.entries.filter(e => e.direction === "taken")).filter(g => calculateLoan(g).remaining > 0);

  const makeOptions = groups => groups.length
    ? `<option value="">Choose one</option>` + groups.map(g => {
        const remaining = calculateLoan(g).remaining;
        return `<option value="${escapeHtml(g.group_id)}">${escapeHtml(g.person_name)} — ${escapeHtml(moneyText(remaining, g.currency))} remaining</option>`;
      }).join("")
    : `<option value="">No open loans available</option>`;

  els.modalLoanSelect.innerHTML = state.modalDirection === "given" ? makeOptions(givenGroups) : makeOptions(takenGroups);

  const hasOptions = (state.modalDirection === "given" ? givenGroups : takenGroups).length > 0;
  els.modalLoanSelect.disabled = !hasOptions;
  els.paymentSubmitBtn.disabled = !hasOptions;
}

function defaultDateInputs(root = document){
  root.querySelectorAll('input[type="date"]').forEach(i => {
    if (!i.value && i.dataset.defaultToday === "true") i.value = todayISO();
  });
}

function renderMultiEntries(count) {
  let html = `
    <div class="multi-row-header">
      <div>Date</div>
      <div>Amount</div>
      <div>Remarks</div>
    </div>
  `;
  for(let i=0; i<count; i++){
    html += `
      <div class="multi-row">
        <input class="input" name="action_date_${i}" type="date" required data-default-today="true" aria-label="Date ${i+1}" />
        <input class="input" name="action_amount_${i}" type="number" min="0" step="0.01" required placeholder="0.00" aria-label="Amount ${i+1}" />
        <input class="input" name="notes_${i}" placeholder="Notes" aria-label="Remarks ${i+1}" />
      </div>
    `;
  }
  els.multiEntryContainer.innerHTML = html;
  defaultDateInputs(els.multiEntryContainer);
}

function parseEntriesPayload(payload){
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.entries)) return payload.entries;
  return [];
}

function csvEscape(value){
  const str = String(value ?? "");
  if (!/[",\n\r]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function toCsv(entries){
  const headers = [
    "id","group_id","direction","entry_kind","person_name","currency",
    "principal_amount","action_amount","loan_date","action_date","notes","created_at"
  ];
  const lines = [headers.join(",")];
  for (const entry of entries){
    lines.push(headers.map(h => csvEscape(entry[h])).join(","));
  }
  return lines.join("\n");
}

function parseCsvLine(line){
  const out = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (ch === '"'){
      if (inQuotes && line[i + 1] === '"'){
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes){
      out.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  out.push(value);
  return out;
}

function parseCsvRows(text){
  const rows = [];
  let row = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (ch === '"'){
      if (inQuotes && text[i + 1] === '"'){
        row += '""';
        i += 1;
      } else {
        inQuotes = !inQuotes;
        row += ch;
      }
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes){
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (row.trim()) rows.push(parseCsvLine(row));
      row = "";
      continue;
    }
    row += ch;
  }
  if (row.trim()) rows.push(parseCsvLine(row));
  return rows;
}

function parseEntriesCsv(csvText){
  const rows = parseCsvRows(csvText);
  if (!rows.length) return [];
  const header = rows[0].map(v => String(v || "").trim());
  const idx = key => header.indexOf(key);
  const required = ["group_id","direction","entry_kind","person_name","currency","loan_date"];
  if (required.some(k => idx(k) === -1)){
    throw new Error("Invalid CSV format. Missing required columns.");
  }
  return rows.slice(1).map(cols => {
    const get = key => {
      const i = idx(key);
      return i >= 0 ? (cols[i] ?? "").trim() : "";
    };
    const valOrNull = key => {
      const v = get(key);
      return v === "" ? null : v;
    };
    const numOrNull = key => {
      const v = get(key);
      if (v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      id: valOrNull("id") || crypto.randomUUID(),
      group_id: get("group_id"),
      direction: get("direction"),
      entry_kind: get("entry_kind"),
      person_name: get("person_name"),
      currency: get("currency"),
      principal_amount: numOrNull("principal_amount"),
      action_amount: numOrNull("action_amount"),
      loan_date: get("loan_date"),
      action_date: valOrNull("action_date"),
      notes: valOrNull("notes"),
      created_at: valOrNull("created_at") || new Date().toISOString()
    };
  }).filter(entry => entry.group_id && entry.direction && entry.entry_kind && entry.person_name);
}

function saveBackupEntries(entries){
  const payload = {
    exportedAt: new Date().toISOString(),
    entries: Array.isArray(entries) ? entries : []
  };
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(payload));
}

function loadBackupEntriesFromStorage(){
  const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
  if (!raw) return [];
  try{
    return parseEntriesPayload(JSON.parse(raw));
  }catch{
    return [];
  }
}

function updateUploadButtonVisibility(){
  const shouldShow = state.hasImportedFile && state.dataSource === "backup";
  els.uploadBackupBtn.classList.toggle("hide", !shouldShow);
}

function applyEntries(entries, source = "backup", options = {}){
  state.entries = Array.isArray(entries) ? entries : [];
  state.dataSource = source;
  if (typeof options.hasImportedFile === "boolean"){
    state.hasImportedFile = options.hasImportedFile;
  }
  saveBackupEntries(state.entries);
  updateUploadButtonVisibility();
  renderAll();
}

async function loadEntries(){
  if (state.dataSource === "backup"){
    applyEntries(loadBackupEntriesFromStorage(), "backup");
    return;
  }
  await loadEntriesFromSupabase();
}

async function loadEntriesFromSupabase(){
  const rows = await supabase(`${CONFIG.table}?select=*&order=created_at.desc`);
  updateDbSnapshot(Array.isArray(rows) ? rows : []);
  applyEntries(Array.isArray(rows) ? rows : [], "supabase", { hasImportedFile: false });
}

function renderAll(){
  renderOverviewCards();
  renderLoanSelectors();
  renderLoanCards(els.givenList, "given", "given");
  renderLoanCards(els.receivedList, "given", "received");
  renderLoanCards(els.takenList, "taken", "taken", {
    groupFilter: group => !group.rows.some(row => hasInstallmentTag(row.note))
  });
  renderLoanCards(els.returnedList, "taken", "returned", {
    groupFilter: group => !group.rows.some(row => hasInstallmentTag(row.note))
  });
  renderLoanCards(els.installmentsList, "taken", "installments", {
    groupFilter: group => group.rows.some(row => hasInstallmentTag(row.note)),
    hideMoveToInstallments: true
  });

  els.openGivenCount.textContent = groupByLoan(state.entries.filter(e => e.direction === "given")).filter(g => calculateLoan(g).remaining > 0).length;
  els.openTakenCount.textContent = groupByLoan(state.entries.filter(e => e.direction === "taken")).filter(g => calculateLoan(g).remaining > 0).length;
  els.receivedCount.textContent = state.entries.filter(e => e.direction === "given" && e.entry_kind !== "principal").length;
  els.returnedCount.textContent = state.entries.filter(e => e.direction === "taken" && e.entry_kind !== "principal").length;
}

function activate(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`${tab}Panel`).classList.add("active");
}

function setCurrencyChoice(form, currency){
  const hidden = form.querySelector('input[name="currency"]');
  if (hidden) hidden.value = currency;
  form.querySelectorAll(".currency-chip").forEach(btn => btn.classList.toggle("active", btn.dataset.currency === currency));
  state.lastCurrency = currency;
}

function openEntryModal(mode, direction){
  state.modalDirection = direction;

  els.entryModal.classList.remove("hide");
  els.entryModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (mode === "principal"){
    els.modalTitle.textContent = direction === "given" ? "New loan given" : "New loan taken";
    els.modalDesc.textContent = direction === "given" ? "Add a loan you gave to someone." : "Add money you received from someone.";
    els.principalModalForm.classList.remove("hide");
    els.paymentModalForm.classList.add("hide");
    els.principalModalForm.reset();
    els.principalModalForm.querySelector('input[name="direction"]').value = direction;
    els.principalModalForm.querySelector('input[name="person_name"]').placeholder = direction === "given" ? "Full name" : "Lender name";
    els.principalSubmitBtn.textContent = direction === "given" ? "Save given loan" : "Save taken loan";
    setCurrencyChoice(els.principalModalForm, state.lastCurrency || "AED");
    defaultDateInputs(els.principalModalForm);
  } else {
    els.modalTitle.textContent = direction === "given" ? "New received back entry" : "New returned back entry";
    els.modalDesc.textContent = direction === "given" ? "Record money received against a given loan." : "Record repayment against a taken loan.";
    els.paymentModalForm.classList.remove("hide");
    els.principalModalForm.classList.add("hide");
    els.paymentModalForm.reset();
    els.paymentModalForm.querySelector('input[name="direction"]').value = direction;
    els.paymentSubmitBtn.textContent = direction === "given" ? "Save received back" : "Save returned back";
    els.multiEntryCount.value = 1;
    renderMultiEntries(1);
    renderLoanSelectors();
  }
}

function openEditModal(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  state.editId = id;
  state.editKind = entry.entry_kind;

  if (entry.entry_kind === "principal") {
    document.getElementById('editPersonGroup').classList.remove('hide');
    document.getElementById('editCurrencyGroup').classList.remove('hide');
    document.getElementById('editName').value = entry.person_name || "";
    document.getElementById('editName').required = true;
    setCurrencyChoice(els.editForm, entry.currency || "AED");
    document.getElementById('editAmountLabel').textContent = "Principal Amount";
    document.getElementById('editAmount').value = entry.principal_amount || "";
    document.getElementById('editDateLabel').textContent = "Loan Date";
    document.getElementById('editDate').value = entry.loan_date || "";
  } else {
    document.getElementById('editPersonGroup').classList.add('hide');
    document.getElementById('editCurrencyGroup').classList.add('hide');
    document.getElementById('editName').required = false;
    document.getElementById('editAmountLabel').textContent = "Payment Amount";
    document.getElementById('editAmount').value = entry.action_amount || "";
    document.getElementById('editDateLabel').textContent = "Payment Date";
    document.getElementById('editDate').value = entry.action_date || "";
  }
  document.getElementById('editNotes').value = entry.notes || "";

  els.editModal.classList.remove("hide");
  els.editModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId){
  document.getElementById(modalId).classList.add("hide");
  document.getElementById(modalId).setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function isBackupMode(){
  return state.dataSource === "backup";
}

function refreshBackupView(){
  applyEntries(state.entries, "backup");
}

async function createPrincipal(form){
  const fd = new FormData(form);
  const direction = String(fd.get("direction") || "");
  const groupId = crypto.randomUUID();
  const payload = {
    group_id: groupId,
    direction,
    entry_kind: "principal",
    person_name: String(fd.get("person_name") || "").trim(),
    currency: String(fd.get("currency") || "").trim(),
    principal_amount: Number(fd.get("principal_amount") || 0),
    action_amount: null,
    loan_date: fd.get("loan_date"),
    action_date: null,
    notes: String(fd.get("notes") || "").trim() || null
  };

  if (!payload.person_name || !payload.currency || !payload.principal_amount || !payload.loan_date) throw new Error("Complete all required fields.");

  if (isBackupMode()){
    state.entries.unshift({
      ...payload,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    });
  } else {
    await supabase(CONFIG.table, { method: "POST", body: JSON.stringify(payload) });
  }
  form.reset();
  setCurrencyChoice(form, "AED");
  defaultDateInputs(form);
  closeModal("entryModal");
  if (isBackupMode()) refreshBackupView();
  else await loadEntriesFromSupabase();
}

async function createPayment(form){
  const fd = new FormData(form);
  const direction = String(fd.get("direction") || "");
  const groupId = String(fd.get("group_id") || "");
  const count = parseInt(els.multiEntryCount.value) || 1;

  if (!groupId) throw new Error("Please choose a loan.");

  const principalEntry = state.entries.find(e => e.group_id === groupId && e.entry_kind === "principal");
  if (!principalEntry) throw new Error("Selected loan could not be found.");

  const group = groupByLoan(state.entries.filter(e => e.group_id === groupId))[0];
  let currentRemaining = calculateLoan(group).remaining;

  let totalAmount = 0;
  for(let i=0; i<count; i++){
     totalAmount += Number(fd.get(`action_amount_${i}`) || 0);
  }

  if (totalAmount > currentRemaining){
    throw new Error(`Total amount (${totalAmount}) exceeds remaining balance (${currentRemaining}).`);
  }

  const payloads = [];
  for(let i=0; i<count; i++){
    const amt = Number(fd.get(`action_amount_${i}`) || 0);
    const dt = fd.get(`action_date_${i}`);
    const nt = String(fd.get(`notes_${i}`) || "").trim() || null;

    if(!amt || !dt) continue;

    currentRemaining -= amt;
    payloads.push({
      group_id: groupId,
      direction,
      entry_kind: currentRemaining <= 0 ? "full" : "partial",
      person_name: principalEntry.person_name,
      currency: principalEntry.currency,
      principal_amount: null,
      action_amount: amt,
      loan_date: principalEntry.loan_date,
      action_date: dt,
      notes: nt
    });
  }

  if(payloads.length === 0) throw new Error("Please fill out amount and date.");

  if (isBackupMode()){
    const now = new Date().toISOString();
    payloads.forEach(p => {
      state.entries.unshift({ ...p, id: crypto.randomUUID(), created_at: now });
    });
  } else {
    await supabase(CONFIG.table, { method: "POST", body: JSON.stringify(payloads) });
  }

  form.reset();
  els.multiEntryCount.value = 1;
  renderMultiEntries(1);
  closeModal("entryModal");
  if (isBackupMode()) refreshBackupView();
  else await loadEntriesFromSupabase();
}

async function submitEdit(){
  const id = state.editId;
  if (!id) return;

  const amt = Number(document.getElementById('editAmount').value || 0);
  const dt = document.getElementById('editDate').value;
  const nt = document.getElementById('editNotes').value.trim() || null;

  if(state.editKind === "principal"){
    const nm = document.getElementById('editName').value.trim();
    const curr = document.getElementById('editCurrency').value;
    if (!nm || !curr || !amt || !dt) throw new Error("Complete required fields.");
    if (isBackupMode()){
      state.entries = state.entries.map(entry => entry.id === id
        ? { ...entry, person_name: nm, currency: curr, principal_amount: amt, loan_date: dt, notes: nt }
        : entry
      );
    } else {
      await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ person_name: nm, currency: curr, principal_amount: amt, loan_date: dt, notes: nt })
      });
    }
  } else {
    if (!amt || !dt) throw new Error("Complete required fields.");
    if (isBackupMode()){
      state.entries = state.entries.map(entry => entry.id === id
        ? { ...entry, action_amount: amt, action_date: dt, notes: nt }
        : entry
      );
    } else {
      await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ action_amount: amt, action_date: dt, notes: nt })
      });
    }
  }

  closeModal("editModal");
  if (isBackupMode()) refreshBackupView();
  else await loadEntriesFromSupabase();
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

  const matchingIds = state.entries
    .filter(e => e.direction === direction && String(e.person_name || "").trim() === currentName)
    .map(e => e.id)
    .filter(Boolean);

  if (!matchingIds.length) return;

  if (isBackupMode()){
    state.entries = state.entries.map(entry => (
      entry.direction === direction && String(entry.person_name || "").trim() === currentName
        ? { ...entry, person_name: cleanedName }
        : entry
    ));
    refreshBackupView();
    return;
  }

  for (const id of matchingIds){
    await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ person_name: cleanedName })
    });
  }
  await loadEntriesFromSupabase();
}

async function deleteEntry(id){
  if (!id) return;
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;

  if(entry.entry_kind === "principal"){
    if (!confirm(`Delete the entire loan for ${entry.person_name}? This will also remove ALL linked repayments.`)) return;
    if (isBackupMode()){
      state.entries = state.entries.filter(e => e.group_id !== entry.group_id);
    } else {
      await supabase(`${CONFIG.table}?group_id=eq.${encodeURIComponent(entry.group_id)}`, { method: "DELETE" });
    }
  } else {
    if (!confirm(`Delete this specific repayment entry?`)) return;
    if (isBackupMode()){
      state.entries = state.entries.filter(e => e.id !== id);
    } else {
      await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  }
  if (isBackupMode()) refreshBackupView();
  else await loadEntriesFromSupabase();
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

  if (isBackupMode()){
    state.entries = state.entries.filter(e => !(e.direction === direction && String(e.person_name || "").trim() === personName));
    refreshBackupView();
    return;
  }

  const matchingIds = state.entries
    .filter(e => e.direction === direction && String(e.person_name || "").trim() === personName)
    .map(e => e.id)
    .filter(Boolean);

  for (const id of matchingIds){
    await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  await loadEntriesFromSupabase();
}

async function movePersonToInstallments(personNameEncoded, direction){
  const personName = decodeURIComponent(personNameEncoded || "").trim();
  if (!personName || direction !== "taken") return;

  const matchedEntries = state.entries.filter(e =>
    e.direction === "taken" && String(e.person_name || "").trim() === personName
  );

  if (!matchedEntries.length){
    alert("No records found for this person.");
    return;
  }

  if (!confirm(`Move ${personName} to Installment Plans?`)) return;

  if (isBackupMode()){
    state.entries = state.entries.map(entry => (
      entry.direction === "taken" && String(entry.person_name || "").trim() === personName
        ? { ...entry, notes: normalizeInstallmentNote(entry.notes, true) }
        : entry
    ));
    refreshBackupView();
  } else {
    for (const entry of matchedEntries){
      await supabase(`${CONFIG.table}?id=eq.${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: normalizeInstallmentNote(entry.notes, true) })
      });
    }
    await loadEntriesFromSupabase();
  }
  activate("installments");
}

async function getBase64ImageFromUrl(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

const PDF_BRAND = {
  owner: "Nadeem Shahzad Fida",
  email: "nadeemshahzadfida@outlook.com",
  mobile: "+971 55 921 6280",
  whatsapp: "+92 333 900 4564",
  facebook: "facebook.com/nadeemshahzadfida",
  systemName: "NSF's Loan Management System"
};

let cachedPdfLogo = null;
async function getPdfLogo(){
  if (cachedPdfLogo !== null) return cachedPdfLogo;
  cachedPdfLogo = await getBase64ImageFromUrl("Assets/logo/logo.png");
  return cachedPdfLogo;
}

function drawPdfHeader(doc, logoData, title, subtitle){
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 8, pageWidth - 20, 34, 2, 2, "F");

  if (logoData){
    try { doc.addImage(logoData, "PNG", 15.5, 13.5, 17, 17); } catch {}
  }

  doc.setTextColor(23, 33, 43);
  doc.setFontSize(14);
  doc.text(PDF_BRAND.systemName, 38, 18);
  doc.setFontSize(10);
  doc.setTextColor(102, 112, 133);
  doc.text(title, 38, 24);
  if (subtitle) doc.text(subtitle, 38, 30);
}

function drawPdfOwnerBlock(doc, y = 48){
  doc.setTextColor(23, 33, 43);
  doc.setFontSize(10);
  doc.text(`Prepared by: ${PDF_BRAND.owner}`, 14, y);
  doc.text(`Email: ${PDF_BRAND.email}`, 14, y + 5);
  doc.text(`Mobile: ${PDF_BRAND.mobile}`, 14, y + 10);
  doc.text(`WhatsApp: ${PDF_BRAND.whatsapp}`, 14, y + 15);
}

function drawPdfFooter(doc){
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(208, 213, 221);
  doc.line(12, pageHeight - 14, doc.internal.pageSize.getWidth() - 12, pageHeight - 14);
  doc.setTextColor(102, 112, 133);
  doc.setFontSize(8.5);
  doc.text(`Powered by ${PDF_BRAND.owner} | ${PDF_BRAND.facebook}`, 14, pageHeight - 8);
}

function buildPersonPdfData(personName, direction){
  const normalizedName = String(personName || "").trim();
  const personEntries = state.entries.filter(e =>
    e.direction === direction && String(e.person_name || "").trim() === normalizedName
  );
  if (!personEntries.length) return null;

  const principalRows = personEntries.filter(e => e.entry_kind === "principal");
  const actionRows = personEntries.filter(e => e.entry_kind !== "principal");

  const currency = principalRows[0]?.currency || actionRows[0]?.currency || "";
  const principalTotal = principalRows.reduce((sum, e) => sum + Number(e.principal_amount || 0), 0);
  const paidTotal = actionRows.reduce((sum, e) => sum + Number(e.action_amount || 0), 0);
  const remaining = Math.max(principalTotal - paidTotal, 0);
  const status = remaining <= 0 ? "Closed" : paidTotal > 0 ? "Partial" : "Open";
  const loanCount = new Set(personEntries.map(e => e.group_id).filter(Boolean)).size;

  const timeline = personEntries
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
      date: isPrincipal ? (entry.loan_date || "—") : (entry.action_date || "—"),
      type: isPrincipal ? "Principal" : (entry.entry_kind === "partial" ? "Partial" : "Full"),
      amount,
      remainingAfter: runningRemaining,
      note: entry.notes || "—"
    };
  });

  return { personName: normalizedName, direction, currency, principalTotal, paidTotal, remaining, status, loanCount, rows };
}

async function downloadPersonPDF(personNameEncoded, direction) {
  if (!window.jspdf) {
    alert("PDF library loading. Please try again in a moment.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const personName = decodeURIComponent(personNameEncoded || "");
  const data = buildPersonPdfData(personName, direction);
  if (!data) {
    alert("No entries found for this person.");
    return;
  }

  const logoData = await getPdfLogo();
  drawPdfHeader(doc, logoData, "Statement / Receipt", `Client: ${data.personName}`);
  drawPdfOwnerBlock(doc, 48);

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(`Status: ${data.status}`, 132, 48);
  doc.text(`Currency: ${data.currency}`, 132, 54);
  doc.text(`Loan Entries: ${data.loanCount}`, 132, 60);

  const formatMon = (amt) => {
     const n = Number(amt || 0);
     const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
     return `${data.currency ? data.currency + " " : ""}${formatted}`;
  };

  doc.text(`Principal: ${formatMon(data.principalTotal)}`, 132, 66);
  doc.text(`Paid/Returned: ${formatMon(data.paidTotal)}`, 132, 72);
  doc.text(`Remaining: ${formatMon(data.remaining)}`, 132, 78);

  const tableData = data.rows.map((r) => [
    displayDate(r.date),
    r.type,
    formatMon(r.amount),
    formatMon(r.remainingAfter),
    r.note || '—'
  ]);

  doc.autoTable({
    startY: 88,
    head: [['Date', 'Type', 'Amount', 'Remaining', 'Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [36, 87, 214] },
    styles: { font: 'helvetica' },
    didDrawPage: () => drawPdfFooter(doc)
  });

  doc.save(`Statement_${data.personName.replace(/\s+/g, '_')}.pdf`);
}

function sectionLabel(searchKey){
  return searchKey === "given"
    ? "Loan Given"
    : searchKey === "received"
    ? "Received Back"
    : searchKey === "taken"
    ? "Loan Taken"
    : "Returned Back";
}

function formatReportAmount(amount, currency){
  const n = Number(amount || 0);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency || ""} ${formatted}`.trim();
}

function buildSectionReportRows(direction, searchKey){
  const groups = getFilteredGroups(direction, searchKey);
  const rows = [];

  for (const group of groups){
    for (const row of group.rows){
      rows.push([
        group.person_name || "Unnamed",
        displayDate(row.date),
        row.kind === "principal" ? "Principal" : row.kind === "partial" ? "Partial" : "Full",
        formatReportAmount(row.amount, group.currency),
        formatReportAmount(row.remainingAfter, group.currency),
        row.note || "—"
      ]);
    }
  }

  return { groups, rows };
}

async function exportSectionPDF(searchKey){
  if (!window.jspdf){
    alert("PDF library loading. Please try again in a moment.");
    return;
  }

  const direction = (searchKey === "given" || searchKey === "received") ? "given" : "taken";
  const label = sectionLabel(searchKey);
  const report = buildSectionReportRows(direction, searchKey);
  if (!report.rows.length){
    alert("No entries found for this section.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logoData = await getPdfLogo();
  drawPdfHeader(doc, logoData, `${label} - Full Report`, `Generated: ${new Date().toLocaleString()}`);
  drawPdfOwnerBlock(doc, 48);
  doc.setTextColor(23, 33, 43);
  doc.setFontSize(10);
  doc.text(`Members: ${report.groups.length}`, 132, 48);
  doc.text(`Rows: ${report.rows.length}`, 132, 54);

  doc.autoTable({
    startY: 72,
    head: [["Member", "Date", "Type", "Amount", "Remaining", "Remarks"]],
    body: report.rows,
    theme: "grid",
    headStyles: { fillColor: [36, 87, 214] },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 38 }, 5: { cellWidth: 58 } },
    didDrawPage: () => drawPdfFooter(doc)
  });

  doc.save(`${label.replace(/\s+/g, "_")}_Report.pdf`);
}

async function exportAllSectionsPDF(){
  if (!window.jspdf){
    alert("PDF library loading. Please try again in a moment.");
    return;
  }

  const sectionDefs = [
    { key: "given", direction: "given", label: "Loan Given" },
    { key: "received", direction: "given", label: "Received Back" },
    { key: "taken", direction: "taken", label: "Loan Taken" },
    { key: "returned", direction: "taken", label: "Returned Back" }
  ];

  const sectionReports = sectionDefs.map(def => ({
    ...def,
    ...buildSectionReportRows(def.direction, def.key)
  }));

  const totalRows = sectionReports.reduce((sum, s) => sum + s.rows.length, 0);
  if (!totalRows){
    alert("No entries found to export.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logoData = await getPdfLogo();
  drawPdfHeader(doc, logoData, "All Sections - Detailed Report", `Generated: ${new Date().toLocaleString()}`);
  drawPdfOwnerBlock(doc, 48);
  doc.setTextColor(23, 33, 43);
  doc.setFontSize(10);
  doc.text(`Total Rows: ${totalRows}`, 132, 48);

  let printedSections = 0;
  sectionReports.forEach(section => {
    if (!section.rows.length) return;
    if (printedSections > 0) doc.addPage();
    drawPdfHeader(doc, logoData, section.label, "Section Summary");
    drawPdfOwnerBlock(doc, 48);
    doc.setTextColor(23, 33, 43);
    doc.setFontSize(10);
    doc.text(`Members: ${section.groups.length}`, 132, 48);
    doc.text(`Rows: ${section.rows.length}`, 132, 54);

    doc.autoTable({
      startY: 72,
      head: [["Member", "Date", "Type", "Amount", "Remaining", "Remarks"]],
      body: section.rows,
      theme: "grid",
      headStyles: { fillColor: [36, 87, 214] },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2 },
      columnStyles: { 0: { cellWidth: 34 }, 5: { cellWidth: 55 } },
      didDrawPage: () => drawPdfFooter(doc)
    });
    printedSections += 1;
  });

  doc.save("All_Sections_Detailed_Report.pdf");
}

function downloadJsonBackup(){
  const payload = {
    exportedAt: new Date().toISOString(),
    source: state.dataSource,
    entries: state.entries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LoanLedger_Backup_${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCsvBackup(){
  const csvText = toCsv(state.entries);
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LoanLedger_Backup_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importJsonBackup(file){
  if (!file) return;
  const text = await file.text();
  let parsed;
  try{
    parsed = JSON.parse(text);
  }catch{
    throw new Error("Invalid JSON file.");
  }
  const entries = parseEntriesPayload(parsed);
  if (!Array.isArray(entries)){
    throw new Error("JSON file must contain an entries array.");
  }
  applyEntries(entries, "backup", { hasImportedFile: true });
}

async function importCsvBackup(file){
  if (!file) return;
  const text = await file.text();
  const entries = parseEntriesCsv(text);
  applyEntries(entries, "backup", { hasImportedFile: true });
}

function sanitizeEntryForSupabase(entry){
  const normalizedLoanDate = normalizeDateForDb(entry.loan_date);
  const normalizedActionDate = normalizeDateForDb(entry.action_date);
  return {
    group_id: String(entry.group_id || "").trim(),
    direction: String(entry.direction || "").trim(),
    entry_kind: String(entry.entry_kind || "").trim(),
    person_name: String(entry.person_name || "").trim(),
    currency: String(entry.currency || "").trim(),
    principal_amount: entry.principal_amount == null || entry.principal_amount === "" ? null : Number(entry.principal_amount),
    action_amount: entry.action_amount == null || entry.action_amount === "" ? null : Number(entry.action_amount),
    loan_date: normalizedLoanDate,
    action_date: normalizedActionDate,
    notes: entry.notes == null || String(entry.notes).trim() === "" ? null : String(entry.notes)
  };
}

function updateDbSnapshot(rows){
  const validRows = Array.isArray(rows) ? rows : [];
  state.dbEntryIds = new Set(validRows.map(r => r.id).filter(Boolean));
  state.dbSignatures = new Set(validRows.map(entrySignature));
}

function getUnsyncedEntriesForPerson(personName, direction){
  if (!state.unlocked) return [];
  return state.entries.filter(entry => {
    if (entry.direction !== direction) return false;
    if (String(entry.person_name || "").trim() !== personName) return false;
    const byId = entry.id && state.dbEntryIds.has(entry.id);
    const bySignature = state.dbSignatures.has(entrySignature(entry));
    return !byId && !bySignature;
  });
}

async function refreshDbSnapshot(){
  if (!runtimeConfig?.supabaseUrl || !runtimeConfig?.supabaseKey) return;
  const rows = await supabase(`${CONFIG.table}?select=*`);
  updateDbSnapshot(Array.isArray(rows) ? rows : []);
}

async function uploadBackupToDatabase(){
  if (!state.hasImportedFile || state.dataSource !== "backup"){
    alert("Please import a JSON or CSV file first.");
    return;
  }
  if (!runtimeConfig?.supabaseUrl || !runtimeConfig?.supabaseKey){
    alert("Please connect to database first using ZIP password.");
    els.lockScreen.classList.remove("hide");
    els.lockError.textContent = "";
    els.zipPasswordInput.focus();
    return;
  }

  const cleanedRows = state.entries
    .map(sanitizeEntryForSupabase)
    .filter(row => row.group_id && row.direction && row.entry_kind && row.person_name && row.currency && row.loan_date);

  if (!cleanedRows.length){
    throw new Error("No valid rows found to upload. Please verify CSV/JSON date format.");
  }

  if (!confirm(`Upload imported backup to database? This will DELETE existing records and replace with ${cleanedRows.length} row(s).`)) return;

  await supabase(`${CONFIG.table}?id=not.is.null`, { method: "DELETE" });
  await supabase(CONFIG.table, { method: "POST", body: JSON.stringify(cleanedRows) });
  await refreshDbSnapshot();
  renderAll();

  alert("Database updated successfully from imported backup.");
}

async function savePersonRecordsToDatabase(personNameEncoded, direction){
  const personName = decodeURIComponent(personNameEncoded || "").trim();
  if (!personName || !direction) return;
  if (!runtimeConfig?.supabaseUrl || !runtimeConfig?.supabaseKey){
    alert("Please connect to database first using ZIP password.");
    els.lockScreen.classList.remove("hide");
    els.lockError.textContent = "";
    els.zipPasswordInput.focus();
    return;
  }

  await refreshDbSnapshot();
  const unsyncedEntries = getUnsyncedEntriesForPerson(personName, direction);
  if (!unsyncedEntries.length){
    alert("All records for this member are already saved in database.");
    return;
  }

  const payload = unsyncedEntries
    .map(sanitizeEntryForSupabase)
    .filter(row => row.group_id && row.direction && row.entry_kind && row.person_name && row.currency && row.loan_date);

  if (!payload.length){
    alert("No valid rows found for database save.");
    return;
  }

  await supabase(CONFIG.table, { method: "POST", body: JSON.stringify(payload) });
  await refreshDbSnapshot();
  renderAll();
  alert(`Saved ${payload.length} record(s) to database for ${personName}.`);
}

function attachEvents(){
  const closeAllMenus = () => {
    document.querySelectorAll(".menu-dropdown.open").forEach(panel => panel.classList.remove("open"));
    document.querySelectorAll(".menu-trigger[aria-expanded='true']").forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
  };

  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => activate(btn.dataset.tab)));

  document.querySelectorAll("[data-open-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.openModal;
      const direction = btn.dataset.direction || "given";
      if (mode === "principal") activate(direction === "given" ? "given" : "taken");
      if (mode === "payment") activate(direction === "given" ? "given" : "taken");
      openEntryModal(mode, direction);
    });
  });

  document.querySelectorAll("[data-entry-menu]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.dataset.entryMenu;
      const panel = document.querySelector(`[data-entry-menu-panel="${key}"]`);
      if (!panel) return;
      document.querySelectorAll(".menu-dropdown.open").forEach(openPanel => {
        if (openPanel !== panel) openPanel.classList.remove("open");
      });
      document.querySelectorAll(".menu-trigger[aria-expanded='true']").forEach(trigger => {
        if (trigger !== btn) trigger.setAttribute("aria-expanded", "false");
      });
      const nowOpen = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", nowOpen ? "true" : "false");
    });
  });

  document.addEventListener("click", e => {
    const trigger = e.target.closest(".menu-trigger");
    document.querySelectorAll(".menu-dropdown.open").forEach(panel => {
      if (trigger && panel.previousElementSibling === trigger) return;
      panel.classList.remove("open");
      if (panel.previousElementSibling?.classList.contains("menu-trigger")){
        panel.previousElementSibling.setAttribute("aria-expanded", "false");
      }
    });
    if (!e.target.closest(".note-wrap")){
      document.querySelectorAll(".note-popover").forEach(pop => pop.classList.add("hide"));
    }
  });
  window.addEventListener("scroll", () => {
    closeAllMenus();
    repositionOpenNotePopovers();
  }, { passive: true });
  window.addEventListener("resize", repositionOpenNotePopovers);

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", e => closeModal(e.target.dataset.closeModal));
  });

  [els.entryModal, els.editModal].forEach(m => {
    m.addEventListener("click", e => {
      if (e.target && e.target.matches(".modal-backdrop")) closeModal(m.id);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!els.entryModal.classList.contains("hide")) closeModal("entryModal");
      if (!els.editModal.classList.contains("hide")) closeModal("editModal");
    }
  });

  document.querySelectorAll(".currency-chip").forEach(btn => {
    btn.addEventListener("click", () => setCurrencyChoice(btn.closest('form'), btn.dataset.currency));
  });

  document.querySelectorAll(".filter-radio").forEach(r => {
    r.addEventListener("change", e => {
      if (!e.target.dataset.filter) return;
      const key = e.target.dataset.filter;
      state.statusFilter[key] = e.target.value;
      renderAll();
    });
  });

  document.querySelectorAll(".currency-radio").forEach(r => {
    r.addEventListener("change", e => {
      const key = e.target.dataset.currencyFilter;
      state.currencyFilter[key] = e.target.value;
      renderAll();
    });
  });

  els.multiEntryCount.addEventListener("input", e => {
    let cnt = parseInt(e.target.value) || 1;
    if(cnt < 1) cnt = 1;
    if(cnt > 10) cnt = 10;
    renderMultiEntries(cnt);
  });

  els.principalModalForm.addEventListener("submit", async e => {
    e.preventDefault();
    try { await createPrincipal(els.principalModalForm); } catch (err) { alert(err.message); }
  });

  els.paymentModalForm.addEventListener("submit", async e => {
    e.preventDefault();
    try { await createPayment(els.paymentModalForm); } catch (err) { alert(err.message); }
  });

  els.editForm.addEventListener("submit", async e => {
    e.preventDefault();
    try { await submitEdit(); } catch (err) { alert(err.message); }
  });

  els.downloadGivenPdfBtn.addEventListener("click", () => exportSectionPDF("given").catch(err => alert(err.message)));
  els.downloadReceivedPdfBtn.addEventListener("click", () => exportSectionPDF("received").catch(err => alert(err.message)));
  els.downloadTakenPdfBtn.addEventListener("click", () => exportSectionPDF("taken").catch(err => alert(err.message)));
  els.downloadReturnedPdfBtn.addEventListener("click", () => exportSectionPDF("returned").catch(err => alert(err.message)));
  els.downloadAllSectionsPdfBtn.addEventListener("click", () => exportAllSectionsPDF().catch(err => alert(err.message)));
  els.downloadAllDataJsonBtn.addEventListener("click", downloadJsonBackup);
  els.downloadAllDataCsvBtn.addEventListener("click", downloadCsvBackup);
  els.uploadBackupBtn.addEventListener("click", () => uploadBackupToDatabase().catch(err => alert(err.message)));
  els.importJsonInput.addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try{
      await importJsonBackup(file);
    }catch(err){
      alert(err.message);
    }finally{
      e.target.value = "";
    }
  });
  els.importCsvInput.addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try{
      await importCsvBackup(file);
    }catch(err){
      alert(err.message);
    }finally{
      e.target.value = "";
    }
  });
  els.connectSupabaseBtn.addEventListener("click", () => {
    els.lockScreen.classList.remove("hide");
    els.lockError.textContent = "";
    els.zipPasswordInput.focus();
  });

  els.zipPasswordInput.addEventListener("keydown", e => { if (e.key === "Enter") attemptUnlock(); });
  els.unlockBtn.addEventListener("click", attemptUnlock);

  [["searchGiven","given"],["searchReceived","received"],["searchTaken","taken"],["searchReturned","returned"],["searchInstallments","installments"]].forEach(([id,key]) => {
    document.getElementById(id).addEventListener("input", e => {
      state.search[key] = e.target.value;
      renderAll();
    });
  });
}

async function attemptUnlock(){
  const zipPassword = els.zipPasswordInput.value.trim();
  if (!zipPassword){
    els.lockError.textContent = "Please enter the ZIP password.";
    return;
  }
  els.unlockBtn.disabled = true;
  els.unlockBtn.textContent = "Unlocking…";
  const keepCurrentBackup = state.hasImportedFile && state.dataSource === "backup";
  try{
    const zipBlob = await fetchProtectedZipBlob();
    const zipFile = new File([zipBlob], "key.zip", { type: "application/zip" });
    const configData = await readConfigFromZip(zipFile, zipPassword);
    if (!configData?.supabaseUrl || !configData?.supabaseKey){
      throw new Error("Config JSON must contain supabaseUrl and supabaseKey.");
    }

    runtimeConfig = {
      supabaseUrl: String(configData.supabaseUrl).trim(),
      supabaseKey: String(configData.supabaseKey).trim()
    };
    sessionStorage.setItem("loanledger-unlocked", "true");
    state.unlocked = true;
    els.lockScreen.classList.add("hide");
    els.app.classList.remove("hide");

    defaultDateInputs(document);
    if (keepCurrentBackup){
      await refreshDbSnapshot();
      updateUploadButtonVisibility();
      renderAll();
    } else {
      await loadEntriesFromSupabase();
    }
  }catch(err){
    els.lockError.textContent = err.message;
  }finally{
    els.unlockBtn.disabled = false;
    els.unlockBtn.textContent = "Unlock";
  }
}

async function boot(){
  attachEvents();
  defaultDateInputs(document);
  applyEntries(loadBackupEntriesFromStorage(), "backup", { hasImportedFile: false });
}

boot();
