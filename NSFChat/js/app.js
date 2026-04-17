import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://hzrxjaxrmpnfwksdhakf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cnhqYXhybXBuZndrc2RoYWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTIzOTUsImV4cCI6MjA5MTk4ODM5NX0.Di0nZVHkXWl8Y5wH4XzB5INuZsCApRLy2FW04TVo4DM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

const state = {
  session: null,
  user: null,
  profile: null,
  conversations: [],
  activeConversationId: null,
  activeMessages: [],
  profilesById: new Map(),
  presence: new Map(),
  conversationsSubscribed: false,
  currentChannel: null,
  voiceRecorder: null,
  voiceStream: null,
  voiceChunks: [],
  recordedVoiceBlob: null,
  recordedVoiceUrl: null,
  selectedImageFile: null,
  loading: true,
  chatSearch: '',
  peopleSearch: '',
  pendingModal: null
};

const $ = (id) => document.getElementById(id);
const els = {
  bootScreen: $('boot-screen'),
  authScreen: $('auth-screen'),
  shell: $('shell'),
  signinForm: $('signin-form'),
  signupForm: $('signup-form'),
  tabSignin: $('tab-signin'),
  tabSignup: $('tab-signup'),
  forgotPassword: $('forgot-password'),
  signoutBtn: $('signout-btn'),
  topbarAvatar: $('topbar-avatar'),
  profileBtn: $('profile-btn'),
  editProfileBtn: $('edit-profile-btn'),
  openProfileFromChat: $('open-profile-from-chat'),
  newChatBtn: $('new-chat-btn'),
  newChatBtn2: $('new-chat-btn-2'),
  newChatBtn3: $('new-chat-btn-3'),
  chatList: $('chat-list'),
  chatCount: $('chat-count'),
  globalSearch: $('global-search'),
  mobileSearch: $('mobile-search'),
  messageList: $('message-list'),
  conversationEmpty: $('conversation-empty'),
  conversationView: $('conversation-view'),
  conversationTitle: $('conversation-title'),
  conversationMeta: $('conversation-meta'),
  conversationAvatar: $('conversation-avatar'),
  composer: $('composer'),
  messageInput: $('message-input'),
  sendBtn: $('send-btn'),
  imageInput: $('image-input'),
  voiceInput: $('voice-input'),
  attachImageBtn: $('attach-image-btn'),
  voiceToggleBtn: $('voice-toggle-btn'),
  composerPreview: $('composer-preview'),
  voicePanel: $('voice-panel'),
  voiceIndicator: $('voice-indicator'),
  voiceText: $('voice-text'),
  voicePreview: $('voice-preview'),
  recordStartBtn: $('record-start-btn'),
  recordStopBtn: $('record-stop-btn'),
  recordSendBtn: $('record-send-btn'),
  recordDiscardBtn: $('record-discard-btn'),
  mobileSidebarToggle: $('mobile-sidebar-toggle'),
  backToChats: $('back-to-chats'),
  sidebar: $('sidebar'),
  mobileNavChats: $('mobile-nav-chats'),
  mobileNavNew: $('mobile-nav-new'),
  mobileNavProfile: $('mobile-nav-profile'),
  mobileNavButtons: Array.from(document.querySelectorAll('.mobile-nav-btn')),
  modalLayer: $('modal-layer'),
  modalBackdrop: $('modal-backdrop'),
  modalCard: $('modal-card'),
  toastStack: $('toast-stack'),
  connectionState: $('connection-state'),
  profileRailAvatar: $('profile-rail-avatar'),
  profileRailName: $('profile-rail-name'),
  profileRailUsername: $('profile-rail-username'),
  mobileOnly: Array.from(document.querySelectorAll('.mobile-only')),
  desktopOnly: Array.from(document.querySelectorAll('.desktop-only'))
};

const DEFAULT_AVATAR = (name = 'User') => {
  const safe = encodeURIComponent(name.trim() || 'User');
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="64" fill="#111827"/>
      <circle cx="128" cy="104" r="46" fill="url(#g)"/>
      <path d="M48 216c10-36 40-56 80-56s70 20 80 56" fill="url(#g)"/>
      <text x="128" y="150" font-size="42" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="700">${safe.slice(0,2).toUpperCase()}</text>
    </svg>
  `)}`;
};

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTime(dateLike) {
  if (!dateLike) return '';
  const date = new Date(dateLike);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatShortDate(dateLike) {
  if (!dateLike) return '';
  const date = new Date(dateLike);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function timeAgo(dateLike) {
  if (!dateLike) return 'Offline';
  const then = new Date(dateLike).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(dateLike);
}

function toast(message, type = 'info', timeout = 3600) {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  els.toastStack.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(4px)';
    node.style.transition = 'all 0.2s ease';
    setTimeout(() => node.remove(), 220);
  }, timeout);
}

function setConnectionState(text, tone = 'ok') {
  els.connectionState.textContent = text;
  els.connectionState.style.color = tone === 'ok' ? '#86efac' : tone === 'warn' ? '#fbbf24' : '#fca5a5';
}

