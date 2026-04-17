/**
 * NSFChat — Authentication Module
 * Handles sign-up, login, logout, and session management
 */

const Auth = (() => {

  /* ── Internal helpers ─────────────────────────────── */

  /** Show an error message inside an auth form */
  function showAuthError(message) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent  = message;
    el.style.display = 'block';
    // Auto-hide after 5 s
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }

  /** Hide auth error */
  function clearAuthError() {
    const el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
  }

  /** Toggle loading state on submit button */
  function setLoading(loading) {
    const btn = document.getElementById('auth-submit-btn');
    if (!btn) return;
    btn.disabled     = loading;
    btn.dataset.loading = loading ? 'true' : 'false';
    const spinner = btn.querySelector('.btn-spinner');
    const label   = btn.querySelector('.btn-label');
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (label)   label.style.opacity   = loading ? '0.6' : '1';
  }

  /* ── Public API ────────────────────────────────────── */

  /**
   * Register a new user with email + password
   * Supabase trigger auto-creates their profile row
   */
  async function signUp(email, password, displayName) {
    clearAuthError();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] }
        }
      });
      if (error) throw error;

      // Supabase may require email confirmation depending on project settings
      if (data.user && !data.session) {
        App.showToast('Check your email to confirm your account!', 'info');
        return null;
      }
      return data;
    } catch (err) {
      showAuthError(err.message || 'Sign-up failed. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sign in an existing user
   */
  async function signIn(email, password) {
    clearAuthError();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    } catch (err) {
      showAuthError(err.message || 'Login failed. Check your credentials.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sign out the current user
   */
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  }

  /**
   * Get the current session (returns null if not logged in)
   */
  async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Get the current user object (or null)
   */
  async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  }

  /**
   * Listen for auth state changes (SIGNED_IN, SIGNED_OUT, etc.)
   * Calls the provided callback with the new session
   */
  function onAuthStateChange(callback) {
    supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  return { signUp, signIn, signOut, getSession, getCurrentUser, onAuthStateChange };
})();
