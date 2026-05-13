import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiFallbackPrompt, generateAiReply, parseAiReplyResponse } from './generateAiReply';

test('valid JSON content parses', () => {
  assert.deepEqual(parseAiReplyResponse('{"content":"  괜찮아요. 천천히 해봐요.  "}'), {
    content: '괜찮아요. 천천히 해봐요.',
  });
});

test('fenced JSON parses', () => {
  assert.deepEqual(parseAiReplyResponse('```json\n{"content":"힘든 마음이 느껴져요. 오늘은 조금 쉬어도 괜찮아요."}\n```'), {
    content: '힘든 마음이 느껴져요. 오늘은 조금 쉬어도 괜찮아요.',
  });
});

test('missing non-string empty and overlong content fails', () => {
  assert.throws(() => parseAiReplyResponse('{}'), /invalid_ai_reply_content/);
  assert.throws(() => parseAiReplyResponse('{"content":1}'), /invalid_ai_reply_content/);
  assert.throws(() => parseAiReplyResponse('{"content":"   "}'), /empty_ai_reply_content/);
  assert.throws(() => parseAiReplyResponse({ content: 'x'.repeat(501) }), /too_long_ai_reply_content/);
});

test('prompt contains Korean short anonymous supportive constraints and no professional counselor framing', async () => {
  let capturedSystem = '';
  const result = await generateAiReply({
    worryContent: '고민',
    fetchJson: async systemInstruction => {
      capturedSystem = systemInstruction;
      return { content: '많이 답답했겠어요. 혼자 다 짊어지지 않아도 괜찮아요.' };
    },
  });

  assert.equal(result.content, '많이 답답했겠어요. 혼자 다 짊어지지 않아도 괜찮아요.');
  const prompt = buildAiFallbackPrompt();
  assert.equal(capturedSystem, prompt);
  assert.match(prompt, /Korean anonymous-user-style/);
  assert.match(prompt, /Short, empathetic, 2-4 sentences/);
  assert.match(prompt, /polite Korean tone/);
  assert.match(prompt, /Do not frame yourself as a professional counselor/);
  assert.match(prompt, /Do not diagnose/);
  assert.match(prompt, /Return JSON only/);
});