function setLoading(isLoading) {
  state.loading = isLoading;
  els.bootScreen.classList.toggle('hidden', !isLoading);
}

function showAuth() {
  els.authScreen.classList.remove('hidden');
  els.shell.classList.add('hidden');
  setLoading(false);
}

function showShell() {
  els.authScreen.classList.add('hidden');
  els.shell.classList.remove('hidden');
  setLoading(false);
}

function openModal(content) {
  els.modalCard.innerHTML = content;
  els.modalLayer.classList.remove('hidden');
  els.modalLayer.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  els.modalLayer.classList.add('hidden');
  els.modalLayer.setAttribute('aria-hidden', 'true');
  els.modalCard.innerHTML = '';
  state.pendingModal = null;
}

function setActiveAuthTab(tab) {
  const signIn = tab === 'signin';
  els.tabSignin.classList.toggle('active', signIn);
  els.tabSignup.classList.toggle('active', !signIn);
  els.tabSignin.setAttribute('aria-selected', String(signIn));
  els.tabSignup.setAttribute('aria-selected', String(!signIn));
  els.signinForm.hidden = !signIn;
  els.signupForm.hidden = signIn;
  els.signinForm.classList.toggle('active', signIn);
  els.signupForm.classList.toggle('active', !signIn);
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}

function currentUserId() {
  return state.session?.user?.id || null;
}

function userAvatar(profile, fallbackName = 'User') {
  const url = profile?.avatar_url || '';
  return url || DEFAULT_AVATAR(profile?.display_name || fallbackName);
}

function conversationLabel(conversation) {
  if (!conversation) return 'Conversation';
  if (conversation.kind === 'group') return conversation.title || 'Group chat';
  const members = conversation.members || [];
  const other = members.find((m) => m.user_id !== currentUserId())?.profile;
  return other?.display_name || other?.username || conversation.title || 'Direct chat';
}

function conversationSubtitle(conversation) {
  if (!conversation) return '';
  if (conversation.kind === 'group') {
    return `${conversation.members?.length || 0} members`;
  }
  const members = conversation.members || [];
  const other = members.find((m) => m.user_id !== currentUserId())?.profile;
  if (!other) return 'Direct chat';
  const online = isProfileOnline(other.id);
  return online ? 'Online now' : `Last active ${timeAgo(other.last_seen_at)}`;
}

function previewMessage(message) {
  if (!message) return 'No messages yet';
  if (message.content_type === 'image') return 'Sent an image';
  if (message.content_type === 'voice') return 'Sent a voice note';
  const text = (message.content || '').trim();
  return text ? text : 'Attachment';
}

function isProfileOnline(userId) {
  if (!userId) return false;
  if (state.presence.has(userId)) return true;
  const profile = state.profilesById.get(userId);
  if (!profile?.last_seen_at) return false;
  return (Date.now() - new Date(profile.last_seen_at).getTime()) < 2 * 60 * 1000;
}

function updateOnlinePresenceUi() {
  renderConversationHeader();
  renderChatList();
  renderProfileRail();
}

function renderProfileRail() {
  const profile = state.profile || {};
  els.profileRailAvatar.src = userAvatar(profile, profile.display_name || 'You');
  els.profileRailName.textContent = profile.display_name || 'Your profile';
  els.profileRailUsername.textContent = profile.username ? `@${profile.username}` : 'No username yet';
  els.topbarAvatar.src = userAvatar(profile, profile.display_name || 'You');
  els.topbarAvatar.alt = profile.display_name || 'Avatar';
}

function renderChatList() {
  const search = (state.chatSearch || '').trim().toLowerCase();
  const conversations = state.conversations.filter((conversation) => {
    if (!search) return true;
    const name = conversationLabel(conversation).toLowerCase();
    const subtitle = conversationSubtitle(conversation).toLowerCase();
    const preview = previewMessage(conversation.lastMessage).toLowerCase();
    return name.includes(search) || subtitle.includes(search) || preview.includes(search);
  });

  els.chatCount.textContent = `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`;
  if (!conversations.length) {
    els.chatList.innerHTML = `<div class="empty-list">No chats yet. Start one from the New chat button.</div>`;
    return;
  }

  els.chatList.innerHTML = conversations.map((conversation) => {
    const other = conversation.members?.find((m) => m.user_id !== currentUserId())?.profile;
    const avatar = conversation.kind === 'group'
      ? DEFAULT_AVATAR(conversation.title || 'Group')
      : userAvatar(other, conversationLabel(conversation));
    const name = conversationLabel(conversation);
    const active = conversation.id === state.activeConversationId;
    const online = conversation.kind === 'group' ? false : isProfileOnline(other?.id);
    const lastText = previewMessage(conversation.lastMessage);
    const lastTime = conversation.lastMessage?.created_at ? formatTime(conversation.lastMessage.created_at) : '';
    return `
      <article class="chat-item ${active ? 'active' : ''}" data-conversation-id="${conversation.id}">
        <div class="chat-avatar-wrap">
          <img class="chat-avatar" src="${avatar}" alt="" />
          <span class="presence-dot ${online ? 'online' : ''}"></span>
        </div>
        <div class="chat-meta">
          <strong>${escapeHtml(name)}</strong>
          <p>${escapeHtml(lastText)}</p>
        </div>
        <div class="chat-time">${escapeHtml(lastTime)}</div>
      </article>
    `;
  }).join('');

  els.chatList.querySelectorAll('.chat-item').forEach((item) => {
    item.addEventListener('click', () => openConversation(item.dataset.conversationId));
  });
}

