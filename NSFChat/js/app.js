import { supabase } from "./supabase.js";
import { APP_NAME } from "./config.js";

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const state = {
  session: null,
  profile: null,
  authView: "signin",
  loading: true,
  initializing: true,
  conversations: [],
  conversationMembers: [],
  activeConversationId: null,
  messages: [],
  otherMember: null,
  conversationSearch: "",
  userSearch: "",
  userResults: [],
  sidebarOpen: false,
  unreadByConversation: new Map(),
  latestMessageByConversation: new Map(),
  messageChannel: null,
  profileDraftOpen: false,
  isSavingProfile: false
};

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map(part => part[0] ? part[0].toUpperCase() : "");
  return letters.join("") || "N";
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function sanitizeLikeInput(value = "") {
  return String(value)
    .replaceAll("%", "")
    .replaceAll(",", " ")
    .replaceAll("*", "")
    .trim();
}

function toast(message, type = "info", timeout = 3200) {
  if (!toastRoot) return;
  const node = document.createElement("div");
  node.className = "toast";
  if (type === "success") node.style.borderColor = "rgba(56,211,159,.26)";
  if (type === "error") node.style.borderColor = "rgba(255,107,143,.26)";
  node.textContent = message;
  toastRoot.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(6px)";
    node.style.transition = "opacity .18s ease, transform .18s ease";
    setTimeout(() => node.remove(), 220);
  }, timeout);
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function authButtonLabel() {
  return state.authView === "signup" ? "Create account" : "Sign in";
}

function renderLoading() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-card">
        <img src="assets/logo.svg" alt="${APP_NAME} logo" style="width:62px;height:62px;">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <h2 style="margin:0 0 8px;">Opening ${APP_NAME}</h2>
          <p style="margin:0;color:var(--muted);line-height:1.7;">Loading your session and secure chat workspace from Supabase.</p>
        </div>
      </div>
    </div>
  `;
}

function renderAuth() {
  const signup = state.authView === "signup";
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="assets/logo.svg" alt="${APP_NAME} logo">
          <div class="brand-copy">
            <h1>${APP_NAME}</h1>
            <p>Modern messaging with email auth and profiles</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="pill">Supabase auth</span>
        </div>
      </header>

      <main class="auth-layout">
        <section class="hero">
          <div class="hero-card">
            <div class="hero-badge">Fast direct messaging for desktop and mobile</div>
            <h2>Private chat with a polished profile system.</h2>
            <p class="lead">
              NSFChat stores user profiles, conversation members, and messages in Supabase.
              It supports email sign-up, email sign-in, realtime updates, and a responsive interface that fits smaller screens cleanly.
            </p>
            <div class="feature-grid">
              <article class="feature">
                <div class="icon">◉</div>
                <h3>Profile storage</h3>
                <p>Display name, nationality, avatar, bio, and more are saved to Supabase.</p>
              </article>
              <article class="feature">
                <div class="icon">↺</div>
                <h3>Realtime chat</h3>
                <p>New messages appear instantly when another device sends them.</p>
              </article>
              <article class="feature">
                <div class="icon">◎</div>
                <h3>Mobile friendly</h3>
                <p>The layout adapts into a full mobile chat experience without breaking the desktop view.</p>
              </article>
            </div>
          </div>
        </section>

        <section class="auth-panel">
          <div class="card">
            <div class="card-head">
              <div class="tabs">
                <button class="tab ${signup ? "" : "active"}" data-auth-tab="signin" type="button">Sign in</button>
                <button class="tab ${signup ? "active" : ""}" data-auth-tab="signup" type="button">Sign up</button>
              </div>
            </div>

            <div class="form">
              <h3>${signup ? "Create your account" : "Welcome back"}</h3>
              <p>${signup ? "Register with email, then complete your profile details." : "Sign in to continue to your chats."}</p>

              <form id="auth-form">
                ${signup ? `
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
                  <label for="${signup ? "signup-email" : "signin-email"}">Email</label>
                  <input class="input" id="${signup ? "signup-email" : "signin-email"}" name="email" type="email" autocomplete="email" placeholder="name@example.com" required />
                </div>
                <div class="field">
                  <label for="${signup ? "signup-password" : "signin-password"}">Password</label>
                  <input class="input" id="${signup ? "signup-password" : "signin-password"}" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="Your password" required minlength="6" />
                </div>
                <button class="btn" type="submit" style="width:100%;">${authButtonLabel()}</button>
              </form>

              <div id="auth-message"></div>
              <p class="help" style="margin-top:14px;">After sign-up, Supabase may send a confirmation email depending on your auth settings.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
  bindAuth();
}

