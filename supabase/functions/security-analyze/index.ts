import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { analyzeSecurityEvents } from '../_shared/security-analyzer.mjs';

function clampHours(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(Math.max(Math.round(parsed), 1), 168);
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

  let body: { hours?: number } = {};
  try {
    body = await req.json();
  } catch (_err) {
    body = {};
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return jsonResponse({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const hours = clampHours(body.hours);
  const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceClient
    .from('security_events')
    .select('event_type, severity, actor_email, actor_user_id, ip_address, route, status_code, user_agent, details, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (error) {
    return jsonResponse({ success: false, message: error.message }, { status: 500 });
  }

  const summary = analyzeSecurityEvents(data || [], { analysisWindowHours: hours });
  return jsonResponse({
    success: true,
    summary,
    window: {
      hours,
      since: sinceIso
    }
  });
});