function renderConversationHeader() {
  const conversation = state.conversations.find((c) => c.id === state.activeConversationId);
  if (!conversation) return;
  const title = conversationLabel(conversation);
  const subtitle = conversationSubtitle(conversation);
  const other = conversation.members?.find((m) => m.user_id !== currentUserId())?.profile;
  const avatar = conversation.kind === 'group'
    ? DEFAULT_AVATAR(conversation.title || 'Group')
    : userAvatar(other, title);
  els.conversationTitle.textContent = title;
  els.conversationMeta.textContent = subtitle;
  els.conversationAvatar.src = avatar;
  els.conversationAvatar.alt = title;
  els.conversationEmpty.classList.add('hidden');
  els.conversationView.classList.remove('hidden');
  document.title = `${title} • NSFChat`;
}

function renderMessages() {
  const convo = state.conversations.find((c) => c.id === state.activeConversationId);
  if (!convo) {
    els.messageList.innerHTML = '';
    els.conversationEmpty.classList.remove('hidden');
    els.conversationView.classList.add('hidden');
    return;
  }

  const messages = state.activeMessages || [];
  if (!messages.length) {
    els.messageList.innerHTML = `
      <div class="empty-list">
        <strong>No messages yet.</strong><br />
        Say hello, share an image, or record a voice note.
      </div>
    `;
    return;
  }

  let html = '';
  let lastDay = '';
  messages.forEach((message) => {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      html += `<div class="message-day">${escapeHtml(formatShortDate(message.created_at))}</div>`;
      lastDay = day;
    }

    const mine = message.sender_id === currentUserId();
    const senderProfile = state.profilesById.get(message.sender_id);
    const senderName = mine ? 'You' : (senderProfile?.display_name || senderProfile?.username || 'Member');

    html += `
      <article class="message-row ${mine ? 'mine' : 'theirs'}">
        <span class="message-sender">${escapeHtml(senderName)}</span>
        <div class="message-bubble">
          ${renderMessageBody(message)}
        </div>
        <div class="message-time">${escapeHtml(formatTime(message.created_at))}</div>
      </article>
    `;
  });

  els.messageList.innerHTML = html;
  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function renderMessageBody(message) {
  const type = message.content_type;
  if (type === 'image') {
    return `
      <a class="message-attachment" href="${message.attachment_url || '#'}" target="_blank" rel="noreferrer">
        <img src="${message.attachment_url || ''}" alt="Shared image" loading="lazy" />
      </a>
      ${message.content ? `<div class="message-text">${escapeHtml(message.content)}</div>` : ''}
    `;
  }
  if (type === 'voice') {
    return `
      ${message.content ? `<div class="message-text">${escapeHtml(message.content)}</div>` : ''}
      <audio class="message-audio" controls src="${message.attachment_url || ''}"></audio>
    `;
  }
  return `<div class="message-text">${escapeHtml(message.content || '')}</div>`;
}

async function apiErrorToast(error, fallback = 'Something went wrong') {
  console.error(error);
  const message = error?.message || fallback;
  toast(message, 'error');
}

async function loadMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUserId())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  state.profile = data || {
    id: currentUserId(),
    display_name: state.session?.user?.user_metadata?.display_name || '',
    username: state.session?.user?.user_metadata?.username || '',
    nationality: state.session?.user?.user_metadata?.nationality || '',
    bio: state.session?.user?.user_metadata?.bio || '',
    avatar_url: state.session?.user?.user_metadata?.avatar_url || ''
  };
  state.profilesById.set(state.profile.id, state.profile);
  renderProfileRail();
}

