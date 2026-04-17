
import { supabase } from "./supabase.js";
import { APP_NAME } from "./config.js";

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const state = {
  session: null,
  profile: null,
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  messages: [],
  members: [],
  otherMember: null,
  userSearch: [],
  searchQuery: "",
  conversationFilter: "",
  loading: true,
  isSidebarOpen: false,
  messageChannel: null,
  conversationChannel: null,
  authView: "signin",
  profileDraft: {},
  draftMessage: "",
  unreadCache: new Map(),
};

const els = {};
let messageTimer = null;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "");
  return letters.join("") || "N";
}

function toast(message, type = "info", timeout = 3600) {
  toastRoot.innerHTML = "";
  const node = el("div", { class: "toast", role: "status", "aria-live": "polite" }, [message]);
  if (type === "success") node.style.borderColor = "rgba(52,211,153,.22)";
  if (type === "error") node.style.borderColor = "rgba(251,113,133,.22)";
  toastRoot.appendChild(node);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    node.remove();
  }, timeout);
}

function setLoading(value) {
  state.loading = value;
  render();
}

function setAuthView(view) {
  state.authView = view;
  render();
}

function openSidebar() {
  state.isSidebarOpen = true;
  render();
}

function closeSidebar() {
  state.isSidebarOpen = false;
  render();
}

function setActiveConversationId(id) {
  state.activeConversationId = id;
  state.isSidebarOpen = false;
  syncActiveConversation();
  render();
  if (id) {
    loadMessages(id).catch(console.error);
    markConversationRead(id).catch(console.error);
  }
}

function cleanupChannels() {
  if (state.messageChannel) {
    supabase.removeChannel(state.messageChannel);
    state.messageChannel = null;
  }
  if (state.conversationChannel) {
    supabase.removeChannel(state.conversationChannel);
    state.conversationChannel = null;
  }
}

function subscribeRealtime() {
  if (!state.session) return;
  cleanupChannels();

  state.conversationChannel = supabase
    .channel("nsfchat:messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const message = payload.new;
        const convId = message.conversation_id;

        await loadConversations(false);
        if (convId === state.activeConversationId) {
          await loadMessages(convId);
          await markConversationRead(convId);
          scrollMessagesToBottom(true);
        } else {
          renderConversationList();
        }
      }
    )
    .subscribe();
}

function render() {
  if (!state.session) {
    app.innerHTML = renderAuth();
    bindAuth();
    return;
  }

  if (!state.profile) {
    app.innerHTML = renderProfileLoading();
    return;
  }

  app.innerHTML = renderApp();
  bindApp();
}

