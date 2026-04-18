/* ============================================================
   NSFChat · app.js — Full rewrite
   Goals:
   - fix refresh/session restore hang
   - live realtime messages
   - reliable 1:1 chat creation
   - status / presence updates
   - delivered / seen ticks
   - smoother WhatsApp-like behavior
   ============================================================ */

'use strict';

// ════════════════════════════════════════════════════════════
// 1. CONFIG & SUPABASE INIT
// ════════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://ddgqamzhwzzrvjylkiqb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZ3FhbXpod3p6cnZqeWxraXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc0NTgsImV4cCI6MjA5MTk5MzQ1OH0.RjL4BBe3y-nH-scSSbsAlnEmWZWnn51f79ROCv7Y8ZU';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ════════════════════════════════════════════════════════════
// 2. STATE
// ════════════════════════════════════════════════════════════
const STATE = {
  user: null,
  profile: null,
  conversations: [],
  currentConvId: null,
  currentConvPeer: null,
  messages: [],

  msgSubscription: null,
  convSubscription: null,
  profileSubscription: null,

  presenceTimer: null,
  seenTimer: null,
  booted: false,
  bootPromise: null,

  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingTimer: null,
  recordingSeconds: 0,
  recordedBlob: null,
  recordedDuration: 0,

  pendingImageFile: null,
  pendingImageUrl: null,

  sidebarOpen: false,
  setupAvatarFile: null,
  profileAvatarFile: null,
};

// ════════════════════════════════════════════════════════════
// 3. ICONS
// ════════════════════════════════════════════════════════════
const icons = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22 11 13 2 9l20-7z"></path></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
};

// ════════════════════════════════════════════════════════════
// 4. UTILITIES
// ════════════════════════════════════════════════════════════
const qs = (sel, parent = document) => parent.querySelector(sel);
const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];

function escHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function showScreen(id) {
  ['loading-screen', 'auth-screen', 'profile-setup-screen', 'app-screen'].forEach(screenId => {
    const el = qs(`#${screenId}`);
    if (el) el.classList.toggle('hidden', screenId !== id);
  });
}

