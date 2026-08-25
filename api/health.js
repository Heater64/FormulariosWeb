const VERSION = '1.0.12';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return json(res, 405, { status: 'error', error: 'method_not_allowed' });
  }

  const started = Date.now();
  const checks = { app: 'ok' };
  let status = 'ok';

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
        signal: AbortSignal.timeout(3500)
      });
      checks.supabase = response.ok ? 'ok' : `http_${response.status}`;
      if (!response.ok) status = 'degraded';
    } catch (error) {
      checks.supabase = 'unreachable';
      checks.supabase_error = error.name === 'TimeoutError' ? 'timeout' : 'network';
      status = 'degraded';
    }
  } else {
    checks.supabase = 'not_configured';
    status = 'degraded';
  }

  return json(res, status === 'ok' ? 200 : 503, {
    status,
    version: process.env.APP_VERSION || VERSION,
    checks,
    response_ms: Date.now() - started,
    timestamp: new Date().toISOString()
  });
}
