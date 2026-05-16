import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
