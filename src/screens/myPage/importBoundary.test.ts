import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const presentationalFiles = [
  'MyPageScreen.tsx',
  'MyAnswersScreen.tsx',
  'MyWorriesScreen.tsx',
];
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

test('my-page presentational screens do not import production services', () => {
  for (const file of presentationalFiles) {
    const source = readFileSync(join(process.cwd(), 'src/screens/myPage', file), 'utf8');
    const imports = source.split('\n').filter(line => line.trim().startsWith('import ')).join('\n');
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(imports), false, `${file} imports forbidden pattern ${pattern}`);
    }
  }
});

test('App no longer imports Phase 7 production modules except justified push lifecycle hook', () => {
  const source = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
  const imports = source.split('\n').filter(line => line.trim().startsWith('import ')).join('\n');

  for (const forbidden of [
    'services/replyFeedback/production',
    'services/userAccount/client',
    'services/myWorries',
    'services/readState/apiClient',
  ]) {
    assert.equal(imports.includes(forbidden), false, `App imports ${forbidden}`);
  }
  assert.equal(imports.includes('services/pushRegistration'), true);
});

test('account deletion success finalizes through App callback instead of my-page back route', () => {
  const source = readFileSync(join(process.cwd(), 'src/screens/myPage/MyPageContainer.tsx'), 'utf8');

  assert.match(source, /onAccountDeleted: \(\) => void/);
  assert.match(source, /props\.onAccountDeleted\(\)/);
  assert.doesNotMatch(source, /setView\(backRouteForRoute\('account_deletion_confirmation'\)\)/);
});
