/* ============================================================
   Login Page
   ============================================================ */
const LoginPage = {
  render() {
    const el = document.getElementById('login-page');
    el.innerHTML = `
      <div class="login-card">
        <h1>&#127829; Tony's Pizza</h1>
        <p class="subtitle">Inventory Management System</p>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="login-email" value="demo@tonys.pizza" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" value="TonysPizza2026!" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%" id="login-btn">
            Sign In
          </button>
          <div class="login-error" id="login-error"></div>
          <div class="demo-hint">
            Demo credentials pre-filled. Just click Sign In.
          </div>
        </form>
      </div>
    `;
  },

  init() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errEl = document.getElementById('login-error');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';
      errEl.textContent = '';

      const { error } = await supabase.auth.signInWithPassword({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      });

      if (error) {
        errEl.textContent = error.message;
        btn.disabled = false;
        btn.textContent = 'Sign In';
        return;
      }

      checkAuth();
    });
  }
};
