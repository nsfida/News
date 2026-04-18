'use strict';

const SUPABASE_URL = 'https://ddgqamzhwzzrvjylkiqb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZ3FhbXpod3p6cnZqeWxraXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc0NTgsImV4cCI6MjA5MTk5MzQ1OH0.RjL4BBe3y-nH-scSSbsAlnEmWZWnn51f79ROCv7Y8ZU'; // replace with your real anon key if needed
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const STATE = {
  user: null,
  profile: null,
  conversations: [],
  statusPosts: [],
  currentConvId: null,
  currentConvPeer: null,
  messages: [],
  msgSubscription: null,
  convSubscription: null,
  profileSubscription: null,
  statusSubscription: null,
  presenceTimer: null,
  seenTimer: null,
  booted: false,
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingTimer: null,
  recordingSeconds: 0,
  recordedBlob: null,
  recordedDuration: 0,
  pendingFile: null,
  pendingFileUrl: null,
  pendingFileType: null,
  pendingLocation: null,
  setupAvatarFile: null,
  profileAvatarFile: null,
  sidebarOpen: false,
  activeTab: 'chats',
  editingMessage: null,
  selectingGroupMembers: [],
  selectedStatusTargets: [],
};

const icons = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  dot: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
};

const qs = (sel, parent = document) => parent.querySelector(sel);
const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function normalizeUsername(v){ return String(v || '').trim().toLowerCase(); }
function debounce(fn, ms = 300){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }
function toast(msg, type='info', dur=3200){
  const wrap = qs('#toast-container'); if (!wrap) return;
  const el = document.createElement('div'); el.className = `toast ${type}`;
  const ico = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span class="toast-icon">${ico}</span><span>${escHtml(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.animation = 'toastOut .25s ease forwards'; setTimeout(()=>el.remove(), 250); }, dur);
}
function showScreen(id){ ['loading-screen','auth-screen','profile-setup-screen','app-screen'].forEach(x => { const el = qs('#'+x); if (el) el.classList.toggle('hidden', x !== id); }); }
function setLoading(btn, loading, label=''){ if (!btn) return; btn.disabled = loading; if (loading){ btn._orig = btn.innerHTML; btn.innerHTML = `<span class="spinner-sm"></span>${label ? ` ${escHtml(label)}` : ''}`; } else { btn.innerHTML = btn._orig || label; } }
function getInitials(name){ return (name || '?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function formatMsgTime(iso){ if (!iso) return ''; const d = new Date(iso), now = new Date(); if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); const diff = Math.floor((now-d)/86400000); if (diff < 7) return d.toLocaleDateString([], { weekday:'short' }); return d.toLocaleDateString([], { month:'short', day:'numeric' }); }
function formatDateSep(iso){ const d = new Date(iso), now = new Date(); if (d.toDateString() === now.toDateString()) return 'Today'; const diff = Math.floor((now-d)/86400000); if (diff === 1) return 'Yesterday'; return d.toLocaleDateString([], { month:'long', day:'numeric', year:'numeric' }); }
function formatDuration(s){ const m = Math.floor(s/60), sec = Math.floor(s%60); return `${m}:${String(sec).padStart(2,'0')}`; }
function isWithin1Hour(iso){ return (Date.now() - new Date(iso).getTime()) <= 3600000; }

function avatarHtml(profile, size=''){
  const label = escHtml(getInitials(profile?.display_name || profile?.username || '?'));
  if (!profile) return `<div class="avatar ${size}">?</div>`;
  if (profile.avatar_url) return `<div class="avatar ${size}"><img src="${escHtml(profile.avatar_url)}" alt="" onerror="this.parentElement.innerHTML='${label}'"></div>`;
  return `<div class="avatar ${size}">${label}</div>`;
}
function generateVoiceBars(){ return [40,60,80,50,90,70,55,85,65,45,75,60,80,50,70].map(h=>`<div class="voice-bar" style="height:${h}%"></div>`).join(''); }
function locationLabel(meta){ return meta?.label || 'Shared location'; }
function messageBodyLabel(msg){
  if (msg.deleted_for_all_at) return 'Message deleted';
  if (msg.content_type === 'image') return msg.content || 'Photo';
  if (msg.content_type === 'video') return msg.content || 'Video';
  if (msg.content_type === 'voice') return 'Voice message';
  if (msg.content_type === 'location') return 'Location';
  return msg.content || '';
}

async function fetchProfile(userId){
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}
async function loadMyProfile(){ if (!STATE.user) return null; STATE.profile = await fetchProfile(STATE.user.id); return STATE.profile; }
async function upsertProfile(fields){
  const payload = { id: STATE.user.id, ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  STATE.profile = data; return data;
}
async function uploadFile(bucket, path, file){
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
async function isUsernameAvailable(username){
  const u = normalizeUsername(username); if (!u) return false;
  const { data, error } = await sb.from('profiles').select('id').eq('username', u).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !data || data.id === STATE.user?.id;
}

async function fetchConversations(){
  if (!STATE.user) return [];
  const { data: members, error: mErr } = await sb.from('conversation_members').select('conversation_id').eq('user_id', STATE.user.id);
  if (mErr) throw mErr;
  if (!members?.length) return [];
  const ids = members.map(r => r.conversation_id);
  const { data: convs, error: cErr } = await sb.from('conversations').select('*').in('id', ids).order('last_message_at', { ascending: false });
  if (cErr) throw cErr;
  const enriched = await Promise.all((convs || []).map(async c => {
    const { data: membs } = await sb.from('conversation_members').select('user_id, role').eq('conversation_id', c.id);
    const peers = (membs || []).map(x => x.user_id).filter(id => id !== STATE.user.id);
    let peerProfile = null;
    if (c.type === 'direct' && peers[0]) peerProfile = await fetchProfile(peers[0]);
    const groupMembers = c.type === 'group' ? await Promise.all((membs || []).map(async x => x.user_id === STATE.user.id ? null : await fetchProfile(x.user_id))) : [];
    return { ...c, peerProfile, groupMembers: groupMembers.filter(Boolean) };
  }));
  return enriched;
}
async function fetchMessages(convId){
  const { data, error } = await sb.from('messages')
    .select('*, sender:profiles!sender_id(id,display_name,username,avatar_url,status_text,is_online,last_seen)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;
  return data || [];
}
async function sendMessage(payload){
  const { data, error } = await sb.from('messages')
    .insert({
      conversation_id: payload.convId,
      sender_id: STATE.user.id,
      content: payload.content,
      content_type: payload.contentType || 'text',
      file_url: payload.fileUrl || null,
      metadata: payload.metadata || {},
    })
    .select('*, sender:profiles!sender_id(id,display_name,username,avatar_url,status_text,is_online,last_seen)')
    .single();
  if (error) throw error;
  return data;
}
async function createDirectConversation(peerId){ const { data, error } = await sb.rpc('create_direct_conversation', { peer_id: peerId }); if (error) throw error; return Array.isArray(data) ? data[0] : data; }
async function createGroupConversation(name, memberIds, description = '', avatarUrl = null){ const { data, error } = await sb.rpc('create_group_conversation', { p_name: name, p_member_ids: memberIds, p_description: description, p_avatar_url: avatarUrl }); if (error) throw error; return Array.isArray(data) ? data[0] : data; }
async function editMessage(messageId, content){ const { data, error } = await sb.rpc('edit_message', { p_message_id: messageId, p_content: content }); if (error) throw error; return data; }
async function deleteMessageForEveryone(messageId){ const { data, error } = await sb.rpc('delete_message_for_everyone', { p_message_id: messageId }); if (error) throw error; return data; }
async function hideMessageForMe(messageId){ const { error } = await sb.rpc('hide_message_for_me', { p_message_id: messageId }); if (error) throw error; return true; }
async function markDelivered(convId){ const { error } = await sb.rpc('mark_conversation_messages_delivered', { p_conversation_id: convId }); if (error) throw error; }
async function markSeen(convId){ const { error } = await sb.rpc('mark_conversation_messages_seen', { p_conversation_id: convId }); if (error) throw error; }
async function touchPresence(statusText = null){ if (!STATE.user) return null; try { const { data, error } = await sb.rpc('touch_my_presence', { p_status_text: statusText }); if (error) throw error; if (data) STATE.profile = data; return data; } catch (e) { console.warn('presence update failed', e.message); return null; } }

function renderAuthScreen(){
  qs('#auth-screen').innerHTML = `
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-logo-row"><img src="assets/logo.svg" alt="NSFChat"><span class="auth-wordmark">NSFChat</span></div>
      <p class="auth-tagline">Secure, real-time messaging</p>
    </div>
    <div class="auth-tabs">
      <button class="auth-tab active" id="tab-signin" onclick="switchAuthTab('signin')">Sign In</button>
      <button class="auth-tab" id="tab-signup" onclick="switchAuthTab('signup')">Create Account</button>
    </div>
    <div id="auth-alert"></div>

    <div id="signin-form">
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="signin-email" type="email" placeholder="you@example.com"></div>
      <div class="form-group"><label class="form-label">Password</label><input class="form-input" id="signin-password" type="password" placeholder="••••••••"></div>
      <button class="btn btn-primary" id="signin-btn" onclick="handleSignIn()">Sign In</button>
      <div style="text-align:center;margin-top:12px"><button class="btn-ghost btn" onclick="showForgotPassword()">Forgot password?</button></div>
    </div>

    <div id="signup-form" class="hidden">
      <div class="form-group"><label class="form-label">Display Name</label><input class="form-input" id="signup-name" type="text" placeholder="Your full name"></div>
      <div class="form-group"><label class="form-label">Username</label><input class="form-input" id="signup-username" type="text" placeholder="e.g. johndoe" oninput="checkUsernameAuth(this.value)"><span class="input-status" id="signup-username-status"></span></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="signup-email" type="email" placeholder="you@example.com"></div>
      <div class="form-group"><label class="form-label">Password</label><input class="form-input" id="signup-password" type="password" placeholder="Min 6 characters"></div>
      <button class="btn btn-primary" id="signup-btn" onclick="handleSignUp()">Create Account</button>
    </div>

    <div id="forgot-form" class="hidden">
      <p style="font-size:14px;color:var(--text-2);margin-bottom:16px">Enter your email and we'll send you a reset link.</p>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="forgot-email" type="email" placeholder="you@example.com"></div>
      <button class="btn btn-primary" id="forgot-btn" onclick="handleForgotPassword()">Send Reset Link</button>
      <div style="text-align:center;margin-top:12px"><button class="btn-ghost btn" onclick="switchAuthTab('signin')">← Back</button></div>
    </div>
  </div>`;
  setTimeout(() => {
    qs('#signin-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignIn(); });
    qs('#signup-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUp(); });
    qs('#forgot-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
  }, 0);
}
function switchAuthTab(tab){
  qs('#tab-signin')?.classList.toggle('active', tab === 'signin');
  qs('#tab-signup')?.classList.toggle('active', tab === 'signup');
  qs('#signin-form')?.classList.toggle('hidden', tab !== 'signin');
  qs('#signup-form')?.classList.toggle('hidden', tab !== 'signup');
  qs('#forgot-form')?.classList.toggle('hidden', tab !== 'forgot');
  qs('#auth-alert').innerHTML = '';
}
function showForgotPassword(){ qs('#signin-form')?.classList.add('hidden'); qs('#signup-form')?.classList.add('hidden'); qs('#forgot-form')?.classList.remove('hidden'); qs('#tab-signin')?.classList.remove('active'); qs('#tab-signup')?.classList.remove('active'); qs('#auth-alert').innerHTML = ''; }
function showAuthAlert(msg, type='error'){ qs('#auth-alert').innerHTML = `<div class="alert alert-${type}">${escHtml(msg)}</div>`; }

const checkUsernameAuth = debounce(async value => {
  const el = qs('#signup-username-status'); if (!el) return;
  const v = normalizeUsername(value);
  if (!v || v.length < 3){ el.textContent = v.length ? 'Min 3 characters' : ''; el.className = 'input-status err'; return; }
  if (!/^[a-z0-9_]+$/.test(v)){ el.textContent = 'Letters, numbers, underscore only'; el.className = 'input-status err'; return; }
  el.textContent = 'Checking…'; el.className = 'input-status';
  try { const ok = await isUsernameAvailable(v); el.textContent = ok ? '✓ Available' : '✕ Taken'; el.className = `input-status ${ok ? 'ok' : 'err'}`; } catch { el.textContent = 'Unable to check'; el.className = 'input-status err'; }
}, 400);

async function handleSignIn(){
  const email = qs('#signin-email')?.value.trim(); const password = qs('#signin-password')?.value;
  if (!email || !password) return showAuthAlert('Please fill in all fields.');
  const btn = qs('#signin-btn'); setLoading(btn, true, 'Signing in…'); qs('#auth-alert').innerHTML = '';
  try { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
  catch (e){ showAuthAlert(e.message || 'Sign in failed.'); setLoading(btn, false); btn.innerHTML = 'Sign In'; }
}
async function handleSignUp(){
  const name = qs('#signup-name')?.value.trim();
  const username = normalizeUsername(qs('#signup-username')?.value);
  const email = qs('#signup-email')?.value.trim();
  const password = qs('#signup-password')?.value;
  if (!name || !username || !email || !password) return showAuthAlert('Please fill in all fields.');
  if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) return showAuthAlert('Username must be at least 3 chars (letters, numbers, underscore).');
  if (password.length < 6) return showAuthAlert('Password must be at least 6 characters.');
  const btn = qs('#signup-btn'); setLoading(btn, true, 'Creating account…');
  try {
    const avail = await isUsernameAvailable(username); if (!avail){ showAuthAlert('Username is already taken.'); setLoading(btn, false); btn.innerHTML='Create Account'; return; }
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name, username } } });
    if (error) throw error;
    if (data?.user && data?.session) {
      STATE.user = data.user;
      await upsertProfile({ display_name: name, username, status_text: 'Available', status_privacy: 'public', last_seen: new Date().toISOString(), is_online: true });
      bootToApp();
    } else {
      showAuthAlert('Check your email to confirm your account, then sign in.', 'success');
      setLoading(btn, false); btn.innerHTML='Create Account';
    }
  } catch (e){ showAuthAlert(e.message || 'Sign up failed.'); setLoading(btn, false); btn.innerHTML='Create Account'; }
}
async function handleForgotPassword(){
  const email = qs('#forgot-email')?.value.trim(); if (!email) return showAuthAlert('Please enter your email.');
  const btn = qs('#forgot-btn'); setLoading(btn, true, 'Sending…');
  try { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (error) throw error; showAuthAlert('Reset link sent! Check your email.', 'success'); setLoading(btn, false); btn.innerHTML='Send Reset Link'; }
  catch (e){ showAuthAlert(e.message || 'Failed to send reset link.'); setLoading(btn, false); btn.innerHTML='Send Reset Link'; }
}
async function handleSignOut(){
  closeNewChatModal(); closeProfileModal(); closeSettingsModal(); closeStatusModal(); closeGroupModal(); closeLightbox(); if (STATE.user) await touchPresence(STATE.profile?.status_text || 'Away'); await sb.auth.signOut();
  STATE.user = null; STATE.profile = null; STATE.conversations = []; STATE.statusPosts = []; STATE.currentConvId = null; STATE.currentConvPeer = null; STATE.messages = [];
  unsubscribeAll(); showScreen('auth-screen'); renderAuthScreen();
}

function needsProfileSetup(){ return !STATE.profile || !STATE.profile.username; }
function renderProfileSetup(){
  const p = STATE.profile || {};
  const fallbackName = p.display_name || STATE.user?.user_metadata?.display_name || '';
  const fallbackUsername = p.username || STATE.user?.user_metadata?.username || '';
  qs('#profile-setup-screen').innerHTML = `
  <div class="profile-setup-card">
    <div class="profile-setup-header">
      <div class="profile-setup-title">Set up your profile</div>
      <div class="profile-setup-subtitle">Tell others a little about yourself</div>
    </div>
    <div class="profile-avatar-section">
      <div class="avatar-edit-wrap" onclick="qs('#setup-avatar-input').click()">
        <div class="avatar xl" id="setup-avatar-preview">${escHtml(getInitials(fallbackName || STATE.user?.email || '?'))}</div>
        <div class="avatar-edit-overlay">${icons.camera}</div>
      </div>
      <input type="file" id="setup-avatar-input" accept="image/*" class="hidden" onchange="previewSetupAvatar(this)">
      <span style="font-size:13px;color:var(--text-2)">Click to upload photo</span>
    </div>
    <div id="setup-alert"></div>
    <div class="form-group"><label class="form-label">Display Name</label><input class="form-input" id="setup-name" value="${escHtml(fallbackName)}"></div>
    <div class="form-group"><label class="form-label">Username</label><input class="form-input" id="setup-username" value="${escHtml(fallbackUsername)}" oninput="checkUsernameSetup(this.value)"><span class="input-status" id="setup-username-status"></span></div>
    <div class="form-group"><label class="form-label">Status</label><input class="form-input" id="setup-status" value="${escHtml(p.status_text || 'Available')}"></div>
    <div class="form-group"><label class="form-label">Nationality</label><input class="form-input" id="setup-nationality" value="${escHtml(p.nationality || '')}"></div>
    <div class="form-group"><label class="form-label">Bio</label><textarea class="form-input" id="setup-bio">${escHtml(p.bio || '')}</textarea></div>
    <button class="btn btn-primary" id="setup-save-btn" onclick="saveProfileSetup()">Complete Setup</button>
  </div>`;
}
function previewSetupAvatar(input){ const file = input.files?.[0]; if (!file) return; STATE.setupAvatarFile = file; qs('#setup-avatar-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="preview">`; }
const checkUsernameSetup = debounce(async value => {
  const el = qs('#setup-username-status'); if (!el) return;
  const v = normalizeUsername(value);
  if (!v || v.length < 3){ el.textContent = v.length ? 'Min 3 characters' : ''; el.className='input-status err'; return; }
  if (!/^[a-z0-9_]+$/.test(v)){ el.textContent = 'Letters, numbers, underscore only'; el.className='input-status err'; return; }
  el.textContent = 'Checking…'; el.className='input-status';
  try { const ok = await isUsernameAvailable(v); el.textContent = ok ? '✓ Available' : '✕ Taken'; el.className = `input-status ${ok ? 'ok' : 'err'}`; } catch { el.textContent = 'Unable to check'; el.className='input-status err'; }
}, 400);
async function saveProfileSetup(){
  const name = qs('#setup-name')?.value.trim();
  const username = normalizeUsername(qs('#setup-username')?.value);
  const statusText = qs('#setup-status')?.value.trim() || 'Available';
  const nationality = qs('#setup-nationality')?.value.trim();
  const bio = qs('#setup-bio')?.value.trim();
  if (!name || !username) { qs('#setup-alert').innerHTML = `<div class="alert alert-error">Display name and username are required.</div>`; return; }
  const btn = qs('#setup-save-btn'); setLoading(btn, true, 'Saving…');
  try {
    const avail = await isUsernameAvailable(username); if (!avail) { qs('#setup-alert').innerHTML = `<div class="alert alert-error">Username taken. Choose another.</div>`; setLoading(btn, false); btn.innerHTML='Complete Setup'; return; }
    let avatar_url = null;
    if (STATE.setupAvatarFile){ avatar_url = await uploadFile('avatars', `${STATE.user.id}/avatar.${(STATE.setupAvatarFile.name.split('.').pop() || 'png')}`, STATE.setupAvatarFile); }
    await upsertProfile({ display_name: name, username, nationality, bio, avatar_url, status_text: statusText, is_online: true, last_seen: new Date().toISOString() });
    bootToApp();
  } catch (e){ qs('#setup-alert').innerHTML = `<div class="alert alert-error">${escHtml(e.message)}</div>`; setLoading(btn, false); btn.innerHTML='Complete Setup'; }
}

function renderSidebar(){
  const p = STATE.profile || {};
  qs('#sidebar').innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <img src="assets/logo.svg" alt="NSFChat"><span class="sidebar-logo-text">NSFChat</span>
      </div>
      <div class="sidebar-actions">
        <button class="btn-icon" title="New Chat" onclick="openNewChatModal()">${icons.plus}</button>
        <button class="btn-icon" title="New Group" onclick="openGroupModal()">${icons.menu}</button>
        <button class="btn-icon" title="Status" onclick="openStatusModal()">${icons.dot}</button>
        <button class="btn-icon" title="Settings" onclick="openSettingsModal()">${icons.edit}</button>
      </div>
    </div>
    <div class="search-wrap">
      <div class="search-input-wrap">${icons.search}<input type="search" class="search-input" id="conv-search" placeholder="Search conversations…" oninput="filterConversations(this.value)"></div>
    </div>
    <div class="sidebar-section-label">Messages</div>
    <div id="chat-list"><div class="loading-inline"><span class="spinner-sm"></span> Loading…</div></div>
    <div class="sidebar-section-label">My Status</div>
    <div class="sidebar-profile" onclick="openStatusModal()">
      ${avatarHtml(p, 'sm')}
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name truncate">${escHtml(p.display_name || 'You')}</div>
        <div class="sidebar-profile-username">${escHtml(p.status_text || 'Available')}</div>
      </div>
      <button class="btn-icon sm danger" title="Sign Out" onclick="event.stopPropagation();handleSignOut()">${icons.logout}</button>
    </div>
  `;
}
function renderWelcomeScreen(){ qs('#main-content').innerHTML = `<div id="welcome-screen"><img src="assets/logo.svg" alt="NSFChat" class="welcome-logo"><div class="welcome-title">Welcome to NSFChat</div><div class="welcome-subtitle">Select a conversation or start a new one</div></div>`; }

async function loadAndRenderConversations(){
  try { STATE.conversations = await fetchConversations(); renderConversationList(STATE.conversations); }
  catch (e) { qs('#chat-list').innerHTML = `<div class="empty-state"><p>Failed to load chats</p></div>`; console.warn(e); }
}
function renderConversationList(convs){
  const list = qs('#chat-list'); if (!list) return;
  if (!convs?.length) { list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><p>No conversations yet</p><p style="font-size:12px">Tap + to start chatting</p></div>`; return; }
  list.innerHTML = convs.map(c => {
    const peer = c.type === 'group' ? null : c.peerProfile;
    const name = c.type === 'group' ? (c.name || 'Group') : (peer?.display_name || peer?.username || 'Unknown');
    const preview = c.last_message_preview || 'Start a conversation';
    const time = c.last_message_at ? formatMsgTime(c.last_message_at) : '';
    return `<div class="chat-item ${c.id === STATE.currentConvId ? 'active' : ''}" onclick="openConversation('${escHtml(c.id)}')">
      <div class="avatar-wrap">${c.type === 'group' ? `<div class="avatar">${escHtml(getInitials(name))}</div>` : avatarHtml(peer)}</div>
      <div class="chat-item-info"><div class="chat-item-name">${escHtml(name)}</div><div class="chat-item-preview">${escHtml(preview)}</div></div>
      <div class="chat-item-meta"><span class="chat-item-time">${escHtml(time)}</span></div>
    </div>`;
  }).join('');
}
function filterConversations(query){
  const q = String(query || '').trim().toLowerCase();
  const filtered = !q ? STATE.conversations : STATE.conversations.filter(c => {
    const peer = c.type === 'group' ? null : c.peerProfile;
    const hay = `${c.name || ''} ${peer?.display_name || ''} ${peer?.username || ''} ${c.last_message_preview || ''}`.toLowerCase();
    return hay.includes(q);
  });
  renderConversationList(filtered);
}

async function openConversation(convId){
  if (!convId) return;
  if (STATE.currentConvId === convId) return;
  STATE.currentConvId = convId; STATE.pendingFile = null; STATE.pendingFileUrl = null; STATE.pendingLocation = null; STATE.recordedBlob = null; STATE.recordedDuration = 0; STATE.messages = [];
  unsubscribeMessages();
  const conv = STATE.conversations.find(c => c.id === convId);
  STATE.currentConvPeer = conv?.type === 'group' ? null : (conv?.peerProfile || null);
  renderConversationScreen();
  try {
    const msgs = await fetchMessages(convId);
    STATE.messages = msgs;
    renderMessages(msgs);
    scrollToBottom();
    subscribeToMessages(convId);
    await markDelivered(convId);
    await markSeen(convId);
    await touchPresence(STATE.profile?.status_text || 'Available');
  } catch (e) { toast('Failed to load messages', 'error'); console.warn(e); }
}
function renderConversationScreen(){
  const conv = STATE.conversations.find(c => c.id === STATE.currentConvId);
  const isGroup = conv?.type === 'group';
  const peer = STATE.currentConvPeer;
  const title = isGroup ? (conv?.name || 'Group') : (peer?.display_name || peer?.username || 'Chat');
  const subtitle = isGroup ? (conv?.description || `${(conv?.groupMembers || []).length + 1} members`) : (peer ? (peer.is_online ? 'Online' : (peer.status_text || 'Last seen')) : '');
  qs('#main-content').innerHTML = `
  <div id="conversation-screen">
    <div class="conv-header">
      <button class="conv-back-btn" onclick="showSidebar()">${icons.back}</button>
      <div class="avatar-wrap">
        ${isGroup ? `<div class="avatar sm">${escHtml(getInitials(title))}</div>` : avatarHtml(peer, 'sm')}
        <div class="online-dot" id="peer-online-dot" style="display:${!isGroup && peer?.is_online ? 'block' : 'none'}"></div>
      </div>
      <div class="conv-header-info">
        <div class="conv-header-name" id="conv-header-name">${escHtml(title)}</div>
        <div class="conv-header-status" id="conv-status">${escHtml(subtitle)}</div>
      </div>
      <div class="conv-meta-actions">
        ${isGroup ? `<button class="btn-icon sm" onclick="openGroupInfoModal()">${icons.menu}</button>` : ''}
        <button class="btn-icon sm" onclick="openSettingsModal()">${icons.edit}</button>
      </div>
    </div>

    <div id="messages-area"><div class="loading-inline" style="justify-content:center"><span class="spinner-sm"></span></div></div>

    <div class="msg-input-area">
      <div id="recording-indicator" class="hidden recording-indicator"><div class="recording-dot"></div><span class="recording-time" id="rec-time">0:00</span><span class="recording-label">Recording voice message…</span><button class="stop-recording-btn" onclick="stopRecording()">Stop</button></div>
      <div id="voice-preview" class="voice-preview hidden"><div class="voice-play-btn" onclick="previewRecording()" id="preview-play-btn">${icons.play}</div><div class="voice-preview-info">Voice message ready · <span id="voice-preview-dur">0:00</span></div><button class="btn-icon sm danger" onclick="discardRecording()" title="Discard">${icons.trash}</button></div>
      <div id="attachment-preview" class="attachment-preview hidden"></div>
      <div class="msg-input-row">
        <textarea class="msg-text-input" id="msg-input" rows="1" placeholder="Message…" oninput="autoResizeTextarea(this)" onkeydown="handleMsgKeydown(event)"></textarea>
        <div class="input-actions">
          <button class="input-action-btn" title="Attach image/video" onclick="qs('#file-input').click()">${icons.image}</button>
          <button class="input-action-btn" title="Share location" onclick="shareLocation()">${icons.map}</button>
          <button class="input-action-btn" id="mic-btn" title="Voice message" onclick="toggleRecording()">${icons.mic}</button>
          <button class="send-btn" onclick="handleSend()">${icons.send}</button>
        </div>
      </div>
      <input type="file" id="file-input" accept="image/*,video/*" class="hidden" onchange="handleFileSelect(this)">
    </div>
  </div>`;
}
function updateConversationHeader(){
  const conv = STATE.conversations.find(c => c.id === STATE.currentConvId);
  if (!conv) return;
  const title = conv.type === 'group' ? (conv.name || 'Group') : (STATE.currentConvPeer?.display_name || STATE.currentConvPeer?.username || 'Chat');
  const subtitle = conv.type === 'group' ? (conv.description || `${(conv.groupMembers || []).length + 1} members`) : (STATE.currentConvPeer?.is_online ? 'Online' : (STATE.currentConvPeer?.status_text || 'Last seen'));
  qs('#conv-header-name') && (qs('#conv-header-name').textContent = title);
  qs('#conv-status') && (qs('#conv-status').textContent = subtitle);
}

function statusTickHtml(msg){
  if (msg.seen_at) return `<span class="msg-state seen">${icons.dot}${icons.dot}</span>`;
  if (msg.delivered_at) return `<span class="msg-state delivered">${icons.dot}${icons.dot}</span>`;
  return `<span class="msg-state sent">${icons.dot}</span>`;
}
function canEditLocally(msg){ return msg.sender_id === STATE.user.id && isWithin1Hour(msg.created_at) && !msg.deleted_for_all_at; }
function renderMsgBubble(msg, isMine){
  if (msg.deleted_for_all_at) return `<div class="msg-bubble">Message deleted</div>`;
  if (msg.content_type === 'image'){
    return `<div class="msg-image" onclick="openLightbox('${escHtml(msg.file_url)}')"><img src="${escHtml(msg.file_url)}" alt="image">${msg.content ? `<div class="msg-bubble" style="border-radius:0 0 20px 20px;border-top:none">${escHtml(msg.content)}</div>` : ''}</div>`;
  }
  if (msg.content_type === 'video'){
    return `<div class="msg-video"><video src="${escHtml(msg.file_url)}" controls playsinline></video>${msg.content ? `<div class="msg-bubble" style="border-radius:0 0 20px 20px;border-top:none">${escHtml(msg.content)}</div>` : ''}</div>`;
  }
  if (msg.content_type === 'voice'){
    return `<div class="msg-voice"><button class="voice-play-btn" onclick="playVoice('${escHtml(msg.file_url)}', this)">${icons.play}</button><div class="voice-waveform">${generateVoiceBars()}</div><span class="voice-duration">${formatDuration(msg.metadata?.duration || 0)}</span></div>`;
  }
  if (msg.content_type === 'location'){
    const meta = msg.metadata || {};
    const lat = meta.lat, lng = meta.lng;
    const mapsUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=18/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
    return `<div class="msg-location"><div class="msg-location-title">Shared location</div><div class="msg-location-sub">${escHtml(locationLabel(meta))}</div><a class="btn-chip" href="${mapsUrl}" target="_blank" rel="noreferrer">Open in Maps</a></div>`;
  }
  return `<div class="msg-bubble">${escHtml(msg.content || '')}${isMine ? `<div class="msg-state-wrap">${statusTickHtml(msg)}</div>` : ''}</div>`;
}
function renderMessages(msgs){
  const area = qs('#messages-area'); if (!area) return;
  if (!msgs?.length){ area.innerHTML = `<div class="empty-state" style="flex:1"><div class="empty-state-icon">💬</div><p>No messages yet</p><p style="font-size:12px">Say hello!</p></div>`; return; }
  let html = ''; let lastDate = null; let lastSenderId = null;
  msgs.forEach(msg => {
    const isMine = msg.sender_id === STATE.user.id;
    const dateKey = new Date(msg.created_at).toDateString();
    if (dateKey !== lastDate){ html += `<div class="date-separator">${escHtml(formatDateSep(msg.created_at))}</div>`; lastDate = dateKey; lastSenderId = null; }
    const senderName = !isMine && msg.sender && msg.sender_id !== lastSenderId ? `<div class="msg-sender-name">${escHtml(msg.sender.display_name || msg.sender.username || 'Unknown')}</div>` : '';
    lastSenderId = msg.sender_id;
    const actionBtn = isMine ? `<button class="btn-icon sm msg-action-btn" onclick="openMessageActions('${escHtml(msg.id)}')">${icons.menu}</button>` : '';
    html += `<div class="msg-group ${isMine ? 'sent' : 'received'}" id="msg-${msg.id}">${senderName}<div class="msg-row">${renderMsgBubble(msg, isMine)}${actionBtn}<span class="msg-time">${escHtml(formatMsgTime(msg.created_at))}</span></div>${msg.edited_at ? `<div style="font-size:10px;color:var(--text-3);padding:${isMine ? '0 6px 0 0' : '0 0 0 6px'}">edited</div>` : ''}</div>`;
  });
  area.innerHTML = html;
}
function appendOrRefreshMessages(){ fetchMessages(STATE.currentConvId).then(msgs => { STATE.messages = msgs; renderMessages(msgs); scrollToBottom(); }).catch(()=>{}); }
function scrollToBottom(){ const area = qs('#messages-area'); if (area) area.scrollTop = area.scrollHeight; }
function autoResizeTextarea(el){ el.style.height='auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
function handleMsgKeydown(e){ if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }

function openMessageActions(messageId){
  const msg = STATE.messages.find(m => m.id === messageId); if (!msg) return;
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'message-actions-overlay';
  const editable = canEditLocally(msg);
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">Message Options</span><button class="modal-close" onclick="closeMessageActions()">${icons.close}</button></div>
      <div class="modal-body">
        ${editable ? `<button class="btn btn-secondary w-full" onclick="editMessagePrompt('${escHtml(msg.id)}')">Edit message</button>` : ''}
        <div style="height:8px"></div>
        <button class="btn btn-secondary w-full" onclick="deleteForMe('${escHtml(msg.id)}')">Delete for me</button>
        ${editable ? `<div style="height:8px"></div><button class="btn btn-secondary w-full" style="color:var(--danger)" onclick="deleteForEveryone('${escHtml(msg.id)}')">Delete for everyone</button>` : ''}
      </div>
    </div>`;
  overlay.onclick = closeMessageActions;
  document.body.appendChild(overlay);
}
function closeMessageActions(){ qs('#message-actions-overlay')?.remove(); }
function editMessagePrompt(messageId){
  closeMessageActions();
  const msg = STATE.messages.find(m => m.id === messageId); if (!msg) return;
  STATE.editingMessage = msg;
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'edit-message-overlay';
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">Edit Message</span><button class="modal-close" onclick="closeEditMessage()">${icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Text</label><textarea class="form-input" id="edit-message-text">${escHtml(msg.content || '')}</textarea></div>
        <button class="btn btn-primary" onclick="saveMessageEdit()">Save</button>
      </div>
    </div>`;
  overlay.onclick = closeEditMessage;
  document.body.appendChild(overlay);
}
function closeEditMessage(){ qs('#edit-message-overlay')?.remove(); STATE.editingMessage = null; }
async function saveMessageEdit(){
  const text = qs('#edit-message-text')?.value.trim();
  if (!STATE.editingMessage || !text) return;
  try { await editMessage(STATE.editingMessage.id, text); closeEditMessage(); appendOrRefreshMessages(); loadAndRenderConversations(); }
  catch (e){ toast(e.message || 'Could not edit', 'error'); }
}
async function deleteForMe(messageId){ try { await hideMessageForMe(messageId); closeMessageActions(); appendOrRefreshMessages(); } catch (e){ toast(e.message || 'Could not delete', 'error'); } }
async function deleteForEveryone(messageId){ try { await deleteMessageForEveryone(messageId); closeMessageActions(); appendOrRefreshMessages(); loadAndRenderConversations(); } catch (e){ toast(e.message || 'Could not delete for everyone', 'error'); } }

async function handleSend(){
  if (!STATE.currentConvId) return;
  const input = qs('#msg-input'); const text = input?.value.trim();
  if (STATE.recordedBlob){ await sendVoiceMessage(STATE.recordedBlob, STATE.recordedDuration); STATE.recordedBlob = null; STATE.recordedDuration = 0; qs('#voice-preview')?.classList.add('hidden'); return; }
  if (STATE.pendingFile) { await sendAttachmentMessage(STATE.pendingFile, text); STATE.pendingFile = null; STATE.pendingFileUrl = null; STATE.pendingFileType = null; qs('#attachment-preview')?.classList.add('hidden'); if (input){ input.value=''; input.style.height='auto'; } return; }
  if (STATE.pendingLocation){ await sendLocationMessage(STATE.pendingLocation); STATE.pendingLocation = null; if (input){ input.value=''; input.style.height='auto'; } return; }
  if (!text) return;
  if (input){ input.value=''; input.style.height='auto'; }
  try { const msg = await sendMessage({ convId: STATE.currentConvId, content: text, contentType: 'text' }); STATE.messages.push(msg); renderMessages(STATE.messages); scrollToBottom(); await loadAndRenderConversations(); }
  catch (e){ toast(e.message || 'Failed to send message', 'error'); }
}

async function sendAttachmentMessage(file, caption=''){
  const btn = qs('.send-btn'); if (btn){ btn.disabled = true; btn.innerHTML = `<span class="spinner-sm" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span>`; }
  try {
    const isVideo = file.type.startsWith('video/');
    const bucket = 'chat-media';
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const fileUrl = await uploadFile(bucket, `${STATE.user.id}/${Date.now()}.${ext}`, file);
    const msg = await sendMessage({ convId: STATE.currentConvId, content: caption || null, contentType: isVideo ? 'video' : 'image', fileUrl });
    STATE.messages.push(msg); renderMessages(STATE.messages); scrollToBottom(); await loadAndRenderConversations();
  } catch (e){ toast(e.message || 'Failed to send media', 'error'); }
  finally { if (btn){ btn.disabled = false; btn.innerHTML = icons.send; } }
}
function handleFileSelect(input){
  const file = input.files?.[0]; if (!file) return;
  STATE.pendingFile = file; STATE.pendingFileUrl = URL.createObjectURL(file); STATE.pendingFileType = file.type.startsWith('video/') ? 'video' : 'image';
  const preview = qs('#attachment-preview'); if (preview){ preview.classList.remove('hidden'); preview.innerHTML = `<div class="attachment-thumb">${STATE.pendingFileType === 'video' ? `<video src="${STATE.pendingFileUrl}" muted></video>` : `<img src="${STATE.pendingFileUrl}" alt="preview">`}<span class="attachment-remove" onclick="clearAttachment()">✕</span></div>`; }
  input.value = '';
}
function clearAttachment(){ STATE.pendingFile = null; STATE.pendingFileUrl = null; STATE.pendingFileType = null; qs('#attachment-preview')?.classList.add('hidden'); qs('#attachment-preview').innerHTML = ''; }

async function shareLocation(){
  if (!navigator.geolocation) return toast('Geolocation not supported', 'error');
  navigator.geolocation.getCurrentPosition(
    pos => { STATE.pendingLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Current location' }; toast('Location ready. Tap send.', 'success'); },
    () => toast('Location permission denied', 'error'),
    { enableHighAccuracy: true, timeout: 12000 }
  );
}
async function sendLocationMessage(loc){
  try {
    const msg = await sendMessage({ convId: STATE.currentConvId, content: null, contentType: 'location', metadata: { ...loc, label: loc.label || 'Shared location' } });
    STATE.messages.push(msg); renderMessages(STATE.messages); scrollToBottom(); await loadAndRenderConversations();
  } catch (e){ toast(e.message || 'Failed to send location', 'error'); }
}

async function startRecording(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.audioChunks = []; STATE.mediaRecorder = new MediaRecorder(stream);
    STATE.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) STATE.audioChunks.push(e.data); };
    STATE.mediaRecorder.onstop = onRecordingStop;
    STATE.mediaRecorder.start(100); STATE.isRecording = true; STATE.recordingSeconds = 0;
    qs('#recording-indicator')?.classList.remove('hidden');
    const micBtn = qs('#mic-btn'); if (micBtn) micBtn.style.color = 'var(--danger)';
    STATE.recordingTimer = setInterval(() => { STATE.recordingSeconds++; qs('#rec-time') && (qs('#rec-time').textContent = formatDuration(STATE.recordingSeconds)); if (STATE.recordingSeconds >= 300) stopRecording(); }, 1000);
  } catch { toast('Microphone access denied', 'error'); }
}
async function toggleRecording(){ if (STATE.isRecording) stopRecording(); else await startRecording(); }
function stopRecording(){
  if (!STATE.mediaRecorder || STATE.mediaRecorder.state === 'inactive') return;
  STATE.mediaRecorder.stop(); try { STATE.mediaRecorder.stream.getTracks().forEach(t => t.stop()); } catch {}
  clearInterval(STATE.recordingTimer); STATE.isRecording = false; STATE.recordedDuration = STATE.recordingSeconds; qs('#recording-indicator')?.classList.add('hidden'); const micBtn = qs('#mic-btn'); if (micBtn) micBtn.style.color = '';
}
function onRecordingStop(){ STATE.recordedBlob = new Blob(STATE.audioChunks, { type: 'audio/webm' }); STATE.audioChunks = []; qs('#voice-preview')?.classList.remove('hidden'); qs('#voice-preview-dur') && (qs('#voice-preview-dur').textContent = formatDuration(STATE.recordedDuration)); }
let _previewAudio = null;
function previewRecording(){
  if (!STATE.recordedBlob) return; const btn = qs('#preview-play-btn');
  if (_previewAudio && !_previewAudio.paused){ _previewAudio.pause(); btn && (btn.innerHTML = icons.play); return; }
  const url = URL.createObjectURL(STATE.recordedBlob); _previewAudio = new Audio(url); _previewAudio.play(); btn && (btn.innerHTML = icons.pause); _previewAudio.onended = () => { btn && (btn.innerHTML = icons.play); };
}
function discardRecording(){ STATE.recordedBlob = null; STATE.recordedDuration = 0; qs('#voice-preview')?.classList.add('hidden'); if (_previewAudio){ _previewAudio.pause(); _previewAudio = null; } }
async function sendVoiceMessage(blob, duration){
  const btn = qs('.send-btn'); if (btn){ btn.disabled = true; btn.innerHTML = `<span class="spinner-sm" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span>`; }
  try {
    const fileUrl = await uploadFile('voice-messages', `${STATE.user.id}/${Date.now()}.webm`, blob);
    const msg = await sendMessage({ convId: STATE.currentConvId, content: null, contentType: 'voice', fileUrl, metadata: { duration } });
    STATE.messages.push(msg); renderMessages(STATE.messages); scrollToBottom(); await loadAndRenderConversations();
  } catch (e){ toast(e.message || 'Failed to send voice', 'error'); }
  finally { if (btn){ btn.disabled = false; btn.innerHTML = icons.send; } }
}
function playVoice(url, btn){
  if (btn._audio && !btn._audio.paused){ btn._audio.pause(); btn.innerHTML = icons.play; return; }
  qsa('.voice-play-btn').forEach(b => { if (b._audio && !b._audio.paused){ b._audio.pause(); b.innerHTML = icons.play; } });
  const audio = new Audio(url); btn._audio = audio; audio.play(); btn.innerHTML = icons.pause; audio.onended = () => { btn.innerHTML = icons.play; };
}

function subscribeToMessages(convId){
  unsubscribeMessages();
  STATE.msgSubscription = sb.channel(`messages:${convId}`)
    .on('postgres_changes', { event:'*', schema:'public', table:'messages', filter:`conversation_id=eq.${convId}` }, async () => { if (STATE.currentConvId === convId){ appendOrRefreshMessages(); await loadAndRenderConversations(); } })
    .subscribe();
}
function subscribeToConversations(){
  if (STATE.convSubscription) sb.removeChannel(STATE.convSubscription);
  STATE.convSubscription = sb.channel('conversations-watch')
    .on('postgres_changes', { event:'*', schema:'public', table:'conversation_members', filter:`user_id=eq.${STATE.user.id}` }, () => loadAndRenderConversations())
    .on('postgres_changes', { event:'*', schema:'public', table:'conversations' }, () => loadAndRenderConversations())
    .subscribe();
}
function subscribeToProfiles(){
  if (STATE.profileSubscription) sb.removeChannel(STATE.profileSubscription);
  STATE.profileSubscription = sb.channel('profiles-watch')
    .on('postgres_changes', { event:'*', schema:'public', table:'profiles' }, payload => {
      const row = payload.new || payload.old; if (!row?.id) return;
      if (row.id === STATE.user?.id){ STATE.profile = payload.new || STATE.profile; renderSidebar(); }
      if (STATE.currentConvPeer?.id === row.id){ STATE.currentConvPeer = payload.new || STATE.currentConvPeer; updateConversationHeader(); }
      if (STATE.currentConvId) loadAndRenderConversations();
    }).subscribe();
}
function subscribeToStatuses(){
  if (STATE.statusSubscription) sb.removeChannel(STATE.statusSubscription);
  STATE.statusSubscription = sb.channel('status-watch')
    .on('postgres_changes', { event:'*', schema:'public', table:'status_posts' }, () => loadStatuses())
    .subscribe();
}
function unsubscribeMessages(){ if (STATE.msgSubscription) { sb.removeChannel(STATE.msgSubscription); STATE.msgSubscription = null; } }
function unsubscribeAll(){ unsubscribeMessages(); if (STATE.convSubscription){ sb.removeChannel(STATE.convSubscription); STATE.convSubscription = null; } if (STATE.profileSubscription){ sb.removeChannel(STATE.profileSubscription); STATE.profileSubscription = null; } if (STATE.statusSubscription){ sb.removeChannel(STATE.statusSubscription); STATE.statusSubscription = null; } clearInterval(STATE.presenceTimer); clearInterval(STATE.seenTimer); }
function startPresenceLoop(){
  clearInterval(STATE.presenceTimer); clearInterval(STATE.seenTimer); if (!STATE.user) return;
  touchPresence(STATE.profile?.status_text || 'Available');
  STATE.presenceTimer = setInterval(() => { if (document.visibilityState === 'visible') touchPresence(STATE.profile?.status_text || 'Available'); }, 25000);
  STATE.seenTimer = setInterval(() => { if (STATE.currentConvId && document.visibilityState === 'visible') markSeen(STATE.currentConvId).catch(()=>{}); }, 12000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { touchPresence(STATE.profile?.status_text || 'Available'); if (STATE.currentConvId) markSeen(STATE.currentConvId).catch(()=>{}); } });
}

function openNewChatModal(){
  const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='new-chat-overlay';
  overlay.innerHTML = `<div class="modal" onclick="event.stopPropagation()"><div class="modal-header"><span class="modal-title">Start New Chat</span><button class="modal-close" onclick="closeNewChatModal()">${icons.close}</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Search Users</label><input type="search" class="form-input" id="user-search-input" placeholder="Search by username or name…" oninput="searchUsers(this.value)" autofocus></div><div id="user-search-results" class="user-search-results"><div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div></div></div></div>`;
  overlay.onclick = closeNewChatModal; document.body.appendChild(overlay);
}
function closeNewChatModal(){ qs('#new-chat-overlay')?.remove(); }
const searchUsers = debounce(async query => {
  const resultsEl = qs('#user-search-results'); if (!resultsEl) return;
  const q = String(query || '').trim();
  if (!q){ resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div>`; return; }
  resultsEl.innerHTML = `<div class="loading-inline"><span class="spinner-sm"></span> Searching…</div>`;
  try {
    const { data, error } = await sb.from('profiles').select('id, display_name, username, avatar_url, nationality, status_text, is_online, last_seen').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id', STATE.user.id).limit(10);
    if (error) throw error;
    if (!data?.length){ resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">No users found</div>`; return; }
    resultsEl.innerHTML = data.map(u => `<div class="user-result-item" onclick="startChatWith('${escHtml(u.id)}')">${avatarHtml(u,'sm')}<div class="user-result-info"><div class="user-result-name">${escHtml(u.display_name || u.username || 'Unknown')}</div><div class="user-result-username">@${escHtml(u.username || '')}${u.status_text ? ` · ${escHtml(u.status_text)}` : ''}</div></div></div>`).join('');
  } catch { resultsEl.innerHTML = `<div style="font-size:13px;color:var(--danger);padding:16px">Search failed</div>`; }
}, 350);
async function startChatWith(peerId){
  closeNewChatModal();
  try {
    const conv = await createDirectConversation(peerId);
    const peerProfile = await fetchProfile(peerId);
    if (!STATE.conversations.find(c => c.id === conv.id)) STATE.conversations.unshift({ ...conv, peerProfile });
    renderConversationList(STATE.conversations);
    openConversation(conv.id);
  } catch (e){ toast(`Could not start chat: ${e.message}`, 'error'); }
}

function openGroupModal(){
  STATE.selectingGroupMembers = [];
  const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='group-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:620px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">Create Group</span><button class="modal-close" onclick="closeGroupModal()">${icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Group Name</label><input class="form-input" id="group-name" placeholder="Family, Friends, Team"></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="group-desc" placeholder="Optional"></div>
        <div class="form-group"><label class="form-label">Search Members</label><input class="form-input" id="group-search" placeholder="Search users" oninput="searchGroupMembers(this.value)"></div>
        <div id="group-member-results" class="user-search-results"><div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div></div>
        <div id="group-selected" class="divider"></div>
        <button class="btn btn-primary" onclick="createGroupNow()">Create Group</button>
      </div>
    </div>`;
  overlay.onclick = closeGroupModal; document.body.appendChild(overlay);
}
function closeGroupModal(){ qs('#group-overlay')?.remove(); }
const searchGroupMembers = debounce(async query => {
  const resultsEl = qs('#group-member-results'); if (!resultsEl) return;
  const q = String(query || '').trim();
  if (!q){ resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">Type to search users</div>`; return; }
  try {
    const { data } = await sb.from('profiles').select('id, display_name, username, avatar_url, status_text').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id', STATE.user.id).limit(12);
    if (!data?.length){ resultsEl.innerHTML = `<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px">No users found</div>`; return; }
    resultsEl.innerHTML = data.map(u => `<div class="group-member-item" onclick="toggleGroupMember('${escHtml(u.id)}')">${avatarHtml(u,'sm')}<div class="user-result-info"><div class="user-result-name">${escHtml(u.display_name || u.username || 'Unknown')}</div><div class="user-result-username">@${escHtml(u.username || '')}</div></div><button class="btn-chip ${STATE.selectingGroupMembers.includes(u.id) ? 'active' : ''}">${STATE.selectingGroupMembers.includes(u.id) ? 'Added' : 'Add'}</button></div>`).join('');
  } catch {}
}, 350);
function toggleGroupMember(id){
  const idx = STATE.selectingGroupMembers.indexOf(id);
  if (idx >= 0) STATE.selectingGroupMembers.splice(idx, 1);
  else STATE.selectingGroupMembers.push(id);
  const input = qs('#group-search'); if (input) searchGroupMembers(input.value);
}
async function createGroupNow(){
  const name = qs('#group-name')?.value.trim();
  const desc = qs('#group-desc')?.value.trim() || '';
  if (!name) return toast('Group name is required', 'error');
  try {
    const conv = await createGroupConversation(name, STATE.selectingGroupMembers, desc, null);
    closeGroupModal();
    await loadAndRenderConversations();
    openConversation(conv.id);
  } catch (e){ toast(e.message || 'Could not create group', 'error'); }
}
function openGroupInfoModal(){ toast('Group settings can be added here', 'info'); }

