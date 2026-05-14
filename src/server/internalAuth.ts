import type express from 'express';

export function requireInternalJobSecret(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) {
    res.status(503).json({
      error: {
        code: 'internal_job_secret_missing',
        message: 'Internal job secret is not configured.',
      },
    });
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).json({
      error: {
        code: 'auth_missing',
        message: 'Authorization header is required.',
      },
    });
    return;
  }

  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({
      error: {
        code: 'auth_malformed',
        message: 'Authorization header must use Bearer auth.',
      },
    });
    return;
  }

  if (match[1] !== secret) {
    res.status(403).json({
      error: {
        code: 'auth_invalid',
        message: 'Internal job secret is invalid.',
      },
    });
    return;
  }

  next();
}