function renderProfileSkeleton() {
  app.innerHTML = `
    <div class="loading-screen">
      <div class="loading-card">
        <img src="assets/logo.svg" alt="${APP_NAME} logo" style="width:62px;height:62px;">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <h2 style="margin:0 0 8px;">Preparing your profile</h2>
          <p style="margin:0;color:var(--muted);line-height:1.7;">We are loading your user details and conversation list.</p>
        </div>
      </div>
    </div>
  `;
}

function otherMemberForConversation(conversationId) {
  const rows = state.conversationMembers.filter(row => row.conversation_id === conversationId && row.user_id !== state.session.user.id);
  const member = rows[0];
  return member ? member.profile : null;
}

function activeConversationData() {
  return state.conversations.find(item => item.id === state.activeConversationId) || null;
}

function renderAppShell() {
  const profile = state.profile || {};
  const activeConversation = activeConversationData();
  const other = otherMemberForConversation(state.activeConversationId);
  const headerLabel = other?.display_name || other?.username || "Select a conversation";
  const headerSub = other ? [other.nationality, other.username ? `@${other.username}` : null].filter(Boolean).join(" • ") : "Search for people or pick an existing chat.";

  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <button class="btn secondary small mobile-toggle" id="mobile-menu-btn" type="button" aria-label="Open chats">☰</button>
          <img src="assets/logo.svg" alt="${APP_NAME} logo">
          <div class="brand-copy">
            <h1>${APP_NAME}</h1>
            <p>${esc(profile.display_name || profile.full_name || profile.email || "Your account")}</p>
          </div>
        </div>
        <div class="top-actions">
          <span class="pill">${esc(profile.nationality || "Nationality not set")}</span>
          <button class="btn secondary small" id="profile-btn" type="button">Profile</button>
          <button class="btn danger small" id="signout-btn" type="button">Sign out</button>
        </div>
      </header>

      <div class="app-shell">
        <aside class="sidebar ${state.sidebarOpen ? "open" : ""}" id="sidebar">
          <div class="sidebar-head">
            <div class="profile-card">
              <div class="avatar">
                ${profile.avatar_url ? `<img src="${esc(profile.avatar_url)}" alt="Avatar">` : `<span>${esc(initials(profile.display_name || profile.full_name || profile.email || "NSF"))}</span>`}
              </div>
              <div class="profile-meta">
                <h3>${esc(profile.display_name || profile.full_name || "Unnamed user")}</h3>
                <p>${esc(profile.status || "Ready to chat")}</p>
                <div class="meta-line">
                  ${profile.username ? `<span class="tag">@${esc(profile.username)}</span>` : ""}
                  ${profile.nationality ? `<span class="tag">${esc(profile.nationality)}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="searchbox">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 21l-4.2-4.2m1.2-5.8a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <input class="input" id="conversation-search" placeholder="Search chats" value="${esc(state.conversationSearch)}" />
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 21l-4.2-4.2m1.2-5.8a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <input class="input" id="user-search" placeholder="Search users..." value="${esc(state.userSearch)}" />
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
            Messages, memberships, and profiles are stored in Supabase with row level security enabled.
          </div>
        </aside>

        <main class="main">
          ${activeConversation ? `
            <div class="chat-head">
              <div class="left">
                <div class="avatar">
                  ${other?.avatar_url ? `<img src="${esc(other.avatar_url)}" alt="Avatar">` : `<span>${esc(initials(headerLabel))}</span>`}
                </div>
                <div>
                  <h3>${esc(headerLabel)}</h3>
                  <p>${esc(headerSub)}</p>
                </div>
              </div>
              <div class="top-actions">
                <span class="pill">Realtime</span>
                <button class="btn secondary small mobile-toggle" id="close-sidebar-btn" type="button">Chats</button>
              </div>
            </div>

            <div class="messages" id="messages"></div>

            <div class="composer">
              <form class="composer-form" id="message-form">
                <textarea class="textarea" id="message-input" rows="1" maxlength="4000" placeholder="Write a message..."></textarea>
                <div class="composer-actions">
                  <button class="icon-btn" type="submit" aria-label="Send">➤</button>
                </div>
              </form>
              <div class="help" style="margin-top:10px;">Press Enter to send, Shift+Enter for a new line.</div>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-card">
                <h2>Choose a conversation</h2>
                <p>Open an existing chat from the sidebar or start a new one with a user search.</p>
              </div>
            </div>
          `}
        </main>
      </div>
    </div>
  `;

  bindApp();
  renderConversationList();
  renderUserResults();
  renderMessages();
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }
  if (!state.session) {
    renderAuth();
    return;
  }
  if (!state.profile) {
    renderProfileSkeleton();
    return;
  }
  renderAppShell();
  if (state.profileDraftOpen) {
    openProfileModal(true);
  }
}