function openStatusModal(){
  const p = STATE.profile || {};
  const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='status-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:620px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">Status & Privacy</span><button class="modal-close" onclick="closeStatusModal()">${icons.close}</button></div>
      <div class="modal-body">
        <div class="profile-avatar-section"><div class="avatar xl">${escHtml(getInitials(p.display_name || 'You'))}</div></div>
        <div class="form-group"><label class="form-label">Status</label><input class="form-input" id="status-text" value="${escHtml(p.status_text || 'Available')}" placeholder="Available"></div>
        <div class="form-group"><label class="form-label">Status privacy</label><select class="form-input" id="status-privacy"><option value="public" ${p.status_privacy === 'public' ? 'selected' : ''}>Everyone</option><option value="contacts" ${p.status_privacy === 'contacts' ? 'selected' : ''}>Contacts</option><option value="selected" ${p.status_privacy === 'selected' ? 'selected' : ''}>Selected users</option><option value="only_me" ${p.status_privacy === 'only_me' ? 'selected' : ''}>Only me</option></select></div>
        <div class="form-group"><label class="form-label">Selected users (comma usernames)</label><input class="form-input" id="status-targets" placeholder="john, alice" value=""></div>
        <button class="btn btn-primary" onclick="saveStatusSettings()">Save Status</button>
      </div>
    </div>`;
  overlay.onclick = closeStatusModal; document.body.appendChild(overlay);
}
function closeStatusModal(){ qs('#status-overlay')?.remove(); }
async function saveStatusSettings(){
  const status_text = qs('#status-text')?.value.trim() || 'Available';
  const status_privacy = qs('#status-privacy')?.value || 'public';
  const targetNames = (qs('#status-targets')?.value || '').split(',').map(s => normalizeUsername(s)).filter(Boolean);
  let privacy_targets = [];
  if (status_privacy === 'selected' && targetNames.length){
    const { data } = await sb.from('profiles').select('id, username').in('username', targetNames);
    privacy_targets = (data || []).map(x => x.id);
  }
  try {
    await upsertProfile({ ...STATE.profile, status_text, status_privacy, updated_at: new Date().toISOString(), is_online: true, last_seen: new Date().toISOString() });
    await touchPresence(status_text);
    closeStatusModal(); renderSidebar(); updateConversationHeader();
    toast('Status updated', 'success');
  } catch (e){ toast(e.message || 'Could not update status', 'error'); }
}
async function loadStatuses(){
  try {
    const { data } = await sb.from('status_posts').select('*, user:profiles!status_posts_user_id_fkey(id,display_name,username,avatar_url,status_text,is_online,last_seen)').order('created_at', { ascending: false }).limit(25);
    STATE.statusPosts = data || [];
  } catch {}
}

function openSettingsModal(){
  const p = STATE.profile || {};
  const overlay = document.createElement('div'); overlay.className='modal-overlay'; overlay.id='settings-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:700px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">Settings</span><button class="modal-close" onclick="closeSettingsModal()">${icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Display name</label><input class="form-input" id="set-display-name" value="${escHtml(p.display_name || '')}"></div>
        <div class="form-group"><label class="form-label">Username</label><input class="form-input" id="set-username" value="${escHtml(p.username || '')}"></div>
        <div class="form-group"><label class="form-label">Bio</label><textarea class="form-input" id="set-bio">${escHtml(p.bio || '')}</textarea></div>
        <div class="form-group"><label class="form-label">Nationality</label><input class="form-input" id="set-nationality" value="${escHtml(p.nationality || '')}"></div>
        <div class="form-group"><label class="form-label">Status text</label><input class="form-input" id="set-status-text" value="${escHtml(p.status_text || 'Available')}"></div>
        <div class="form-group"><label class="form-label">Last seen privacy</label><select class="form-input" id="set-last-seen"><option value="all" ${p.last_seen_privacy === 'all' ? 'selected' : ''}>Everyone</option><option value="contacts" ${p.last_seen_privacy === 'contacts' ? 'selected' : ''}>Contacts</option><option value="nobody" ${p.last_seen_privacy === 'nobody' ? 'selected' : ''}>Nobody</option></select></div>
        <div class="form-group"><label class="form-label">Profile photo privacy</label><select class="form-input" id="set-photo"><option value="all" ${p.profile_photo_privacy === 'all' ? 'selected' : ''}>Everyone</option><option value="contacts" ${p.profile_photo_privacy === 'contacts' ? 'selected' : ''}>Contacts</option><option value="nobody" ${p.profile_photo_privacy === 'nobody' ? 'selected' : ''}>Nobody</option></select></div>
        <div class="form-group"><label class="form-label">Read receipts</label><select class="form-input" id="set-rr"><option value="true" ${p.read_receipts_enabled ? 'selected' : ''}>On</option><option value="false" ${!p.read_receipts_enabled ? 'selected' : ''}>Off</option></select></div>
        <div class="form-group"><label class="form-label">Auto-download media</label><select class="form-input" id="set-auto-dl"><option value="true" ${p.media_auto_download ? 'selected' : ''}>On</option><option value="false" ${!p.media_auto_download ? 'selected' : ''}>Off</option></select></div>
        <div class="form-group"><label class="form-label">Save to gallery</label><select class="form-input" id="set-gallery"><option value="true" ${p.save_to_gallery ? 'selected' : ''}>On</option><option value="false" ${!p.save_to_gallery ? 'selected' : ''}>Off</option></select></div>
        <div class="form-group"><label class="form-label">Low data mode</label><select class="form-input" id="set-low-data"><option value="true" ${p.low_data_mode ? 'selected' : ''}>On</option><option value="false" ${!p.low_data_mode ? 'selected' : ''}>Off</option></select></div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
      </div>
    </div>`;
  overlay.onclick = closeSettingsModal; document.body.appendChild(overlay);
}
function closeSettingsModal(){ qs('#settings-overlay')?.remove(); }
async function saveSettings(){
  try {
    const data = {
      display_name: qs('#set-display-name')?.value.trim(),
      username: normalizeUsername(qs('#set-username')?.value),
      bio: qs('#set-bio')?.value.trim(),
      nationality: qs('#set-nationality')?.value.trim(),
      status_text: qs('#set-status-text')?.value.trim() || 'Available',
      last_seen_privacy: qs('#set-last-seen')?.value,
      profile_photo_privacy: qs('#set-photo')?.value,
      read_receipts_enabled: qs('#set-rr')?.value === 'true',
      media_auto_download: qs('#set-auto-dl')?.value === 'true',
      save_to_gallery: qs('#set-gallery')?.value === 'true',
      low_data_mode: qs('#set-low-data')?.value === 'true',
      updated_at: new Date().toISOString(),
    };
    const avail = await isUsernameAvailable(data.username); if (!avail && data.username !== STATE.profile?.username) throw new Error('Username taken');
    await upsertProfile(data); closeSettingsModal(); renderSidebar(); updateConversationHeader(); toast('Settings updated', 'success');
  } catch (e){ toast(e.message || 'Could not save settings', 'error'); }
}