function toast(message, type = 'info', dur = 3200) {
  const wrap = qs('#toast-container');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ico = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span class="toast-icon">${ico}</span><span>${escHtml(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, dur);
}

function setLoading(btn, loading, label = '') {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn._orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-sm"></span>${label ? ` ${escHtml(label)}` : ''}`;
  } else {
    btn.innerHTML = btn._orig || label;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const diff = Math.floor((now - d) / 86400000);
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDateSep(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function lastSeenText(profile) {
  if (!profile) return '';
  if (profile.is_online) return 'Online';
  if (!profile.last_seen) return profile.status_text || '';
  const d = new Date(profile.last_seen);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'Last seen just now';
  if (diff < 60) return `Last seen ${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

function generateVoiceBars() {
  const heights = [40, 60, 80, 50, 90, 70, 55, 85, 65, 45, 75, 60, 80, 50, 70];
  return heights.map(h => `<div class="voice-bar" style="height:${h}%"></div>`).join('');
}

function avatarHtml(profile, sizeClass = '') {
  if (!profile) return `<div class="avatar ${sizeClass}">?</div>`;
  const label = escHtml(getInitials(profile.display_name || profile.username || '?'));
  if (profile.avatar_url) {
    return `<div class="avatar ${sizeClass}"><img src="${escHtml(profile.avatar_url)}" alt="" onerror="this.parentElement.innerHTML='${label}'"></div>`;
  }
  return `<div class="avatar ${sizeClass}">${label}</div>`;
}

function setSidebarOpen(open) {
  const sidebar = qs('#sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  STATE.sidebarOpen = open;
}

function closeSidebar() {
  if (window.innerWidth <= 768) setSidebarOpen(false);
}

function showSidebar() {
  if (window.innerWidth <= 768) setSidebarOpen(true);
}

function isCurrentUserOnline() {
  return document.visibilityState === 'visible' && navigator.onLine;
}

// ════════════════════════════════════════════════════════════
// 5. SUPABASE HELPERS
// ════════════════════════════════════════════════════════════
async function fetchProfile(userId) {
  if (!userId) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadMyProfile() {
  if (!STATE.user) return null;
  const p = await fetchProfile(STATE.user.id);
  STATE.profile = p;
  return p;
}

async function upsertProfile(fields) {
  if (!STATE.user) throw new Error('Not authenticated');
  const payload = {
    id: STATE.user.id,
    ...fields,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  STATE.profile = data;
  return data;
}

async function isUsernameAvailable(username) {
  const u = normalizeUsername(username);
  if (!u) return false;
  const { data, error } = await sb.from('profiles').select('id').eq('username', u).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !data || data.id === STATE.user?.id;
}

async function uploadFile(bucket, path, file) {
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function fetchConversations() {
  if (!STATE.user) return [];

  const { data: memberRows, error: memberError } = await sb.from('conversation_members')
    .select('conversation_id')
    .eq('user_id', STATE.user.id);
  if (memberError) throw memberError;
  if (!memberRows?.length) return [];

  const convIds = memberRows.map(r => r.conversation_id);

  const { data: convs, error: convError } = await sb.from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_message_at', { ascending: false });
  if (convError) throw convError;
  if (!convs?.length) return [];

  const enriched = await Promise.all(convs.map(async conv => {
    const { data: members, error: memError } = await sb.from('conversation_members').select('user_id').eq('conversation_id', conv.id);
    if (memError) throw memError;
    const otherIds = (members || []).map(m => m.user_id).filter(id => id !== STATE.user.id);
    const peerProfile = otherIds.length ? await fetchProfile(otherIds[0]) : null;
    return { ...conv, peerProfile };
  }));

  return enriched;
}

async function fetchMessages(convId) {
  const { data, error } = await sb.from('messages')
    .select('*, sender:profiles!sender_id(id,display_name,username,avatar_url,status_text,is_online,last_seen)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return data || [];
}

async function sendMessage({ convId, content, contentType = 'text', fileUrl = null, metadata = {} }) {
  const { data, error } = await sb.from('messages')
    .insert({
      conversation_id: convId,
      sender_id: STATE.user.id,
      content,
      content_type: contentType,
      file_url: fileUrl,
      metadata,
    })
    .select('*, sender:profiles!sender_id(id,display_name,username,avatar_url,status_text,is_online,last_seen)')
    .single();
  if (error) throw error;
  return data;
}

async function createDirectConversation(peerId) {
  const { data, error } = await sb.rpc('create_direct_conversation', { peer_id: peerId });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function markConversationDelivered(convId) {
  if (!convId) return 0;
  const { data, error } = await sb.rpc('mark_conversation_messages_delivered', { p_conversation_id: convId });
  if (error) throw error;
  return data || 0;
}

async function markConversationSeen(convId) {
  if (!convId) return 0;
  const { data, error } = await sb.rpc('mark_conversation_messages_seen', { p_conversation_id: convId });
  if (error) throw error;
  return data || 0;
}

async function touchPresence(statusText = null) {
  if (!STATE.user) return null;
  try {
    const { data, error } = await sb.rpc('touch_my_presence', { p_status_text: statusText });
    if (error) throw error;
    if (data) STATE.profile = data;
    return data || null;
  } catch (e) {
    console.warn('Presence update failed:', e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// 6. AUTH UI
// ════════════════════════════════════════════════════════════
function renderAuthScreen() {
  qs('#auth-screen').innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo-row">
          <img src="assets/logo.svg" alt="NSFChat logo">
          <span class="auth-wordmark">NSFChat</span>
        </div>
        <p class="auth-tagline">Secure, real-time messaging</p>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-signin" onclick="switchAuthTab('signin')">Sign In</button>
        <button class="auth-tab" id="tab-signup" onclick="switchAuthTab('signup')">Create Account</button>
      </div>

      <div id="auth-alert"></div>

      <div id="signin-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="signin-email" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="signin-password" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary" id="signin-btn" onclick="handleSignIn()">Sign In</button>
        <div style="text-align:center;margin-top:12px">
          <button class="btn-ghost btn" onclick="showForgotPassword()">Forgot password?</button>
        </div>
      </div>

      <div id="signup-form" class="hidden">
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" id="signup-name" placeholder="Your full name" autocomplete="name">
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" id="signup-username" placeholder="e.g. johndoe" autocomplete="username" oninput="checkUsernameAuth(this.value)">
          <span class="input-status" id="signup-username-status"></span>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="signup-email" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="signup-password" placeholder="Min 6 characters" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" id="signup-btn" onclick="handleSignUp()">Create Account</button>
      </div>

      <div id="forgot-form" class="hidden">
        <p style="font-size:14px;color:var(--text-2);margin-bottom:16px">Enter your email and we'll send you a reset link.</p>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="forgot-email" placeholder="you@example.com">
        </div>
        <button class="btn btn-primary" id="forgot-btn" onclick="handleForgotPassword()">Send Reset Link</button>
        <div style="text-align:center;margin-top:12px">
          <button class="btn-ghost btn" onclick="switchAuthTab('signin')">← Back to Sign In</button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    qs('#signin-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignIn(); });
    qs('#signup-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUp(); });
    qs('#forgot-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
  }, 0);
}

function switchAuthTab(tab) {
  qs('#tab-signin')?.classList.toggle('active', tab === 'signin');
  qs('#tab-signup')?.classList.toggle('active', tab === 'signup');
  qs('#signin-form')?.classList.toggle('hidden', tab !== 'signin');
  qs('#signup-form')?.classList.toggle('hidden', tab !== 'signup');
  qs('#forgot-form')?.classList.toggle('hidden', tab !== 'forgot');
  qs('#auth-alert').innerHTML = '';
}

function showForgotPassword() {
  qs('#signin-form')?.classList.add('hidden');
  qs('#signup-form')?.classList.add('hidden');
  qs('#forgot-form')?.classList.remove('hidden');
  qs('#tab-signin')?.classList.remove('active');
  qs('#tab-signup')?.classList.remove('active');
  qs('#auth-alert').innerHTML = '';
}

function showAuthAlert(msg, type = 'error') {
  qs('#auth-alert').innerHTML = `<div class="alert alert-${type}"><span>${escHtml(msg)}</span></div>`;
}

const checkUsernameAuth = debounce(async value => {
  const el = qs('#signup-username-status');
  if (!el) return;
  const v = normalizeUsername(value);

  if (!v || v.length < 3) {
    el.textContent = v.length ? 'Min 3 characters' : '';
    el.className = 'input-status err';
    return;
  }
  if (!/^[a-z0-9_]+$/.test(v)) {
    el.textContent = 'Letters, numbers, underscore only';
    el.className = 'input-status err';
    return;
  }

  el.textContent = 'Checking…';
  el.className = 'input-status';

  try {
    const avail = await isUsernameAvailable(v);
    el.textContent = avail ? '✓ Available' : '✕ Taken';
    el.className = `input-status ${avail ? 'ok' : 'err'}`;
  } catch {
    el.textContent = 'Unable to check';
    el.className = 'input-status err';
  }
}, 450);

async function handleSignIn() {
  const email = qs('#signin-email')?.value.trim();
  const password = qs('#signin-password')?.value;
  if (!email || !password) return showAuthAlert('Please fill in all fields.');

  const btn = qs('#signin-btn');
  setLoading(btn, true, 'Signing in…');
  qs('#auth-alert').innerHTML = '';

  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (e) {
    showAuthAlert(e.message || 'Sign in failed.');
    setLoading(btn, false);
    btn.innerHTML = 'Sign In';
  }
}

async function handleSignUp() {
  const name = qs('#signup-name')?.value.trim();
  const username = normalizeUsername(qs('#signup-username')?.value);
  const email = qs('#signup-email')?.value.trim();
  const password = qs('#signup-password')?.value;

  if (!name || !username || !email || !password) return showAuthAlert('Please fill in all fields.');
  if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) return showAuthAlert('Username must be at least 3 chars (letters, numbers, underscore).');
  if (password.length < 6) return showAuthAlert('Password must be at least 6 characters.');

  const btn = qs('#signup-btn');
  setLoading(btn, true, 'Creating account…');
  qs('#auth-alert').innerHTML = '';

  try {
    const avail = await isUsernameAvailable(username);
    if (!avail) {
      showAuthAlert('Username is already taken. Please choose another.');
      setLoading(btn, false);
      btn.innerHTML = 'Create Account';
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, username } },
    });
    if (error) throw error;

    if (data?.user && data?.session) {
      STATE.user = data.user;
      await upsertProfile({
        display_name: name,
        username,
        status_text: 'Available',
        is_online: true,
        last_seen: new Date().toISOString(),
      });
      await touchPresence('Available');
      bootToApp();
    } else {
      showAuthAlert('Check your email to confirm your account, then sign in.', 'success');
      setLoading(btn, false);
      btn.innerHTML = 'Create Account';
    }
  } catch (e) {
    showAuthAlert(e.message || 'Sign up failed.');
    setLoading(btn, false);
    btn.innerHTML = 'Create Account';
  }
}

async function handleForgotPassword() {
  const email = qs('#forgot-email')?.value.trim();
  if (!email) return showAuthAlert('Please enter your email.');

  const btn = qs('#forgot-btn');
  setLoading(btn, true, 'Sending…');
  qs('#auth-alert').innerHTML = '';

  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
    showAuthAlert('Reset link sent! Check your email.', 'success');
    setLoading(btn, false);
    btn.innerHTML = 'Send Reset Link';
  } catch (e) {
    showAuthAlert(e.message || 'Failed to send reset link.');
    setLoading(btn, false);
    btn.innerHTML = 'Send Reset Link';
  }
}

async function handleSignOut() {
  closeNewChatModal();
  closeProfileModal();
  closeLightbox();

  try {
    await touchPresence(STATE.profile?.status_text || 'Away');
  } catch {}

  await sb.auth.signOut();

  STATE.user = null;
  STATE.profile = null;
  STATE.conversations = [];
  STATE.currentConvId = null;
  STATE.currentConvPeer = null;
  STATE.messages = [];
  STATE.pendingImageFile = null;
  STATE.pendingImageUrl = null;
  STATE.recordedBlob = null;
  STATE.recordedDuration = 0;
  STATE.isRecording = false;
  STATE.sidebarOpen = false;

  unsubscribeAll();
  showScreen('auth-screen');
  renderAuthScreen();
}

// ════════════════════════════════════════════════════════════
// 7. PROFILE SETUP
// ════════════════════════════════════════════════════════════
function needsProfileSetup() {
  return !STATE.profile || !STATE.profile.username;
}

function renderProfileSetup() {
  const p = STATE.profile || {};
  const fallbackName = p.display_name || STATE.user?.user_metadata?.display_name || '';
  const fallbackUsername = p.username || STATE.user?.user_metadata?.username || '';

  qs('#profile-setup-screen').innerHTML = `
    <div class="profile-setup-card">
      <div class="profile-setup-header">
        <div class="profile-setup-step">Step 1 of 1 · Welcome</div>
        <div class="profile-setup-title">Set up your profile</div>
        <div class="profile-setup-subtitle">Tell others a bit about yourself</div>
      </div>

      <div class="profile-avatar-section">
        <div class="avatar-edit-wrap" onclick="qs('#setup-avatar-input').click()">
          <div class="avatar xl" id="setup-avatar-preview">${escHtml(getInitials(fallbackName || STATE.user?.email || '?'))}</div>
          <div class="avatar-edit-overlay">${icons.camera}</div>
        </div>
        <span style="font-size:13px;color:var(--text-2)">Click to upload photo</span>
        <input type="file" id="setup-avatar-input" accept="image/*" class="hidden" onchange="previewSetupAvatar(this)">
      </div>

      <div id="setup-alert"></div>

      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input type="text" class="form-input" id="setup-name" value="${escHtml(fallbackName)}" placeholder="Your full name">
      </div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" class="form-input" id="setup-username" value="${escHtml(fallbackUsername)}" placeholder="unique handle" oninput="checkUsernameSetup(this.value)">
        <span class="input-status" id="setup-username-status"></span>
      </div>
      <div class="form-group">
        <label class="form-label">Nationality</label>
        <input type="text" class="form-input" id="setup-nationality" value="${escHtml(p.nationality || '')}" placeholder="e.g. American, British, Japanese">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <input type="text" class="form-input" id="setup-status" value="${escHtml(p.status_text || 'Available')}" placeholder="Available">
      </div>
      <div class="form-group">
        <label class="form-label">Bio <span style="color:var(--text-3)">(optional)</span></label>
        <textarea class="form-input" id="setup-bio" placeholder="A short bio...">${escHtml(p.bio || '')}</textarea>
      </div>
      <button class="btn btn-primary" id="setup-save-btn" onclick="saveProfileSetup()">Complete Setup</button>
    </div>
  `;
}

function previewSetupAvatar(input) {
  const file = input.files?.[0];
  if (!file) return;
  STATE.setupAvatarFile = file;
  qs('#setup-avatar-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="preview">`;
}

const checkUsernameSetup = debounce(async value => {
  const el = qs('#setup-username-status');
  if (!el) return;
  const v = normalizeUsername(value);

  if (!v || v.length < 3) {
    el.textContent = v.length ? 'Min 3 characters' : '';
    el.className = 'input-status err';
    return;
  }
  if (!/^[a-z0-9_]+$/.test(v)) {
    el.textContent = 'Letters, numbers, underscore only';
    el.className = 'input-status err';
    return;
  }

  el.textContent = 'Checking…';
  el.className = 'input-status';

  try {
    const avail = await isUsernameAvailable(v);
    el.textContent = avail ? '✓ Available' : '✕ Taken';
    el.className = `input-status ${avail ? 'ok' : 'err'}`;
  } catch {
    el.textContent = 'Unable to check';
    el.className = 'input-status err';
  }
}, 450);

async function saveProfileSetup() {
  const name = qs('#setup-name')?.value.trim();
  const username = normalizeUsername(qs('#setup-username')?.value);
  const nationality = qs('#setup-nationality')?.value.trim();
  const statusText = qs('#setup-status')?.value.trim() || 'Available';
  const bio = qs('#setup-bio')?.value.trim();

  if (!name || !username) {
    qs('#setup-alert').innerHTML = `<div class="alert alert-error">Display name and username are required.</div>`;
    return;
  }
  if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
    qs('#setup-alert').innerHTML = `<div class="alert alert-error">Invalid username format.</div>`;
    return;
  }

  const btn = qs('#setup-save-btn');
  setLoading(btn, true, 'Saving…');

  try {
    const avail = await isUsernameAvailable(username);
    if (!avail) {
      qs('#setup-alert').innerHTML = `<div class="alert alert-error">Username taken. Choose another.</div>`;
      setLoading(btn, false);
      btn.innerHTML = 'Complete Setup';
      return;
    }

    let avatar_url = STATE.profile?.avatar_url || null;
    if (STATE.setupAvatarFile) {
      const ext = STATE.setupAvatarFile.name.split('.').pop() || 'png';
      avatar_url = await uploadFile('avatars', `${STATE.user.id}/avatar.${ext}`, STATE.setupAvatarFile);
    }

    await upsertProfile({
      display_name: name,
      username,
      nationality,
      bio,
      avatar_url,
      status_text: statusText || 'Available',
      is_online: true,
      last_seen: new Date().toISOString(),
    });

    await touchPresence(statusText || 'Available');
    bootToApp();
  } catch (e) {
    qs('#setup-alert').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    setLoading(btn, false);
    btn.innerHTML = 'Complete Setup';
  }
}

// ════════════════════════════════════════════════════════════
// 8. MAIN APP
// ════════════════════════════════════════════════════════════
function bootToApp() {
  STATE.booted = true;
  showScreen('app-screen');
  renderSidebar();
  renderWelcomeScreen();
  loadAndRenderConversations();
  subscribeToConversations();
  subscribeToProfiles();
  startPresenceLoop();
}

function renderSidebar() {
  const p = STATE.profile || {};
  qs('#sidebar').innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <img src="assets/logo.svg" alt="NSFChat">
        <span class="sidebar-logo-text">NSFChat</span>
      </div>
      <div class="sidebar-actions">
        <button class="btn-icon" title="New Chat" onclick="openNewChatModal()">${icons.plus}</button>
        <button class="btn-icon" title="Profile" onclick="openProfileModal()">${icons.edit}</button>
      </div>
    </div>

    <div class="search-wrap">
      <div class="search-input-wrap">
        ${icons.search}
        <input type="search" class="search-input" id="conv-search" placeholder="Search conversations…" oninput="filterConversations(this.value)">
      </div>
    </div>

    <div class="sidebar-section-label">Messages</div>
    <div id="chat-list"><div class="loading-inline"><span class="spinner-sm"></span> Loading…</div></div>

    <div class="sidebar-profile" onclick="openProfileModal()">
      ${avatarHtml(p, 'sm')}
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name truncate">${escHtml(p.display_name || 'You')}</div>
        <div class="sidebar-profile-username">@${escHtml(p.username || '…')}</div>
        <div class="sidebar-profile-username">${escHtml(p.status_text || 'Available')}</div>
      </div>
      <button class="btn-icon sm danger" title="Sign Out" onclick="event.stopPropagation();handleSignOut()">${icons.logout}</button>
    </div>
  `;
}

function renderWelcomeScreen() {
  qs('#main-content').innerHTML = `
    <div id="welcome-screen">
      <img src="assets/logo.svg" alt="NSFChat" class="welcome-logo">
      <div class="welcome-title">Welcome to NSFChat</div>
      <div class="welcome-subtitle">Select a conversation or start a new one</div>
    </div>
  `;
}

async function loadAndRenderConversations() {
  try {
    STATE.conversations = await fetchConversations();
    renderConversationList(STATE.conversations);
    syncCurrentConversationMeta();
  } catch (e) {
    qs('#chat-list').innerHTML = `<div class="empty-state"><p>Failed to load chats</p></div>`;
    console.warn('loadAndRenderConversations failed:', e);
  }
}

function syncCurrentConversationMeta() {
  if (!STATE.currentConvId) return;
  const conv = STATE.conversations.find(c => c.id === STATE.currentConvId);
  if (!conv) return;
  STATE.currentConvPeer = conv.peerProfile || STATE.currentConvPeer;
  updateConversationHeader();
}

function renderConversationList(convs) {
  const list = qs('#chat-list');
  if (!list) return;

  if (!convs?.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icons.chat}</div>
        <p>No conversations yet</p>
        <p style="font-size:12px">Tap + to start chatting</p>
      </div>
    `;
    return;
  }

  list.innerHTML = convs.map(conv => {
    const peer = conv.peerProfile;
    const name = peer?.display_name || peer?.username || 'Unknown';
    const preview = conv.last_message_preview || 'Start a conversation';
    const time = conv.last_message_at ? formatMsgTime(conv.last_message_at) : '';
    const isActive = conv.id === STATE.currentConvId;

    return `
      <div class="chat-item ${isActive ? 'active' : ''}" onclick="openConversation('${escHtml(conv.id)}')">
        <div class="avatar-wrap">${avatarHtml(peer)}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${escHtml(name)}</div>
          <div class="chat-item-preview">${escHtml(preview)}</div>
        </div>
        <div class="chat-item-meta">
          <span class="chat-item-time">${escHtml(time)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterConversations(query) {
  const q = String(query || '').toLowerCase().trim();
  const filtered = !q ? STATE.conversations : STATE.conversations.filter(c => {
    const peer = c.peerProfile;
    const name = `${peer?.display_name || ''} ${peer?.username || ''} ${peer?.status_text || ''}`.toLowerCase();
    return name.includes(q);
  });
  renderConversationList(filtered);
}

// ════════════════════════════════════════════════════════════
// 9. CONVERSATION SCREEN
// ════════════════════════════════════════════════════════════
async function openConversation(convId) {
  if (!convId) return;
  if (STATE.currentConvId === convId) {
    closeSidebar();
    return;
  }

  STATE.currentConvId = convId;
  STATE.pendingImageFile = null;
  STATE.pendingImageUrl = null;
  STATE.recordedBlob = null;
  STATE.recordedDuration = 0;
  STATE.messages = [];

  unsubscribeMessages();

  const conv = STATE.conversations.find(c => c.id === convId);
  STATE.currentConvPeer = conv?.peerProfile || null;

  qsa('.chat-item').forEach(el => el.classList.remove('active'));
  renderConversationScreen();
  closeSidebar();

  try {
    const msgs = await fetchMessages(convId);
    STATE.messages = msgs;
    renderMessages(msgs);
    scrollToBottom();
    subscribeToMessages(convId);
    await markConversationDelivered(convId);
    await markConversationSeen(convId);
    await loadAndRenderConversations();
    await touchPresence(STATE.profile?.status_text || 'Available');
  } catch (e) {
    toast('Failed to load messages', 'error');
    console.warn('openConversation failed:', e);
  }
}

function renderConversationScreen() {
  const peer = STATE.currentConvPeer;
  const name = peer?.display_name || peer?.username || 'Chat';
  const statusLine = peer ? (peer.is_online ? 'Online' : (peer.status_text || lastSeenText(peer))) : '';

  qs('#main-content').innerHTML = `
    <div id="conversation-screen">
      <div class="conv-header">
        <button class="conv-back-btn" onclick="showSidebar()">${icons.back}</button>
        <div class="avatar-wrap" id="conv-peer-avatar-wrap">
          ${avatarHtml(peer, 'sm')}
          <div class="online-dot" id="peer-online-dot" style="display:${peer?.is_online ? 'block' : 'none'}"></div>
        </div>
        <div class="conv-header-info">
          <div class="conv-header-name" id="conv-header-name">${escHtml(name)}</div>
          <div class="conv-header-status" id="conv-status">${escHtml(statusLine || '')}</div>
        </div>
      </div>

      <div id="messages-area">
        <div class="loading-inline" style="justify-content:center"><span class="spinner-sm"></span></div>
      </div>

      <div class="msg-input-area">
        <div id="recording-indicator" class="hidden recording-indicator">
          <div class="recording-dot"></div>
          <span class="recording-time" id="rec-time">0:00</span>
          <span class="recording-label">Recording voice message…</span>
          <button class="stop-recording-btn" onclick="stopRecording()">Stop</button>
        </div>

        <div id="voice-preview" class="voice-preview hidden">
          <div class="voice-play-btn" onclick="previewRecording()" id="preview-play-btn">${icons.play}</div>
          <div class="voice-preview-info">Voice message ready · <span id="voice-preview-dur">0:00</span></div>
          <button class="btn-icon sm danger" onclick="discardRecording()" title="Discard">${icons.trash}</button>
        </div>

        <div id="attachment-preview" class="attachment-preview hidden"></div>

        <div class="msg-input-row">
          <textarea class="msg-text-input" id="msg-input" rows="1" placeholder="Message…" oninput="autoResizeTextarea(this)" onkeydown="handleMsgKeydown(event)"></textarea>
          <div class="input-actions">
            <button class="input-action-btn" title="Image" onclick="qs('#img-file-input').click()">${icons.image}</button>
            <button class="input-action-btn" id="mic-btn" title="Voice message" onclick="toggleRecording()">${icons.mic}</button>
            <button class="send-btn" onclick="handleSend()">${icons.send}</button>
          </div>
        </div>
        <input type="file" id="img-file-input" accept="image/*" class="hidden" onchange="handleImageSelect(this)">
      </div>
    </div>
  `;
}

function updateConversationHeader() {
  const peer = STATE.currentConvPeer;
  if (!peer) return;
  const nameEl = qs('#conv-header-name');
  const statusEl = qs('#conv-status');
  const dotEl = qs('#peer-online-dot');
  const avatarWrap = qs('#conv-peer-avatar-wrap');

  if (nameEl) nameEl.textContent = peer.display_name || peer.username || 'Chat';
  if (statusEl) statusEl.textContent = peer.is_online ? 'Online' : (peer.status_text || lastSeenText(peer) || '');
  if (dotEl) dotEl.style.display = peer.is_online ? 'block' : 'none';
  if (avatarWrap) avatarWrap.innerHTML = `${avatarHtml(peer, 'sm')}<div class="online-dot" id="peer-online-dot" style="display:${peer.is_online ? 'block' : 'none'}"></div>`;
}

function renderMessages(msgs) {
  const area = qs('#messages-area');
  if (!area) return;

  if (!msgs?.length) {
    area.innerHTML = `
      <div class="empty-state" style="flex:1">
        <div class="empty-state-icon">💬</div>
        <p>No messages yet</p>
        <p style="font-size:12px">Say hello!</p>
      </div>
    `;
    return;
  }

  let html = '';
  let lastDate = null;
  let lastSenderId = null;

  msgs.forEach(msg => {
    const isMine = msg.sender_id === STATE.user.id;
    const dateKey = new Date(msg.created_at).toDateString();

    if (dateKey !== lastDate) {
      html += `<div class="date-separator">${escHtml(formatDateSep(msg.created_at))}</div>`;
      lastDate = dateKey;
      lastSenderId = null;
    }

    const isNewSender = msg.sender_id !== lastSenderId;
    lastSenderId = msg.sender_id;

    const senderName = !isMine && isNewSender
      ? `<div class="msg-sender-name">${escHtml(msg.sender?.display_name || msg.sender?.username || 'Unknown')}</div>`
      : '';

    html += `
      <div class="msg-group ${isMine ? 'sent' : 'received'}" id="msg-${msg.id}">
        ${senderName}
        <div class="msg-row">
          ${renderMsgBubble(msg, isMine)}
          <span class="msg-time">${escHtml(formatMsgTime(msg.created_at))}</span>
        </div>
      </div>
    `;
  });

  area.innerHTML = html;
}

function messageStatusHtml(msg) {
  if (msg.seen_at) {
    return `<span class="msg-state seen">${icons.check}${icons.check}</span>`;
  }
  if (msg.delivered_at) {
    return `<span class="msg-state delivered">${icons.check}${icons.check}</span>`;
  }
  return `<span class="msg-state sent">${icons.check}</span>`;
}

function renderMsgBubble(msg, isMine) {
  if (msg.content_type === 'image' && msg.file_url) {
    return `
      <div class="msg-image" onclick="openLightbox('${escHtml(msg.file_url)}')">
        <img src="${escHtml(msg.file_url)}" alt="image" loading="lazy">
        ${msg.content ? `<div class="msg-bubble" style="border-radius:0 0 var(--radius-xl) var(--radius-xl);padding:8px 14px;font-size:14px">${escHtml(msg.content)}</div>` : ''}
      </div>
    `;
  }

  if (msg.content_type === 'voice' && msg.file_url) {
    const dur = msg.metadata?.duration || 0;
    return `
      <div class="msg-voice">
        <button class="voice-play-btn" onclick="playVoice('${escHtml(msg.file_url)}', this)">${icons.play}</button>
        <div class="voice-waveform">${generateVoiceBars()}</div>
        <span class="voice-duration">${escHtml(formatDuration(dur))}</span>
      </div>
    `;
  }

  const state = isMine ? `<div class="msg-state-wrap">${messageStatusHtml(msg)}</div>` : '';
  return `
    <div class="msg-bubble">
      ${escHtml(msg.content || '')}
      ${state}
    </div>
  `;
}

function appendOrRefreshMessage(msg) {
  if (!msg || !msg.id) return;
  const existing = qs(`#msg-${msg.id}`);
  if (existing) {
    const msgs = STATE.messages.map(m => m.id === msg.id ? msg : m);
    STATE.messages = msgs;
    renderMessages(msgs);
    scrollToBottom();
    return;
  }

  STATE.messages.push(msg);
  renderMessages(STATE.messages);
  scrollToBottom();
}

function scrollToBottom() {
  const area = qs('#messages-area');
  if (area) area.scrollTop = area.scrollHeight;
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleMsgKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}

// ════════════════════════════════════════════════════════════
// 10. SENDING MESSAGES
// ════════════════════════════════════════════════════════════
async function handleSend() {
  if (!STATE.currentConvId) return;
  const input = qs('#msg-input');
  const text = input?.value.trim();

  if (STATE.recordedBlob) {
    await sendVoiceMessage(STATE.recordedBlob, STATE.recordedDuration);
    STATE.recordedBlob = null;
    STATE.recordedDuration = 0;
    qs('#voice-preview')?.classList.add('hidden');
    return;
  }

  if (STATE.pendingImageFile) {
    await sendImageMessage(STATE.pendingImageFile, text);
    STATE.pendingImageFile = null;
    STATE.pendingImageUrl = null;
    qs('#attachment-preview')?.classList.add('hidden');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    return;
  }

  if (!text) return;
  if (input) {
    input.value = '';
    input.style.height = 'auto';
  }

  try {
    const msg = await sendMessage({ convId: STATE.currentConvId, content: text, contentType: 'text' });
    appendOrRefreshMessage(msg);
    await loadAndRenderConversations();
    await markConversationDelivered(STATE.currentConvId);
    await markConversationSeen(STATE.currentConvId);
  } catch (e) {
    toast('Failed to send message', 'error');
    console.warn('handleSend failed:', e);
  }
}

async function sendImageMessage(file, caption = '') {
  const btn = qs('.send-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-sm" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff"></span>`;
  }

  try {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${STATE.user.id}/${Date.now()}.${ext}`;
    const fileUrl = await uploadFile('chat-images', path, file);
    const msg = await sendMessage({ convId: STATE.currentConvId, content: caption || null, contentType: 'image', fileUrl });
    appendOrRefreshMessage(msg);
    await loadAndRenderConversations();
  } catch (e) {
    toast(`Failed to send image: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = icons.send;
    }
  }
}

async function sendVoiceMessage(blob, duration) {
  const btn = qs('.send-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-sm" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff"></span>`;
  }

  try {
    const path = `${STATE.user.id}/${Date.now()}.webm`;
    const fileUrl = await uploadFile('voice-messages', path, blob);
    const msg = await sendMessage({ convId: STATE.currentConvId, content: null, contentType: 'voice', fileUrl, metadata: { duration } });
    appendOrRefreshMessage(msg);
    await loadAndRenderConversations();
    toast('Voice message sent', 'success');
  } catch (e) {
    toast(`Failed to send voice: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = icons.send;
    }
  }
}

function handleImageSelect(input) {
  const file = input.files?.[0];
  if (!file) return;
  STATE.pendingImageFile = file;
  STATE.pendingImageUrl = URL.createObjectURL(file);

  const preview = qs('#attachment-preview');
  if (preview) {
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="attachment-thumb">
        <img src="${STATE.pendingImageUrl}" alt="preview">
        <span class="attachment-remove" onclick="clearImageAttachment()">✕</span>
      </div>
    `;
  }
  input.value = '';
}

function clearImageAttachment() {
  STATE.pendingImageFile = null;
  STATE.pendingImageUrl = null;
  const preview = qs('#attachment-preview');
  if (preview) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
  }
}

// ════════════════════════════════════════════════════════════
// 11. VOICE RECORDING
// ════════════════════════════════════════════════════════════
async function toggleRecording() {
  if (STATE.isRecording) stopRecording();
  else await startRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.audioChunks = [];
    STATE.mediaRecorder = new MediaRecorder(stream);

    STATE.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) STATE.audioChunks.push(e.data);
    };
    STATE.mediaRecorder.onstop = onRecordingStop;
    STATE.mediaRecorder.start(100);
    STATE.isRecording = true;
    STATE.recordingSeconds = 0;

    const micBtn = qs('#mic-btn');
    if (micBtn) micBtn.style.color = 'var(--danger)';
    qs('#recording-indicator')?.classList.remove('hidden');

    STATE.recordingTimer = setInterval(() => {
      STATE.recordingSeconds++;
      const el = qs('#rec-time');
      if (el) el.textContent = formatDuration(STATE.recordingSeconds);
      if (STATE.recordingSeconds >= 300) stopRecording();
    }, 1000);
  } catch {
    toast('Microphone access denied. Please allow mic access.', 'error');
  }
}