function bindAuth() {
  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
      state.authView = button.dataset.authTab;
      renderAuth();
    });
  });

  const form = document.getElementById("auth-form");
  const message = document.getElementById("auth-message");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const isSignup = state.authView === "signup";

    try {
      if (message) message.innerHTML = `<div class="message info">${esc(isSignup ? "Creating account..." : "Signing in...")}</div>`;

      if (isSignup) {
        const display_name = String(fd.get("display_name") || "").trim();
        const username = String(fd.get("username") || "").trim();
        const nationality = String(fd.get("nationality") || "").trim();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name,
              username,
              nationality,
              full_name: display_name
            }
          }
        });

        if (error) throw error;

        if (data?.session) {
          if (message) message.innerHTML = `<div class="message success">Account created. Loading your workspace.</div>`;
        } else {
          if (message) message.innerHTML = `<div class="message success">Account created. Check your email to confirm the address, then sign in.</div>`;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (message) message.innerHTML = `<div class="message success">Signed in successfully.</div>`;
      }
    } catch (error) {
      if (message) message.innerHTML = `<div class="message error">${esc(error?.message || "Authentication failed.")}</div>`;
    }
  });
}

function bindApp() {
  document.getElementById("signout-btn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  document.getElementById("profile-btn")?.addEventListener("click", () => openProfileModal(false));
  document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    render();
  });
  document.getElementById("close-sidebar-btn")?.addEventListener("click", () => {
    state.sidebarOpen = false;
    render();
  });

  const conversationSearch = document.getElementById("conversation-search");
  conversationSearch?.addEventListener("input", (event) => {
    state.conversationSearch = event.target.value;
    renderConversationList();
  });

  const userSearch = document.getElementById("user-search");
  let userSearchTimer = null;
  userSearch?.addEventListener("input", (event) => {
    state.userSearch = event.target.value;
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => {
      searchUsers(state.userSearch).catch(() => {});
    }, 220);
  });

  document.getElementById("message-form")?.addEventListener("submit", sendMessage);
  const messageInput = document.getElementById("message-input");
  if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        document.getElementById("message-form")?.requestSubmit();
      }
    });
    setTimeout(() => messageInput.focus(), 0);
  }
}

