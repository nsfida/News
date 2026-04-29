(() => {
  'use strict';

  const CONFIG = window.LOAN_TRACKER_CONFIG || {};
  const STORAGE_KEYS = {
    entries: 'loan-tracker-entries-v1',
    drafts: 'loan-tracker-drafts-v1',
    unlocked: 'loan-tracker-unlocked-v1',
    lastSync: 'loan-tracker-last-sync-v1'
  };

  const CATEGORIES = [
    { key: 'loan_given', label: 'Loan Given', short: 'Given', accent: 'chip-warning' },
    { key: 'received_back', label: 'Received Back', short: 'Received', accent: 'chip-success' },
    { key: 'loan_taken', label: 'Loan Taken', short: 'Taken', accent: 'chip-danger' },
    { key: 'loan_returned', label: 'Loan Returned', short: 'Returned', accent: 'chip-success' },
  ];

  const STATUS_OPTIONS = {
    open: { label: 'Open', className: 'chip' },
    partial: { label: 'Partial', className: 'chip chip-warning' },
    settled: { label: 'Settled', className: 'chip chip-success' },
  };

  const state = {
    activeCategory: 'loan_given',
    view: 'new',
    entries: [],
    filteredEntries: [],
    editId: null,
    sortBy: 'newest',
    filters: {
      search: '',
      currency: 'all',
      status: 'all',
      from: '',
      to: ''
    },
    supabase: null,
    onlineReady: false,
    confirmResolver: null,
    hydrateDraftPending: false
  };

  const $ = (id) => document.getElementById(id);
  const els = {};
  const setEl = (k, v) => { els[k] = v; return v; };

  function cacheElements() {
    [
      'gateOverlay','gateForm','gatePassword','gateError','gateClear','appShell','confirmOverlay',
      'confirmTitle','confirmMessage','confirmCancel','confirmAccept','toastStack','refreshButton',
      'exportCsvButton','exportJsonButton','importButton','printButton','importInput','categoryTabs',
      'viewTabs','activeCategoryTitle','activeCategoryBadge','currencyTotals','summaryEntries',
      'summaryOutstanding','summarySettled','summaryPartial','visibleCount','visibleOutstanding',
      'visibleSettled','activityTimeline','entryForm','entryId','personName','amount','currency',
      'entryDate','status','partialAmount','partialNote','notes','editBanner','cancelEditButton',
      'resetDraftButton','formCategoryLabel','newEntryView','existingEntriesView','searchInput',
      'filterCurrency','filterStatus','filterFrom','filterTo','sortBy','clearFiltersButton',
      'entriesGrid','emptyState','resultCount','syncStateBadge'
    ].forEach(key => setEl(key, $(key)));
  }

  function getCategory(key = state.activeCategory) {
    return CATEGORIES.find(item => item.key === key) || CATEGORIES[0];
  }

  function getCurrencyConfig(currency) {
    return (CONFIG.CURRENCY_CONFIG || {})[currency] || { label: currency, symbol: currency, fontClass: '' };
  }

  function formatNumber(value) {
    const number = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }

  function formatCurrencyHTML(amount, currency) {
    const cfg = getCurrencyConfig(currency);
    const value = formatNumber(amount);
    if (currency === 'AED') {
      return `<span class="amount-inline"><span class="currency-symbol currency-aed-symbol">${cfg.symbol}</span> ${value}</span>`;
    }
    if (currency === 'SAR') {
      return `<span class="amount-inline"><span class="currency-symbol currency-sar-symbol">${cfg.symbol}</span> ${value}</span>`;
    }
    if (currency === 'PKR') {
      return `<span class="amount-inline"><span class="currency-symbol currency-pkr-label">${cfg.symbol}</span> ${value}</span>`;
    }
    return `<span class="amount-inline">${cfg.symbol} ${value}</span>`;
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function toDateOnly(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function parseAmount(raw) {
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : NaN;
  }

  function calculateEntry(entry) {
    const amount = Number(entry.amount) || 0;
    const partial = Number(entry.partialAmount) || 0;
    let remaining = amount;

    if (entry.status === 'settled') {
      remaining = 0;
    } else if (entry.status === 'partial') {
      remaining = Math.max(amount - partial, 0);
    } else {
      remaining = Math.max(amount, 0);
    }

    const derivedStatus = remaining === 0 ? 'settled' : (partial > 0 ? 'partial' : 'open');
    return {
      ...entry,
      amount,
      partialAmount: partial,
      remainingBalance: remaining,
      effectiveStatus: entry.status === 'settled' ? 'settled' : (entry.status === 'partial' || derivedStatus === 'partial' ? 'partial' : 'open')
    };
  }

  function makeId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return 'loan_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getDbRow(entry) {
    return {
      id: entry.id,
      category: entry.category,
      person_name: entry.personName,
      amount: entry.amount,
      currency: entry.currency,
      entry_date: entry.entryDate,
      notes: entry.notes || '',
      status: entry.status,
      partial_amount: entry.partialAmount || 0,
      partial_note: entry.partialNote || '',
      remaining_balance: entry.remainingBalance || 0,
      created_at: entry.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  function fromDbRow(row) {
    return calculateEntry({
      id: row.id,
      category: row.category,
      personName: row.person_name,
      amount: Number(row.amount),
      currency: row.currency,
      entryDate: row.entry_date,
      notes: row.notes || '',
      status: row.status || 'open',
      partialAmount: Number(row.partial_amount || 0),
      partialNote: row.partial_note || '',
      remainingBalance: Number(row.remaining_balance || 0),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString()
    });
  }

  function getLocalEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.entries);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(calculateEntry) : [];
    } catch {
      return [];
    }
  }

  function saveLocalEntries(entries) {
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  function readDrafts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.drafts) || '{}') || {};
    } catch {
      return {};
    }
  }

  function saveDraft() {
    const drafts = readDrafts();
    const draftKey = `${state.activeCategory}:${state.editId || 'new'}`;
    drafts[draftKey] = {
      personName: els.personName.value,
      amount: els.amount.value,
      currency: els.currency.value,
      entryDate: els.entryDate.value,
      status: els.status.value,
      partialAmount: els.partialAmount.value,
      partialNote: els.partialNote.value,
      notes: els.notes.value
    };
    localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
  }

  function clearDraft(category = state.activeCategory) {
    const drafts = readDrafts();
    delete drafts[`${category}:${state.editId || 'new'}`];
    localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(drafts));
  }

  function restoreDraft() {
    const drafts = readDrafts();
    const key = `${state.activeCategory}:${state.editId || 'new'}`;
    const draft = drafts[key];
    if (!draft) return;
    els.personName.value = draft.personName || '';
    els.amount.value = draft.amount || '';
    els.currency.value = draft.currency || 'AED';
    els.entryDate.value = draft.entryDate || '';
    els.status.value = draft.status || 'open';
    els.partialAmount.value = draft.partialAmount || '';
    els.partialNote.value = draft.partialNote || '';
    els.notes.value = draft.notes || '';
  }

  function resetForm(keepCategory = true) {
    state.editId = null;
    els.entryId.value = '';
    els.entryForm.reset();
    els.currency.value = 'AED';
    els.status.value = 'open';
    els.partialAmount.value = '';
    els.partialNote.value = '';
    els.notes.value = '';
    els.personName.value = '';
    els.amount.value = '';
    els.entryDate.value = new Date().toISOString().slice(0, 10);
    els.editBanner.classList.add('hidden');
    if (keepCategory) {
      clearDraft();
    }
  }

  function setEditMode(entry) {
    state.editId = entry.id;
    els.entryId.value = entry.id;
    els.personName.value = entry.personName || '';
    els.amount.value = entry.amount ?? '';
    els.currency.value = entry.currency || 'AED';
    els.entryDate.value = entry.entryDate || new Date().toISOString().slice(0, 10);
    els.status.value = entry.status || 'open';
    els.partialAmount.value = entry.partialAmount || '';
    els.partialNote.value = entry.partialNote || '';
    els.notes.value = entry.notes || '';
    els.editBanner.classList.remove('hidden');
    saveDraft();
  }

  function setView(view) {
    state.view = view;
    $('newEntryView').classList.toggle('hidden', view !== 'new');
    $('existingEntriesView').classList.toggle('hidden', view !== 'existing');
    document.querySelectorAll('#viewTabs .segment').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view === 'existing') renderEntries();
  }

  function setCategory(category) {
    state.activeCategory = category;
    const cat = getCategory(category);
    document.querySelectorAll('#categoryTabs .segment').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    els.activeCategoryTitle.textContent = cat.label;
    els.formCategoryLabel.textContent = cat.label;
    els.activeCategoryBadge.textContent = cat.label;
    state.editId = null;
    els.editBanner.classList.add('hidden');
    restoreDraft();
    renderDashboard();
    renderEntries();
  }

  function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${escapeHTML(title)}</strong><div class="muted">${escapeHTML(message)}</div>`;
    els.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(4px)';
      toast.style.transition = 'all 180ms ease';
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function confirmAction(title, message, acceptLabel = 'Delete', danger = true) {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmAccept.textContent = acceptLabel;
    els.confirmAccept.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    els.confirmOverlay.classList.remove('hidden');

    return new Promise(resolve => {
      state.confirmResolver = resolve;
    });
  }

  function closeConfirm(result) {
    els.confirmOverlay.classList.add('hidden');
    if (state.confirmResolver) {
      state.confirmResolver(result);
      state.confirmResolver = null;
    }
  }

  function setSyncState(text, kind = 'soft') {
    els.syncStateBadge.textContent = text;
    els.syncStateBadge.className = kind === 'good' ? 'badge badge-success' : 'badge badge-soft';
  }

  function getSupabaseClient() {
    if (!window.supabase?.createClient) return null;
    const url = CONFIG.SUPABASE_URL;
    const key = CONFIG.SUPABASE_ANON_KEY;
    if (!url || !key || String(key).includes('PASTE_YOUR')) return null;
    try {
      return window.supabase.createClient(url, key);
    } catch {
      return null;
    }
  }

  function categoryEntries() {
    return state.entries.filter(entry => entry.category === state.activeCategory);
  }

  function filteredEntries() {
    const categoryItems = categoryEntries();
    const searchTerm = normalizeText(state.filters.search);
    let items = categoryItems.filter(entry => {
      if (state.filters.currency !== 'all' && entry.currency !== state.filters.currency) return false;
      if (state.filters.status !== 'all' && entry.effectiveStatus !== state.filters.status) return false;
      if (state.filters.from && entry.entryDate < state.filters.from) return false;
      if (state.filters.to && entry.entryDate > state.filters.to) return false;
      if (searchTerm) {
        const hay = normalizeText([entry.personName, entry.notes, entry.partialNote, entry.currency, entry.category].join(' '));
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    const sortBy = state.sortBy;
    items.sort((a, b) => {
      if (sortBy === 'amount_desc') return b.amount - a.amount || (b.entryDate < a.entryDate ? -1 : 1);
      if (sortBy === 'amount_asc') return a.amount - b.amount || (b.entryDate < a.entryDate ? -1 : 1);
      if (sortBy === 'oldest') return a.entryDate.localeCompare(b.entryDate) || (a.createdAt || '').localeCompare(b.createdAt || '');
      return b.entryDate.localeCompare(a.entryDate) || (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return items;
  }

  function calculateSummaries(entries) {
    const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const outstanding = entries.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);
    const settled = entries.filter(e => e.effectiveStatus === 'settled').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const partial = entries.filter(e => e.effectiveStatus === 'partial').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { total, outstanding, settled, partial };
  }

  function calculateByCurrency(entries) {
    const currencies = ['AED', 'SAR', 'PKR'];
    return currencies.map(currency => {
      const subset = entries.filter(entry => entry.currency === currency);
      const summary = calculateSummaries(subset);
      return { currency, ...summary, count: subset.length };
    });
  }

  function renderDashboard() {
    const currentEntries = categoryEntries().map(calculateEntry);
    const visibleEntries = filteredEntries().map(calculateEntry);
    const summary = calculateSummaries(currentEntries);
    const visible = calculateSummaries(visibleEntries);

    els.summaryEntries.textContent = currentEntries.length.toString();
    els.summaryOutstanding.textContent = formatCurrencyHTML(summary.outstanding, currentEntries[0]?.currency || 'AED').replace(/<[^>]+>/g, '') || '0.00';
    els.summarySettled.textContent = formatCurrencyHTML(summary.settled, currentEntries[0]?.currency || 'AED').replace(/<[^>]+>/g, '') || '0.00';
    els.summaryPartial.textContent = formatCurrencyHTML(summary.partial, currentEntries[0]?.currency || 'AED').replace(/<[^>]+>/g, '') || '0.00';

    els.visibleCount.textContent = visibleEntries.length.toString();
    els.visibleOutstanding.textContent = visible.outstanding.toFixed(2);
    els.visibleSettled.textContent = visible.settled.toFixed(2);

    const byCurrency = calculateByCurrency(currentEntries);
    els.currencyTotals.innerHTML = byCurrency.map(item => `
      <div class="currency-card">
        <div class="currency-card-header">
          <span class="currency-name">${escapeHTML(item.currency)}</span>
          <span class="badge badge-soft">${item.count} entries</span>
        </div>
        <div class="currency-value">${formatCurrencyHTML(item.total, item.currency)}</div>
        <div class="currency-sub">
          Outstanding: ${formatNumber(item.outstanding)} • Settled: ${formatNumber(item.settled)}
        </div>
      </div>
    `).join('') || '<div class="currency-card"><div class="currency-value">No data yet</div><div class="currency-sub">Add an entry to see totals.</div></div>';

    const recent = [...currentEntries]
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 6);

    els.activityTimeline.innerHTML = recent.length
      ? recent.map(entry => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-body">
              <strong>${escapeHTML(entry.personName)} • ${escapeHTML(getCategory(entry.category).label)}</strong>
              <span>${escapeHTML(entry.entryDate)} • ${entry.effectiveStatus.toUpperCase()} • ${formatCurrencyHTML(entry.amount, entry.currency).replace(/<[^>]+>/g, '')}</span>
            </div>
          </div>
        `).join('')
      : '<div class="muted small">No activity yet.</div>';
  }

  function renderCategoryTabs() {
    els.categoryTabs.innerHTML = CATEGORIES.map(cat => {
      const count = state.entries.filter(entry => entry.category === cat.key).length;
      return `<button class="segment ${cat.key === state.activeCategory ? 'active' : ''}" data-category="${cat.key}">${escapeHTML(cat.label)} <span class="muted">(${count})</span></button>`;
    }).join('');
  }

  function renderEntries() {
    const items = filteredEntries().map(calculateEntry);
    state.filteredEntries = items;

    els.resultCount.textContent = items.length.toString();
    els.entriesGrid.innerHTML = items.map(entry => {
      const status = STATUS_OPTIONS[entry.effectiveStatus] || STATUS_OPTIONS.open;
      const remaining = formatCurrencyHTML(entry.remainingBalance, entry.currency);
      const partialInfo = entry.partialAmount > 0
        ? `${formatCurrencyHTML(entry.partialAmount, entry.currency).replace(/<[^>]+>/g, '')}${entry.partialNote ? ' • ' + escapeHTML(entry.partialNote) : ''}`
        : 'No partial settlement yet';

      return `
        <article class="entry-card" data-id="${escapeHTML(entry.id)}">
          <div class="entry-top">
            <div>
              <h3 class="entry-name">${escapeHTML(entry.personName)}</h3>
              <div class="entry-meta">
                <span class="chip">${escapeHTML(getCategory(entry.category).label)}</span>
                <span class="chip ${status.className}">${escapeHTML(status.label)}</span>
                <span class="chip">${escapeHTML(entry.currency)}</span>
              </div>
            </div>
            <div class="badge badge-soft">${escapeHTML(entry.entryDate)}</div>
          </div>

          <div class="entry-amount">${formatCurrencyHTML(entry.amount, entry.currency)}</div>

          <div class="entry-grid">
            <div class="info-box">
              <span>Remaining balance</span>
              <strong>${remaining}</strong>
            </div>
            <div class="info-box">
              <span>Partial amount</span>
              <strong>${partialInfo}</strong>
            </div>
            <div class="info-box">
              <span>Status</span>
              <strong>${escapeHTML(entry.effectiveStatus.toUpperCase())}</strong>
            </div>
            <div class="info-box">
              <span>Entry date</span>
              <strong>${escapeHTML(entry.entryDate)}</strong>
            </div>
          </div>

          <div class="notes-box">
            <span>Notes / description</span>
            <p>${escapeHTML(entry.notes || '—')}</p>
          </div>

          <div class="card-actions">
            <button class="btn btn-ghost btn-small action-edit" data-action="edit">Edit</button>
            <button class="btn btn-ghost btn-small action-partial" data-action="partial">Partial</button>
            <button class="btn btn-danger btn-small action-delete" data-action="delete">Delete</button>
          </div>
        </article>
      `;
    }).join('');

    els.emptyState.classList.toggle('hidden', items.length !== 0);

    if (!items.length) {
      els.entriesGrid.innerHTML = '';
    }

    renderDashboard();
  }

  function syncSupabaseStatus() {
    state.supabase = getSupabaseClient();
    state.onlineReady = !!state.supabase;
    setSyncState(state.onlineReady ? 'Supabase ready' : 'Local fallback');
  }

  async function loadEntries() {
    syncSupabaseStatus();
    const local = getLocalEntries();

    if (!state.supabase) {
      state.entries = local;
      renderCategoryTabs();
      renderDashboard();
      renderEntries();
      return;
    }

    try {
      const { data, error } = await state.supabase
        .from(CONFIG.SUPABASE_TABLE || 'loan_entries')
        .select('*')
        .order('entry_date', { ascending: false });

      if (error) throw error;
      state.entries = (data || []).map(fromDbRow);
      saveLocalEntries(state.entries);
      setSyncState('Synced to Supabase', 'good');
    } catch (error) {
      console.warn('Supabase load failed, using local cache', error);
      state.entries = local;
      setSyncState('Local fallback');
      showToast('Offline mode', 'Loaded local cached entries because Supabase was unavailable.', 'warning');
    }

    renderCategoryTabs();
    renderDashboard();
    renderEntries();
  }

  async function persistEntry(entry, mode = 'create') {
    const row = getDbRow(entry);
    if (state.supabase) {
      if (mode === 'update') {
        const { error } = await state.supabase
          .from(CONFIG.SUPABASE_TABLE || 'loan_entries')
          .update(row)
          .eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await state.supabase
          .from(CONFIG.SUPABASE_TABLE || 'loan_entries')
          .insert(row);
        if (error) throw error;
      }
    }

    if (mode === 'create') {
      state.entries.unshift(entry);
    } else {
      const index = state.entries.findIndex(item => item.id === entry.id);
      if (index !== -1) state.entries[index] = entry;
    }
    saveLocalEntries(state.entries);
  }

  async function deleteEntry(id) {
    const idx = state.entries.findIndex(entry => entry.id === id);
    if (idx === -1) return;

    const entry = state.entries[idx];
    const confirmed = await confirmAction(
      'Delete this entry?',
      `${entry.personName} • ${getCategory(entry.category).label} • ${entry.currency} ${formatNumber(entry.amount)}`,
      'Delete',
      true
    );
    if (!confirmed) return;

    try {
      if (state.supabase) {
        const { error } = await state.supabase
          .from(CONFIG.SUPABASE_TABLE || 'loan_entries')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      state.entries.splice(idx, 1);
      saveLocalEntries(state.entries);
      renderCategoryTabs();
      renderDashboard();
      renderEntries();
      showToast('Entry deleted', 'The loan record was removed successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Delete failed', 'Could not delete the entry. Please try again.', 'error');
    }
  }

  function validateForm(data) {
    if (!data.personName.trim()) return 'Person name is required.';
    if (!Number.isFinite(data.amount) || data.amount <= 0) return 'Amount must be a valid number greater than zero.';
    if (!data.currency) return 'Currency is required.';
    if (!data.entryDate) return 'Date is required.';
    if (Number.isNaN(Date.parse(data.entryDate))) return 'Please enter a valid date.';
    if (!data.status) return 'Status is required.';
    if (data.partialAmount < 0) return 'Partial amount cannot be negative.';
    if (data.status === 'partial' && data.partialAmount <= 0) return 'Partial entries need a partial amount.';
    if (data.partialAmount > data.amount) return 'Partial amount cannot exceed the total amount.';
    return '';
  }

  function formDataFromUI() {
    const amount = parseAmount(els.amount.value);
    const partialAmount = els.partialAmount.value === '' ? 0 : parseAmount(els.partialAmount.value);
    return {
      id: els.entryId.value || makeId(),
      category: state.activeCategory,
      personName: els.personName.value.trim(),
      amount,
      currency: els.currency.value,
      entryDate: els.entryDate.value,
      status: els.status.value,
      partialAmount: Number.isFinite(partialAmount) ? partialAmount : 0,
      partialNote: els.partialNote.value.trim(),
      notes: els.notes.value.trim(),
      createdAt: state.editId ? (state.entries.find(e => e.id === state.editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const data = formDataFromUI();
    const validationError = validateForm(data);

    if (validationError) {
      showToast('Check the form', validationError, 'warning');
      return;
    }

    const entry = calculateEntry(data);
    const mode = state.editId ? 'update' : 'create';

    try {
      await persistEntry(entry, mode);
      renderCategoryTabs();
      renderDashboard();
      renderEntries();
      resetForm();
      showToast(mode === 'update' ? 'Entry updated' : 'Entry saved', 'The loan record is now stored safely.', 'success');
    } catch (error) {
      console.error(error);
      state.entries = getLocalEntries();
      saveLocalEntries(state.entries);
      renderCategoryTabs();
      renderDashboard();
      renderEntries();
      showToast('Saved locally', 'Supabase could not be reached, so the entry was saved in local storage.', 'warning');
      resetForm();
    }
  }

  async function handleCardAction(event) {
    const button = event.target.closest('button[data-action]');
    const card = event.target.closest('.entry-card');
    if (!button || !card) return;
    const entry = state.entries.find(item => item.id === card.dataset.id);
    if (!entry) return;

    if (button.dataset.action === 'edit') {
      setEditMode(entry);
      setView('new');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (button.dataset.action === 'partial') {
      setEditMode({
        ...entry,
        status: 'partial',
        partialAmount: entry.partialAmount || Math.max(Number(entry.amount) * 0.5, 0),
        partialNote: entry.partialNote || 'Partial settlement recorded'
      });
      els.status.value = 'partial';
      setView('new');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (button.dataset.action === 'delete') {
      await deleteEntry(entry.id);
    }
  }

  async function unlockApp(password) {
    const clean = String(password || '').trim();
    if (!clean) {
      els.gateError.textContent = 'Enter the password to continue.';
      return;
    }
    const encoded = new TextEncoder().encode(`${CONFIG.PASSWORD_SALT || ''}:${clean}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== CONFIG.PASSWORD_HASH) {
      els.gateError.textContent = 'Incorrect password.';
      els.gatePassword.value = '';
      els.gatePassword.focus();
      return;
    }

    sessionStorage.setItem(STORAGE_KEYS.unlocked, '1');
    els.gateOverlay.classList.add('hidden');
    els.appShell.classList.remove('hidden');
    await loadEntries();
    showToast('Welcome back', 'Your ledger is unlocked.', 'success');
  }

  async function verifySessionLock() {
    if (sessionStorage.getItem(STORAGE_KEYS.unlocked) === '1') {
      els.gateOverlay.classList.add('hidden');
      els.appShell.classList.remove('hidden');
      await loadEntries();
      return true;
    }
    els.gateOverlay.classList.remove('hidden');
    els.appShell.classList.add('hidden');
    setTimeout(() => els.gatePassword.focus(), 80);
    return false;
  }

  function applyFiltersFromInputs() {
    state.filters.search = els.searchInput.value.trim();
    state.filters.currency = els.filterCurrency.value;
    state.filters.status = els.filterStatus.value;
    state.filters.from = els.filterFrom.value;
    state.filters.to = els.filterTo.value;
    state.sortBy = els.sortBy.value;
    renderEntries();
  }

  function clearFilters() {
    els.searchInput.value = '';
    els.filterCurrency.value = 'all';
    els.filterStatus.value = 'all';
    els.filterFrom.value = '';
    els.filterTo.value = '';
    els.sortBy.value = 'newest';
    state.filters = { search: '', currency: 'all', status: 'all', from: '', to: '' };
    state.sortBy = 'newest';
    renderEntries();
  }

  function exportCSV() {
    const rows = filteredEntries().map(entry => ({
      id: entry.id,
      category: getCategory(entry.category).label,
      person_name: entry.personName,
      amount: entry.amount,
      currency: entry.currency,
      date: entry.entryDate,
      status: entry.effectiveStatus,
      partial_amount: entry.partialAmount,
      partial_note: entry.partialNote || '',
      remaining_balance: entry.remainingBalance,
      notes: entry.notes || ''
    }));

    const headers = Object.keys(rows[0] || {
      id: '', category: '', person_name: '', amount: '', currency: '', date: '', status: '', partial_amount: '', partial_note: '', remaining_balance: '', notes: ''
    });
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(key => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-ledger-${state.activeCategory}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'Downloaded the current filtered entries.', 'success');
  }

  function exportJSON() {
    const payload = {
      app: CONFIG.APP_NAME || 'Loan Ledger',
      exportedAt: new Date().toISOString(),
      entries: state.entries
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-ledger-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported', 'A full JSON backup was downloaded.', 'success');
  }

  function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
    if (!lines.length) return [];
    const parseLine = (line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"' && inQuotes && next === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current);
      return values.map(v => v.trim());
    };
    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1).map(line => {
      const cells = parseLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = (cells[index] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"');
      });
      return row;
    });
  }

  async function importJSONFile(file) {
    if (!file) return;
    const text = await file.text();
    let incoming = null;

    if ((file.name || '').toLowerCase().endsWith('.csv') || (file.type || '').includes('csv')) {
      incoming = parseCSV(text);
    } else {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        showToast('Import failed', 'Please choose a valid JSON or CSV backup file.', 'error');
        return;
      }
      incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : null;
    }

    if (!incoming) {
      showToast('Import failed', 'The backup file does not contain a valid entries array.', 'error');
      return;
    }

    const cleanEntries = incoming
      .map(item => calculateEntry({
        id: item.id || makeId(),
        category: item.category || state.activeCategory,
        personName: item.personName || item.person_name || '',
        amount: Number(item.amount || 0),
        currency: item.currency || 'AED',
        entryDate: toDateOnly(item.entryDate || item.entry_date || new Date().toISOString()),
        status: item.status || 'open',
        partialAmount: Number(item.partialAmount ?? item.partial_amount ?? 0),
        partialNote: item.partialNote ?? item.partial_note ?? '',
        notes: item.notes ?? '',
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        updatedAt: item.updatedAt || item.updated_at || new Date().toISOString()
      }))
      .filter(entry => entry.personName && Number.isFinite(entry.amount));

    if (!cleanEntries.length) {
      showToast('Import failed', 'No usable entries were found in the backup.', 'error');
      return;
    }

    const byId = new Map(state.entries.map(entry => [entry.id, entry]));
    for (const entry of cleanEntries) byId.set(entry.id, entry);
    state.entries = [...byId.values()];
    saveLocalEntries(state.entries);

    if (state.supabase) {
      try {
        const { error } = await state.supabase.from(CONFIG.SUPABASE_TABLE || 'loan_entries').upsert(cleanEntries.map(getDbRow), { onConflict: 'id' });
        if (error) throw error;
        setSyncState('Synced to Supabase', 'good');
      } catch (error) {
        console.warn('Import synced locally only', error);
        setSyncState('Local fallback');
      }
    }

    renderCategoryTabs();
    renderDashboard();
    renderEntries();
    showToast('Backup imported', `${cleanEntries.length} entries merged into the ledger.`, 'success');
  }

  function wireEvents() {
    els.gateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await unlockApp(els.gatePassword.value);
    });

    els.gateClear.addEventListener('click', () => {
      els.gatePassword.value = '';
      els.gateError.textContent = '';
      els.gatePassword.focus();
    });

    els.confirmCancel.addEventListener('click', () => closeConfirm(false));
    els.confirmAccept.addEventListener('click', () => closeConfirm(true));
    els.confirmOverlay.addEventListener('click', (e) => {
      if (e.target === els.confirmOverlay) closeConfirm(false);
    });

    els.refreshButton.addEventListener('click', loadEntries);
    els.exportCsvButton.addEventListener('click', exportCSV);
    els.exportJsonButton.addEventListener('click', exportJSON);
    els.importButton.addEventListener('click', () => els.importInput.click());
    els.printButton.addEventListener('click', () => window.print());
    els.importInput.addEventListener('change', async () => {
      const file = els.importInput.files?.[0];
      await importJSONFile(file);
      els.importInput.value = '';
    });

    els.entryForm.addEventListener('submit', handleSubmit);
    els.cancelEditButton.addEventListener('click', () => {
      state.editId = null;
      els.editBanner.classList.add('hidden');
      resetForm();
      showToast('Edit cancelled', 'The form has been reset.', 'warning');
    });

    els.resetDraftButton.addEventListener('click', () => {
      resetForm();
      clearDraft();
      showToast('Draft cleared', 'The form was reset to a clean state.', 'success');
    });

    document.querySelectorAll('#viewTabs .segment').forEach(btn => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    document.addEventListener('click', (event) => {
      const catBtn = event.target.closest('#categoryTabs .segment');
      if (catBtn?.dataset?.category) setCategory(catBtn.dataset.category);

      const actionBtn = event.target.closest('.entry-card button[data-action]');
      if (actionBtn) handleCardAction(event);
    });

    [
      els.searchInput, els.filterCurrency, els.filterStatus,
      els.filterFrom, els.filterTo, els.sortBy
    ].forEach(input => input.addEventListener('input', applyFiltersFromInputs));

    els.clearFiltersButton.addEventListener('click', clearFilters);

    [
      els.personName, els.amount, els.currency, els.entryDate, els.status,
      els.partialAmount, els.partialNote, els.notes
    ].forEach(input => {
      input.addEventListener('input', () => {
        saveDraft();
      });
      input.addEventListener('change', () => {
        saveDraft();
      });
    });

    window.addEventListener('beforeunload', () => {
      saveDraft();
    });
  }

  function initDefaults() {
    els.currency.value = 'AED';
    els.status.value = 'open';
    els.entryDate.value = new Date().toISOString().slice(0, 10);
    els.filterStatus.value = 'all';
    els.filterCurrency.value = 'all';
    els.sortBy.value = 'newest';
  }

  async function boot() {
    cacheElements();
    initDefaults();
    renderCategoryTabs();
    setCategory(state.activeCategory);
    setView('new');
    wireEvents();

    if (!(await verifySessionLock())) {
      return;
    }

    const current = getLocalEntries();
    state.entries = current;
    renderCategoryTabs();
    renderDashboard();
    renderEntries();
  }

  boot().catch(err => {
    console.error(err);
    showToast('App error', 'Something went wrong while starting the app.', 'error');
  });
})();
