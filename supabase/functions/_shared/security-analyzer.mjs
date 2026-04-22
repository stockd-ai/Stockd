const PROBE_PATTERNS = [
  /\/\.env/i,
  /wp-login\.php/i,
  /\/admin(?:\/|$)/i,
  /phpmyadmin/i,
  /\/boaform/i,
  /\/\.git/i
];

const STATUS_THRESHOLDS = {
  401: 5,
  403: 4,
  404: 8,
  429: 3,
  500: 3
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIso(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function safeString(value, fallback = '') {
  return value == null ? fallback : String(value);
}

function severityWeight(level) {
  if (level === 'critical') return 3;
  if (level === 'warning') return 2;
  return 1;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function analyzeSecurityEvents(rawEvents, options = {}) {
  const events = toArray(rawEvents)
    .map(event => ({
      eventType: safeString(event.event_type || event.eventType, 'unknown'),
      severity: safeString(event.severity, 'info'),
      actorEmail: safeString(event.actor_email || event.actorEmail || ''),
      actorUserId: safeString(event.actor_user_id || event.actorUserId || ''),
      ipAddress: safeString(event.ip_address || event.ipAddress || 'unknown'),
      route: safeString(event.route || event.path || event.details?.path || ''),
      statusCode: Number.isFinite(Number(event.status_code ?? event.statusCode))
        ? Number(event.status_code ?? event.statusCode)
        : null,
      userAgent: safeString(event.user_agent || event.userAgent || ''),
      details: event.details && typeof event.details === 'object' && !Array.isArray(event.details) ? event.details : {},
      createdAt: toIso(event.created_at || event.createdAt)
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const severityCounts = { info: 0, warning: 0, critical: 0 };
  const eventTypeCounts = {};
  const ipTotals = {};
  const failedLogins = {};
  const probeHits = {};
  const statusCounts = {};
  const flaggedActivities = [];

  events.forEach(event => {
    severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
    eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    ipTotals[event.ipAddress] = (ipTotals[event.ipAddress] || 0) + severityWeight(event.severity);

    if (event.statusCode != null) {
      statusCounts[event.statusCode] = (statusCounts[event.statusCode] || 0) + 1;
    }

    if (event.eventType === 'auth.login_failed') {
      const key = `${event.actorEmail || 'unknown'}::${event.ipAddress}`;
      if (!failedLogins[key]) {
        failedLogins[key] = {
          email: event.actorEmail || 'unknown',
          ipAddress: event.ipAddress,
          attempts: 0,
          firstSeen: event.createdAt,
          lastSeen: event.createdAt
        };
      }
      failedLogins[key].attempts += 1;
      failedLogins[key].lastSeen = event.createdAt;
    }

    const probeTarget = `${event.route} ${safeString(event.details?.path || '')}`.trim();
    if (probeTarget && PROBE_PATTERNS.some(pattern => pattern.test(probeTarget))) {
      if (!probeHits[event.ipAddress]) {
        probeHits[event.ipAddress] = {
          ipAddress: event.ipAddress,
          routes: []
        };
      }
      probeHits[event.ipAddress].routes.push(event.route || safeString(event.details?.path || ''));
    }
  });

  Object.values(failedLogins)
    .filter(group => group.attempts >= 4)
    .sort((a, b) => b.attempts - a.attempts)
    .forEach(group => {
      flaggedActivities.push({
        type: 'repeated_failed_logins',
        severity: group.attempts >= 8 ? 'critical' : 'warning',
        summary: `${group.email} had ${group.attempts} failed login attempts from ${group.ipAddress}.`,
        evidence: group
      });
    });

  events
    .filter(event => event.eventType === 'auth.login_locked')
    .forEach(event => {
      flaggedActivities.push({
        type: 'lockout_triggered',
        severity: event.severity === 'critical' ? 'critical' : 'warning',
        summary: `Temporary login lockout triggered for ${event.actorEmail || 'unknown user'} from ${event.ipAddress}.`,
        evidence: {
          email: event.actorEmail || 'unknown',
          ipAddress: event.ipAddress,
          lockedUntil: event.details?.lockedUntil || null,
          retryAfterSeconds: event.details?.retryAfterSeconds || null
        }
      });
    });

  Object.values(probeHits)
    .map(group => ({
      ...group,
      routes: unique(group.routes)
    }))
    .filter(group => group.routes.length > 0)
    .forEach(group => {
      flaggedActivities.push({
        type: 'route_probe',
        severity: group.routes.length >= 3 ? 'critical' : 'warning',
        summary: `${group.ipAddress} probed suspicious routes: ${group.routes.join(', ')}.`,
        evidence: group
      });
    });

  Object.entries(statusCounts)
    .filter(([statusCode, count]) => {
      const numericStatus = Number(statusCode);
      if (!Number.isFinite(numericStatus) || numericStatus < 400) return false;
      const threshold = STATUS_THRESHOLDS[numericStatus] || 6;
      return count >= threshold;
    })
    .forEach(([statusCode, count]) => {
      flaggedActivities.push({
        type: 'status_spike',
        severity: Number(statusCode) >= 500 ? 'critical' : 'warning',
        summary: `Observed ${count} responses with status ${statusCode} in the analysis window.`,
        evidence: {
          statusCode: Number(statusCode),
          count
        }
      });
    });

  const topIpAddresses = Object.entries(ipTotals)
    .map(([ipAddress, score]) => ({
      ipAddress,
      score,
      events: events.filter(event => event.ipAddress === ipAddress).length
    }))
    .sort((a, b) => b.score - a.score || b.events - a.events)
    .slice(0, 5);

  const flaggedCount = flaggedActivities.length;
  const headline = flaggedCount === 0
    ? 'No high-confidence suspicious activity was detected in the current analysis window.'
    : `Detected ${flaggedCount} suspicious pattern${flaggedCount === 1 ? '' : 's'} across ${events.length} monitored events.`;

  const aiStyleSummary = [
    headline,
    flaggedActivities.find(item => item.type === 'repeated_failed_logins')
      ? 'Primary risk signal: repeated failed logins with escalating lockout behavior.'
      : 'Primary risk signal: no sustained credential attack pattern detected.',
    flaggedActivities.find(item => item.type === 'route_probe')
      ? 'Secondary signal: route probing consistent with opportunistic scanning.'
      : 'Secondary signal: no probe-route burst crossed the alert threshold.',
    topIpAddresses[0]
      ? `Highest weighted source IP: ${topIpAddresses[0].ipAddress} (${topIpAddresses[0].events} events).`
      : 'No IP address accumulated notable risk weight.'
  ].join(' ');

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    severityCounts,
    eventTypeCounts,
    statusCounts,
    topIpAddresses,
    flaggedActivities,
    recentEvents: events.slice(-15).reverse(),
    aiStyleSummary,
    analysisWindowHours: Number.isFinite(options.analysisWindowHours) ? options.analysisWindowHours : 24
  };
}

export function renderSecurityMarkdown(summary) {
  const lines = [
    '# Security Analysis Summary',
    '',
    `Generated: ${summary.generatedAt}`,
    `Events analyzed: ${summary.totalEvents}`,
    '',
    '## Heuristic Summary',
    '',
    summary.aiStyleSummary,
    '',
    '## Severity Counts',
    '',
    `- Info: ${summary.severityCounts.info || 0}`,
    `- Warning: ${summary.severityCounts.warning || 0}`,
    `- Critical: ${summary.severityCounts.critical || 0}`,
    '',
    '## Flagged Activity',
    ''
  ];

  if (!summary.flaggedActivities.length) {
    lines.push('- No suspicious patterns crossed the current threshold.');
  } else {
    summary.flaggedActivities.forEach(item => {
      lines.push(`- [${item.severity.toUpperCase()}] ${item.summary}`);
    });
  }

  lines.push('', '## Top Source IPs', '');

  if (!summary.topIpAddresses.length) {
    lines.push('- None');
  } else {
    summary.topIpAddresses.forEach(item => {
      lines.push(`- ${item.ipAddress}: ${item.events} events, risk score ${item.score}`);
    });
  }

  return lines.join('\n');
}