function renderConversationList() {
  const container = document.getElementById("conversation-list");
  if (!container) return;

  const query = state.conversationSearch.trim().toLowerCase();
  const filtered = state.conversations.filter(item => {
    if (!query) return true;
    const haystack = [
      item.title,
      item.otherProfile?.display_name,
      item.otherProfile?.username,
      item.otherProfile?.nationality,
      item.otherProfile?.status
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-card" style="padding:18px; border-radius:18px;">
        <h2 style="margin:0 0 8px; font-size:1.05rem;">No conversations yet</h2>
        <p style="margin:0; color:var(--muted); line-height:1.6;">Search for a user above and start the first chat.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(conversation => {
    const other = conversation.otherProfile || {};
    const active = conversation.id === state.activeConversationId;
    const lastMessage = state.latestMessageByConversation.get(conversation.id);
    const preview = lastMessage?.body ? lastMessage.body.slice(0, 72) : "No messages yet";
    const unread = conversation.updated_at && conversation.myLastReadAt && new Date(conversation.updated_at) > new Date(conversation.myLastReadAt);

    return `
      <button class="conv-item ${active ? "active" : ""}" data-conversation-id="${conversation.id}" type="button">
        <div class="avatar" style="width:48px;height:48px;border-radius:16px;">
          ${other.avatar_url ? `<img src="${esc(other.avatar_url)}" alt="Avatar">` : `<span>${esc(initials(other.display_name || other.username || "N"))}</span>`}
        </div>
        <div class="meta">
          <div class="name">${esc(other.display_name || other.username || conversation.title || "Direct chat")}</div>
          <div class="sub">${esc(preview)}</div>
          ${other.nationality ? `<div class="conv-pill">${esc(other.nationality)}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div class="conv-time">${esc(formatTime(conversation.updated_at))}</div>
          ${unread ? `<div class="conv-pill" style="margin-top:10px;">New</div>` : ""}
        </div>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-conversation-id]").forEach(button => {
    button.addEventListener("click", () => {
      openConversation(button.dataset.conversationId);
    });
  });
}

function renderUserResults() {
  const container = document.getElementById("user-search-results");
  if (!container) return;

  const results = state.userResults;
  if (!state.userSearch.trim()) {
    container.innerHTML = `
      <div class="empty-card" style="padding:18px; border-radius:18px;">
        <h2 style="margin:0 0 8px; font-size:1.05rem;">Search to find people</h2>
        <p style="margin:0; color:var(--muted); line-height:1.6;">Type a name, username, or nationality to find users.</p>
      </div>
    `;
    return;
  }

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-card" style="padding:18px; border-radius:18px;">
        <h2 style="margin:0 0 8px; font-size:1.05rem;">No users found</h2>
        <p style="margin:0; color:var(--muted); line-height:1.6;">Try another search term.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = results.map(user => `
    <div class="search-result">
      <div class="avatar" style="width:48px;height:48px;border-radius:16px;">
        ${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="Avatar">` : `<span>${esc(initials(user.display_name || user.username || "N"))}</span>`}
      </div>
      <div class="meta">
        <div class="name">${esc(user.display_name || user.username || "Unnamed user")}</div>
        <div class="sub">${esc([user.username ? `@${user.username}` : null, user.nationality, user.status].filter(Boolean).join(" • ") || "Profile found")}</div>
      </div>
      <button class="btn secondary small" type="button" data-chat-user="${user.id}">Chat</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-chat-user]").forEach(button => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.chatUser;
      try {
        const conversationId = await startDirectConversation(userId);
        await refreshConversations(conversationId);
        await openConversation(conversationId);
        state.sidebarOpen = false;
        render();
      } catch (error) {
        toast(error?.message || "Could not start chat.", "error");
      }
    });
  });
}

