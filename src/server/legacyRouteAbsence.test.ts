import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const removedRoutes = [
  '/api/schedule-bot-reply',
  '/api/notify-new-comment',
  '/api/notify-new-worry',
  '/api/notify-new-reply',
  '/api/process-comment',
  '/api/generate-ai-reply',
];

test('legacy letters routes are absent from server runtime', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const serverFiles = fs
    .readdirSync('src/server')
    .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map(file => fs.readFileSync(`src/server/${file}`, 'utf8'))
    .join('\n');

  for (const route of removedRoutes) {
    assert.doesNotMatch(server, new RegExp(route.replaceAll('/', '\\/')));
    assert.doesNotMatch(serverFiles, new RegExp(route.replaceAll('/', '\\/')));
  }

  assert.doesNotMatch(server, /db\.collection\(['"]letters['"]\)/);
  assert.doesNotMatch(serverFiles, /db\.collection\(['"]letters['"]\)/);
});
