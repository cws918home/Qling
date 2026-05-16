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
  const policy = fs.readFileSync('src/screens/writeForm/containerPolicy.ts', 'utf8');

  assert.match(policy, /if \(result\.status === 'rejected'\) \{[\s\S]*?clearDraft: false,[\s\S]*?\}/);
  assert.match(policy, /if \(result\.status === 'failed'\) \{[\s\S]*?clearDraft: false,[\s\S]*?\}/);
  assert.match(policy, /routeAfterWorryPublish\(\{ worryId: result\.worryId \}\)/);
  assert.match(policy, /routeAfterReplyPublish\(\{[\s\S]*?replyId: result\.replyId,[\s\S]*?deliveryId: target\.deliveryId,[\s\S]*?worryId: target\.worryId,[\s\S]*?\}\)/);
  assert.match(worryContainer, /if \(!policy\.clearDraft \|\| !policy\.route\) \{[\s\S]*?return;\s*\}/);
  assert.match(worryContainer, /setDraft\(''\);[\s\S]*?clearStoredDraft\(WRITE_WORRY_DRAFT_KEY\)/);
  assert.match(replyContainer, /if \(!policy\.clearDraft \|\| !policy\.route\) \{[\s\S]*?return;\s*\}/);
  assert.match(replyContainer, /clearStoredDraft\(replyDraftKey\(target\.deliveryId\)\);[\s\S]*?setDraft\(''\)/);
  assert.doesNotMatch(worryContainer, /routeAfterWorryPublish\([^)]*\)\.route/);
  assert.doesNotMatch(replyContainer, /routeAfterReplyPublish\([^)]*\)\.route/);
});

test('reply-detail container feedback comments use PRD feedback API and preserve failed drafts', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');
  const container = fs.readFileSync('src/screens/replyDetail/ReplyDetailContainer.tsx', 'utf8');

  assert.match(source, /<ReplyDetailContainer/);
  assert.doesNotMatch(source, /submitReplyFeedbackWithProductionAdapters/);
  assert.match(container, /submitReplyFeedbackWithProductionAdapters/);
  assert.match(container, /comment,/);
  assert.match(container, /feedback:\s*result\.feedback\s*\?\?\s*feedbackType/);
  assert.match(container, /setFeedbackCommentDrafts\(prev => clearDraft\(prev, props\.selectedReply\?\.id \?\? ''\)\)/);
  assert.match(container, /if \(result\.status === 'rejected'\) \{[\s\S]*?return result;\s*\}/);
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