async function loadConversations() {
  const uid = currentUserId();
  if (!uid) return;

  const { data: memberships, error: memError } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, role, joined_at, last_read_at')
    .eq('user_id', uid)
    .order('joined_at', { ascending: false });

  if (memError) throw memError;
  const conversationIds = memberships.map((m) => m.conversation_id);
  if (!conversationIds.length) {
    state.conversations = [];
    renderChatList();
    renderConversationHeader();
    renderMessages();
    return;
  }

  const { data: conversations, error: convoError } = await supabase
    .from('conversations')
    .select('id, kind, title, direct_pair_key, created_by, last_message_at, created_at, updated_at')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (convoError) throw convoError;

  const { data: members, error: membersError } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, role, joined_at, last_read_at, profile:profiles(*)')
    .in('conversation_id', conversationIds);

  if (membersError) throw membersError;

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, content_type, attachment_url, metadata, created_at, updated_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;

  const memberMap = new Map();
  members.forEach((member) => {
    if (!memberMap.has(member.conversation_id)) memberMap.set(member.conversation_id, []);
    const profile = member.profile || null;
    if (profile) state.profilesById.set(profile.id, profile);
    memberMap.get(member.conversation_id).push({
      ...member,
      profile
    });
  });

  const lastMessageMap = new Map();
  messages.forEach((message) => {
    lastMessageMap.set(message.conversation_id, message);
  });

  state.conversations = conversations.map((conversation) => ({
    ...conversation,
    members: memberMap.get(conversation.id) || [],
    lastMessage: lastMessageMap.get(conversation.id) || null
  }));

  state.conversations.sort((a, b) => {
    const aTime = a.last_message_at || a.created_at;
    const bTime = b.last_message_at || b.created_at;
    return new Date(bTime) - new Date(aTime);
  });

  renderChatList();
  updateOnlinePresenceUi();

  if (!state.activeConversationId && state.conversations.length) {
    await openConversation(state.conversations[0].id, { silent: true });
  } else if (state.activeConversationId) {
    const exists = state.conversations.some((c) => c.id === state.activeConversationId);
    if (!exists && state.conversations[0]) {
      await openConversation(state.conversations[0].id, { silent: true });
    }
  }
}

async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, content_type, attachment_url, metadata, created_at, updated_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const resolved = [];
  for (const message of data || []) {
    resolved.push(await resolveMediaUrl(message));
  }
  state.activeMessages = resolved;
  renderMessages();
}

async function resolveMediaUrl(message) {
  if (!message || !message.metadata || !message.metadata.storage_path) return message;
  if (message.attachment_url && !String(message.attachment_url).includes('/storage/v1/object/sign/')) {
    return message;
  }
  const bucket = message.content_type === 'voice' ? 'voice-notes' : 'chat-media';
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(message.metadata.storage_path, 60 * 60 * 12);
    if (error) throw error;
    return { ...message, attachment_url: data.signedUrl };
  } catch (err) {
    console.warn('Failed to resolve signed URL', err);
    return message;
  }
}

async function openConversation(conversationId, options = {}) {
  const convo = state.conversations.find((c) => c.id === conversationId);
  if (!convo) return;
  state.activeConversationId = conversationId;
  els.sidebar.classList.remove('open');
  state.activeMessages = [];
  renderChatList();
  renderConversationHeader();
  if (!options.silent) {
    setConnectionState('Loading messages…', 'warn');
  }
  await loadMessages(conversationId);
  setConnectionState('Connected', 'ok');
}

function clearComposerPreview() {
  els.composerPreview.innerHTML = '';
  els.composerPreview.classList.add('hidden');
  state.selectedImageFile = null;
  if (state.recordedVoiceUrl) {
    URL.revokeObjectURL(state.recordedVoiceUrl);
  }
  state.recordedVoiceBlob = null;
  state.recordedVoiceUrl = null;
  els.voicePreview.src = '';
  els.voicePreview.classList.add('hidden');
  els.voiceText.textContent = 'Ready to record';
  els.voiceIndicator.classList.remove('recording');
  els.recordSendBtn.disabled = true;
  els.recordDiscardBtn.disabled = true;
}

function showImagePreview(file) {
  const url = URL.createObjectURL(file);
  state.selectedImageFile = file;
  els.composerPreview.innerHTML = `
    <div class="preview-card">
      <strong>Image preview</strong>
      <img src="${url}" alt="Image preview" />
      <small>${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(1)} MB</small>
    </div>
  `;
  els.composerPreview.classList.remove('hidden');
}

function showVoicePreview(blob) {
  const url = URL.createObjectURL(blob);
  state.recordedVoiceBlob = blob;
  state.recordedVoiceUrl = url;
  els.voicePreview.src = url;
  els.voicePreview.classList.remove('hidden');
  els.recordSendBtn.disabled = false;
  els.recordDiscardBtn.disabled = false;
  els.voiceText.textContent = `Recorded ${(blob.size / 1024).toFixed(0)} KB`;
}

async function ensureUniqueUsername(username, ignoreId = null) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username);

  if (error) throw error;
  const clashes = (data || []).filter((row) => row.id !== ignoreId);
  return clashes.length === 0;
}

