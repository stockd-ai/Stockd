import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { logSecurityEvent } from '../_shared/security-events.ts';

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_STEPS = [
  { failures: 5, lockMs: 5 * 60 * 1000 },
  { failures: 8, lockMs: 15 * 60 * 1000 },
  { failures: 10, lockMs: 60 * 60 * 1000 }
];

type LoginGuardRow = {
  email_normalized: string;
  failed_attempts: number;
  first_failed_at: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  locked_until: string | null;
  last_ip: string | null;
  last_user_agent: string | null;
  last_failure_reason: string | null;
};

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function getLockoutStep(failures: number) {
  return LOCKOUT_STEPS.reduce<{ failures: number; lockMs: number } | null>((selected, step) => {
    if (failures >= step.failures) return step;
    return selected;
  }, null);
}

function secondsUntil(targetIso: string) {
  return Math.max(0, Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000));
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds >= 3600) {
    return `${Math.ceil(totalSeconds / 3600)} hour${totalSeconds >= 7200 ? 's' : ''}`;
  }
  if (totalSeconds >= 60) {
    return `${Math.ceil(totalSeconds / 60)} minute${totalSeconds >= 120 ? 's' : ''}`;
  }
  return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
}

async function upsertGuardRow(serviceClient: ReturnType<typeof createClient>, payload: Partial<LoginGuardRow> & { email_normalized: string }) {
  const { error } = await serviceClient
    .from('auth_login_guards')
    .upsert({
      ...payload,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('auth-login guard upsert failed', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({
      success: false,
      message: 'Auth login function is missing required environment variables.'
    }, { status: 500 });
  }

  let body: { email?: string; password?: string; clientFingerprint?: string; userAgent?: string } = {};
  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!email || !password) {
    return jsonResponse({ success: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const clientIp = getClientIp(req);
  const userAgent = String(body.userAgent || req.headers.get('user-agent') || '').slice(0, 255);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: existingGuard } = await serviceClient
    .from('auth_login_guards')
    .select('email_normalized, failed_attempts, first_failed_at, last_attempt_at, last_success_at, locked_until, last_ip, last_user_agent, last_failure_reason')
    .eq('email_normalized', email)
    .maybeSingle<LoginGuardRow>();

  if (existingGuard?.locked_until && new Date(existingGuard.locked_until).getTime() > now) {
    const retryAfterSeconds = secondsUntil(existingGuard.locked_until);
    await logSecurityEvent(serviceClient, {
      eventType: 'auth.login_locked',
      severity: 'warning',
      actorEmail: email,
      ipAddress: clientIp,
      route: '/login.html',
      statusCode: 429,
      userAgent,
      details: {
        source: 'auth-login',
        retryAfterSeconds,
        lockedUntil: existingGuard.locked_until
      }
    });
    return jsonResponse({
      success: false,
      code: 'locked',
      message: `Too many failed attempts. Try again in ${formatDuration(retryAfterSeconds)}.`,
      lockedUntil: existingGuard.locked_until,
      retryAfterSeconds,
      remainingAttempts: 0
    }, { status: 429 });
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey
    },
    body: JSON.stringify({ email, password })
  });

  const authPayload = await authResponse.json().catch(() => ({}));

  if (authResponse.ok) {
    await upsertGuardRow(serviceClient, {
      email_normalized: email,
      failed_attempts: 0,
      first_failed_at: null,
      last_attempt_at: nowIso,
      last_success_at: nowIso,
      locked_until: null,
      last_ip: clientIp,
      last_user_agent: userAgent,
      last_failure_reason: null
    });

    await logSecurityEvent(serviceClient, {
      eventType: 'auth.login_succeeded',
      severity: 'info',
      actorEmail: email,
      actorUserId: authPayload.user?.id || null,
      ipAddress: clientIp,
      route: '/login.html',
      statusCode: 200,
      userAgent,
      details: {
        source: 'auth-login'
      }
    });

    return jsonResponse({
      success: true,
      session: {
        access_token: authPayload.access_token,
        refresh_token: authPayload.refresh_token,
        expires_in: authPayload.expires_in,
        expires_at: authPayload.expires_at,
        token_type: authPayload.token_type,
        user: authPayload.user
      }
    });
  }

  const firstFailureTime = existingGuard?.first_failed_at ? new Date(existingGuard.first_failed_at).getTime() : null;
  const resetWindow = !firstFailureTime || (now - firstFailureTime) > WINDOW_MS;
  const nextFailures = (resetWindow ? 0 : (existingGuard?.failed_attempts || 0)) + 1;
  const lockout = getLockoutStep(nextFailures);
  const lockedUntil = lockout ? new Date(now + lockout.lockMs).toISOString() : null;

  await upsertGuardRow(serviceClient, {
    email_normalized: email,
    failed_attempts: nextFailures,
    first_failed_at: resetWindow ? nowIso : (existingGuard?.first_failed_at || nowIso),
    last_attempt_at: nowIso,
    locked_until: lockedUntil,
    last_ip: clientIp,
    last_user_agent: userAgent,
    last_failure_reason: String(authPayload.error_description || authPayload.msg || 'Invalid credentials').slice(0, 255)
  });

  if (lockedUntil) {
    const retryAfterSeconds = secondsUntil(lockedUntil);
    await logSecurityEvent(serviceClient, {
      eventType: 'auth.login_locked',
      severity: 'critical',
      actorEmail: email,
      ipAddress: clientIp,
      route: '/login.html',
      statusCode: 429,
      userAgent,
      details: {
        source: 'auth-login',
        failedAttempts: nextFailures,
        lockedUntil,
        retryAfterSeconds
      }
    });
    return jsonResponse({
      success: false,
      code: 'locked',
      message: `Too many failed attempts. Try again in ${formatDuration(retryAfterSeconds)}.`,
      lockedUntil,
      retryAfterSeconds,
      remainingAttempts: 0,
      failedAttempts: nextFailures
    }, { status: 429 });
  }

  await logSecurityEvent(serviceClient, {
    eventType: 'auth.login_failed',
    severity: nextFailures >= 3 ? 'warning' : 'info',
    actorEmail: email,
    ipAddress: clientIp,
    route: '/login.html',
    statusCode: 401,
    userAgent,
    details: {
      source: 'auth-login',
      failedAttempts: nextFailures,
      remainingAttempts: Math.max(0, LOCKOUT_STEPS[0].failures - nextFailures)
    }
  });

  return jsonResponse({
    success: false,
    code: 'invalid_credentials',
    message: 'Invalid email or password.',
    remainingAttempts: Math.max(0, LOCKOUT_STEPS[0].failures - nextFailures),
    failedAttempts: nextFailures,
    lockoutAt: LOCKOUT_STEPS[0].failures
  }, { status: 401 });
});
