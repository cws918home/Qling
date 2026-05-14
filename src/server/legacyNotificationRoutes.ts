import type express from 'express';

const disabled = {
  error: {
    code: 'legacy_notification_route_disabled',
    message: 'Use PRD mutation routes.',
  },
};

export function registerLegacyNotificationRoutes(app: Pick<express.Express, 'post'>) {
  app.post('/api/notify-new-worry', async (_req, res) => {
    res.status(410).json(disabled);
  });

  app.post('/api/notify-new-reply', async (_req, res) => {
    res.status(410).json(disabled);
  });

  app.post('/api/notify-new-comment', async (_req, res) => {
    res.status(410).json({
      error: {
        code: 'legacy_notification_route_disabled',
        message: 'Comment notifications are not a PRD notification kind.',
      },
    });
  });
}