function renderAuth() {
  const signupActive = state.authView === "signup";
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="assets/logo.svg" alt="${APP_NAME} logo">
          <div class="brand-copy">
            <h1>${APP_NAME}</h1>
            <p>Private messaging, profiles, and realtime chat</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="pill">Secure sign-in with Supabase</span>
        </div>
      </header>

      <main class="auth-layout">
        <section class="hero">
          <div class="hero-card">
            <div class="hero-badge">Realtime messaging built for desktop and mobile</div>
            <h2>Chat that feels fast, polished, and ready for real use.</h2>
            <p class="lead">
              NSFChat stores user profiles in Supabase, keeps conversations synced in realtime,
              and gives you a clean, responsive interface for secure email sign-up and sign-in.
            </p>
            <div class="feature-grid">
              <div class="feature">
                <div class="icon">✦</div>
                <h3>Profile system</h3>
                <p>Display name, nationality, bio, username, avatar, and more stored in Supabase.</p>
              </div>
              <div class="feature">
                <div class="icon">↻</div>
                <h3>Realtime chat</h3>
                <p>Messages update instantly with Supabase realtime subscriptions.</p>
              </div>
              <div class="feature">
                <div class="icon">◌</div>
                <h3>Mobile first</h3>
                <p>Fully responsive layout that adapts cleanly to smaller screens.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="auth-panel">
          <div class="card">
            <div class="card-head">
              <div class="tabs">
                <button class="tab ${signupActive ? "" : "active"}" data-auth-tab="signin">Sign in</button>
                <button class="tab ${signupActive ? "active" : ""}" data-auth-tab="signup">Sign up</button>
              </div>
            </div>
            <div class="form">
              <h3>${signupActive ? "Create your account" : "Welcome back"}</h3>
              <p>${signupActive ? "Register with your email and start your profile." : "Use your email and password to continue."}</p>
              <form id="auth-form">
                ${signupActive ? `
                  <div class="field">
                    <label for="signup-display-name">Display name</label>
                    <input class="input" id="signup-display-name" name="display_name" autocomplete="nickname" placeholder="Your display name" required />
                  </div>
                  <div class="field">
                    <label for="signup-username">Username</label>
                    <input class="input" id="signup-username" name="username" autocomplete="username" placeholder="Unique username" />
                  </div>
                  <div class="field">
                    <label for="signup-nationality">Nationality</label>
                    <input class="input" id="signup-nationality" name="nationality" autocomplete="country-name" placeholder="Your nationality" />
                  </div>
                ` : ""}
                <div class="field">
                  <label for="${signupActive ? "signup-email" : "signin-email"}">Email</label>
                  <input class="input" id="${signupActive ? "signup-email" : "signin-email"}" name="email" type="email" autocomplete="email" placeholder="name@example.com" required />
                </div>
                <div class="field">
                  <label for="${signupActive ? "signup-password" : "signin-password"}">Password</label>
                  <input class="input" id="${signupActive ? "signup-password" : "signin-password"}" name="password" type="password" autocomplete="${signupActive ? "new-password" : "current-password"}" placeholder="Your password" required />
                </div>
                <button class="btn" style="width:100%; margin-top:6px" type="submit">${signupActive ? "Create account" : "Sign in"}</button>
              </form>
              <div id="auth-message"></div>
              <p class="help" style="margin-top:14px">
                By continuing, you agree to keep your chat and profile details stored in Supabase for this app.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
}