function stopRecording() {
  if (!STATE.mediaRecorder || STATE.mediaRecorder.state === 'inactive') return;
  STATE.mediaRecorder.stop();
  try { STATE.mediaRecorder.stream.getTracks().forEach(t => t.stop()); } catch {}
  clearInterval(STATE.recordingTimer);
  STATE.isRecording = false;
  STATE.recordedDuration = STATE.recordingSeconds;

  const micBtn = qs('#mic-btn');
  if (micBtn) micBtn.style.color = '';
  qs('#recording-indicator')?.classList.add('hidden');
}

function onRecordingStop() {
  const blob = new Blob(STATE.audioChunks, { type: 'audio/webm' });
  STATE.recordedBlob = blob;
  STATE.audioChunks = [];

  const preview = qs('#voice-preview');
  const durEl = qs('#voice-preview-dur');
  if (preview) preview.classList.remove('hidden');
  if (durEl) durEl.textContent = formatDuration(STATE.recordedDuration);
}

let _previewAudio = null;
function previewRecording() {
  if (!STATE.recordedBlob) return;
  const btn = qs('#preview-play-btn');

  if (_previewAudio && !_previewAudio.paused) {
    _previewAudio.pause();
    if (btn) btn.innerHTML = icons.play;
    return;
  }

  const url = URL.createObjectURL(STATE.recordedBlob);
  _previewAudio = new Audio(url);
  _previewAudio.play();
  if (btn) btn.innerHTML = icons.pause;
  _previewAudio.onended = () => { if (btn) btn.innerHTML = icons.play; };
}

