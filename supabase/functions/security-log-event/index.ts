import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { logSecurityEvent } from '../_shared/security-events.ts';

function normalizeEventType(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSeverity(value: unknown) {
  const severity = String(value || 'info').trim().toLowerCase();
  if (severity === 'warning' || severity === 'critical') return severity;
  return 'info';
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown';
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
    return jsonResponse({ success: false, message: 'Missing Supabase function environment variables.' }, { status: 500 });
  }

  let body: {
    eventType?: string;
    severity?: string;
    route?: string;
    statusCode?: number;
    actorEmail?: string;
    details?: Record<string, unknown>;
  } = {};

  try {
    body = await req.json();
  } catch (_err) {
    return jsonResponse({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const eventType = normalizeEventType(body.eventType);
  if (!eventType) {
    return jsonResponse({ success: false, message: 'eventType is required.' }, { status: 400 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user } } = await authClient.auth.getUser();
  const anonymousAllowed = eventType.startsWith('auth.');

  if (!user && !anonymousAllowed) {
    return jsonResponse({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  await logSecurityEvent(serviceClient, {
    eventType,
    severity: normalizeSeverity(body.severity),
    actorEmail: user?.email || body.actorEmail || null,
    actorUserId: user?.id || null,
    ipAddress: getClientIp(req),
    route: String(body.route || '').slice(0, 255),
    statusCode: Number.isFinite(Number(body.statusCode)) ? Number(body.statusCode) : null,
    userAgent: String(req.headers.get('user-agent') || '').slice(0, 255),
    details: body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {}
  });

  return jsonResponse({ success: true });
});
