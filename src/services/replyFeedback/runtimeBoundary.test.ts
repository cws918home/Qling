import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const runtimeFiles = [
  'src/App.tsx',
  'src/services/replyFeedback/submitReplyFeedback.ts',
  'src/services/replyFeedback/production.ts',
  'src/services/replyFeedback/apiClient.ts',
  'src/services/myWorries/useRepliesForWorry.ts',
  'src/services/myWorries/useMyGivenReplies.ts',
  'src/services/myWorries/prdPolicy.ts',
];

test('PRD feedback runtime does not directly mutate legacy letters or browser Firestore', () => {
  for (const file of runtimeFiles) {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    assert.doesNotMatch(source, /firestoreAdapters/);
    assert.doesNotMatch(source, /letters\.feedback/);
    assert.doesNotMatch(source, /letters\.publisherComment/);
    assert.doesNotMatch(source, /['"]letters['"]/);
    assert.doesNotMatch(source, /updateDoc\([^)]*feedbacks/);
    assert.doesNotMatch(source, /updateDoc\([^)]*helpedCount/);
  }
});