function renderMessages() {
  const container = document.getElementById("messages");
  if (!container) return;

  if (!state.activeConversationId) {
    container.innerHTML = "";
    return;
  }

  if (!state.messages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-card">
          <h2>No messages yet</h2>
          <p>Send the first message to begin the conversation.</p>
        </div>
      </div>
    `;
    return;
  }

  let lastDate = "";
  container.innerHTML = state.messages.map(message => {
    const dateLabel = formatDateLabel(message.created_at);
    const dateSeparator = dateLabel !== lastDate ? `<div class="date-separator">${esc(dateLabel)}</div>` : "";
    lastDate = dateLabel;
    const self = message.sender_id === state.session.user.id;

    return `
      ${dateSeparator}
      <div class="msg ${self ? "self" : "other"}">
        <div class="bubble">${esc(message.body)}</div>
        <div class="msg-meta">
          <span>${esc(self ? "You" : state.otherMember?.display_name || "Member")}</span>
          <span>•</span>
          <span>${esc(formatTime(message.created_at))}</span>
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

function openProfileModal(force = false) {
  state.profileDraftOpen = true;
  const profile = state.profile || {};
  modalRoot.innerHTML = `
    <div class="modal-backdrop show" id="profile-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div class="modal-head">
          <div>
            <h2 id="profile-title">${force ? "Complete your profile" : "Edit profile"}</h2>
            <div class="small-muted">Keep your public details stored in Supabase.</div>
          </div>
          ${force ? "" : `<button class="btn secondary small" type="button" id="close-profile-modal">Close</button>`}
        </div>
        <div class="modal-body">
          <form class="form" id="profile-form">
            <div class="form-row">
              <div class="field">
                <label for="profile-display-name">Display name</label>
                <input class="input" id="profile-display-name" name="display_name" required value="${esc(profile.display_name || "")}" />
              </div>
              <div class="field">
                <label for="profile-username">Username</label>
                <input class="input" id="profile-username" name="username" value="${esc(profile.username || "")}" />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label for="profile-full-name">Full name</label>
                <input class="input" id="profile-full-name" name="full_name" value="${esc(profile.full_name || "")}" />
              </div>
              <div class="field">
                <label for="profile-nationality">Nationality</label>
                <input class="input" id="profile-nationality" name="nationality" value="${esc(profile.nationality || "")}" />
              </div>
            </div>

            <div class="field">
              <label for="profile-avatar-url">Avatar URL</label>
              <input class="input" id="profile-avatar-url" name="avatar_url" placeholder="https://..." value="${esc(profile.avatar_url || "")}" />
            </div>

            <div class="form-row">
              <div class="field">
                <label for="profile-website">Website</label>
                <input class="input" id="profile-website" name="website" value="${esc(profile.website || "")}" />
              </div>
              <div class="field">
                <label for="profile-location">Location</label>
                <input class="input" id="profile-location" name="location" value="${esc(profile.location || "")}" />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label for="profile-phone">Phone</label>
                <input class="input" id="profile-phone" name="phone" value="${esc(profile.phone || "")}" />
              </div>
              <div class="field">
                <label for="profile-status">Status</label>
                <input class="input" id="profile-status" name="status" value="${esc(profile.status || "Hey there, I am using NSFChat.")}" />
              </div>
            </div>

            <div class="field">
              <label for="profile-bio">Bio</label>
              <textarea class="textarea" id="profile-bio" name="bio" placeholder="Write a short bio...">${esc(profile.bio || "")}</textarea>
            </div>

            <div class="modal-actions">
              ${force ? "" : `<button class="btn secondary" type="button" id="cancel-profile">Cancel</button>`}
              <button class="btn" type="submit">${state.isSavingProfile ? "Saving..." : "Save profile"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.style.overflow = "hidden";
  document.getElementById("profile-backdrop")?.addEventListener("click", (event) => {
    if (event.target.id === "profile-backdrop" && !force) closeProfileModal();
  });
  document.getElementById("close-profile-modal")?.addEventListener("click", closeProfileModal);
  document.getElementById("cancel-profile")?.addEventListener("click", closeProfileModal);
  document.getElementById("profile-form")?.addEventListener("submit", saveProfile);
}

function closeProfileModal() {
  state.profileDraftOpen = false;
  modalRoot.innerHTML = "";
  document.body.style.overflow = "";
}

async function saveProfile(event) {
  event.preventDefault();
  if (!state.session) return;

  const fd = new FormData(event.currentTarget);
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
    state.isSavingProfile = true;
    render();

    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        display_name: payload.display_name,
        username: payload.username,
        full_name: payload.full_name || payload.display_name,
        nationality: payload.nationality,
        avatar_url: payload.avatar_url,
        website: payload.website,
        location: payload.location,
        phone: payload.phone,
        status: payload.status,
        bio: payload.bio
      }
    });
    if (metaError) throw metaError;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;

    state.profile = data;
    state.isSavingProfile = false;
    closeProfileModal();
    toast("Profile saved.", "success");
    render();
    await refreshConversations(state.activeConversationId);
  } catch (error) {
    state.isSavingProfile = false;
    render();
    toast(error?.message || "Could not save profile.", "error");
  }
}

async function loadSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  state.session = data.session || null;
}

async function loadProfile() {
  if (!state.session) return;
  const user = state.session.user;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    state.profile = data;
    return;
  }

  const fallbackProfile = {
    id: user.id,
    display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "New user",
    username: user.user_metadata?.username || null,
    full_name: user.user_metadata?.full_name || null,
    nationality: user.user_metadata?.nationality || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    website: user.user_metadata?.website || null,
    location: user.user_metadata?.location || null,
    phone: user.user_metadata?.phone || null,
    status: user.user_metadata?.status || "Hey there, I am using NSFChat.",
    bio: user.user_metadata?.bio || null
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" })
    .select("*")
    .single();

  if (insertError) throw insertError;
  state.profile = inserted;
  state.profileDraftOpen = true;
  openProfileModal(true);
}

async function loadConversations() {
  if (!state.session) return;
  const myId = state.session.user.id;

  const { data: membershipRows, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id,last_read_at,joined_at")
    .eq("user_id", myId);

  if (membershipError) throw membershipError;

  const ids = membershipRows.map(row => row.conversation_id);
  if (!ids.length) {
    state.conversations = [];
    state.conversationMembers = [];
    state.latestMessageByConversation = new Map();
    state.unreadByConversation = new Map();
    return;
  }

  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id,conversation_type,title,dm_key,created_at,updated_at")
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (convError) throw convError;

  const { data: memberRows, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id,user_id,last_read_at,joined_at")
    .in("conversation_id", ids);

  if (memberError) throw memberError;

  const otherIds = [...new Set(memberRows.filter(row => row.user_id !== myId).map(row => row.user_id))];
  let profileRows = [];
  if (otherIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,username,nationality,avatar_url,status")
      .in("id", otherIds);
    if (error) throw error;
    profileRows = data || [];
  }

  const profileMap = new Map(profileRows.map(row => [row.id, row]));
  const membershipMap = new Map(memberRows.map(row => [row.user_id, row]));

  state.conversations = (conversations || []).map(conversation => {
    const otherProfile = memberRows
      .filter(row => row.conversation_id === conversation.id && row.user_id !== myId)
      .map(row => profileMap.get(row.user_id))
      .find(Boolean) || null;

    const myMembership = memberRows.find(row => row.conversation_id === conversation.id && row.user_id === myId) || null;
    return {
      ...conversation,
      otherProfile,
      myLastReadAt: myMembership?.last_read_at || null
    };
  });

  state.conversationMembers = memberRows.map(row => ({
    ...row,
    profile: profileMap.get(row.user_id) || null
  }));

  const unreadMap = new Map();
  state.conversations.forEach(item => {
    const lastRead = item.myLastReadAt ? new Date(item.myLastReadAt).getTime() : 0;
    const updated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
    unreadMap.set(item.id, Boolean(updated && updated > lastRead));
  });
  state.unreadByConversation = unreadMap;
}

async function refreshConversations(preferredId = null) {
  await loadConversations();
  if (preferredId && state.conversations.some(item => item.id === preferredId)) {
    state.activeConversationId = preferredId;
  } else if (state.activeConversationId && !state.conversations.some(item => item.id === state.activeConversationId)) {
    state.activeConversationId = state.conversations[0]?.id || null;
  } else if (!state.activeConversationId) {
    state.activeConversationId = state.conversations[0]?.id || null;
  }

  if (state.activeConversationId) {
    await loadMessages(state.activeConversationId);
  } else {
    state.messages = [];
    state.otherMember = null;
  }
  render();
}

async function loadMessages(conversationId) {
  if (!conversationId) return;

  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  state.messages = data || [];
  const current = state.conversationMembers.find(row => row.conversation_id === conversationId && row.user_id !== state.session.user.id);
  state.otherMember = current?.profile || null;

  if (state.session) {
    await markConversationRead(conversationId).catch(() => {});
  }
}

async function markConversationRead(conversationId) {
  if (!conversationId || !state.session) return;
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", state.session.user.id);
}

async function openConversation(conversationId) {
  state.activeConversationId = conversationId;
  state.sidebarOpen = false;
  await loadMessages(conversationId);
  render();
}

async function startDirectConversation(otherUserId) {
  const { data, error } = await supabase.rpc("start_direct_conversation", {
    p_other_user_id: otherUserId
  });
  if (error) throw error;
  return data;
}

async function searchUsers(query) {
  const clean = sanitizeLikeInput(query);
  if (!clean) {
    state.userResults = [];
    renderUserResults();
    return;
  }

  const pattern = `%${clean}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,username,nationality,avatar_url,status")
    .or(`display_name.ilike.${pattern},username.ilike.${pattern},nationality.ilike.${pattern}`)
    .neq("id", state.session.user.id)
    .order("display_name", { ascending: true })
    .limit(12);

  if (error) {
    state.userResults = [];
    renderUserResults();
    throw error;
  }

  state.userResults = data || [];
  renderUserResults();
}

async function sendMessage(event) {
  event.preventDefault();
  const input = document.getElementById("message-input");
  const text = String(input?.value || "").trim();
  if (!text || !state.activeConversationId) return;

  try {
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: state.activeConversationId,
        sender_id: state.session.user.id,
        body: text
      });

    if (error) throw error;

    input.value = "";
    input.style.height = "";
    await refreshConversations(state.activeConversationId);
    toast("Message sent.", "success", 1800);
  } catch (error) {
    toast(error?.message || "Could not send message.", "error");
  }
}

