import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('write-reply container uses server API and does not expose legacy human reply writer in App', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');
  const container = fs.readFileSync('src/screens/writeForm/WriteReplyContainer.tsx', 'utf8');

  assert.match(source, /<WriteReplyContainer/);
  assert.doesNotMatch(source, /publishReplyViaApi/);
  assert.match(container, /publishReplyViaApi/);
  assert.doesNotMatch(source, /publishReplyWithProductionAdapters/);
  assert.doesNotMatch(source, /publishPublisherCommentWithProductionAdapters/);
  assert.match(container, /이전 형식의 고민에는 새 답장을 보낼 수 없습니다/);
});

test('write containers clear worry and reply drafts only after successful publish paths', () => {
  const worryContainer = fs.readFileSync('src/screens/writeForm/WriteWorryContainer.tsx', 'utf8');
  const replyContainer = fs.readFileSync('src/screens/writeForm/WriteReplyContainer.tsx', 'utf8');

  assert.match(worryContainer, /if \(result\.status === 'rejected'\) \{[\s\S]*?return;\s*\}/);
  assert.match(worryContainer, /if \(result\.status === 'failed'\) \{[\s\S]*?return;\s*\}/);
  assert.match(worryContainer, /setDraft\(''\);[\s\S]*?routeAfterWorryPublish\(\{ worryId: result\.worryId \}\)/);
  assert.match(replyContainer, /if \(result\.status === 'rejected'\) \{[\s\S]*?return;\s*\}/);
  assert.match(replyContainer, /if \(result\.status === 'failed'\) \{[\s\S]*?return;\s*\}/);
  assert.match(replyContainer, /routeAfterReplyPublish\(\{[\s\S]*?replyId: result\.replyId,[\s\S]*?deliveryId: target\.deliveryId,[\s\S]*?worryId: target\.worryId,[\s\S]*?\}\)\)/);
  assert.match(replyContainer, /setDrafts\(prev => clearDraft\(prev, target\.deliveryId\)\)/);
  assert.doesNotMatch(worryContainer, /routeAfterWorryPublish\([^)]*\)\.route/);
  assert.doesNotMatch(replyContainer, /routeAfterReplyPublish\([^)]*\)\.route/);
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