function profileEditorHtml(profile = {}) {
  return `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Edit profile</h2>
          <p class="fineprint">Update your display name, username, nationality, bio, and avatar.</p>
        </div>
        <button class="icon-btn" type="button" data-close-modal aria-label="Close">✕</button>
      </div>

      <form id="profile-form" class="modal-grid">
        <div class="grid-2">
          <label>Display name
            <input name="display_name" type="text" value="${escapeHtml(profile.display_name || '')}" required maxlength="60" />
          </label>
          <label>Username
            <input name="username" type="text" value="${escapeHtml(profile.username || '')}" required minlength="3" maxlength="24" />
          </label>
        </div>
        <div class="grid-2">
          <label>Nationality
            <input name="nationality" type="text" value="${escapeHtml(profile.nationality || '')}" maxlength="48" />
          </label>
          <label>Avatar URL
            <input name="avatar_url" type="url" placeholder="https://..." value="${escapeHtml(profile.avatar_url || '')}" />
          </label>
        </div>
        <label>Bio
          <textarea name="bio" rows="4" maxlength="240">${escapeHtml(profile.bio || '')}</textarea>
        </label>
        <div class="modal-grid">
          <input id="profile-avatar-file" type="file" accept="image/*" />
          <p class="fineprint">You can also upload an avatar image. It will be stored in Supabase Storage.</p>
        </div>
        <div class="grid-2">
          <button class="primary-btn" type="submit">Save profile</button>
          <button class="ghost-btn" type="button" data-close-modal>Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function newChatHtml(results = [], loading = false, search = '') {
  const rows = loading
    ? `<div class="loading-inline">Searching…</div>`
    : results.length
      ? results.map((profile) => {
          const avatar = userAvatar(profile, profile.display_name || profile.username || 'User');
          const online = isProfileOnline(profile.id);
          const conv = state.conversations.find((conversation) =>
            conversation.kind === 'direct'
            && conversation.members?.some((m) => m.user_id === profile.id)
          );
          const buttonText = conv ? 'Open chat' : 'Start chat';
          return `
            <article class="result-item">
              <img class="result-avatar" src="${avatar}" alt="" />
              <div>
                <strong>${escapeHtml(profile.display_name || 'Unnamed')}</strong>
                <p>@${escapeHtml(profile.username || 'unknown')} · ${escapeHtml(profile.nationality || 'No nationality listed')} · ${online ? 'Online' : `Last seen ${timeAgo(profile.last_seen_at)}`}</p>
              </div>
              <button class="secondary-btn" type="button" data-start-chat="${profile.id}">${buttonText}</button>
            </article>
          `;
        }).join('')
      : `<div class="empty-list">No matching users found for “${escapeHtml(search)}”.</div>`;

  return `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Start a new chat</h2>
          <p class="fineprint">Search by username or display name. Direct conversations are created instantly.</p>
        </div>
        <button class="icon-btn" type="button" data-close-modal aria-label="Close">✕</button>
      </div>

      <label>Search people
        <input id="people-search-input" type="search" placeholder="Find someone…" value="${escapeHtml(search)}" />
      </label>

      <div class="modal-results">
        ${rows}
      </div>
    </div>
  `;
}

function profileDrawerHtml(profile = {}) {
  return `
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Your profile</h2>
          <p class="fineprint">Manage the public details that other people see.</p>
        </div>
        <button class="icon-btn" type="button" data-close-modal aria-label="Close">✕</button>
      </div>

      <div class="profile-card" style="margin:0">
        <img src="${userAvatar(profile, profile.display_name || 'You')}" alt="" class="profile-rail-avatar" />
        <h3>${escapeHtml(profile.display_name || 'Your profile')}</h3>
        <p>@${escapeHtml(profile.username || 'username')}</p>
        <p>${escapeHtml(profile.nationality || 'Nationality not set')}</p>
        <p>${escapeHtml(profile.bio || 'No bio yet.')}</p>
      </div>

      <button id="profile-edit-inline" class="primary-btn" type="button">Edit profile</button>
    </div>
  `;
}

async function openProfileEditor() {
  openModal(profileEditorHtml(state.profile || {}));
  const form = $('profile-form');
  const closeButtons = Array.from(document.querySelectorAll('[data-close-modal]'));
  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));

  const fileInput = $('profile-avatar-file');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    form.avatar_url.value = url;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const displayName = String(fd.get('display_name') || '').trim();
    const username = normalizeUsername(fd.get('username'));
    const nationality = String(fd.get('nationality') || '').trim();
    const bio = String(fd.get('bio') || '').trim();
    const avatarInput = fileInput.files?.[0];
    const avatar_url = String(fd.get('avatar_url') || '').trim();

    if (!displayName) return toast('Display name is required.', 'error');
    if (!isValidUsername(username)) return toast('Username must be 3–24 characters and use only letters, numbers, or underscores.', 'error');

    const unique = await ensureUniqueUsername(username, currentUserId());
    if (!unique) return toast('That username is already taken.', 'error');

    let finalAvatarUrl = avatar_url;
    if (avatarInput) {
      const ext = avatarInput.name.split('.').pop() || 'png';
      const path = `${currentUserId()}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarInput, {
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) return apiErrorToast(uploadError, 'Avatar upload failed');
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      finalAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUserId(),
        display_name: displayName,
        username,
        nationality,
        bio,
        avatar_url: finalAvatarUrl
      }, { onConflict: 'id' });

    if (error) return apiErrorToast(error, 'Could not save profile');

    await loadMyProfile();
    renderChatList();
    toast('Profile saved.', 'success');
    closeModal();
  });
}

