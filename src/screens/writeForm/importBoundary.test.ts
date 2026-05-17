import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const presentationalScreenFiles = [
  path.join(process.cwd(), 'src', 'screens', 'writeForm', 'WriteFormScreen.tsx'),
] as const;

const forbiddenImportSources = [
  'src/firebase',
  'firebase/',
  'firebase-admin/',
  'firebase/firestore',
  'firebase/auth',
  'firebase/messaging',
  'services/worryPublication',
  'services/replyPublication',
  'services/drafts',
  'services/validation',
  'services/appShell',
  'src/server',
  'server/',
] as const;

function importedSources(source: string): string[] {
  const imports = source.matchAll(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g);
  return Array.from(imports, match => match[1] ?? '');
}

test('write-form presentational screen files have no forbidden production imports', () => {
  for (const file of presentationalScreenFiles) {
    const source = fs.readFileSync(file, 'utf8');

    for (const importSource of importedSources(source)) {
      for (const forbidden of forbiddenImportSources) {
        assert.equal(
          importSource.includes(forbidden),
          false,
          `${path.relative(process.cwd(), file)} imports forbidden source ${importSource}`,
        );
      }
    }
  }
});

test('write-form presentational screen emits draft and publish events only', () => {
  const source = fs.readFileSync(presentationalScreenFiles[0], 'utf8');

  assert.match(source, /onChange=\{props\.onDraftChange\}/);
  assert.match(source, /props\.onPublish\(/);
  assert.doesNotMatch(source, /validateDraftContent|publishWorryViaApi|publishReplyViaApi|setDraft|clearDraft/);
});