function discardRecording() {
  STATE.recordedBlob = null;
  STATE.recordedDuration = 0;
  qs('#voice-preview')?.classList.add('hidden');
  if (_previewAudio) {
    _previewAudio.pause();
    _previewAudio = null;
  }
}

function playVoice(url, btn) {
  if (btn._audio && !btn._audio.paused) {
    btn._audio.pause();
    btn.innerHTML = icons.play;
    return;
  }

  qsa('.voice-play-btn').forEach(b => {
    if (b._audio && !b._audio.paused) {
      b._audio.pause();
      b.innerHTML = icons.play;
    }
  });

  const audio = new Audio(url);
  btn._audio = audio;
  audio.play();
  btn.innerHTML = icons.pause;
  audio.onended = () => { btn.innerHTML = icons.play; };
  audio.onerror = () => {
    btn.innerHTML = icons.play;
    toast('Could not play audio', 'error');
  };
}

// ════════════════════════════════════════════════════════════
// 12. REALTIME
// ════════════════════════════════════════════════════════════
function subscribeToMessages(convId) {
  unsubscribeMessages();
  STATE.msgSubscription = sb.channel(`messages:${convId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${convId}`,
    }, async () => {
      if (STATE.currentConvId !== convId) return;
      try {
        const msgs = await fetchMessages(convId);
        STATE.messages = msgs;
        renderMessages(msgs);
        scrollToBottom();
        await loadAndRenderConversations();
      } catch (e) {
        console.warn('message realtime refresh failed:', e);
      }
    })
    .subscribe();
}