async function openNewChat(search = '') {
  state.peopleSearch = search;
  openModal(newChatHtml([], false, search));
  const input = $('people-search-input');
  input.focus();

  const closeButtons = Array.from(document.querySelectorAll('[data-close-modal]'));
  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));

  async function runSearch(term) {
    const q = term.trim();
    state.peopleSearch = q;
    openModal(newChatHtml([], true, q));
    attachChatModalHandlers();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, nationality, bio, avatar_url, last_seen_at')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq('id', currentUserId())
      .order('display_name', { ascending: true })
      .limit(20);
    if (error) return apiErrorToast(error, 'Could not search people');
    openModal(newChatHtml(data || [], false, q));
    attachChatModalHandlers();
  }

  function attachChatModalHandlers() {
    const inputEl = $('people-search-input');
    if (inputEl) {
      inputEl.addEventListener('input', debounce((event) => runSearch(event.target.value), 240));
      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          runSearch(inputEl.value);
        }
      });
    }
    document.querySelectorAll('[data-start-chat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const otherId = btn.dataset.startChat;
        await startDirectChat(otherId);
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeModal);
    });
  }

  attachChatModalHandlers();
  if (search) {
    await runSearch(search);
  }
}

async function startDirectChat(otherUserId) {
  try {
    const { data, error } = await supabase.rpc('create_direct_conversation', { other_user_id: otherUserId });
    if (error) throw error;
    const convoId = data?.id || data;
    closeModal();
    await refreshAll({ openConversationId: convoId });
    toast('Chat created.', 'success');
    if (convoId) await openConversation(convoId);
  } catch (error) {
    await apiErrorToast(error, 'Could not create conversation');
  }
}

async function refreshAll(options = {}) {
  await loadConversations();
  if (options.openConversationId) {
    const exists = state.conversations.some((c) => c.id === options.openConversationId);
    if (exists) {
      await openConversation(options.openConversationId, { silent: true });
    }
  } else if (state.activeConversationId) {
    const exists = state.conversations.some((c) => c.id === state.activeConversationId);
    if (exists) {
      await loadMessages(state.activeConversationId);
    }
  }
  renderChatList();
}

async function handleSignIn(event) {
  event.preventDefault();
  const fd = new FormData(els.signinForm);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');

  if (!email || !password) return toast('Please fill in both fields.', 'error');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return apiErrorToast(error, 'Sign in failed');
  state.session = data.session;
  state.user = data.user;
  toast('Welcome back.', 'success');
}

async function handleSignUp(event) {
  event.preventDefault();
  const fd = new FormData(els.signupForm);
  const display_name = String(fd.get('display_name') || '').trim();
  const username = normalizeUsername(fd.get('username'));
  const nationality = String(fd.get('nationality') || '').trim();
  const bio = String(fd.get('bio') || '').trim();
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');

  if (!display_name) return toast('Display name is required.', 'error');
  if (!isValidUsername(username)) return toast('Username must be 3–24 characters and use only letters, numbers, or underscores.', 'error');
  if (password.length < 8) return toast('Password must be at least 8 characters.', 'error');

  const unique = await ensureUniqueUsername(username);
  if (!unique) return toast('That username is already taken.', 'error');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name,
        username,
        nationality,
        bio,
        avatar_url: ''
      }
    }
  });

  if (error) return apiErrorToast(error, 'Sign up failed');

  if (data?.session) {
    state.session = data.session;
    state.user = data.user;
    toast('Account created.', 'success');
  } else {
    toast('Account created. Check your email to confirm sign-in.', 'success', 5000);
  }
}

async function handleForgotPassword() {
  const email = prompt('Enter your account email to receive a password reset link:');
  if (!email) return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) return apiErrorToast(error, 'Could not send reset email');
  toast('Password reset email sent.', 'success');
}

async function handleSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) return apiErrorToast(error, 'Could not sign out');
  cleanupRealtime();
  state.session = null;
  state.user = null;
  state.profile = null;
  state.conversations = [];
  state.activeConversationId = null;
  state.activeMessages = [];
  state.profilesById = new Map();
  showAuth();
  toast('Signed out.', 'success');
}

function cleanupRealtime() {
  if (state.currentChannel) {
    supabase.removeChannel(state.currentChannel);
    state.currentChannel = null;
  }
}