function renderProfileLoading() {
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="assets/logo.svg" alt="${APP_NAME} logo">
          <div class="brand-copy">
            <h1>${APP_NAME}</h1>
            <p>Loading profile...</p>
          </div>
        </div>
      </header>
      <main class="empty-state">
        <div class="empty-card">
          <h2>Preparing your workspace</h2>
          <p>We are loading your profile and conversation data from Supabase.</p>
        </div>
      </main>
    </div>
  `;
}

function renderApp() {
  const profile = state.profile;
  const activeConv = state.activeConversation;
  const other = state.otherMember;
  const activeLabel = other ? (other.display_name || other.username || "Conversation") : "Select a conversation";
  const activeSub = other ? [other.nationality, other.username ? `@${other.username}` : null].filter(Boolean).join(" • ") : "Search for people or pick an existing chat.";
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <button class="btn secondary small mobile-toggle" id="mobile-menu-btn" aria-label="Toggle conversations">☰</button>
          <img src="assets/logo.svg" alt="${APP_NAME} logo">
          <div class="brand-copy">
            <h1>${APP_NAME}</h1>
            <p>${profile.display_name || profile.full_name || "Your account"}</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="pill">${profile.nationality || "Nationality not set"}</span>
          <button class="btn secondary small" id="profile-btn">Profile</button>
          <button class="btn danger small" id="signout-btn">Sign out</button>
        </div>
      </header>

      <div class="app-shell">
        <aside class="sidebar ${state.isSidebarOpen ? "open" : ""}" id="sidebar">
          <div class="sidebar-head">
            <div class="profile-card">
              <div class="avatar">
                ${profile.avatar_url ? `<img src="${escapeHtml(profile.avatar_url)}" alt="Avatar">` : `<span>${escapeHtml(initials(profile.display_name || profile.full_name || "NSF"))}</span>`}
              </div>
              <div class="profile-meta">
                <h3>${escapeHtml(profile.display_name || profile.full_name || "Unnamed user")}</h3>
                <p>${escapeHtml(profile.status || "")}</p>
                <div class="meta-line">
                  ${profile.username ? `<span class="tag">@${escapeHtml(profile.username)}</span>` : ""}
                  ${profile.nationality ? `<span class="tag">${escapeHtml(profile.nationality)}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="searchbox">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 21l-4.2-4.2m1.2-5.8a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <input class="input" id="conversation-search" placeholder="Search chats or users" value="${escapeHtml(state.conversationFilter)}">
            </div>
          </div>

          <div class="user-search">
            <div class="row">
              <div>
                <div style="font-weight:600;">Start new chat</div>
                <div class="small-muted">Find people by name, username, or nationality.</div>
              </div>
            </div>
            <div class="searchbox" style="margin-top:12px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 21l-4.2-4.2m1.2-5.8a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <input class="input" id="user-search" placeholder="Search users..." value="${escapeHtml(state.searchQuery)}">
            </div>
            <div class="user-search-results" id="user-search-results"></div>
          </div>

          <div class="sidebar-section">
            <div class="sidebar-label">
              <span>Conversations</span>
              <span>${state.conversations.length}</span>
            </div>
            <div class="list" id="conversation-list"></div>
          </div>

          <div class="footer-note">
            Your data is stored in Supabase with RLS policies. Messages update in realtime for connected clients.
          </div>
        </aside>

        <main class="main">
          ${activeConv ? `
            <div class="chat-head">
              <div class="left">
                <div class="avatar">
                  ${other && other.avatar_url ? `<img src="${escapeHtml(other.avatar_url)}" alt="Avatar">` : `<span>${escapeHtml(initials(activeLabel))}</span>`}
                </div>
                <div>
                  <h3>${escapeHtml(activeLabel)}</h3>
                  <p>${escapeHtml(activeSub)}</p>
                </div>
              </div>
              <div class="top-actions">
                <span class="pill">Realtime</span>
                <button class="btn secondary small mobile-toggle" id="close-sidebar-btn">Chats</button>
              </div>
            </div>
            <div class="messages" id="messages"></div>
            <div class="composer">
              <form class="composer-form" id="message-form">
                <textarea class="input" id="message-input" placeholder="Write a message..." rows="1" maxlength="4000"></textarea>
                <div class="composer-actions">
                  <button class="icon-btn primary" type="submit" aria-label="Send message">➤</button>
                </div>
              </form>
              <div class="help" style="margin-top:10px;">Press Enter to send, Shift+Enter for a new line.</div>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-card">
                <h2>Choose a conversation</h2>
                <p>Search for someone from the sidebar, start a new direct chat, or open one of your recent conversations.</p>
              </div>
            </div>
          `}
        </main>
      </div>
    </div>
  `;
}

function bindAuth() {
  document.querySelectorAll("[data-auth-tab]").forEach(btn => {
    btn.addEventListener("click", () => setAuthView(btn.dataset.authTab));
  });

  const form = document.getElementById("auth-form");
  const message = document.getElementById("auth-message");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const isSignup = state.authView === "signup";

    setAuthMessage(message, "info", isSignup ? "Creating your account..." : "Signing in...");

    try {
      if (isSignup) {
        const displayName = String(fd.get("display_name") || "").trim();
        const username = String(fd.get("username") || "").trim();
        const nationality = String(fd.get("nationality") || "").trim();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              username,
              nationality
            }
          }
        });
        if (error) throw error;

        if (data?.session) {
          setAuthMessage(message, "success", "Account created. Loading your workspace...");
        } else {
          setAuthMessage(message, "success", "Account created. Check your email to confirm your address, then sign in.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.session) {
          setAuthMessage(message, "success", "Signed in successfully.");
        }
      }
    } catch (err) {
      setAuthMessage(message, "error", err.message || "Authentication failed.");
    }
  });
}

function setAuthMessage(container, type, text) {
  if (!container) return;
  container.innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
}

function bindApp() {
  document.getElementById("signout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  document.getElementById("profile-btn")?.addEventListener("click", () => {
    openProfileModal();
  });

  document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
    state.isSidebarOpen = !state.isSidebarOpen;
    render();
  });

  document.getElementById("close-sidebar-btn")?.addEventListener("click", closeSidebar);

  const search = document.getElementById("conversation-search");
  if (search) {
    search.addEventListener("input", (e) => {
      state.conversationFilter = e.target.value;
      renderConversationList();
    });
  }

  const userSearch = document.getElementById("user-search");
  if (userSearch) {
    userSearch.addEventListener("input", async (e) => {
      state.searchQuery = e.target.value;
      await searchUsers(state.searchQuery);
      renderUserSearchResults();
    });
  }

  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");

  if (messageInput) {
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        messageForm?.requestSubmit();
      }
    });
    autosizeTextarea(messageInput);
  }

  messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = String(document.getElementById("message-input")?.value || "").trim();
    if (!text || !state.activeConversationId) return;
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: state.activeConversationId,
        sender_id: state.session.user.id,
        body: text,
        message_type: "text"
      });
      if (error) throw error;
      const input = document.getElementById("message-input");
      if (input) input.value = "";
      autosizeTextarea(input);
      await touchConversation(state.activeConversationId);
      await loadConversations(false);
      renderConversationList();
    } catch (err) {
      toast(err.message || "Could not send message", "error");
    }
  });

  renderConversationList();
  renderUserSearchResults();

  document.querySelectorAll("[data-conversation-id]").forEach(node => {
    node.addEventListener("click", () => setActiveConversationId(node.dataset.conversationId));
  });

  document.querySelectorAll("[data-user-id]").forEach(node => {
    node.addEventListener("click", async () => {
      const userId = node.dataset.userId;
      try {
        const convoId = await getOrCreateDm(userId);
        await loadConversations(false);
        setActiveConversationId(convoId);
      } catch (err) {
        toast(err.message || "Could not open chat", "error");
      }
    });
  });

  if (state.activeConversationId) {
    renderMessages();
    scrollMessagesToBottom(true);
  }
}

function autosizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
}

function renderConversationList() {
  const wrap = document.getElementById("conversation-list");
  if (!wrap) return;
  const filter = state.conversationFilter.trim().toLowerCase();
  const rows = state.conversations.filter(item => {
    if (!filter) return true;
    const hay = `${item.title || ""} ${item.other?.display_name || ""} ${item.other?.username || ""} ${item.other?.nationality || ""}`.toLowerCase();
    return hay.includes(filter);
  });

  if (!rows.length) {
    wrap.innerHTML = `<div class="panel small-muted">No conversations yet. Search a user to start one.</div>`;
    return;
  }

  wrap.innerHTML = rows.map(item => {
    const active = item.id === state.activeConversationId ? "active" : "";
    const unread = item.unreadCount > 0 ? `<span class="counter">${item.unreadCount}</span>` : "";
    const avatar = item.other?.avatar_url
      ? `<img src="${escapeHtml(item.other.avatar_url)}" alt="Avatar">`
      : `<span>${escapeHtml(initials(item.other?.display_name || item.other?.username || "Chat"))}</span>`;
    return `
      <div class="chat-item ${active}" data-conversation-id="${escapeHtml(item.id)}">
        <div class="chat-item-top">
          <div class="profile-card" style="gap:12px; align-items:flex-start;">
            <div class="avatar" style="width:46px;height:46px;border-radius:16px;">${avatar}</div>
            <div style="min-width:0;">
              <div class="name">${escapeHtml(item.other?.display_name || item.title || "Conversation")}</div>
              <div class="sub">${escapeHtml(item.preview || "No messages yet")}</div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
            <span class="small-muted">${escapeHtml(item.lastMessageTime || "")}</span>
            ${unread}
          </div>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-conversation-id]").forEach(node => {
    node.addEventListener("click", () => setActiveConversationId(node.dataset.conversationId));
  });
}