function subscribeToConversations() {
  if (STATE.convSubscription) sb.removeChannel(STATE.convSubscription);
  STATE.convSubscription = sb.channel('user-conversations')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversation_members',
      filter: `user_id=eq.${STATE.user.id}`,
    }, () => loadAndRenderConversations())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
    }, () => loadAndRenderConversations())
    .subscribe();
}

function subscribeToProfiles() {
  if (STATE.profileSubscription) sb.removeChannel(STATE.profileSubscription);
  STATE.profileSubscription = sb.channel('profiles-watch')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles',
    }, async payload => {
      const changed = payload.new || payload.old;
      if (!changed?.id) return;

      if (STATE.user?.id === changed.id) {
        STATE.profile = payload.new || STATE.profile;
        renderSidebar();
      }

      if (STATE.currentConvPeer?.id === changed.id) {
        STATE.currentConvPeer = payload.new || STATE.currentConvPeer;
        updateConversationHeader();
      }

      // if peer list preview should reflect new status / name, refresh conversations lightly
      if (STATE.booted) {
        const activePeer = STATE.currentConvPeer?.id;
        if (activePeer === changed.id) {
          syncCurrentConversationMeta();
        }
      }
    })
    .subscribe();
}

function unsubscribeMessages() {
  if (STATE.msgSubscription) {
    sb.removeChannel(STATE.msgSubscription);
    STATE.msgSubscription = null;
  }
}