async function startRealtime() {
  cleanupRealtime();
  const channel = supabase.channel(`nsfchat:${currentUserId()}`);

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
      const message = payload.new || payload.old;
      if (!message) return;
      const conversationId = message.conversation_id;
      const belongs = state.conversations.some((c) => c.id === conversationId);
      if (!belongs) return;

      const convo = state.conversations.find((c) => c.id === conversationId);
      const resolved = await resolveMediaUrl(message);
      if (payload.eventType === 'INSERT') {
        if (state.activeConversationId === conversationId) {
          state.activeMessages.push(resolved);
          state.activeMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          renderMessages();
        }
        if (convo) convo.lastMessage = resolved;
      } else {
        if (state.activeConversationId === conversationId) {
          await loadMessages(conversationId);
        }
      }
      if (convo) {
        convo.last_message_at = resolved.created_at;
      }
      state.conversations.sort((a, b) => new Date((b.last_message_at || b.created_at)) - new Date((a.last_message_at || a.created_at)));
      renderChatList();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, async (payload) => {
      const row = payload.new || payload.old;
      if (!row) return;
      if (row.user_id === currentUserId()) {
        await loadConversations();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async (payload) => {
      const row = payload.new || payload.old;
      if (!row) return;
      state.profilesById.set(row.id, row);
      if (state.profile?.id === row.id) {
        state.profile = row;
        renderProfileRail();
      }
      renderChatList();
      updateOnlinePresenceUi();
    });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setConnectionState('Connected', 'ok');
      channel.track({
        user_id: currentUserId(),
        display_name: state.profile?.display_name || '',
        avatar_url: state.profile?.avatar_url || '',
        at: new Date().toISOString()
      });
    } else if (status === 'CHANNEL_ERROR') {
      setConnectionState('Realtime error', 'bad');
    }
  });

  channel.on('presence', { event: 'sync' }, () => {
    const states = channel.presenceState();
    state.presence.clear();
    Object.values(states).flat().forEach((presence) => {
      if (presence?.user_id) state.presence.set(presence.user_id, presence);
    });
    updateOnlinePresenceUi();
  });

  state.currentChannel = channel;
}

function handlePresenceStart() {
  if (!state.currentChannel) return;
  state.currentChannel.track({
    user_id: currentUserId(),
    display_name: state.profile?.display_name || '',
    avatar_url: state.profile?.avatar_url || '',
    at: new Date().toISOString()
  });
}

