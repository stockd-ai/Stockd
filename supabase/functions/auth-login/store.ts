import { AuthLoginEnv, AuthLoginError, GuardState, LoginFlow } from "./types.ts";

type PostgrestErrorPayload = {
  message?: string;
};

type AuthLoginGuardRow = {
  email_normalized: string;
  failed_attempts: number;
  first_failed_at: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  locked_until: string | null;
  created_at?: string;
  updated_at?: string;
};

function buildServiceHeaders(env: AuthLoginEnv, withJsonBody = false): Headers {
  const headers = new Headers({
    "apikey": env.supabaseServiceRoleKey,
    "Authorization": `Bearer ${env.supabaseServiceRoleKey}`,
    "Accept": "application/json",
  });

  if (withJsonBody) {
    headers.set("Content-Type", "application/json");
    headers.set("Prefer", "resolution=merge-duplicates,return=minimal");
  }

  return headers;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function mapPostgrestError(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload && typeof (payload as PostgrestErrorPayload).message === "string") {
    return (payload as PostgrestErrorPayload).message as string;
  }

  return "PostgREST request failed.";
}

function mapGuardRow(row: AuthLoginGuardRow, flow: LoginFlow): GuardState {
  return {
    scope_key: row.email_normalized,
    flow,
    scope_type: "identifier",
    failed_attempts: row.failed_attempts || 0,
    challenge_required: false,
    lock_until: row.locked_until,
    last_failed_at: row.last_attempt_at || row.first_failed_at || null,
    last_success_at: row.last_success_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchGuardStates(
  env: AuthLoginEnv,
  scopeKeys: string[],
  flow: LoginFlow = "web_login",
): Promise<GuardState[]> {
  if (scopeKeys.length === 0) {
    return [];
  }

  const url = new URL(`${env.supabaseUrl}/rest/v1/auth_login_guards`);
  url.searchParams.set(
    "select",
    "email_normalized,failed_attempts,first_failed_at,last_attempt_at,last_success_at,locked_until,created_at,updated_at",
  );
  const encodedKeys = scopeKeys
    .map((scopeKey) => `"${scopeKey.replace(/"/g, '\\"')}"`)
    .join(",");
  url.searchParams.set("email_normalized", `in.(${encodedKeys})`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: buildServiceHeaders(env),
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new AuthLoginError(
      "guard_fetch_failed",
      mapPostgrestError(parsed),
      502,
      false,
    );
  }

  return Array.isArray(parsed)
    ? (parsed as AuthLoginGuardRow[]).map((row) => mapGuardRow(row, flow))
    : [];
}

export async function upsertGuardStates(env: AuthLoginEnv, states: GuardState[]): Promise<void> {
  if (!states.length) {
    return;
  }

  const rows = states.map((state) => ({
    email_normalized: state.scope_key,
    failed_attempts: state.failed_attempts,
    first_failed_at: state.failed_attempts > 0 ? (state.last_failed_at || null) : null,
    last_attempt_at: state.last_failed_at || state.last_success_at || null,
    last_success_at: state.last_success_at || null,
    locked_until: state.lock_until || null,
    updated_at: state.updated_at || new Date().toISOString(),
  }));

  const response = await fetch(`${env.supabaseUrl}/rest/v1/auth_login_guards?on_conflict=email_normalized`, {
    method: "POST",
    headers: buildServiceHeaders(env, true),
    body: JSON.stringify(rows),
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new AuthLoginError(
      "guard_upsert_failed",
      mapPostgrestError(parsed),
      502,
      false,
    );
  }
}