function unsubscribeAll() {
  unsubscribeMessages();
  if (STATE.convSubscription) {
    sb.removeChannel(STATE.convSubscription);
    STATE.convSubscription = null;
  }
  if (STATE.profileSubscription) {
    sb.removeChannel(STATE.profileSubscription);
    STATE.profileSubscription = null;
  }
  clearInterval(STATE.presenceTimer);
  clearInterval(STATE.seenTimer);
  STATE.presenceTimer = null;
  STATE.seenTimer = null;
}

function startPresenceLoop() {
  clearInterval(STATE.presenceTimer);
  clearInterval(STATE.seenTimer);

  if (!STATE.user) return;

  // immediately mark presence and keep it alive
  touchPresence(STATE.profile?.status_text || 'Available');

  STATE.presenceTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      touchPresence(STATE.profile?.status_text || 'Available');
    }
  }, 25000);

  STATE.seenTimer = setInterval(() => {
    if (STATE.currentConvId && document.visibilityState === 'visible') {
      markConversationSeen(STATE.currentConvId).catch(() => {});
    }
  }, 12000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      touchPresence(STATE.profile?.status_text || 'Available');
      if (STATE.currentConvId) markConversationSeen(STATE.currentConvId).catch(() => {});
    }
  });
}

// ════════════════════════════════════════════════════════════
// 13. NEW CHAT MODAL
// ════════════════════════════════════════════════════════════
function openNewChatModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'new-chat-overlay';
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <span class="modal-title">Start New Chat</span>
        <button class="modal-close" onclick="closeNewChatModal()">${icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Search Users</label>
          <input type="search" class="form-input" id="user-search-input" placeholder="Search by username or name…" oninput="searchUsers(this.value)" autofocus>
        </div>
        <div id="user-search-results" class="user-search-results">
          <div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div>
        </div>
      </div>
    </div>
  `;
  overlay.onclick = closeNewChatModal;
  document.body.appendChild(overlay);
}

function closeNewChatModal() {
  qs('#new-chat-overlay')?.remove();
}

const searchUsers = debounce(async query => {
  const resultsEl = qs('#user-search-results');
  if (!resultsEl) return;

  const q = String(query || '').trim();
  if (!q) {
    resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div>`;
    return;
  }

  resultsEl.innerHTML = `<div class="loading-inline"><span class="spinner-sm"></span> Searching…</div>`;

  try {
    const { data, error } = await sb.from('profiles')
      .select('id, display_name, username, avatar_url, nationality, status_text, is_online, last_seen')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', STATE.user.id)
      .limit(10);

    if (error) throw error;

    if (!data?.length) {
      resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">No users found</div>`;
      return;
    }

    resultsEl.innerHTML = data.map(u => `
      <div class="user-result-item" onclick="startChatWith('${escHtml(u.id)}')">
        ${avatarHtml(u, 'sm')}
        <div class="user-result-info">
          <div class="user-result-name">${escHtml(u.display_name || u.username || 'Unknown')}</div>
          <div class="user-result-username">@${escHtml(u.username || '')}${u.status_text ? ` · ${escHtml(u.status_text)}` : ''}</div>
        </div>
      </div>
    `).join('');
  } catch {
    resultsEl.innerHTML = `<div style="font-size:13px;color:var(--danger);padding:16px">Search failed</div>`;
  }
}, 350);

