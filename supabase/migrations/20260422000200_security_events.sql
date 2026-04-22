-- Assignment enhancement: security event persistence for monitoring and analysis

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  actor_email text,
  actor_user_id uuid,
  ip_address text,
  route text,
  status_code integer,
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS security_events_created_at_idx
  ON public.security_events (created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_event_type_idx
  ON public.security_events (event_type);

CREATE INDEX IF NOT EXISTS security_events_ip_idx
  ON public.security_events (ip_address);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.security_events IS
  'Stores auth, request, and monitoring events for assignment-driven traffic and security analysis.';
