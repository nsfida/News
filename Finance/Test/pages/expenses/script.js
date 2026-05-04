const CONFIG = {
  zipBaseUrl: "https://livenews.live/Finance/Assets/app/",
  table: "loan_ledger_entries"
};

const BACKUP_STORAGE_KEY = "loanledger-json-backup-v1";
const IMPORT_SESSION_KEY = "loanledger-imported-file-v1";
const EXPENSE_ACCOUNT_TAG = "[EXPENSE_ACCOUNT]";
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
  editKind: null,
  expenseWalletFilter: "all",
  expenseDateFrom: "",
  expenseDateTo: ""
};

const els = {
  app: document.getElementById("app"),
  logoutBtn: document.getElementById("logoutBtn"),
  mainOverview: document.getElementById("mainOverview"),
  statsGrid: document.getElementById("statsGrid"),
  expensesList: document.getElementById("expensesList"),
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
  downloadExpensesPdfBtn: document.getElementById("downloadExpensesPdfBtn"),
  editModal: document.getElementById("editModal"),
  editForm: document.getElementById("editForm"),
  expenseModal: document.getElementById("expenseModal"),
  expenseModalTitle: document.getElementById("expenseModalTitle"),
  expenseModalDesc: document.getElementById("expenseModalDesc"),
  expenseAccountForm: document.getElementById("expenseAccountForm"),
  expenseTopupForm: document.getElementById("expenseTopupForm"),
  expenseEntryForm: document.getElementById("expenseEntryForm"),
  expenseTopupAccountSelect: document.getElementById("expenseTopupAccountSelect"),
  expenseSpendAccountSelect: document.getElementById("expenseSpendAccountSelect"),
  expenseCurrencySelect: document.getElementById("expenseCurrencySelect"),
  expenseTypeSelect: document.getElementById("expenseTypeSelect"),
  openExpenseAccountBtn: document.getElementById("openExpenseAccountBtn"),
  openExpenseTopupBtn: document.getElementById("openExpenseTopupBtn"),
  openExpenseEntryBtn: document.getElementById("openExpenseEntryBtn"),
  expenseWalletFilters: document.getElementById("expenseWalletFilters"),
  searchExpenses: document.getElementById("searchExpenses"),
  transferModal: document.getElementById("transferModal"),
  transferModalTitle: document.getElementById("transferModalTitle"),
  transferModalDesc: document.getElementById("transferModalDesc"),
  transferForm: document.getElementById("transferForm"),
  transferFromWallet: document.getElementById("transferFromWallet"),
  transferToWallet: document.getElementById("transferToWallet"),
  conversionRateInput: document.getElementById("conversionRateInput"),
  conversionHelp: document.getElementById("conversionHelp"),
  fromCurrencyIndicator: document.getElementById("fromCurrencyIndicator"),
  toCurrencyIndicator: document.getElementById("toCurrencyIndicator"),
  toggleWalletsBtn: document.getElementById("toggleWalletsBtn"),
  walletsOverviewSection: document.getElementById("walletsOverviewSection"),
  walletsBanner: document.getElementById("walletsBanner"),
  walletsContent: document.getElementById("walletsContent"),
  toggleMainOverviewBtn: document.getElementById("toggleMainOverviewBtn"),
  mainOverviewBanner: document.getElementById("mainOverviewBanner"),
  mainOverviewContent: document.getElementById("mainOverviewContent"),
  expenseDateFrom: document.getElementById("expenseDateFrom"),
  expenseDateTo: document.getElementById("expenseDateTo"),
  clearExpenseDateBtn: document.getElementById("clearExpenseDateBtn"),
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

function hasExpenseAccountTag(noteValue){
  return String(noteValue || "").includes(EXPENSE_ACCOUNT_TAG);
}

function expenseMetaFromNotes(noteValue){
  const text = String(noteValue || "");
  const readText = key => {
    const m = text.match(new RegExp(`\\[${key}:([^\\]]+)\\]`, "i"));
    return m ? m[1].trim() : "";
  };
  return {
    accountType: readText("ATYPE"),
    rowType: readText("ETYPE"),
    itemName: readText("ITEM"),
    expenseType: readText("XTYPE")
  };
}

function upsertExpenseMetaInNote(noteValue, meta = {}){
  const base = String(noteValue || "")
    .replace(EXPENSE_ACCOUNT_TAG, "")
    .replace(/\[(ATYPE|ETYPE|ITEM|XTYPE):[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const tags = [];
  if (meta.accountType) tags.push(`[ATYPE:${meta.accountType}]`);
  if (meta.rowType) tags.push(`[ETYPE:${meta.rowType}]`);
  if (meta.itemName) tags.push(`[ITEM:${meta.itemName}]`);
  if (meta.expenseType) tags.push(`[XTYPE:${meta.expenseType}]`);
  const withTag = `${EXPENSE_ACCOUNT_TAG} ${base}`.trim();
  return `${withTag} ${tags.join(" ")}`.trim();
}

function cleanExpenseNote(noteValue){
  return String(noteValue || "")
    .replace(EXPENSE_ACCOUNT_TAG, "")
    .replace(/\[(ATYPE|ETYPE|ITEM|XTYPE):[^\]]+\]/gi, "")
    .replace(/→/g, "->")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isInDateRange(dateStr){
  if (!dateStr) return true;
  const date = normalizeDateForDb(dateStr);
  if (!date) return true;
  const from = state.expenseDateFrom ? normalizeDateForDb(state.expenseDateFrom) : null;
  const to = state.expenseDateTo ? normalizeDateForDb(state.expenseDateTo) : null;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
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

function getExpenseAccounts(options = {}){
  const { applyUiFilters = true } = options;
  const expenseEntries = state.entries.filter(e => hasExpenseAccountTag(e.notes));
  const accountsByGroup = new Map();
  
  for (const entry of expenseEntries){
    if (!entry.group_id) continue;
    if (!accountsByGroup.has(entry.group_id)){
      accountsByGroup.set(entry.group_id, {
        group_id: entry.group_id,
        person_name: entry.person_name,
        currency: entry.currency,
        accountType: expenseMetaFromNotes(entry.notes).accountType || "Wallet",
        openingBalance: 0,
        addedMoney: 0,
        spentMoney: 0,
        balance: 0,
        principal: null,
        topups: [],
        spends: [],
        activityStamp: 0,
        lastActivity: null
      });
    }
    
    const account = accountsByGroup.get(entry.group_id);
    if (entry.entry_kind === "principal"){
      account.principal = entry;
      account.openingBalance = Number(entry.principal_amount || 0);
      account.balance = account.openingBalance;
      account.loan_date = entry.loan_date;
    } else {
      const meta = expenseMetaFromNotes(entry.notes);
      if (meta.rowType === "TOPUP"){
        account.topups.push(entry);
        account.addedMoney += Number(entry.action_amount || 0);
        account.balance += Number(entry.action_amount || 0);
      } else if (meta.rowType === "EXPENSE"){
        account.spends.push(entry);
        account.spentMoney += Number(entry.action_amount || 0);
        account.balance = Math.max(account.balance - Number(entry.action_amount || 0), 0);
      }
    }
    
    const candidateStamp = Math.max(dateStamp(entry.loan_date), dateStamp(entry.action_date));
    if (candidateStamp >= account.activityStamp){
      account.activityStamp = candidateStamp;
      account.lastActivity = entry.action_date || entry.loan_date || account.lastActivity;
    }
  }
  
  let accounts = Array.from(accountsByGroup.values());
  
  if (applyUiFilters){
    const wf = state.expenseWalletFilter;
    if (wf !== "all"){
      accounts = accounts.filter(a => a.group_id === wf);
    }
    
    const searchTerm = state.search.expenses;
    if (searchTerm){
      accounts = accounts.filter(a => 
        String(a.person_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.accountType || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const selectedCurrency = state.currencyFilter.expenses;
    if (selectedCurrency !== "All"){
      accounts = accounts.filter(a => a.currency === selectedCurrency);
    }
  }
  
  return accounts.sort((a, b) => {
    const diff = (b.activityStamp || 0) - (a.activityStamp || 0);
    if (diff !== 0) return diff;
    return String(a.person_name || "").localeCompare(String(b.person_name || ""));
  });
}

function renderExpenseWalletFilters(){
  const accounts = getExpenseAccounts({ applyUiFilters: false });
  const wf = state.expenseWalletFilter;
  
  let html = `
    <div class="expense-wallet-card-wrap">
      <input type="radio" id="wallet_filter_all" name="wallet_filter" value="all" 
             class="expense-wallet-radio" data-wallet-filter="all" 
             ${wf === "all" ? "checked" : ""}>
      <label for="wallet_filter_all" class="expense-wallet-card">
        <div class="expense-wallet-title">All Wallets</div>
        <div class="expense-wallet-sub">${accounts.length} accounts</div>
        <div class="expense-wallet-stats">
          <span class="available-label">
            <em>Total</em>
            <strong class="available-amount">${money(
              accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0),
              accounts[0]?.currency || "AED"
            )}</strong>
          </span>
        </div>
      </label>
    </div>
  `;
  
  for (const account of accounts){
    const isChecked = wf === account.group_id;
    html += `
      <div class="expense-wallet-card-wrap">
        <input type="radio" id="wallet_filter_${account.group_id}" name="wallet_filter" 
               value="${account.group_id}" class="expense-wallet-radio" 
               data-wallet-filter="${account.group_id}" ${isChecked ? "checked" : ""}>
        <label for="wallet_filter_${account.group_id}" class="expense-wallet-card">
          <div class="expense-wallet-title">${escapeHtml(account.person_name)}</div>
          <div class="expense-wallet-sub">${escapeHtml(account.accountType)} · ${escapeHtml(account.currency)}</div>
          <div class="expense-wallet-stats">
            <span>
              <em>Added</em>
              <strong>${money(account.addedMoney, account.currency)}</strong>
            </span>
            <span>
              <em>Spent</em>
              <strong>${money(account.spentMoney, account.currency)}</strong>
            </span>
            <span class="available-label">
              <em>Available</em>
              <strong class="available-amount">${money(account.balance, account.currency)}</strong>
            </span>
          </div>
          <div class="expense-wallet-actions">
            <button type="button" class="edit-account-btn" data-account-id="${account.group_id}">Edit</button>
            <button type="button" class="delete-account-btn" data-account-id="${account.group_id}" class="danger">Delete</button>
          </div>
        </label>
      </div>
    `;
  }
  
  els.expenseWalletFilters.innerHTML = html;
  
  // Bind events
  els.expenseWalletFilters.querySelectorAll(".expense-wallet-radio").forEach(radio => {
    radio.addEventListener("change", () => {
      state.expenseWalletFilter = radio.value;
      renderExpenses();
    });
  });
  
  els.expenseWalletFilters.querySelectorAll(".edit-account-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // TODO: Implement edit account functionality
      alert("Edit account functionality to be implemented");
    });
  });
  
  els.expenseWalletFilters.querySelectorAll(".delete-account-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // TODO: Implement delete account functionality
      alert("Delete account functionality to be implemented");
    });
  });
}

function renderExpenses(){
  const accounts = getExpenseAccounts();
  const searchTerm = state.search.expenses.toLowerCase();
  
  if (!accounts.length){
    els.expensesList.innerHTML = `<div class="empty">No expense accounts found. Create your first account to get started.</div>`;
    return;
  }
  
  let html = "";
  for (const account of accounts){
    const accountSpends = account.spends.filter(spend => {
      if (searchTerm && !String(spend.notes || "").toLowerCase().includes(searchTerm) && 
          !String(expenseMetaFromNotes(spend.notes).itemName || "").toLowerCase().includes(searchTerm)) {
        return false;
      }
      return isInDateRange(spend.action_date);
    });
    
    if (!accountSpends.length && searchTerm) continue;
    
    html += `
      <div class="expense-section-anchor">
        <h3 class="expense-section-title">${escapeHtml(account.person_name)} (${escapeHtml(account.currency)})</h3>
        <div class="expense-section-toolbar">
          <div class="expense-toolbar-hint">
            Balance: ${money(account.balance, account.currency)} | 
            Added: ${money(account.addedMoney, account.currency)} | 
            Spent: ${money(account.spentMoney, account.currency)}
          </div>
          <button type="button" class="btn ghost add-expense-btn" data-account-id="${account.group_id}">Add Expense</button>
          <button type="button" class="btn ghost add-topup-btn" data-account-id="${account.group_id}">Add Money</button>
        </div>
        <div class="expense-by-currency">
    `;
    
    if (!accountSpends.length){
      html += `<div class="empty">No expenses found for this wallet.</div>`;
    } else {
      html += `<div class="list">`;
      for (const spend of accountSpends){
        const meta = expenseMetaFromNotes(spend.notes);
        html += `
          <div class="loan expense-item-row">
            <div class="loan-top">
              <div class="lt-main">
                <div class="loan-name">${escapeHtml(meta.itemName || "Expense")}</div>
                <div class="loan-sub">
                  <span>${escapeHtml(meta.expenseType || "Other")}</span>
                  <span>${displayDate(spend.action_date)}</span>
                  ${meta.expenseType === "Transfer" ? `<span class="badge orange">Transfer</span>` : ""}
                </div>
              </div>
              <div class="cell expense-item-total">
                <small>Amount</small>
                <strong>${money(spend.action_amount, account.currency)}</strong>
                ${meta.expenseType === "Transfer" ? `<small>${cleanExpenseNote(spend.notes)}</small>` : ""}
              </div>
              <div class="lt-action">
                <button class="tiny ghost editRowBtn" data-id="${spend.id}" title="Edit expense">✎</button>
                <button class="tiny danger delRowBtn" data-id="${spend.id}" title="Delete expense">✕</button>
              </div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }
    
    html += `</div></div>`;
  }
  
  els.expensesList.innerHTML = html;
  
  // Bind events
  els.expensesList.querySelectorAll(".add-expense-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openExpenseModal("expense", btn.dataset.accountId);
    });
  });
  
  els.expensesList.querySelectorAll(".add-topup-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openExpenseModal("topup", btn.dataset.accountId);
    });
  });
  
  els.expensesList.querySelectorAll(".editRowBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      openEditModal(btn.dataset.id);
    });
  });
  
  els.expensesList.querySelectorAll(".delRowBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteEntry(btn.dataset.id);
    });
  });
}

function openExpenseModal(type, accountId = null){
  const modal = els.expenseModal;
  const title = els.expenseModalTitle;
  const desc = els.expenseModalDesc;
  
  // Hide all forms first
  els.expenseAccountForm.classList.add("hide");
  els.expenseTopupForm.classList.add("hide");
  els.expenseEntryForm.classList.add("hide");
  
  if (type === "account"){
    title.textContent = "Create Expense Account";
    desc.textContent = "Set up a new wallet for tracking expenses.";
    els.expenseAccountForm.classList.remove("hide");
  } else if (type === "topup"){
    title.textContent = "Add Money to Wallet";
    desc.textContent = "Add funds to an existing expense account.";
    els.expenseTopupForm.classList.remove("hide");
    populateAccountSelect(els.expenseTopupAccountSelect, accountId);
  } else if (type === "expense"){
    title.textContent = "Add Expense";
    desc.textContent = "Record a new expense transaction.";
    els.expenseEntryForm.classList.remove("hide");
    populateAccountSelect(els.expenseSpendAccountSelect, accountId);
  }
  
  modal.classList.remove("hide");
  modal.setAttribute("aria-hidden", "false");
}

function populateAccountSelect(selectElement, selectedAccountId = null){
  const accounts = getExpenseAccounts({ applyUiFilters: false });
  selectElement.innerHTML = accounts.map(account => 
    `<option value="${account.group_id}" ${account.group_id === selectedAccountId ? "selected" : ""}>
      ${escapeHtml(account.person_name)} (${escapeHtml(account.currency)})
    </option>`
  ).join("");
}

function closeExpenseModal(){
  els.expenseModal.classList.add("hide");
  els.expenseModal.setAttribute("aria-hidden", "true");
  
  // Reset forms
  els.expenseAccountForm.reset();
  els.expenseTopupForm.reset();
  els.expenseEntryForm.reset();
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
  form.elements.notes.value = cleanExpenseNote(entry.notes) || "";
  
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

async function saveExpenseAccount(formData){
  const accountName = formData.get("account_name").trim();
  const currency = formData.get("currency");
  const initialBalance = Number(formData.get("initial_balance") || 0);
  
  if (!accountName) {
    alert("Please enter an account name.");
    return false;
  }
  
  const groupId = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const today = todayISO();
  
  const principalEntry = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    group_id: groupId,
    direction: "taken",
    entry_kind: "principal",
    person_name: accountName,
    currency: currency,
    principal_amount: initialBalance,
    action_amount: null,
    loan_date: today,
    action_date: null,
    notes: upsertExpenseMetaInNote("", {
      accountType: "Wallet",
      rowType: "ACCOUNT",
      itemName: accountName
    })
  };
  
  state.entries.push(principalEntry);
  updateSessionStorage();
  renderExpenses();
  renderExpenseWalletFilters();
  renderOverviewCards();
  closeExpenseModal();
  
  return true;
}

async function saveExpenseTopup(formData){
  const accountId = formData.get("account_id");
  const amount = Number(formData.get("amount"));
  const date = formData.get("date");
  const notes = formData.get("notes").trim();
  
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return false;
  }
  
  const account = getExpenseAccounts({ applyUiFilters: false }).find(a => a.group_id === accountId);
  if (!account) {
    alert("Account not found.");
    return false;
  }
  
  const topupEntry = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    group_id: accountId,
    direction: "taken",
    entry_kind: "payment",
    person_name: account.person_name,
    currency: account.currency,
    principal_amount: null,
    action_amount: amount,
    loan_date: null,
    action_date: date,
    notes: upsertExpenseMetaInNote(notes, {
      accountType: account.accountType,
      rowType: "TOPUP",
      itemName: notes || "Top-up",
      expenseType: "Top-up"
    })
  };
  
  state.entries.push(topupEntry);
  updateSessionStorage();
  renderExpenses();
  renderExpenseWalletFilters();
  renderOverviewCards();
  closeExpenseModal();
  
  return true;
}

async function saveExpenseEntry(formData){
  const accountId = formData.get("account_id");
  const amount = Number(formData.get("amount"));
  const date = formData.get("date");
  const category = formData.get("category");
  const itemName = formData.get("item_name").trim();
  const notes = formData.get("notes").trim();
  
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return false;
  }
  
  if (!itemName) {
    alert("Please enter an item description.");
    return false;
  }
  
  const account = getExpenseAccounts({ applyUiFilters: false }).find(a => a.group_id === accountId);
  if (!account) {
    alert("Account not found.");
    return false;
  }
  
  const expenseEntry = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    group_id: accountId,
    direction: "taken",
    entry_kind: "payment",
    person_name: account.person_name,
    currency: account.currency,
    principal_amount: null,
    action_amount: amount,
    loan_date: null,
    action_date: date,
    notes: upsertExpenseMetaInNote(notes, {
      accountType: account.accountType,
      rowType: "EXPENSE",
      itemName: itemName,
      expenseType: category || "Other"
    })
  };
  
  state.entries.push(expenseEntry);
  updateSessionStorage();
  renderExpenses();
  renderExpenseWalletFilters();
  renderOverviewCards();
  closeExpenseModal();
  
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
  entry.notes = hasExpenseAccountTag(entry.notes) 
    ? upsertExpenseMetaInNote(entry.notes, { itemName: name })
    : notes;
  
  updateSessionStorage();
  renderExpenses();
  renderExpenseWalletFilters();
  renderOverviewCards();
  closeEditModal();
  
  return true;
}

async function deleteEntry(id){
  if (!id) return;
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  
  if (!confirm(`Delete this ${entry.entry_kind === "principal" ? "account" : "entry"}? This action cannot be undone.`)) return;
  
  state.entries = state.entries.filter(e => e.id !== id);
  updateSessionStorage();
  renderExpenses();
  renderExpenseWalletFilters();
  renderOverviewCards();
}

function updateSessionStorage(){
  sessionStorage.setItem("loanledger-entries", JSON.stringify(state.entries));
}

function renderOverviewCards(){
  const currencies = ["AED", "SAR", "PKR"];
  let cards = "";
  
  for (const currency of currencies){
    const summary = summarizeExpenseByCurrency(currency);
    const watermark = overviewWatermarkExpenses([currency]);
    
    cards += `
      <div class="summary currency-summary">
        ${watermark}
        <div class="currency-head">
          ${currencySymbolHtml(currency)}${currency}
        </div>
        <div class="summary-line-one">
          <span class="summary-line-one-label">Total Added</span>
          <span class="summary-line-one-value">${money(summary.totalAmount, currency)}</span>
        </div>
        <div class="summary-line-one">
          <span class="summary-line-one-label">Total Spent</span>
          <span class="summary-line-one-value">${money(summary.totalExpenses, currency)}</span>
        </div>
        <div class="summary-line-one available-label">
          <span class="summary-line-one-label">Available</span>
          <span class="summary-line-one-value available-amount">${money(summary.availableBalance, currency)}</span>
        </div>
      </div>
    `;
  }
  
  els.statsGrid.innerHTML = cards;
}

function summarizeExpenseByCurrency(currency){
  const accounts = getExpenseAccounts({ applyUiFilters: false }).filter(a => a.currency === currency);
  const totalAmount = accounts.reduce((sum, account) => sum + Number(account.openingBalance || 0) + Number(account.addedMoney || 0), 0);
  const totalExpenses = accounts.reduce((sum, account) => sum + Number(account.spentMoney || 0), 0);
  const availableBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  return { currency, totalAmount, totalExpenses, availableBalance };
}

function overviewWatermarkExpenses(currencies){
  if (!currencies.length) return "";
  const layers = currencies.map((currency, index) =>
    `<span class="summary-watermark-symbol" style="animation-delay:${index * 0.55}s">${currencySymbolHtml(currency)}</span>`
  ).join("");
  return `<div class="summary-watermark summary-watermark-expense" aria-hidden="true">${layers}</div>`;
}

function logout(){
  sessionStorage.clear();
  window.location.href = "/index.html";
}

function bindEvents(){
  // Logout
  els.logoutBtn.addEventListener("click", logout);
  
  // Search
  els.searchExpenses.addEventListener("input", (e) => {
    state.search.expenses = e.target.value;
    renderExpenses();
  });
  
  // Date filters
  els.expenseDateFrom.addEventListener("change", (e) => {
    state.expenseDateFrom = e.target.value;
    renderExpenses();
  });
  
  els.expenseDateTo.addEventListener("change", (e) => {
    state.expenseDateTo = e.target.value;
    renderExpenses();
  });
  
  els.clearExpenseDateBtn.addEventListener("click", () => {
    state.expenseDateFrom = "";
    state.expenseDateTo = "";
    els.expenseDateFrom.value = "";
    els.expenseDateTo.value = "";
    renderExpenses();
  });
  
  // Currency filters
  document.querySelectorAll('[data-currency-filter="expenses"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.currencyFilter.expenses = e.target.value;
      renderExpenses();
      renderExpenseWalletFilters();
    });
  });
  
  // Status filters
  document.querySelectorAll('[data-filter="expenses"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      state.statusFilter.expenses = e.target.value;
      renderExpenses();
    });
  });
  
  // Modal buttons
  els.openExpenseAccountBtn.addEventListener("click", () => openExpenseModal("account"));
  els.openExpenseTopupBtn.addEventListener("click", () => openExpenseModal("topup"));
  els.openExpenseEntryBtn.addEventListener("click", () => openExpenseModal("expense"));
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal="expenseModal"]').forEach(btn => {
    btn.addEventListener("click", closeExpenseModal);
  });
  
  document.querySelectorAll('[data-close-modal="editModal"]').forEach(btn => {
    btn.addEventListener("click", closeEditModal);
  });
  
  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        const modalId = backdrop.getAttribute('data-close-modal');
        if (modalId === 'expenseModal') closeExpenseModal();
        if (modalId === 'editModal') closeEditModal();
      }
    });
  });
  
  // Form submissions
  els.expenseAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveExpenseAccount(new FormData(e.target));
  });
  
  els.expenseTopupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveExpenseTopup(new FormData(e.target));
  });
  
  els.expenseEntryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveExpenseEntry(new FormData(e.target));
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
  
  // Overview toggles
  els.toggleMainOverviewBtn.addEventListener('click', () => {
    els.mainOverview.classList.toggle('collapsed');
  });
  
  els.toggleWalletsBtn.addEventListener('click', () => {
    els.walletsOverviewSection.classList.toggle('collapsed');
  });
  
  // Download buttons (placeholder functionality)
  els.downloadExpensesPdfBtn.addEventListener('click', () => {
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
            renderExpenses();
            renderExpenseWalletFilters();
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
  renderExpenseWalletFilters();
  renderExpenses();
  renderOverviewCards();
  bindEvents();
  
  // Show app
  els.app.classList.remove("hide");
}

boot();