function cleanupChannel() {
  if (state.messageChannel) {
    supabase.removeChannel(state.messageChannel);
    state.messageChannel = null;
  }
}

function subscribeRealtime() {
  cleanupChannel();
  if (!state.session) return;

  state.messageChannel = supabase
    .channel(`nsfchat-${state.session.user.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async payload => {
        const newMessage = payload.new;
        await refreshConversations(state.activeConversationId);
        if (newMessage.conversation_id === state.activeConversationId) {
          await loadMessages(state.activeConversationId);
          render();
          const messagesWrap = document.getElementById("messages");
          if (messagesWrap) messagesWrap.scrollTop = messagesWrap.scrollHeight;
        } else {
          renderConversationList();
        }
      }
    )
    .subscribe();
}

async function bootstrap() {
  try {
    renderLoading();
    await loadSession();
    state.loading = false;

    if (!state.session) {
      render();
      return;
    }

    await loadProfile();
    await loadConversations();

    if (!state.activeConversationId && state.conversations[0]) {
      state.activeConversationId = state.conversations[0].id;
    }

    if (state.activeConversationId) {
      await loadMessages(state.activeConversationId);
    }

    render();
    subscribeRealtime();

    if (!state.profile?.display_name || !state.profile?.nationality || !state.profile?.username) {
      state.profileDraftOpen = true;
      openProfileModal(true);
    }
  } catch (error) {
    state.loading = false;
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-card">
          <img src="assets/logo.svg" alt="${APP_NAME} logo" style="width:62px;height:62px;">
          <h2 style="margin:0;">Could not load NSFChat</h2>
          <p style="margin:0;color:var(--muted);line-height:1.7;">${esc(error?.message || "Unknown error")}</p>
          <p style="margin:0;color:var(--muted);line-height:1.7;">Check the Supabase URL, anon key, and the SQL schema.</p>
        </div>
      </div>
    `;
    console.error(error);
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  state.session = session;
  if (!session) {
    cleanupChannel();
    state.profile = null;
    state.conversations = [];
    state.conversationMembers = [];
    state.messages = [];
    state.activeConversationId = null;
    state.otherMember = null;
    state.userResults = [];
    state.profileDraftOpen = false;
    document.body.style.overflow = "";
    render();
    return;
  }

  await loadProfile().catch(() => {});
  await loadConversations().catch(() => {});
  if (!state.activeConversationId && state.conversations[0]) {
    state.activeConversationId = state.conversations[0].id;
  }
  if (state.activeConversationId) {
    await loadMessages(state.activeConversationId).catch(() => {});
  }
  state.loading = false;
  render();
  subscribeRealtime();
});

bootstrap();

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && modalRoot.innerHTML) {
    closeProfileModal();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    state.sidebarOpen = false;
    render();
  }
});
