import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('ops docs and README include required operational tokens', () => {
  const docs = [
    read('README.md'),
    read('docs/ops.md'),
  ].join('\n');

  for (const token of [
    'FIREBASE_SERVICE_ACCOUNT',
    'OPENROUTER_API_KEY',
    'OPENAI_API_KEY',
    'INTERNAL_JOB_SECRET',
    'firebase-applet-config.json',
    'firestoreDatabaseId',
    'npm test',
    'npm run lint',
    'npm run build',
    'npm run test:rules',
    '/api/internal/rematch-due-deliveries',
    '/api/internal/create-ai-fallbacks',
    '/api/internal/create-example-feedbacks',
    '/api/internal/admin/hide-content',
  ]) {
    assert.match(docs, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