async function startChatWith(peerId) {
  closeNewChatModal();
  showScreen('app-screen');

  try {
    const conv = await createDirectConversation(peerId);
    const peerProfile = await fetchProfile(peerId);

    if (!STATE.conversations.find(c => c.id === conv.id)) {
      STATE.conversations.unshift({ ...conv, peerProfile });
      renderConversationList(STATE.conversations);
    }

    openConversation(conv.id);
  } catch (e) {
    toast(`Could not start chat: ${e.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════
// 14. PROFILE MODAL
// ════════════════════════════════════════════════════════════
function openProfileModal() {
  const p = STATE.profile || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'profile-overlay';
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <span class="modal-title">Edit Profile</span>
        <button class="modal-close" onclick="closeProfileModal()">${icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="profile-avatar-section">
          <div class="avatar-edit-wrap" onclick="qs('#profile-avatar-input').click()">
            <div class="avatar xl" id="profile-avatar-preview">
              ${p.avatar_url ? `<img src="${escHtml(p.avatar_url)}" alt="">` : escHtml(getInitials(p.display_name || STATE.user?.email || '?'))}
            </div>
            <div class="avatar-edit-overlay">${icons.camera}</div>
          </div>
          <span style="font-size:12px;color:var(--text-2)">Click to change photo</span>
          <input type="file" id="profile-avatar-input" accept="image/*" class="hidden" onchange="previewProfileAvatar(this)">
        </div>

        <div id="profile-modal-alert"></div>

        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" id="profile-name" value="${escHtml(p.display_name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" id="profile-username" value="${escHtml(p.username || '')}" oninput="checkUsernameProfile(this.value)">
          <span class="input-status" id="profile-username-status"></span>
        </div>
        <div class="form-group">
          <label class="form-label">Nationality</label>
          <input type="text" class="form-input" id="profile-nationality" value="${escHtml(p.nationality || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <input type="text" class="form-input" id="profile-status" value="${escHtml(p.status_text || 'Available')}">
        </div>
        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea class="form-input" id="profile-bio">${escHtml(p.bio || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" value="${escHtml(STATE.user?.email || '')}" disabled style="opacity:0.5">
        </div>
        <button class="btn btn-primary" id="profile-save-btn" onclick="saveProfileModal()">Save Changes</button>
        <div class="divider"></div>
        <button class="btn btn-primary" style="background:rgba(248,113,113,0.15);box-shadow:none;color:var(--danger);border:1px solid rgba(248,113,113,0.3)" onclick="handleSignOut()">Sign Out</button>
      </div>
    </div>
  `;
  overlay.onclick = closeProfileModal;
  document.body.appendChild(overlay);
}

function closeProfileModal() {
  qs('#profile-overlay')?.remove();
}

function previewProfileAvatar(input) {
  const file = input.files?.[0];
  if (!file) return;
  STATE.profileAvatarFile = file;
  qs('#profile-avatar-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="preview">`;
}

const checkUsernameProfile = debounce(async value => {
  const el = qs('#profile-username-status');
  if (!el) return;
  const v = normalizeUsername(value);

  if (v === STATE.profile?.username) {
    el.textContent = '';
    el.className = 'input-status';
    return;
  }

  if (!v || v.length < 3 || !/^[a-z0-9_]+$/.test(v)) {
    el.textContent = v.length < 3 ? 'Min 3 chars' : 'Invalid characters';
    el.className = 'input-status err';
    return;
  }

  el.textContent = 'Checking…';
  el.className = 'input-status';

  try {
    const avail = await isUsernameAvailable(v);
    el.textContent = avail ? '✓ Available' : '✕ Taken';
    el.className = `input-status ${avail ? 'ok' : 'err'}`;
  } catch {
    el.textContent = 'Unable to check';
    el.className = 'input-status err';
  }
}, 450);

async function saveProfileModal() {
  const name = qs('#profile-name')?.value.trim();
  const username = normalizeUsername(qs('#profile-username')?.value);
  const nationality = qs('#profile-nationality')?.value.trim();
  const statusText = qs('#profile-status')?.value.trim() || 'Available';
  const bio = qs('#profile-bio')?.value.trim();
  const alertEl = qs('#profile-modal-alert');

  if (!name || !username) {
    alertEl.innerHTML = `<div class="alert alert-error">Name and username are required.</div>`;
    return;
  }

  const btn = qs('#profile-save-btn');
  setLoading(btn, true, 'Saving…');

  try {
    if (username !== STATE.profile?.username) {
      const avail = await isUsernameAvailable(username);
      if (!avail) {
        alertEl.innerHTML = `<div class="alert alert-error">Username taken.</div>`;
        setLoading(btn, false);
        btn.innerHTML = 'Save Changes';
        return;
      }
    }

    let avatar_url = STATE.profile?.avatar_url || null;
    if (STATE.profileAvatarFile) {
      const ext = STATE.profileAvatarFile.name.split('.').pop() || 'png';
      avatar_url = await uploadFile('avatars', `${STATE.user.id}/avatar.${ext}`, STATE.profileAvatarFile);
      STATE.profileAvatarFile = null;
    }

    await upsertProfile({ display_name: name, username, nationality, bio, avatar_url, status_text: statusText, is_online: true, last_seen: new Date().toISOString() });
    await touchPresence(statusText);
    closeProfileModal();
    renderSidebar();
    syncCurrentConversationMeta();
    toast('Profile updated!', 'success');
  } catch (e) {
    alertEl.innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`;
    setLoading(btn, false);
    btn.innerHTML = 'Save Changes';
  }
}

// ════════════════════════════════════════════════════════════
// 15. LIGHTBOX
// ════════════════════════════════════════════════════════════
function openLightbox(url) {
  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.innerHTML = `
    <img src="${escHtml(url)}" alt="Full image">
    <button id="lightbox-close" onclick="closeLightbox()">${icons.close}</button>
  `;
  lb.onclick = closeLightbox;
  document.body.appendChild(lb);
}

function closeLightbox() {
  qs('#lightbox')?.remove();
}

// ════════════════════════════════════════════════════════════
// 16. BOOT / INIT
// ════════════════════════════════════════════════════════════
async function restoreFromSession(session) {
  if (!session?.user) return false;
  STATE.user = session.user;

  try {
    await Promise.race([
      loadMyProfile(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Profile load timeout')), 6000)),
    ]);
  } catch (e) {
    console.warn('Profile load issue:', e.message);
    STATE.profile = STATE.profile || null;
  }

  if (needsProfileSetup()) {
    showScreen('profile-setup-screen');
    renderProfileSetup();
  } else {
    bootToApp();
  }

  STATE.booted = true;
  return true;
}

async function initApp() {
  showScreen('loading-screen');
  renderAuthScreen();

  const bootTimeout = setTimeout(() => {
    if (!STATE.booted) {
      console.warn('Boot timeout fallback triggered');
      showScreen('auth-screen');
      renderAuthScreen();
    }
  }, 10000);

  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            clearTimeout(bootTimeout);
            await restoreFromSession(session);
          }
        } else if (event === 'SIGNED_OUT') {
          STATE.booted = false;
          STATE.user = null;
          STATE.profile = null;
          unsubscribeAll();
          showScreen('auth-screen');
          renderAuthScreen();
        } else if (event === 'PASSWORD_RECOVERY') {
          showScreen('auth-screen');
          renderAuthScreen();
          qs('#auth-alert').innerHTML = `<div class="alert alert-info">Set your new password below.</div>`;
        }
      } catch (e) {
        console.error('Auth state handler error:', e);
      }
    }, 0);
  });

  try {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const session = data?.session || null;

    if (session?.user) {
      clearTimeout(bootTimeout);
      await restoreFromSession(session);
      return;
    }

    clearTimeout(bootTimeout);
    showScreen('auth-screen');
    renderAuthScreen();
  } catch (e) {
    clearTimeout(bootTimeout);
    console.error('Session restore failed:', e);
    showScreen('auth-screen');
    renderAuthScreen();
  }
}

// ════════════════════════════════════════════════════════════
// 17. GLOBAL HANDLERS
// ════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeNewChatModal();
    closeProfileModal();
  }
});

window.addEventListener('online', () => {
  if (STATE.user) touchPresence(STATE.profile?.status_text || 'Available');
});

window.addEventListener('beforeunload', () => {
  try {
    if (STATE.user) touchPresence(STATE.profile?.status_text || 'Available');
  } catch {}
});

window.addEventListener('DOMContentLoaded', initApp);
