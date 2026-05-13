import type express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { requireInternalJobSecret } from './internalAuth';
import { processSimpleModerationResponse } from './moderationResponses';
import { createAiFallbacksWithDependencies, type CreateAiFallbacks, type CreateAiFallbacksResult } from '../services/aiFallback';
import { generateAiReply, OPENAI_CHAT_COMPLETIONS_URL } from '../services/aiFallback/generateAiReply';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseBody(body: unknown): (
  | { status: 'ok'; now?: Date; dryRun?: boolean; limit?: number }
  | { status: 'invalid' }
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid' };
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).every(key => ['now', 'dryRun', 'limit'].includes(key))) return { status: 'invalid' };

  let now: Date | undefined;
  if ('now' in input) {
    if (typeof input.now !== 'string') return { status: 'invalid' };
    now = new Date(input.now);
    if (Number.isNaN(now.getTime())) return { status: 'invalid' };
  }

  let dryRun: boolean | undefined;
  if ('dryRun' in input) {
    if (typeof input.dryRun !== 'boolean') return { status: 'invalid' };
    dryRun = input.dryRun;
  }

  let limit: number | undefined;
  if ('limit' in input) {
    if (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit <= 0 || input.limit > MAX_LIMIT) return { status: 'invalid' };
    limit = input.limit;
  }

  return { status: 'ok', now, dryRun, limit };
}

function sendResult(res: express.Response, result: CreateAiFallbacksResult): void {
  if (result.status === 'lock_busy') {
    res.status(409).json(result);
    return;
  }
  if (result.status === 'provider_error') {
    res.status(502).json({
      error: {
        code: result.code,
        message: result.message,
        details: result.details,
      },
    });
    return;
  }
  if (result.status === 'server_error') {
    res.status(result.code === 'firebase_unavailable' ? 503 : 500).json({
      error: {
        code: result.code,
        message: result.message,
        details: result.details,
      },
    });
    return;
  }
  res.status(200).json(result);
}

export function registerAiFallbackRoutes(app: express.Express, deps: {
  db: Firestore | null;
  messaging: Messaging | null;
  createAiFallbacks?: CreateAiFallbacks;
}): void {
  if (!deps.db) {
    app.post('/api/internal/create-ai-fallbacks', requireInternalJobSecret, (_req, res) => {
      res.status(503).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const createAiFallbacks = deps.createAiFallbacks ?? createAiFallbacksWithDependencies({
    db: deps.db,
    messaging: deps.messaging,
    generator: ({ worryContent }) => generateAiReply({ worryContent }),
    moderationProvider: replyContent => processSimpleModerationResponse(
      replyContent,
      content => generateModerationResponse(content)
    ).then(result => result.body),
  });

  app.post('/api/internal/create-ai-fallbacks', requireInternalJobSecret, async (req, res) => {
    const body = parseBody(req.body);
    if (body.status === 'invalid') {
      res.status(400).json({
        error: {
          code: 'invalid_body',
          message: 'Request body must be an object with optional now, dryRun, and limit fields.',
        },
      });
      return;
    }

    try {
      const result = await createAiFallbacks({
        now: body.now,
        dryRun: body.dryRun,
        limit: body.limit ?? DEFAULT_LIMIT,
      });
      sendResult(res, result);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: 'AI fallback job failed.',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
}

async function generateModerationResponse(content: string): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not defined in .env file');
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        {
          role: 'system',
          content: `You are a moderator for a Korean anonymous worry-sharing app.
1. Check if the AI reply is inappropriate, abusive, violent, or unhelpful spam.
2. Return JSON exactly like this:
   - If bad: { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }
   - If good: { "status": "approved" }`,
        },
        { role: 'user', content },
      ],
      temperature: 0.1,
      max_completion_tokens: 500,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
  const data = await response.json();
  let textContent = data.choices?.[0]?.message?.content || '{}';
  if (textContent.includes('```')) textContent = textContent.replace(/```json|```/g, '').trim();
  return JSON.parse(textContent);
}