function renderUserSearchResults() {
  const wrap = document.getElementById("user-search-results");
  if (!wrap) return;
  if (!state.searchQuery.trim()) {
    wrap.innerHTML = `<div class="panel small-muted">Type to search people by display name, username, or nationality.</div>`;
    return;
  }
  if (!state.userSearch.length) {
    wrap.innerHTML = `<div class="panel small-muted">No people found.</div>`;
    return;
  }
  wrap.innerHTML = state.userSearch.map(user => {
    const avatar = user.avatar_url
      ? `<img src="${escapeHtml(user.avatar_url)}" alt="Avatar">`
      : `<span>${escapeHtml(initials(user.display_name || user.username || "User"))}</span>`;
    return `
      <div class="user-item" data-user-id="${escapeHtml(user.id)}">
        <div class="row">
          <div class="profile-card" style="gap:12px; align-items:flex-start;">
            <div class="avatar" style="width:44px;height:44px;border-radius:16px;">${avatar}</div>
            <div>
              <div class="name">${escapeHtml(user.display_name || user.username || "Unnamed")}</div>
              <div class="sub">${escapeHtml([user.username ? `@${user.username}` : null, user.nationality].filter(Boolean).join(" • ") || "Profile found")}</div>
            </div>
          </div>
          <button class="btn secondary small" type="button">Chat</button>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll("[data-user-id]").forEach(node => {
    node.addEventListener("click", async () => {
      const userId = node.dataset.userId;
      try {
        const convoId = await getOrCreateDm(userId);
        await loadConversations(false);
        setActiveConversationId(convoId);
      } catch (err) {
        toast(err.message || "Could not open chat", "error");
      }
    });
  });
}

function renderMessages() {
  const wrap = document.getElementById("messages");
  if (!wrap) return;
  if (!state.activeConversationId) {
    wrap.innerHTML = "";
    return;
  }
  if (!state.messages.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-card">
          <h2>No messages yet</h2>
          <p>Start the conversation by sending the first message.</p>
        </div>
      </div>
    `;
    return;
  }

  let lastDate = "";
  wrap.innerHTML = state.messages.map((msg) => {
    const dateLabel = formatDateLabel(msg.created_at);
    const dateMarkup = dateLabel !== lastDate ? `<div class="date-separator">${escapeHtml(dateLabel)}</div>` : "";
    lastDate = dateLabel;
    const self = msg.sender_id === state.session.user.id;
    return `${dateMarkup}
      <div class="msg ${self ? "self" : "other"}">
        <div class="bubble">${escapeHtml(msg.body)}</div>
        <div class="msg-meta">
          <span>${escapeHtml(self ? "You" : state.otherMember?.display_name || "Member")}</span>
          <span>•</span>
          <span>${escapeHtml(formatTime(msg.created_at))}</span>
        </div>
      </div>
    `;
  }).join("");
  scrollMessagesToBottom();
}

function scrollMessagesToBottom(force = false) {
  const wrap = document.getElementById("messages");
  if (!wrap) return;
  if (!force) {
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      wrap.scrollTop = wrap.scrollHeight;
    }, 20);
    return;
  }
  wrap.scrollTop = wrap.scrollHeight;
}