async function uploadAndSendFile(file, kind) {
  if (!state.activeConversationId) return toast('Choose a conversation first.', 'error');
  if (!file) return;

  const ext = (file.name.split('.').pop() || (kind === 'voice' ? 'webm' : 'bin')).toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const bucket = kind === 'voice' ? 'voice-notes' : 'chat-media';
  const path = `${currentUserId()}/${state.activeConversationId}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || (kind === 'voice' ? 'audio/webm' : 'application/octet-stream')
  });
  if (uploadError) return apiErrorToast(uploadError, 'Upload failed');

  const { data: signed, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 12);
  if (signedError) return apiErrorToast(signedError, 'Could not generate secure link');

  const metadata = {
    storage_path: path,
    mime_type: file.type || '',
    original_name: file.name || '',
    size: file.size
  };

  const content_type = kind === 'voice' ? 'voice' : 'image';
  const content = kind === 'voice' ? 'Voice note' : 'Image';
  const { error: insertError } = await supabase.from('messages').insert({
    conversation_id: state.activeConversationId,
    sender_id: currentUserId(),
    content,
    content_type,
    attachment_url: signed.signedUrl,
    metadata
  });
  if (insertError) return apiErrorToast(insertError, 'Could not send attachment');

  clearComposerPreview();
}

async function sendTextMessage(text) {
  if (!state.activeConversationId) return toast('Choose a conversation first.', 'error');
  const content = String(text || '').trim();
  if (!content) return;

  const { error } = await supabase.from('messages').insert({
    conversation_id: state.activeConversationId,
    sender_id: currentUserId(),
    content,
    content_type: 'text',
    metadata: {}
  });

  if (error) return apiErrorToast(error, 'Could not send message');
  els.messageInput.value = '';
  autoResizeTextarea(els.messageInput);
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return toast('Microphone recording is not supported in this browser.', 'error');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    state.voiceStream = stream;
    state.voiceRecorder = recorder;
    state.voiceChunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) state.voiceChunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(state.voiceChunks, { type: recorder.mimeType || 'audio/webm' });
      state.voiceChunks = [];
      state.recordedVoiceBlob = blob;
      showVoicePreview(blob);
      stream.getTracks().forEach((track) => track.stop());
      state.voiceStream = null;
      state.voiceRecorder = null;
      els.voiceIndicator.classList.remove('recording');
      els.voiceText.textContent = 'Recording ready to send';
      els.recordStartBtn.disabled = false;
      els.recordStopBtn.disabled = true;
    };

    recorder.start();
    els.voiceIndicator.classList.add('recording');
    els.voiceText.textContent = 'Recording…';
    els.recordStartBtn.disabled = true;
    els.recordStopBtn.disabled = false;
    els.recordSendBtn.disabled = true;
    els.recordDiscardBtn.disabled = true;
    toast('Recording started.', 'success', 1800);
  } catch (error) {
    await apiErrorToast(error, 'Microphone access failed');
  }
}

function stopRecording() {
  if (!state.voiceRecorder) return;
  try {
    state.voiceRecorder.stop();
  } catch (error) {
    console.warn(error);
  }
}

function discardVoice() {
  clearComposerPreview();
  state.voiceChunks = [];
  if (state.voiceStream) {
    state.voiceStream.getTracks().forEach((track) => track.stop());
    state.voiceStream = null;
  }
  state.voiceRecorder = null;
}

async function refreshCurrentConversation() {
  if (state.activeConversationId) {
    await loadMessages(state.activeConversationId);
  }
}

function debounce(fn, wait = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function handleMobileNav(selection) {
  if (selection === 'chats') {
    els.sidebar.classList.toggle('open');
  } else if (selection === 'new') {
    openNewChat(els.globalSearch.value || els.mobileSearch.value || '');
  } else if (selection === 'profile') {
    openProfileDrawer();
  }
}

async function openProfileDrawer() {
  openModal(profileDrawerHtml(state.profile || {}));
  const editBtn = $('profile-edit-inline');
  editBtn.addEventListener('click', async () => {
    closeModal();
    await openProfileEditor();
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', closeModal));
}

function bindEvents() {
  els.tabSignin.addEventListener('click', () => setActiveAuthTab('signin'));
  els.tabSignup.addEventListener('click', () => setActiveAuthTab('signup'));
  els.signinForm.addEventListener('submit', handleSignIn);
  els.signupForm.addEventListener('submit', handleSignUp);
  els.forgotPassword.addEventListener('click', handleForgotPassword);
  els.signoutBtn.addEventListener('click', handleSignOut);
  els.profileBtn.addEventListener('click', openProfileDrawer);
  els.editProfileBtn.addEventListener('click', openProfileEditor);
  els.openProfileFromChat.addEventListener('click', openProfileDrawer);
  els.newChatBtn.addEventListener('click', () => openNewChat(els.globalSearch.value || ''));
  els.newChatBtn2.addEventListener('click', () => openNewChat(els.globalSearch.value || ''));
  els.newChatBtn3.addEventListener('click', () => openNewChat(els.globalSearch.value || ''));
  els.globalSearch.addEventListener('input', debounce((event) => {
    state.chatSearch = event.target.value;
    renderChatList();
  }, 100));
  els.mobileSearch.addEventListener('input', debounce((event) => {
    state.chatSearch = event.target.value;
    renderChatList();
  }, 100));
  els.composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendTextMessage(els.messageInput.value);
  });
  els.messageInput.addEventListener('input', (event) => autoResizeTextarea(event.target));
  els.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.composer.requestSubmit();
    }
  });

  els.attachImageBtn.addEventListener('click', () => els.imageInput.click());
  els.imageInput.addEventListener('change', async () => {
    const file = els.imageInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose an image.', 'error');
    state.selectedImageFile = file;
    showImagePreview(file);
    await uploadAndSendFile(file, 'image');
    els.imageInput.value = '';
  });

  els.voiceToggleBtn.addEventListener('click', () => {
    els.voicePanel.classList.toggle('hidden');
    if (!els.voicePanel.classList.contains('hidden')) els.voiceText.textContent = 'Ready to record';
  });
  els.recordStartBtn.addEventListener('click', startRecording);
  els.recordStopBtn.addEventListener('click', stopRecording);
  els.recordSendBtn.addEventListener('click', async () => {
    if (!state.recordedVoiceBlob) return;
    const file = new File([state.recordedVoiceBlob], `voice-${Date.now()}.webm`, {
      type: state.recordedVoiceBlob.type || 'audio/webm'
    });
    await uploadAndSendFile(file, 'voice');
  });
  els.recordDiscardBtn.addEventListener('click', discardVoice);

  els.mobileSidebarToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));
  els.backToChats.addEventListener('click', () => els.sidebar.classList.add('open'));
  els.mobileNavChats.addEventListener('click', () => handleMobileNav('chats'));
  els.mobileNavNew.addEventListener('click', () => handleMobileNav('new'));
  els.mobileNavProfile.addEventListener('click', () => handleMobileNav('profile'));

  els.modalBackdrop.addEventListener('click', closeModal);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close-modal]');
    if (close) closeModal();
  });
}

async function initSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    state.user = data.session?.user || null;

    if (!state.session) {
      showAuth();
      return;
    }

    showShell();
    await loadMyProfile();
    await loadConversations();
    await startRealtime();
    handlePresenceStart();
    setConnectionState('Connected', 'ok');
    renderProfileRail();
    renderChatList();
    if (state.activeConversationId) await loadMessages(state.activeConversationId);
  } catch (error) {
    await apiErrorToast(error, 'Failed to initialize');
    showAuth();
  }
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    cleanupRealtime();
    state.session = null;
    state.user = null;
    showAuth();
    return;
  }

  if (session?.user) {
    state.session = session;
    state.user = session.user;
    showShell();
    try {
      await loadMyProfile();
      await loadConversations();
      await startRealtime();
      handlePresenceStart();
    } catch (error) {
      await apiErrorToast(error, 'Could not refresh session');
    }
  }
});

bindEvents();
setActiveAuthTab('signin');
initSession();

window.addEventListener('resize', () => {
  if (window.innerWidth > 920) {
    els.sidebar.classList.remove('open');
  }
});
