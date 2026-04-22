type SecurityEventPayload = {
  eventType: string;
  severity?: 'info' | 'warning' | 'critical';
  actorEmail?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  route?: string | null;
  statusCode?: number | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
};

export async function logSecurityEvent(serviceClient: any, payload: SecurityEventPayload) {
  const { error } = await serviceClient.from('security_events').insert({
    event_type: payload.eventType,
    severity: payload.severity || 'info',
    actor_email: payload.actorEmail || null,
    actor_user_id: payload.actorUserId || null,
    ip_address: payload.ipAddress || null,
    route: payload.route || null,
    status_code: payload.statusCode ?? null,
    user_agent: payload.userAgent || null,
    details: payload.details || {}
  });

  if (error) {
    console.error('security_events insert failed', error);
  }
}
