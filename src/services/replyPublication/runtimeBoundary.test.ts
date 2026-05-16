import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('App reply submission uses server API and does not import legacy human reply writer', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /publishReplyViaApi/);
  assert.doesNotMatch(source, /publishReplyWithProductionAdapters/);
  assert.doesNotMatch(source, /publishPublisherCommentWithProductionAdapters/);
  assert.match(source, /이전 형식의 고민에는 새 답장을 보낼 수 없습니다/);
});

test('App clears worry and reply drafts only after successful publish paths', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /if \(result\.status === 'rejected'\) \{\s*showRejectionAlert\(result\);\s*return;\s*\}/);
  assert.match(source, /if \(result\.status === 'failed'\) \{\s*setFilterAlert\(`전송 실패:/);
  assert.match(source, /setWorryDraft\(''\);\s*setSelectedMyWorry\(null\);\s*setView\(prev => resolveAppRouteState\(prev, routeAfterWorryPublish\(\{ worryId: result\.worryId \}\)\)\)/);
  assert.match(source, /setView\(prev => resolveAppRouteState\(prev, routeAfterReplyPublish\(\{\s*replyId: result\.replyId,\s*deliveryId: worry\.deliveryId,\s*worryId: worry\.worryId,\s*\}\)\)\);\s*setReplyDrafts\(prev => worry\.deliveryId \? clearDraft\(prev, worry\.deliveryId\) : prev\)/);
  assert.doesNotMatch(source, /routeAfterWorryPublish\([^)]*\)\.route/);
  assert.doesNotMatch(source, /routeAfterReplyPublish\([^)]*\)\.route/);
});

test('App feedback comments use PRD feedback API and preserve failed drafts', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /submitReplyFeedbackWithProductionAdapters/);
  assert.match(source, /comment:\s*content/);
  assert.match(source, /feedback:\s*result\.feedback\s*\?\?\s*feedbackType/);
  assert.match(source, /setFeedbackCommentDrafts\(prev => clearDraft\(prev, selectedReply\.id\)\)/);
  assert.match(source, /if \(result\.status === 'rejected'\) \{\s*showRejectionAlert\(result\);\s*return result;\s*\}/);
  assert.doesNotMatch(source, /letters\.publisherComment/);
  assert.doesNotMatch(source, /letters\.feedback/);
});

test('legacy client reply publication adapters are not exposed at runtime', () => {
  const index = fs.readFileSync('src/services/replyPublication/index.ts', 'utf8');

  assert.doesNotMatch(index, /createReplyLetter/);
  assert.doesNotMatch(index, /updatePublisherComment/);
  assert.doesNotMatch(index, /publishReplyWithProductionAdapters/);
  assert.doesNotMatch(index, /publishPublisherCommentWithProductionAdapters/);
});
