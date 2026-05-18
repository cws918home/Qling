import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReplyDetailScreen } from './ReplyDetailScreen';

const forbiddenPatterns = [
  /src\/firebase/,
  /firebase\//,
  /firebase-admin\//,
  /services\/userAccount/,
  /services\/pushRegistration/,
  /services\/replyFeedback/,
  /services\/readState/,
  /services\/myWorries/,
  /services\/appShell/,
  /server/,
  /apiClient/,
  /production/,
];

test('reply-detail presentational screen does not import production services', () => {
  const source = readFileSync(join(process.cwd(), 'src/screens/replyDetail/ReplyDetailScreen.tsx'), 'utf8');
  const imports = source.split('\n').filter(line => line.trim().startsWith('import ')).join('\n');
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(imports), false, `ReplyDetailScreen imports forbidden pattern ${pattern}`);
  }
});

test('received-answer-detail renders original worry and reply text from props', () => {
  const html = renderToStaticMarkup(createElement(ReplyDetailScreen, {
    variant: 'received-answer-detail',
    state: { status: 'ready' },
    originalWorry: {
      worryId: 'worry-real',
      category: '외모',
      summaryText: '실제 원문 요약',
      bodyText: '실제 원문 고민 내용',
      date: { label: '2026.05.18', isoValue: '2026-05-18T00:00:00.000Z' },
    },
    reply: {
      replyId: 'reply-real',
      bodyText: '실제 도착한 답변 내용',
      date: { label: '2026.05.19', isoValue: '2026-05-19T00:00:00.000Z' },
      replierDisplay: 'anonymous',
    },
    existingFeedback: { status: 'none' },
    commentDraft: '',
    commentMaxLength: 300,
    commentValidation: { status: 'valid' },
    commentModeration: { status: 'idle' },
    isFeedbackProcessing: false,
    isCommentProcessing: false,
    onBack: () => undefined,
    onFeedbackChange: () => undefined,
    onFeedbackSubmit: () => undefined,
    onCommentChange: () => undefined,
    onCommentSubmit: () => undefined,
  }));

  assert.match(html, /실제 원문 고민 내용/);
  assert.match(html, /실제 도착한 답변 내용/);
  assert.doesNotMatch(html, /Lorem ipsum/);
});

test('received-answer-detail keeps back feedback and comment callbacks source-wired', () => {
  const source = readFileSync(join(process.cwd(), 'src/screens/replyDetail/ReplyDetailScreen.tsx'), 'utf8');

  assert.match(source, /onClick=\{props\.onBack\}/);
  assert.match(source, /onSelect\(value\)/);
  assert.match(source, /onSubmit\(\)/);
  assert.match(source, /onChange=\{props\.onCommentChange\}/);
  assert.match(source, /onClick=\{props\.onCommentSubmit\}/);
});
