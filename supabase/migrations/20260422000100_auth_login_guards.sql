-- Assignment enhancement: brute-force login protection state
-- Stores per-email failure counters and temporary lockouts.

CREATE TABLE IF NOT EXISTS public.auth_login_guards (
  email_normalized text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  first_failed_at timestamptz,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  locked_until timestamptz,
  last_ip text,
  last_user_agent text,
  last_failure_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS auth_login_guards_locked_until_idx
  ON public.auth_login_guards (locked_until);

CREATE INDEX IF NOT EXISTS auth_login_guards_last_attempt_idx
  ON public.auth_login_guards (last_attempt_at DESC);

ALTER TABLE public.auth_login_guards ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.auth_login_guards IS
  'Tracks failed password login attempts and temporary lockouts for assignment-driven brute-force protection.';