async function loadProfile() {
  const user = state.session.user;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    state.profile = {
      id: user.id,
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "New user",
      full_name: user.user_metadata?.full_name || "",
      username: user.user_metadata?.username || "",
      nationality: user.user_metadata?.nationality || "",
      avatar_url: user.user_metadata?.avatar_url || "",
      bio: user.user_metadata?.bio || "",
      website: user.user_metadata?.website || "",
      location: user.user_metadata?.location || "",
      phone: user.user_metadata?.phone || "",
      status: user.user_metadata?.status || "Hey there, I am using NSFChat.",
    };
    openProfileModal(true);
    return;
  }

  state.profile = data;
  if (!data.display_name || !data.nationality || !data.username) {
    state.profileDraft = { ...data };
    openProfileModal(true);
  }
}

function openProfileModal(force = false) {
  const p = state.profile || {};
  modalRoot.innerHTML = `
    <div class="modal-backdrop show" id="profile-modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div class="modal-head">
          <div>
            <h2 id="profile-modal-title" style="margin:0 0 8px;">${force ? "Complete your profile" : "Edit profile"}</h2>
            <div class="small-muted">Store your public profile details in Supabase.</div>
          </div>
          ${force ? "" : `<button class="btn secondary small" id="close-profile-modal">Close</button>`}
        </div>
        <div class="modal-body">
          <form class="form" id="profile-form">
            <div class="form-row">
              <div class="field">
                <label for="profile-display-name">Display name</label>
                <input class="input" id="profile-display-name" name="display_name" required value="${escapeHtml(p.display_name || "")}">
              </div>
              <div class="field">
                <label for="profile-username">Username</label>
                <input class="input" id="profile-username" name="username" placeholder="username" value="${escapeHtml(p.username || "")}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="profile-full-name">Full name</label>
                <input class="input" id="profile-full-name" name="full_name" value="${escapeHtml(p.full_name || "")}">
              </div>
              <div class="field">
                <label for="profile-nationality">Nationality</label>
                <input class="input" id="profile-nationality" name="nationality" value="${escapeHtml(p.nationality || "")}">
              </div>
            </div>
            <div class="field">
              <label for="profile-avatar-url">Avatar URL</label>
              <input class="input" id="profile-avatar-url" name="avatar_url" placeholder="https://..." value="${escapeHtml(p.avatar_url || "")}">
            </div>
            <div class="form-row">
              <div class="field">
                <label for="profile-website">Website</label>
                <input class="input" id="profile-website" name="website" value="${escapeHtml(p.website || "")}">
              </div>
              <div class="field">
                <label for="profile-location">Location</label>
                <input class="input" id="profile-location" name="location" value="${escapeHtml(p.location || "")}">
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="profile-phone">Phone</label>
                <input class="input" id="profile-phone" name="phone" value="${escapeHtml(p.phone || "")}">
              </div>
              <div class="field">
                <label for="profile-status">Status</label>
                <input class="input" id="profile-status" name="status" value="${escapeHtml(p.status || "Hey there, I am using NSFChat.")}">
              </div>
            </div>
            <div class="field">
              <label for="profile-bio">Bio</label>
              <textarea class="textarea" id="profile-bio" name="bio" placeholder="Write something about yourself...">${escapeHtml(p.bio || "")}</textarea>
            </div>
            <div class="modal-actions">
              ${force ? "" : `<button class="btn secondary" type="button" id="profile-cancel">Cancel</button>`}
              <button class="btn" type="submit">Save profile</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  const backdrop = document.getElementById("profile-modal-backdrop");
  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop && !force) closeProfileModal();
  });
  document.getElementById("close-profile-modal")?.addEventListener("click", closeProfileModal);
  document.getElementById("profile-cancel")?.addEventListener("click", closeProfileModal);
  document.getElementById("profile-form")?.addEventListener("submit", saveProfile);
  document.body.style.overflow = "hidden";
}

function closeProfileModal() {
  modalRoot.innerHTML = "";
  document.body.style.overflow = "";
}

async function saveProfile(e) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const payload = {
    id: state.session.user.id,
    display_name: String(fd.get("display_name") || "").trim(),
    username: String(fd.get("username") || "").trim() || null,
    full_name: String(fd.get("full_name") || "").trim() || null,
    nationality: String(fd.get("nationality") || "").trim() || null,
    avatar_url: String(fd.get("avatar_url") || "").trim() || null,
    website: String(fd.get("website") || "").trim() || null,
    location: String(fd.get("location") || "").trim() || null,
    phone: String(fd.get("phone") || "").trim() || null,
    status: String(fd.get("status") || "").trim() || null,
    bio: String(fd.get("bio") || "").trim() || null
  };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;
    state.profile = data;
    closeProfileModal();
    toast("Profile saved.", "success");
    render();
    await loadConversations(false);
    renderConversationList();
  } catch (err) {
    toast(err.message || "Could not save profile", "error");
  }
}

async function loadConversations(setDefault = true) {
  if (!state.session) return;
  const myId = state.session.user.id;

  const { data: members, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, joined_at")
    .eq("user_id", myId);

  if (membersError) throw membersError;

  const ids = members.map(m => m.conversation_id);
  if (!ids.length) {
    state.conversations = [];
    if (setDefault) state.activeConversationId = null;
    syncActiveConversation();
    renderConversationList();
    return;
  }

  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id, title, conversation_type, created_at, updated_at, dm_key")
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (convoError) throw convoError;

  const { data: allMessages, error: msgError } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at, sender_id")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  if (msgError) throw msgError;

  const otherMembers = await loadOtherMembers(ids);
  const byConversation = new Map();
  const latestMap = new Map();
  const unreadMap = new Map();
  for (const msg of allMessages || []) {
    if (!latestMap.has(msg.conversation_id)) latestMap.set(msg.conversation_id, msg);
  }

  for (const convoId of ids) unreadMap.set(convoId, 0);
  for (const msg of allMessages || []) {
    const membership = members.find(m => m.conversation_id === msg.conversation_id);
    if (!membership || !membership.last_read_at) continue;
    if (msg.sender_id === myId) continue;
    if (new Date(msg.created_at) > new Date(membership.last_read_at)) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
    }
  }

  for (const convo of convos || []) {
    const other = otherMembers.get(convo.id) || null;
    const latest = latestMap.get(convo.id) || null;
    const unreadCount = unreadMap.get(convo.id) || 0;
    byConversation.set(convo.id, {
      ...convo,
      other,
      preview: latest?.body || "No messages yet",
      lastMessageTime: latest?.created_at ? formatTime(latest.created_at) : "",
      unreadCount
    });
  }

  state.conversations = Array.from(byConversation.values()).sort((a, b) => {
    const ta = a.updated_at || a.created_at || "";
    const tb = b.updated_at || b.created_at || "";
    return new Date(tb) - new Date(ta);
  });

  if (setDefault && !state.activeConversationId && state.conversations[0]) {
    state.activeConversationId = state.conversations[0].id;
  }
  syncActiveConversation();
  renderConversationList();
  if (state.activeConversationId) {
    await loadMessages(state.activeConversationId);
  } else {
    state.messages = [];
    renderMessages();
  }
}

async function loadOtherMembers(conversationIds) {
  const map = new Map();
  if (!conversationIds.length) return map;
  const myId = state.session.user.id;

  const { data, error } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id, user:profiles(id, display_name, username, nationality, avatar_url, status)")
    .in("conversation_id", conversationIds)
    .neq("user_id", myId);

  if (error) throw error;
  for (const row of data || []) {
    map.set(row.conversation_id, row.user);
  }
  return map;
}

async function searchUsers(query) {
  const q = query.trim();
  if (!q) {
    state.userSearch = [];
    renderUserSearchResults();
    return;
  }
  const myId = state.session.user.id;
  const search = `%${q}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, nationality, avatar_url")
    .neq("id", myId)
    .or(`display_name.ilike.${search},username.ilike.${search},nationality.ilike.${search}`)
    .order("display_name", { ascending: true })
    .limit(20);

  if (error) {
    state.userSearch = [];
    renderUserSearchResults();
    throw error;
  }
  state.userSearch = data || [];
}

