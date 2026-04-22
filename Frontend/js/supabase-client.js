// ═══════════════════════════════════════════════
// js/supabase-client.js — Shared Supabase init
// Load AFTER the Supabase CDN script
// ═══════════════════════════════════════════════

// ─── PASTE YOUR KEYS HERE ────────────────────
// NOTE: anon key is safe to expose in frontend (RLS enforced). Service key must NEVER be used here.
const SUPABASE_URL  = window.__SUPABASE_URL || '';
const SUPABASE_ANON = window.__SUPABASE_ANON_KEY || '';
// ──────────────────────────────────────────────

if (!SUPABASE_ANON) {
  console.error('⚠️  Set SUPABASE_ANON in js/supabase-client.js');
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

function getClientFingerprint() {
  const key = 'stockd-client-fingerprint';
  let fingerprint = null;

  try {
    fingerprint = localStorage.getItem(key);
  } catch (_error) {
    fingerprint = null;
  }

  if (!fingerprint) {
    fingerprint = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `stockd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      localStorage.setItem(key, fingerprint);
    } catch (_error) {
    }
  }

  return fingerprint;
}

async function invokeEdgeFunction(functionName, body) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON,
  };

  const { data: { session } } = await sb.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function guardedPasswordLogin(email, password) {
  return invokeEdgeFunction('auth-login', {
    flow: 'web_login',
    email,
    password,
    client_token: getClientFingerprint(),
    userAgent: navigator.userAgent || '',
  });
}

// ─── Auth Helpers ────────────────────────────

/** Get current session or redirect to login */
async function requireAuth(loginPage = '/login.html') {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = loginPage;
    return null;
  }
  return session;
}

/** Sign out and redirect */
async function signOut() {
  await sb.auth.signOut();
  window.location.href = '/login.html';
}

// ─── Router: check onboarding state, redirect appropriately ──

async function routeByOnboarding() {
  const session = await requireAuth();
  if (!session) return;

  const { data, error } = await sb.rpc('get_onboarding_status');
  if (error) {
    console.error('Onboarding check failed:', error);
    return 'dashboard'; // fallback
  }
  return data.setup_complete ? 'dashboard' : 'onboarding';
}

// ─── Toast Notifications ─────────────────────

function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
