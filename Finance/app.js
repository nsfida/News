(() => {
  const SUPABASE_URL = 'https://aeyzorrqucqawbvnfpgc.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleXpvcnJxdWNxYXdidm5mcGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTk1NzQsImV4cCI6MjA5MzAzNTU3NH0.WhZwc3Z2mgFUAXqWhKXPKHZBHVgbhKrNdpy7tIumcIM';
  const SUPABASE_TABLE = 'loan_entries';

  const PASSWORD_SALT = 'loanledger-static-v1';
  const PASSWORD_HASH = '6990e2745daa0386284eacb7b7cd289bdb9298a22cb86383c9b3a57a0287e69b';

  const STORAGE_KEYS = {
    entries: 'loanledger_entries_v1',
    drafts: 'loanledger_drafts_v1',
    unlocked: 'loanledger_unlocked_v1',
    syncQueue: 'loanledger_sync_queue_v1'
  };

  const CATEGORY_META = {
    given: { label: 'Loan Given', short: 'Given', direction: 'outgoing' },
    received_back: { label: 'Received Back', short: 'Received Back', direction: 'incoming' },
    taken: { label: 'Loan Taken', short: 'Taken', direction: 'incoming' },
    returned_back: { label: 'Loan Returned', short: 'Returned', direction: 'outgoing' },
  };

  const CURRENCY_META = {
    AED: { label: 'AED', symbol: '~', cssClass: 'currency-aed' },
    SAR: { label: 'SAR', symbol: '$', cssClass: 'currency-sar' },
    PKR: { label: 'PKR', symbol: 'Rs.', cssClass: '' },
  };

  const state = {
    unlocked: sessionStorage.getItem(STORAGE_KEYS.unlocked) === '1',
    connected: false,
    category: 'given',
    view: 'new',
    entries: [],
    editingId: null,
    filters: {
      search: '',
      currency: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'newest',
    },
    drafts: JSON.parse(localStorage.getItem(STORAGE_KEYS.drafts) || '{}'),
    remoteReady: false,
    syncMessage: 'Syncing…'
  };

  let supabaseClient = null;

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindElements();
    attachEvents();
    prepareInitialValues();
    restoreDraft();
    renderCategoryUI();
    renderSummary();
    renderEntries();
    updateSyncStatus('Connecting…');
    unlockGateIfNeeded();
    initSupabase();
    refreshData();
  }

  function bindElements() {
    const ids = [
      'gate', 'gateForm', 'gatePassword', 'gateMessage', 'app',
      'exportCsvBtn', 'importJsonBtn', 'printBtn', 'syncStatus',
      'dashboardSummary', 'panelTitle', 'existingTitle', 'currentCategoryBadge',
      'currentViewBadge', 'entryForm', 'editingId', 'entryType', 'personName',
      'amount', 'currency', 'entryDate', 'settledAmount', 'partialNotes', 'notes',
      'remainingBalancePreview', 'settlementPreview', 'statusPreview', 'saveEntryBtn',
      'resetFormBtn', 'panelNew', 'panelExisting', 'searchInput', 'currencyFilter',
      'statusFilter', 'dateFromFilter', 'dateToFilter', 'sortBy', 'clearFiltersBtn',
      'refreshBtn', 'entriesGrid', 'emptyState', 'entryCountBadge', 'filterCountBadge',
      'importInput', 'editModal', 'closeModalBtn', 'cancelEditBtn', 'editForm',
      'editEntryId', 'editEntryType', 'editPersonName', 'editAmount', 'editCurrency',
      'editEntryDate', 'editSettledAmount', 'editPartialNotes', 'editNotes',
      'editRemainingBalancePreview', 'editSettlementPreview', 'editStatusPreview'
    ];
    ids.forEach((id) => els[id] = document.getElementById(id));
  }

  function attachEvents() {
    document.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.category;
        state.view = state.view || 'new';
        renderCategoryUI();
        renderSummary();
        renderEntries();
        autoSaveDraft();
      });
    });

    document.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.view = btn.dataset.view;
        renderCategoryUI();
      });
    });

    els.gateForm.addEventListener('submit', handleGateSubmit);

    els.entryForm.addEventListener('submit', handleCreateSubmit);
    els.resetFormBtn.addEventListener('click', resetForm);

    [els.personName, els.amount, els.currency, els.entryDate, els.settledAmount, els.partialNotes, els.notes].forEach((input) => {
      input.addEventListener('input', () => {
        updateComputedPreview();
        autoSaveDraft();
      });
      input.addEventListener('change', autoSaveDraft);
    });

    [els.searchInput, els.currencyFilter, els.statusFilter, els.dateFromFilter, els.dateToFilter, els.sortBy].forEach((input) => {
      input.addEventListener('input', () => {
        state.filters.search = els.searchInput.value.trim();
        state.filters.currency = els.currencyFilter.value;
        state.filters.status = els.statusFilter.value;
        state.filters.dateFrom = els.dateFromFilter.value;
        state.filters.dateTo = els.dateToFilter.value;
        state.filters.sortBy = els.sortBy.value;
        renderEntries();
      });
    });

    els.clearFiltersBtn.addEventListener('click', () => {
      els.searchInput.value = '';
      els.currencyFilter.value = '';
      els.statusFilter.value = '';
      els.dateFromFilter.value = '';
      els.dateToFilter.value = '';
      els.sortBy.value = 'newest';
      state.filters = {
        search: '',
        currency: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        sortBy: 'newest',
      };
      renderEntries();
      showToast('info', 'Filters cleared', 'The current category is shown without restrictions.');
    });

    els.refreshBtn.addEventListener('click', refreshData);
    els.exportCsvBtn.addEventListener('click', exportCSV);
    els.importJsonBtn.addEventListener('click', () => els.importInput.click());
    els.importInput.addEventListener('change', handleImportFile);
    els.printBtn.addEventListener('click', () => window.print());

    els.closeModalBtn.addEventListener('click', closeEditModal);
    els.cancelEditBtn.addEventListener('click', closeEditModal);
    els.editForm.addEventListener('submit', handleEditSubmit);

    [els.editPersonName, els.editAmount, els.editCurrency, els.editEntryDate, els.editSettledAmount, els.editPartialNotes, els.editNotes].forEach((input) => {
      input.addEventListener('input', updateEditPreview);
      input.addEventListener('change', updateEditPreview);
    });

    window.addEventListener('beforeunload', () => {
      autoSaveDraft();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.editModal.hidden) {
        closeEditModal();
      }
    });
  }

  function prepareInitialValues() {
    const today = new Date().toISOString().slice(0, 10);
    if (!els.entryDate.value) els.entryDate.value = today;
    if (!els.editEntryDate.value) els.editEntryDate.value = today;
    if (!els.currency.value) els.currency.value = 'AED';
    if (!els.editCurrency.value) els.editCurrency.value = 'AED';
    els.entryType.value = state.category;
    els.editEntryType.value = state.category;
    els.sortBy.value = 'newest';
    state.filters.sortBy = 'newest';
    updateComputedPreview();
    updateEditPreview();
  }

  function unlockGateIfNeeded() {
    if (state.unlocked) {
      showApp();
    }
  }

  async function handleGateSubmit(event) {
    event.preventDefault();
    const password = els.gatePassword.value.trim();
    if (!password) {
      els.gateMessage.textContent = 'Enter the password to continue.';
      return;
    }

    const hash = await sha256(`${PASSWORD_SALT}${password}`);
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem(STORAGE_KEYS.unlocked, '1');
      state.unlocked = true;
      els.gateMessage.textContent = '';
      showApp();
      showToast('success', 'Access granted', 'Dashboard unlocked for this session.');
    } else {
      els.gateMessage.textContent = 'Incorrect password.';
      showToast('error', 'Access denied', 'The password did not match.');
    }
  }

  function showApp() {
    els.gate.hidden = true;
    els.app.hidden = false;
  }

  function renderCategoryUI() {
    document.querySelectorAll('[data-category]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === state.category);
    });
    document.querySelectorAll('[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === state.view);
    });

    const meta = CATEGORY_META[state.category];
    els.panelTitle.textContent = meta.label;
    els.existingTitle.textContent = meta.label;
    els.currentCategoryBadge.textContent = meta.short;
    els.currentViewBadge.textContent = state.view === 'new' ? 'Draft auto-saves' : 'Searchable list';
    els.entryType.value = state.category;
    els.editEntryType.value = state.category;
    els.panelNew.hidden = state.view !== 'new';
    els.panelExisting.hidden = state.view !== 'existing';
    saveDraftToState();
    restoreDraft();
    updateComputedPreview();
    updateEditPreview();
  }

  function renderSummary() {
    const entries = state.entries.filter((entry) => entry.entry_type === state.category);
    const total = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const settled = entries.filter((entry) => Number(entry.remaining_balance || 0) <= 0.001).length;
    const partial = entries.filter((entry) => Number(entry.settled_amount || 0) > 0 && Number(entry.remaining_balance || 0) > 0.001).length;
    const outstanding = entries.reduce((sum, entry) => sum + Number(entry.remaining_balance || 0), 0);

    const currencyTotals = entries.reduce((acc, entry) => {
      acc[entry.currency] = (acc[entry.currency] || 0) + Number(entry.amount || 0);
      return acc;
    }, {});

    const cards = [
      { label: 'Entries', value: String(entries.length), sub: 'Current category' },
      { label: 'Total amount', value: formatMoney(total, dominantCurrency(entries)), sub: formatCurrencyBreakdown(currencyTotals) },
      { label: 'Outstanding', value: formatMoney(outstanding, dominantCurrency(entries)), sub: 'Remaining unpaid balance' },
      { label: 'Settled / partial', value: `${settled} settled`, sub: `${partial} partially settled` },
    ];

    els.dashboardSummary.innerHTML = cards.map((card) => `
      <article class="summary-card">
        <div class="label">${escapeHtml(card.label)}</div>
        <strong class="value">${escapeHtml(card.value)}</strong>
        <div class="sub">${escapeHtml(card.sub)}</div>
      </article>
    `).join('');
  }

  function renderEntries() {
    const all = state.entries.filter((entry) => entry.entry_type === state.category);
    els.entryCountBadge.textContent = `${all.length} entr${all.length === 1 ? 'y' : 'ies'}`;
    const filtered = applyFilters(all);
    els.filterCountBadge.textContent = `${filtered.length} shown`;

    els.emptyState.hidden = !(all.length === 0 || filtered.length === 0);
    if (all.length === 0) {
      els.emptyState.querySelector('h3').textContent = 'No entries yet';
      els.emptyState.querySelector('p').textContent = 'Use the New Entry tab to add your first record in this category.';
    } else if (filtered.length === 0) {
      els.emptyState.querySelector('h3').textContent = 'No matches found';
      els.emptyState.querySelector('p').textContent = 'Adjust search, filters, or sorting to reveal entries in this category.';
    }

    if (!filtered.length) {
      els.entriesGrid.innerHTML = '';
      return;
    }

    els.entriesGrid.innerHTML = filtered.map(renderEntryCard).join('');
    document.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
    document.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener('click', () => deleteEntry(btn.dataset.id)));
    document.querySelectorAll('[data-action="partial"]').forEach((btn) => btn.addEventListener('click', () => quickPartial(btn.dataset.id)));
  }

  function renderEntryCard(entry) {
    const statusClass = `status-${entry.status || 'pending'}`;
    const currencyMarkup = formatMoneyHTML(Number(entry.amount || 0), entry.currency);
    const balanceMarkup = formatMoneyHTML(Number(entry.remaining_balance || 0), entry.currency);
    const settledAmount = Number(entry.settled_amount || 0);
    const typeMeta = CATEGORY_META[entry.entry_type] || CATEGORY_META.given;

    return `
      <article class="entry-card">
        <div class="entry-top">
          <div>
            <h3 class="entry-name">${escapeHtml(entry.person_name)}</h3>
            <div class="entry-meta">
              <span class="pill">${escapeHtml(typeMeta.label)}</span>
              <span class="pill">Date: ${escapeHtml(formatDate(entry.entry_date))}</span>
              <span class="pill">Currency: ${escapeHtml(entry.currency)}</span>
            </div>
          </div>
          <span class="status-chip ${statusClass}">${escapeHtml(entry.status || 'pending')}</span>
        </div>

        <div class="amount-row">
          <div class="amount-value">${currencyMarkup}</div>
          <div class="amount-detail">
            Settled: ${formatMoneyHTML(settledAmount, entry.currency)} · Remaining: ${balanceMarkup}
          </div>
        </div>

        <div class="entry-footer">
          <span class="pill">Notes: ${escapeHtml(entry.notes || '—')}</span>
          <span class="pill">Partial details: ${escapeHtml(entry.partial_notes || '—')}</span>
        </div>

        <div class="card-actions">
          <button class="btn btn-ghost" type="button" data-action="edit" data-id="${entry.id}">Edit</button>
          <button class="btn btn-ghost" type="button" data-action="partial" data-id="${entry.id}">Mark partial</button>
          <button class="btn btn-ghost" type="button" data-action="delete" data-id="${entry.id}">Delete</button>
        </div>
      </article>
    `;
  }

  function applyFilters(entries) {
    const search = state.filters.search.toLowerCase();
    const filtered = entries.filter((entry) => {
      const matchesSearch = !search || [
        entry.person_name,
        entry.notes,
        entry.partial_notes,
        entry.currency,
        entry.status
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));

      const matchesCurrency = !state.filters.currency || entry.currency === state.filters.currency;
      const matchesStatus = !state.filters.status || entry.status === state.filters.status;
      const matchesFrom = !state.filters.dateFrom || entry.entry_date >= state.filters.dateFrom;
      const matchesTo = !state.filters.dateTo || entry.entry_date <= state.filters.dateTo;

      return matchesSearch && matchesCurrency && matchesStatus && matchesFrom && matchesTo;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (state.filters.sortBy) {
        case 'oldest':
          return compareDate(a.entry_date, b.entry_date);
        case 'amount_desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount_asc':
          return Number(a.amount) - Number(b.amount);
        case 'newest':
        default:
          return compareDate(b.entry_date, a.entry_date);
      }
    });

    return sorted;
  }

  function compareDate(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  function dominantCurrency(entries) {
    const tally = entries.reduce((acc, entry) => {
      acc[entry.currency] = (acc[entry.currency] || 0) + 1;
      return acc;
    }, {});
    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return winner ? winner[0] : 'AED';
  }

  function formatCurrencyBreakdown(currencyTotals) {
    const parts = Object.entries(currencyTotals).map(([currency, total]) => `${currency} ${formatNumber(total)}`);
    return parts.length ? parts.join(' · ') : 'No totals yet';
  }

  function formatMoney(amount, currency) {
    const meta = CURRENCY_META[currency] || CURRENCY_META.AED;
    return `${meta.symbol} ${formatNumber(amount)}`;
  }

  function formatMoneyHTML(amount, currency) {
    const meta = CURRENCY_META[currency] || CURRENCY_META.AED;
    const symbolClass = meta.cssClass ? `currency-symbol ${meta.cssClass}` : 'currency-symbol';
    return `<span class="${symbolClass}">${escapeHtml(meta.symbol)}</span><span>${formatNumber(amount)}</span>`;
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function currencyToStatus(settled, amount) {
    const settledValue = Number(settled || 0);
    const original = Number(amount || 0);
    if (settledValue <= 0) return 'pending';
    if (settledValue >= original) return 'settled';
    return 'partial';
  }

  function updateComputedPreview() {
    const amount = parseNumber(els.amount.value);
    const settledAmount = parseNumber(els.settledAmount.value);
    const remaining = Math.max(amount - settledAmount, 0);
    const status = currencyToStatus(settledAmount, amount);
    els.remainingBalancePreview.textContent = formatNumber(remaining);
    els.settlementPreview.textContent = settledAmount > 0 ? 'Partial / settled' : 'None';
    els.statusPreview.textContent = statusLabel(status);
  }

  function updateEditPreview() {
    const amount = parseNumber(els.editAmount.value);
    const settledAmount = parseNumber(els.editSettledAmount.value);
    const remaining = Math.max(amount - settledAmount, 0);
    const status = currencyToStatus(settledAmount, amount);
    els.editRemainingBalancePreview.textContent = formatNumber(remaining);
    els.editSettlementPreview.textContent = settledAmount > 0 ? 'Partial / settled' : 'None';
    els.editStatusPreview.textContent = statusLabel(status);
  }

  function statusLabel(status) {
    switch (status) {
      case 'settled':
        return 'Settled';
      case 'partial':
        return 'Partial';
      default:
        return 'Pending';
    }
  }

  function parseNumber(value) {
    const n = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  function validateEntryPayload(payload) {
    const errors = [];
    if (!payload.person_name.trim()) errors.push('Person name is required.');
    if (!payload.entry_date) errors.push('Date is required.');
    if (!payload.currency || !CURRENCY_META[payload.currency]) errors.push('Pick a valid currency.');
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) errors.push('Amount must be greater than zero.');
    if (!Number.isFinite(payload.settled_amount) || payload.settled_amount < 0) errors.push('Settled amount cannot be negative.');
    if (payload.settled_amount > payload.amount) errors.push('Settled amount cannot exceed the original amount.');
    return errors;
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const payload = readFormPayload('create');
    const errors = validateEntryPayload(payload);
    if (errors.length) {
      showToast('error', 'Validation failed', errors[0]);
      return;
    }
    await saveEntry(payload);
    resetForm();
    showToast('success', 'Entry saved', 'The new record has been stored successfully.');
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    const payload = readFormPayload('edit');
    const errors = validateEntryPayload(payload);
    if (errors.length) {
      showToast('error', 'Validation failed', errors[0]);
      return;
    }

    const existing = state.entries.find((entry) => entry.id === payload.id);
    if (!existing) {
      showToast('error', 'Not found', 'This entry no longer exists.');
      closeEditModal();
      return;
    }

    const updated = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString(),
    };

    await persistEntries((entries) => entries.map((entry) => entry.id === payload.id ? updated : entry));
    closeEditModal();
    renderAll();
    showToast('success', 'Entry updated', 'The selected record has been refreshed.');
  }

  function readFormPayload(mode) {
    const isEdit = mode === 'edit';
    const fields = isEdit
      ? {
          id: els.editEntryId,
          entryType: els.editEntryType,
          personName: els.editPersonName,
          amount: els.editAmount,
          currency: els.editCurrency,
          entryDate: els.editEntryDate,
          settledAmount: els.editSettledAmount,
          partialNotes: els.editPartialNotes,
          notes: els.editNotes,
        }
      : {
          id: els.editingId,
          entryType: els.entryType,
          personName: els.personName,
          amount: els.amount,
          currency: els.currency,
          entryDate: els.entryDate,
          settledAmount: els.settledAmount,
          partialNotes: els.partialNotes,
          notes: els.notes,
        };

    const person_name = fields.personName.value.trim();
    const amount = parseNumber(fields.amount.value);
    const currency = fields.currency.value;
    const entry_date = fields.entryDate.value;
    const settled_amount = parseNumber(fields.settledAmount.value);
    const partial_notes = fields.partialNotes.value.trim();
    const notes = fields.notes.value.trim();
    const status = currencyToStatus(settled_amount, amount);
    const remaining_balance = Math.max(amount - settled_amount, 0);

    return {
      id: fields.id.value || crypto.randomUUID(),
      entry_type: fields.entryType.value || state.category,
      person_name,
      amount,
      currency,
      entry_date,
      settled_amount,
      remaining_balance,
      status,
      partial_notes,
      notes,
    };
  }

  async function saveEntry(payload) {
    const entry = {
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!entry.id) entry.id = crypto.randomUUID();

    await persistEntries((entries) => [entry, ...entries.filter((item) => item.id !== entry.id)]);
    renderAll();
  }

  async function persistEntries(updater) {
    const next = updater(Array.isArray(state.entries) ? state.entries : []);
    state.entries = next;
    cacheEntries();

    try {
      if (supabaseClient) {
        const ids = next.map((entry) => entry.id);
        const currentIds = state.entries.map((entry) => entry.id);
      }
      await syncAllToSupabase(next);
      state.connected = true;
      updateSyncStatus('Synced');
    } catch (error) {
      state.connected = false;
      updateSyncStatus('Offline cache active');
      queueSync(next);
      console.warn(error);
    }
  }

  async function syncAllToSupabase(entries) {
    if (!supabaseClient) return;
    const remote = await supabaseClient.from(SUPABASE_TABLE).select('id, created_at').order('updated_at', { ascending: false });
    if (remote.error && remote.status !== 406) {
      throw remote.error;
    }

    const remoteRows = remote.data || [];
    const remoteIds = new Set(remoteRows.map((row) => row.id));
    const localIds = new Set(entries.map((entry) => entry.id));

    const toDelete = remoteRows.filter((row) => !localIds.has(row.id)).map((row) => row.id);
    const toUpsert = entries.map((entry) => stripLocalOnlyFields(entry));

    if (toDelete.length) {
      const deleted = await supabaseClient.from(SUPABASE_TABLE).delete().in('id', toDelete);
      if (deleted.error) throw deleted.error;
    }

    if (toUpsert.length) {
      const upserted = await supabaseClient.from(SUPABASE_TABLE).upsert(toUpsert, { onConflict: 'id' });
      if (upserted.error) throw upserted.error;
    }
  }

  function stripLocalOnlyFields(entry) {
    return {
      id: entry.id,
      entry_type: entry.entry_type,
      person_name: entry.person_name,
      amount: Number(entry.amount),
      currency: entry.currency,
      entry_date: entry.entry_date,
      settled_amount: Number(entry.settled_amount || 0),
      notes: entry.notes || '',
      partial_notes: entry.partial_notes || '',
      created_at: entry.created_at || new Date().toISOString(),
      updated_at: entry.updated_at || new Date().toISOString(),
    };
  }

  function cacheEntries() {
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(state.entries));
  }

  function saveDraftToState() {
    state.drafts[state.category] = {
      personName: els.personName.value,
      amount: els.amount.value,
      currency: els.currency.value,
      entryDate: els.entryDate.value,
      settledAmount: els.settledAmount.value,
      partialNotes: els.partialNotes.value,
      notes: els.notes.value,
    };
    localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(state.drafts));
  }

  function restoreDraft() {
    const draft = state.drafts[state.category] || {};
    els.personName.value = draft.personName || '';
    els.amount.value = draft.amount || '';
    els.currency.value = draft.currency || 'AED';
    els.entryDate.value = draft.entryDate || new Date().toISOString().slice(0, 10);
    els.settledAmount.value = draft.settledAmount || '';
    els.partialNotes.value = draft.partialNotes || '';
    els.notes.value = draft.notes || '';
    updateComputedPreview();
  }

  function autoSaveDraft() {
    if (!state.unlocked) return;
    saveDraftToState();
  }

  function resetForm() {
    els.entryForm.reset();
    els.entryType.value = state.category;
    els.currency.value = 'AED';
    els.entryDate.value = new Date().toISOString().slice(0, 10);
    els.settledAmount.value = '';
    els.partialNotes.value = '';
    els.notes.value = '';
    els.editingId.value = '';
    updateComputedPreview();
    autoSaveDraft();
  }

  function renderAll() {
    renderSummary();
    renderEntries();
    updateComputedPreview();
    updateEditPreview();
  }

  function openEditModal(id) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    els.editModal.hidden = false;
    document.body.style.overflow = 'hidden';
    els.editEntryId.value = entry.id;
    els.editEntryType.value = entry.entry_type;
    els.editPersonName.value = entry.person_name || '';
    els.editAmount.value = entry.amount ?? '';
    els.editCurrency.value = entry.currency || 'AED';
    els.editEntryDate.value = entry.entry_date || new Date().toISOString().slice(0, 10);
    els.editSettledAmount.value = entry.settled_amount ?? '';
    els.editPartialNotes.value = entry.partial_notes || '';
    els.editNotes.value = entry.notes || '';
    updateEditPreview();
  }

  function closeEditModal() {
    els.editModal.hidden = true;
    document.body.style.overflow = '';
  }

  async function quickPartial(id) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    const amount = parseNumber(prompt('Enter settled / returned amount', String(entry.settled_amount || 0)) || entry.settled_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      showToast('warning', 'Nothing changed', 'The entered amount was not valid.');
      return;
    }
    if (amount > Number(entry.amount || 0)) {
      showToast('warning', 'Amount too high', 'Settled amount cannot exceed original amount.');
      return;
    }

    const updated = {
      ...entry,
      settled_amount: amount,
      remaining_balance: Math.max(Number(entry.amount || 0) - amount, 0),
      status: currencyToStatus(amount, entry.amount),
      updated_at: new Date().toISOString(),
    };

    await persistEntries((entries) => entries.map((item) => item.id === id ? updated : item));
    renderAll();
    showToast('success', 'Updated', 'Settlement amount has been refreshed.');
  }

  async function deleteEntry(id) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    const confirmed = confirm(`Delete the entry for ${entry.person_name}? This cannot be undone.`);
    if (!confirmed) return;
    await persistEntries((entries) => entries.filter((item) => item.id !== id));
    renderAll();
    showToast('warning', 'Entry deleted', 'The selected record has been removed.');
  }

  async function refreshData() {
    try {
      if (!supabaseClient) {
        state.entries = loadLocalEntries();
        cacheEntries();
        renderAll();
        updateSyncStatus('Offline cache active');
        return;
      }

      const { data, error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .select('*')
        .order('entry_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      state.entries = (data || []).map(normalizeEntry);
      cacheEntries();
      state.connected = true;
      updateSyncStatus('Synced');
      renderAll();
      if (!state.entries.length) {
        const local = loadLocalEntries();
        if (local.length) {
          state.entries = local;
          renderAll();
          updateSyncStatus('Loaded local backup');
        }
      }
    } catch (error) {
      console.warn(error);
      state.entries = loadLocalEntries();
      renderAll();
      updateSyncStatus(state.entries.length ? 'Loaded local backup' : 'Offline cache active');
      showToast('warning', 'Using local backup', 'Supabase was unavailable, so cached records are shown.');
    }
  }

  function normalizeEntry(row) {
    const amount = Number(row.amount || 0);
    const settled_amount = Number(row.settled_amount || 0);
    return {
      id: row.id,
      entry_type: row.entry_type,
      person_name: row.person_name || '',
      amount,
      currency: row.currency || 'AED',
      entry_date: row.entry_date || new Date().toISOString().slice(0, 10),
      settled_amount,
      remaining_balance: row.remaining_balance != null ? Number(row.remaining_balance) : Math.max(amount - settled_amount, 0),
      status: row.status || currencyToStatus(settled_amount, amount),
      partial_notes: row.partial_notes || '',
      notes: row.notes || '',
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    };
  }

  function loadLocalEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.entries) || '[]').map(normalizeEntry);
    } catch {
      return [];
    }
  }

  function queueSync(entries) {
    localStorage.setItem(STORAGE_KEYS.syncQueue, JSON.stringify(entries));
  }

  function updateSyncStatus(message) {
    state.syncMessage = message;
    els.syncStatus.textContent = message;
  }

  async function initSupabase() {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error('Supabase client library is unavailable.');
      }
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      state.remoteReady = true;
    } catch (error) {
      console.warn(error);
      supabaseClient = null;
      state.remoteReady = false;
      updateSyncStatus('Offline cache active');
    }
  }

  function showToast(type, title, message) {
    const wrap = els.toastWrap;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 180);
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function sha256(input) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function exportCSV() {
    const rows = state.entries.map((entry) => [
      entry.id,
      CATEGORY_META[entry.entry_type]?.label || entry.entry_type,
      entry.person_name,
      entry.amount,
      entry.currency,
      entry.entry_date,
      entry.status,
      entry.settled_amount,
      entry.remaining_balance,
      JSON.stringify(entry.notes || ''),
      JSON.stringify(entry.partial_notes || ''),
      entry.created_at || '',
      entry.updated_at || ''
    ]);
    const header = ['id','entry_type','person_name','amount','currency','entry_date','status','settled_amount','remaining_balance','notes','partial_notes','created_at','updated_at'];
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `loanledger-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('success', 'CSV exported', 'Your loan ledger has been downloaded.');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) {
        throw new Error('Backup file must contain an array of entries.');
      }

      const normalized = imported.map((item) => normalizeEntry({
        id: item.id || crypto.randomUUID(),
        entry_type: item.entry_type || state.category,
        person_name: item.person_name || '',
        amount: Number(item.amount || 0),
        currency: item.currency || 'AED',
        entry_date: item.entry_date || new Date().toISOString().slice(0, 10),
        settled_amount: Number(item.settled_amount || 0),
        remaining_balance: item.remaining_balance != null ? Number(item.remaining_balance) : Math.max(Number(item.amount || 0) - Number(item.settled_amount || 0), 0),
        status: item.status || currencyToStatus(Number(item.settled_amount || 0), Number(item.amount || 0)),
        partial_notes: item.partial_notes || '',
        notes: item.notes || '',
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      }));

      await persistEntries(() => normalized);
      renderAll();
      showToast('success', 'Backup imported', 'The entries were restored from the selected file.');
    } catch (error) {
      console.warn(error);
      showToast('error', 'Import failed', error.message || 'The backup file could not be read.');
    } finally {
      event.target.value = '';
    }
  }
})();