async function getOrCreateDm(otherUserId) {
  const { data, error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherUserId });
  if (error) throw error;
  return data;
}

async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, message_type, edited_at, deleted_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  state.messages = data || [];
  renderMessages();
  scrollMessagesToBottom(true);
}

async function markConversationRead(conversationId) {
  if (!conversationId || !state.session?.user?.id) return;
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", state.session.user.id);
}

async function touchConversation(conversationId) {
  if (!conversationId) return;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  await markConversationRead(conversationId);
}

function syncActiveConversation() {
  state.activeConversation = state.conversations.find(c => c.id === state.activeConversationId) || null;
  state.otherMember = state.activeConversation?.other || null;
}

async function initializeSession() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    state.session = sessionData.session || null;

    supabase.auth.onAuthStateChange(async (_event, session) => {
      state.session = session || null;
      if (!session) {
        state.profile = null;
        state.conversations = [];
        state.activeConversationId = null;
        state.activeConversation = null;
        state.otherMember = null;
        cleanupChannels();
        modalRoot.innerHTML = "";
        document.body.style.overflow = "";
        render();
        return;
      }
      try {
        await loadProfile();
        await loadConversations(true);
        subscribeRealtime();
      } catch (err) {
        toast(err.message || "Could not load account data", "error");
      }
      render();
    });

    if (state.session) {
      await loadProfile();
      await loadConversations(true);
      subscribeRealtime();
    }
  } catch (err) {
    toast(err.message || "Startup failed", "error");
  } finally {
    setLoading(false);
    render();
  }
}

window.addEventListener("beforeunload", cleanupChannels);

window.addEventListener("resize", () => {
  if (window.innerWidth > 840) state.isSidebarOpen = false;
});

modalRoot.addEventListener("click", (e) => {
  const backdrop = e.target.closest(".modal-backdrop");
  if (backdrop && e.target === backdrop) {
    closeProfileModal();
  }
});

await initializeSession();
