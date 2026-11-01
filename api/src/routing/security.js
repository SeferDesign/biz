import { rateLimit } from 'express-rate-limit';

function createLimiter(identifier, defaults, options) {
  return rateLimit({
    ...defaults,
    ...options,
    identifier,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  });
}

export function createRateLimiters(options = {}) {
  return {
    api: createLimiter('api', {
      windowMs: 60_000,
      limit: 300,
      skip: (req) => req.method === 'OPTIONS' || req.path === '/health'
    }, options.api),
    auth: createLimiter('authentication', {
      windowMs: 15 * 60_000,
      limit: 20,
      skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    }, options.auth),
    reset: createLimiter('password-reset', {
      windowMs: 15 * 60_000,
      limit: 5,
      skip: (req) => req.method !== 'POST'
    }, options.reset)
  };
}

export function createOriginProtection(allowedOrigins) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || /^Bearer\s+\S+$/i.test(req.get('authorization') || '')) return next();
    const origin = req.get('origin');
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    const hasSessionCookie = /(?:^|;\s*)biz_session=/.test(req.get('cookie') || '');
    if ((origin && origin !== sameOrigin && !allowedOrigins.includes(origin)) ||
        (!origin && (hasSessionCookie || req.get('sec-fetch-site') === 'cross-site'))) {
      return res.status(403).json({ error: 'Request origin is not allowed' });
    }
    return next();
  };
}