function openLightbox(url){ const lb = document.createElement('div'); lb.id = 'lightbox'; lb.innerHTML = `<img src="${escHtml(url)}" alt="Full image"><button id="lightbox-close" onclick="closeLightbox()">${icons.close}</button>`; lb.onclick = closeLightbox; document.body.appendChild(lb); }
function closeLightbox(){ qs('#lightbox')?.remove(); }

function showSidebar(){ qs('#sidebar')?.classList.add('open'); STATE.sidebarOpen = true; }
function closeSidebar(){ if (window.innerWidth > 768) return; qs('#sidebar')?.classList.remove('open'); STATE.sidebarOpen = false; }

async function bootToApp(){
  showScreen('app-screen'); renderSidebar(); renderWelcomeScreen(); await loadAndRenderConversations(); subscribeToConversations(); subscribeToProfiles(); subscribeToStatuses(); startPresenceLoop(); await loadStatuses(); STATE.booted = true;
}
async function restoreFromSession(session){
  if (!session?.user) return false;
  STATE.user = session.user;
  try { await Promise.race([ loadMyProfile(), new Promise((_, rej) => setTimeout(()=>rej(new Error('Profile load timeout')), 6000)) ]); } catch (e){ console.warn(e.message); }
  if (needsProfileSetup()) { showScreen('profile-setup-screen'); renderProfileSetup(); } else { await bootToApp(); }
  return true;
}
async function initApp(){
  showScreen('loading-screen'); renderAuthScreen();
  const bootTimeout = setTimeout(() => { if (!STATE.booted) { showScreen('auth-screen'); renderAuthScreen(); } }, 10000);
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) { clearTimeout(bootTimeout); await restoreFromSession(session); }
        } else if (event === 'SIGNED_OUT') {
          STATE.booted = false; STATE.user = null; STATE.profile = null; unsubscribeAll(); showScreen('auth-screen'); renderAuthScreen();
        }
      } catch (e) { console.error(e); }
    }, 0);
  });
  try { const { data, error } = await sb.auth.getSession(); if (error) throw error; const session = data?.session || null; if (session?.user) { clearTimeout(bootTimeout); await restoreFromSession(session); return; } clearTimeout(bootTimeout); showScreen('auth-screen'); renderAuthScreen(); }
  catch (e){ clearTimeout(bootTimeout); console.error(e); showScreen('auth-screen'); renderAuthScreen(); }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeLightbox(); closeNewChatModal(); closeGroupModal(); closeStatusModal(); closeSettingsModal(); closeMessageActions(); closeEditMessage(); } });
window.addEventListener('online', () => { if (STATE.user) touchPresence(STATE.profile?.status_text || 'Available'); });
window.addEventListener('beforeunload', () => { try { if (STATE.user) touchPresence(STATE.profile?.status_text || 'Available'); } catch {} });
window.addEventListener('DOMContentLoaded', initApp);
