/**
 * NSFChat — Main Application Controller
 * UI rendering, event handling, state transitions
 */

const App = (() => {

  /* ── State ─────────────────────────────────────────── */
  let currentUser    = null;
  let pendingFile    = null;  // file staged for upload before send
  let isMobileOpen   = false; // sidebar visible on mobile

  /* ── View transitions ─────────────────────────────── */

  function showAuthView() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
  }

  function showAppView() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
  }

  /* ── Toast notifications ──────────────────────────── */

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-text">${message}</span>
    `;
    container.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    // Remove after 3.5 s
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  /* ── Auth form UI ─────────────────────────────────── */

  function initAuthForms() {
    const loginTab   = document.getElementById('tab-login');
    const signupTab  = document.getElementById('tab-signup');
    const loginForm  = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Tab switching
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      document.getElementById('auth-submit-btn').querySelector('.btn-label').textContent = 'Sign In';
      clearAuthForm();
    });

    signupTab.addEventListener('click', () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      document.getElementById('auth-submit-btn').querySelector('.btn-label').textContent = 'Create Account';
      clearAuthForm();
    });

    // Submit
    document.getElementById('auth-submit-btn').addEventListener('click', handleAuthSubmit);
    // Allow Enter key
    document.getElementById('auth-view').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuthSubmit();
    });
  }

  function clearAuthForm() {
    ['login-email','login-password','signup-name','signup-email','signup-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
  }

  async function handleAuthSubmit() {
    const isLogin = document.getElementById('login-form').classList.contains('hidden') === false;

    if (isLogin) {
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) return showToast('Please fill in all fields.', 'error');
      const result = await Auth.signIn(email, password);
      if (result?.session) await initApp(result.session.user);
    } else {
      const name     = document.getElementById('signup-name').value.trim();
      const email    = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      if (!email || !password) return showToast('Please fill in all fields.', 'error');
      if (password.length < 6) return showToast('Password must be at least 6 characters.', 'error');
      const result = await Auth.signUp(email, password, name);
      if (result?.session) await initApp(result.session.user);
      else if (result?.user) showToast('Account created! Please verify your email.', 'info');
    }
  }

  /* ── App initialisation (after login) ────────────────── */

  async function initApp(user) {
    currentUser = user;
    Chat.setCurrentUser(user);

    // Update header
    const profile = await Chat.getMyProfile();
    const displayName = profile?.display_name || user.email.split('@')[0];
    document.getElementById('user-display-name').textContent = displayName;
    const initials = displayName.slice(0, 2).toUpperCase();
    document.getElementById('user-avatar-initials').textContent = initials;

    showAppView();
    await refreshConversationList();
    clearChatWindow();
  }

  /* ── Conversation list ────────────────────────────── */

  async function refreshConversationList() {
    const list = document.getElementById('conversations-list');
    list.innerHTML = `<div class="loading-conversations"><div class="spinner"></div></div>`;

    const conversations = await Chat.loadConversations();

    if (conversations.length === 0) {
      list.innerHTML = `
        <div class="empty-convos">
          <div class="empty-convos-icon">💬</div>
          <p>No conversations yet</p>
          <span>Start a new chat below</span>
        </div>`;
      return;
    }

    list.innerHTML = '';
    conversations.forEach(conv => {
      const item = createConversationItem(conv);
      list.appendChild(item);
    });
  }

  function createConversationItem(conv) {
    const other    = conv.other;
    const name     = other?.display_name || other?.email || 'Unknown';
    const initials = name.slice(0, 2).toUpperCase();
    const lastMsg  = conv.last_message || 'No messages yet';
    const time     = conv.last_message_at ? formatTime(conv.last_message_at) : '';
    const isActive = Chat.getActiveConversation()?.id === conv.id;

    const div = document.createElement('div');
    div.className = `conversation-item${isActive ? ' active' : ''}`;
    div.dataset.id = conv.id;
    div.innerHTML = `
      <div class="conv-avatar" style="background: ${stringToColor(name)}">
        <span>${initials}</span>
      </div>
      <div class="conv-info">
        <div class="conv-header-row">
          <span class="conv-name">${escapeHtml(name)}</span>
          <span class="conv-time">${time}</span>
        </div>
        <span class="conv-preview">${escapeHtml(lastMsg)}</span>
      </div>
    `;
    div.addEventListener('click', () => openConversation(conv));
    return div;
  }

  /* ── Open / switch conversation ─────────────────────── */

  async function openConversation(conv) {
    // Mark active in sidebar
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`[data-id="${conv.id}"]`);
    if (activeEl) activeEl.classList.add('active');

    Chat.setActiveConversation(conv);
    Chat.unsubscribe();

    // On mobile, close sidebar
    if (window.innerWidth < 768) closeMobileSidebar();

    // Update chat header
    const name = conv.other?.display_name || conv.other?.email || 'Unknown';
    const initials = name.slice(0, 2).toUpperCase();
    document.getElementById('chat-header-name').textContent = name;
    document.getElementById('chat-header-email').textContent = conv.other?.email || '';
    document.getElementById('chat-header-avatar').textContent = initials;
    document.getElementById('chat-header-avatar').style.background = stringToColor(name);

    // Show chat panel
    document.getElementById('chat-placeholder').classList.add('hidden');
    document.getElementById('chat-panel').classList.remove('hidden');
    document.getElementById('message-input-bar').classList.remove('hidden');

    // Load messages
    const messages = await Chat.loadMessages(conv.id);
    renderMessages(messages);

    // Subscribe to realtime
    Chat.subscribeToMessages(conv.id, (msg) => {
      // Only append if not from current user (own messages already appended optimistically)
      if (msg.sender_id !== currentUser.id) {
        appendMessage(msg, false);
        scrollToBottom();
      }
    });
  }

  /* ── Message rendering ────────────────────────────── */

  function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (messages.length === 0) {
      container.innerHTML = `<div class="no-messages">Start the conversation ✨</div>`;
      return;
    }

    let lastDate = null;
    messages.forEach(msg => {
      // Date separator
      const msgDate = formatDateSeparator(msg.created_at);
      if (msgDate !== lastDate) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = `<span>${msgDate}</span>`;
        container.appendChild(sep);
        lastDate = msgDate;
      }
      const isOwn = msg.sender_id === currentUser.id;
      container.appendChild(buildMessageBubble(msg, isOwn));
    });

    scrollToBottom(false);
  }

  function appendMessage(msg, isOwn) {
    const container = document.getElementById('messages-container');
    // Remove "no messages" placeholder
    const noMsg = container.querySelector('.no-messages');
    if (noMsg) noMsg.remove();
    container.appendChild(buildMessageBubble(msg, isOwn));
    scrollToBottom();
  }

  function buildMessageBubble(msg, isOwn) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper${isOwn ? ' own' : ' other'}`;
    wrapper.dataset.id = msg.id;

    let mediaHtml = '';
    if (msg.media_url && msg.media_type === 'image') {
      mediaHtml = `
        <div class="message-media">
          <img src="${escapeHtml(msg.media_url)}" alt="Image" loading="lazy"
               onclick="App.openLightbox('${escapeHtml(msg.media_url)}', 'image')">
        </div>`;
    } else if (msg.media_url && msg.media_type === 'video') {
      mediaHtml = `
        <div class="message-media">
          <video controls preload="metadata" onclick="event.stopPropagation()">
            <source src="${escapeHtml(msg.media_url)}">
          </video>
        </div>`;
    }

    const textHtml = msg.content
      ? `<div class="message-text">${escapeHtml(msg.content)}</div>`
      : '';

    const timeStr = formatMessageTime(msg.created_at);

    wrapper.innerHTML = `
      <div class="message-bubble">
        ${mediaHtml}
        ${textHtml}
        <span class="message-time">${timeStr}</span>
      </div>
    `;
    return wrapper;
  }

  function scrollToBottom(smooth = true) {
    const container = document.getElementById('messages-container');
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    });
  }

  function clearChatWindow() {
    document.getElementById('chat-placeholder').classList.remove('hidden');
    document.getElementById('chat-panel').classList.add('hidden');
    document.getElementById('message-input-bar').classList.add('hidden');
    Chat.unsubscribe();
    Chat.setActiveConversation(null);
  }

  /* ── Message sending ──────────────────────────────── */

  function initMessageInput() {
    const textarea = document.getElementById('message-input');
    const sendBtn  = document.getElementById('send-btn');
    const mediaBtn = document.getElementById('media-upload-btn');
    const fileIn   = document.getElementById('file-input');

    // Auto-grow textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter = newline)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    sendBtn.addEventListener('click', handleSend);

    // Media picker
    mediaBtn.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', handleFileSelected);
  }

  async function handleSend() {
    const conv = Chat.getActiveConversation();
    if (!conv) return;

    const textarea = document.getElementById('message-input');
    const text     = textarea.value.trim();

    if (!text && !pendingFile) return;

    // Disable input while sending
    setInputEnabled(false);
    let mediaUrl  = null;
    let mediaType = null;

    try {
      // Upload media if staged
      if (pendingFile) {
        showToast('Uploading media…', 'info');
        mediaUrl  = await Chat.uploadMedia(pendingFile);
        mediaType = Chat.getMediaType(pendingFile);
        clearPendingFile();
      }

      const msg = await Chat.sendMessage({
        conversationId: conv.id,
        content: text || null,
        mediaUrl,
        mediaType
      });

      if (msg) {
        // Optimistic render
        appendMessage(msg, true);
        scrollToBottom();
        // Refresh conversation list order
        await refreshConversationList();
        // Re-mark active
        const activeEl = document.querySelector(`[data-id="${conv.id}"]`);
        if (activeEl) activeEl.classList.add('active');
      }

      textarea.value = '';
      textarea.style.height = 'auto';
    } catch (err) {
      showToast(err.message || 'Failed to send. Try again.', 'error');
    } finally {
      setInputEnabled(true);
      textarea.focus();
    }
  }

  function setInputEnabled(enabled) {
    const textarea = document.getElementById('message-input');
    const sendBtn  = document.getElementById('send-btn');
    const mediaBtn = document.getElementById('media-upload-btn');
    textarea.disabled = !enabled;
    sendBtn.disabled  = !enabled;
    mediaBtn.disabled = !enabled;
    sendBtn.classList.toggle('loading', !enabled);
  }

  /* ── File / media handling ────────────────────────── */

  function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const mediaType = Chat.getMediaType(file);
    if (!mediaType) {
      showToast('Unsupported file type. Use images or videos.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast(`File too large. Max ${MAX_FILE_SIZE_MB} MB.`, 'error');
      e.target.value = '';
      return;
    }

    pendingFile = file;
    showFilePreview(file, mediaType);
    e.target.value = ''; // reset so same file can be re-selected
  }

  function showFilePreview(file, mediaType) {
    const preview = document.getElementById('file-preview');
    const name    = document.getElementById('file-preview-name');
    const thumb   = document.getElementById('file-preview-thumb');

    name.textContent = file.name;
    preview.classList.remove('hidden');

    if (mediaType === 'image') {
      const url = URL.createObjectURL(file);
      thumb.innerHTML = `<img src="${url}" alt="preview">`;
    } else {
      thumb.innerHTML = `<div class="video-thumb-icon">🎬</div>`;
    }
  }

  function clearPendingFile() {
    pendingFile = null;
    const preview = document.getElementById('file-preview');
    preview.classList.add('hidden');
    document.getElementById('file-preview-thumb').innerHTML = '';
    // Revoke any object URLs
    const img = preview.querySelector('img');
    if (img) URL.revokeObjectURL(img.src);
  }

  /* ── New conversation modal ───────────────────────── */

  function initNewChatModal() {
    const openBtn  = document.getElementById('new-chat-btn');
    const modal    = document.getElementById('new-chat-modal');
    const overlay  = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');
    const startBtn = document.getElementById('modal-start-btn');
    const emailIn  = document.getElementById('new-chat-email');
    const errorEl  = document.getElementById('modal-error');

    function openModal() {
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
      emailIn.value = '';
      errorEl.style.display = 'none';
      setTimeout(() => emailIn.focus(), 100);
    }

    function closeModal() {
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    emailIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBtn.click(); });

    startBtn.addEventListener('click', async () => {
      const email = emailIn.value.trim().toLowerCase();
      if (!email) return;
      if (email === currentUser.email) {
        errorEl.textContent = "You can't chat with yourself.";
        errorEl.style.display = 'block';
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = 'Finding…';
      errorEl.style.display = 'none';

      try {
        const profile = await Chat.getProfileByEmail(email);
        if (!profile) {
          errorEl.textContent = 'No user found with that email.';
          errorEl.style.display = 'block';
          return;
        }

        const conv = await Chat.getOrCreateConversation(profile.id);
        closeModal();
        await refreshConversationList();

        // Open the conversation
        const fullConv = { ...conv, other: profile };
        await openConversation(fullConv);
      } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong.';
        errorEl.style.display = 'block';
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Chat';
      }
    });
  }

  /* ── Lightbox ─────────────────────────────────────── */

  function openLightbox(url, type) {
    const lb = document.getElementById('lightbox');
    const content = document.getElementById('lightbox-content');
    content.innerHTML = type === 'image'
      ? `<img src="${escapeHtml(url)}" alt="Media">`
      : `<video src="${escapeHtml(url)}" controls autoplay></video>`;
    lb.classList.remove('hidden');
  }

  function initLightbox() {
    const lb = document.getElementById('lightbox');
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.id === 'lightbox-close') {
        lb.classList.add('hidden');
        document.getElementById('lightbox-content').innerHTML = '';
      }
    });
  }

  /* ── Mobile sidebar ───────────────────────────────── */

  function initMobileSidebar() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    menuBtn?.addEventListener('click', () => {
      isMobileOpen = !isMobileOpen;
      sidebar.classList.toggle('mobile-open', isMobileOpen);
      overlay.classList.toggle('hidden', !isMobileOpen);
    });

    overlay?.addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    isMobileOpen = false;
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.add('hidden');
  }

  /* ── Logout ───────────────────────────────────────── */

  function initLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
      Chat.unsubscribe();
      await Auth.signOut();
      currentUser = null;
      clearChatWindow();
      showAuthView();
      showToast('Signed out successfully.', 'success');
    });
  }

  /* ── File preview cancel ──────────────────────────── */

  function initFilePreviewCancel() {
    document.getElementById('file-preview-cancel').addEventListener('click', clearPendingFile);
  }

  /* ── Utility functions ────────────────────────────── */

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatMessageTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateSeparator(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function stringToColor(str) {
    // Generate a consistent muted color from a string
    const colors = [
      '#7c6f5e','#5e7c6f','#6f5e7c','#7c5e6a','#5e6a7c',
      '#6a7c5e','#7c7a5e','#5e7c7a','#8a6a5e','#5e8a6a'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  /* ── Bootstrap ────────────────────────────────────── */

  async function init() {
    // Wire up all UI components
    initAuthForms();
    initMessageInput();
    initNewChatModal();
    initLightbox();
    initMobileSidebar();
    initLogout();
    initFilePreviewCancel();

    // Listen for Supabase auth changes
    Auth.onAuthStateChange(async (session) => {
      if (session?.user) {
        if (!currentUser || currentUser.id !== session.user.id) {
          await initApp(session.user);
        }
      } else {
        currentUser = null;
        showAuthView();
      }
    });

    // Check existing session on load
    const session = await Auth.getSession();
    if (session?.user) {
      await initApp(session.user);
    } else {
      showAuthView();
    }
  }

  return { init, showToast, openLightbox };
})();

// Boot app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', App.init);
