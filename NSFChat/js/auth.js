/**
 * NSFChat — Authentication Module
 * ---------------------------------------------------------
 * Drop this in js/auth.js.
 * Requires js/config.js to run first and create:
 *   window.supabaseClient
 * ---------------------------------------------------------
 */

(() => {
  'use strict';

  function getSupabase() {
    const client = window.supabaseClient;
    if (!client) {
      throw new Error('Supabase client not initialized. Load js/config.js before auth.js.');
    }
    return client;
  }

  function showAuthError(message) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(window.__authErrorTimer);
    window.__authErrorTimer = setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }

  function clearAuthError() {
    const el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
  }

  function setLoading(loading) {
    const btn = document.getElementById('auth-submit-btn');
    if (!btn) return;

    btn.disabled = loading;
    btn.dataset.loading = loading ? 'true' : 'false';

    const spinner = btn.querySelector('.btn-spinner');
    const label = btn.querySelector('.btn-label');
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (label) label.style.opacity = loading ? '0.6' : '1';
  }

  function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function showToastSafe(message, type = 'info') {
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(message, type);
      return;
    }
    if (type === 'error') {
      showAuthError(message);
      return;
    }
    console.log(message);
  }

  async function signUp(email, password, displayName) {
    const supabase = getSupabase();
    clearAuthError();
    setLoading(true);

    try {
      const safeEmail = String(email || '').trim();
      const safePassword = String(password || '');
      const safeName = String(displayName || '').trim() || safeEmail.split('@')[0] || 'New user';

      if (!safeEmail || !safePassword) {
        throw new Error('Email and password are required.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password: safePassword,
        options: {
          data: {
            display_name: safeName,
          },
        },
      });

      if (error) throw error;

      if (data?.user && !data?.session) {
        showToastSafe('Check your email to confirm your account.', 'info');
        return null;
      }

      return data;
    } catch (err) {
      showAuthError(err?.message || 'Sign-up failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const supabase = getSupabase();
    clearAuthError();
    setLoading(true);

    try {
      const safeEmail = String(email || '').trim();
      const safePassword = String(password || '');

      if (!safeEmail || !safePassword) {
        throw new Error('Email and password are required.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password: safePassword,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      showAuthError(err?.message || 'Login failed. Check your credentials.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const supabase = getSupabase();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }

  async function getSession() {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }

  async function getCurrentUser() {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  }

  function onAuthStateChange(callback) {
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session || null);
    });
    return data?.subscription || null;
  }

  function setAuthMode(mode) {
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const submitBtn = document.getElementById('auth-submit-btn');
    const btnLabel = submitBtn?.querySelector('.btn-label');

    const isSignup = mode === 'signup';

    if (loginTab) loginTab.classList.toggle('active', !isSignup);
    if (signupTab) signupTab.classList.toggle('active', isSignup);
    if (loginForm) loginForm.classList.toggle('hidden', isSignup);
    if (signupForm) signupForm.classList.toggle('hidden', !isSignup);
    if (btnLabel) btnLabel.textContent = isSignup ? 'Create Account' : 'Sign In';

    clearAuthError();
  }

  async function handleSubmit() {
    const loginVisible = !document.getElementById('login-form')?.classList.contains('hidden');

    if (loginVisible) {
      const email = getInputValue('login-email');
      const password = document.getElementById('login-password')?.value || '';
      const data = await signIn(email, password);
      if (data?.session) {
        showToastSafe('Signed in successfully.', 'info');
      }
      return;
    }

    const displayName = getInputValue('signup-name');
    const email = getInputValue('signup-email');
    const password = document.getElementById('signup-password')?.value || '';
    const data = await signUp(email, password, displayName);
    if (data?.session) {
      showToastSafe('Account created successfully.', 'info');
    }
  }

  function initAuthUI() {
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const submitBtn = document.getElementById('auth-submit-btn');
    const loginPassword = document.getElementById('login-password');
    const signupPassword = document.getElementById('signup-password');

    if (loginTab) {
      loginTab.addEventListener('click', () => setAuthMode('login'));
    }

    if (signupTab) {
      signupTab.addEventListener('click', () => setAuthMode('signup'));
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }

    if (loginPassword) {
      loginPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
    }

    if (signupPassword) {
      signupPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
    }

    setAuthMode('login');
  }

  function init() {
    try {
      getSupabase();
    } catch (err) {
      console.error(err);
      showAuthError(err.message);
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAuthUI, { once: true });
    } else {
      initAuthUI();
    }
  }

  window.Auth = {
    signUp,
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    onAuthStateChange,
  };

  init();
})();
