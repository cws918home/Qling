import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WriteFormScreen } from './WriteFormScreen';

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
  assert.match(source, /onChange=\{event => props\.onDraftChange\(event\.currentTarget\.value\)\}/);
  assert.match(source, /props\.onPublish\(/);
  assert.doesNotMatch(source, /validateDraftContent|publishWorryViaApi|publishReplyViaApi|setDraft|clearDraft/);
});

test('write-worry branch renders real draft value and disabled state from props', () => {
  const html = renderToStaticMarkup(createElement(WriteFormScreen, {
    kind: 'write-worry',
    draft: {
      value: '사용자가 입력 중인 실제 고민',
      characterCount: 14,
      maxLength: 1000,
      validation: { status: 'valid' },
      moderation: { status: 'idle' },
      isProcessing: false,
      submitDisabledReason: undefined,
    },
    onDraftChange: () => undefined,
    onPublish: () => undefined,
  }));

  assert.match(html, /사용자가 입력 중인 실제 고민/);
  assert.match(html, /14 \/ 1000/);
  assert.doesNotMatch(html, /disabled=""/);
});

test('write-worry branch disables submit from submitDisabledReason and keeps publish handler source-wired', () => {
  const html = renderToStaticMarkup(createElement(WriteFormScreen, {
    kind: 'write-worry',
    draft: {
      value: '',
      characterCount: 0,
      maxLength: 1000,
      validation: { status: 'valid' },
      moderation: { status: 'idle' },
      isProcessing: false,
      submitDisabledReason: 'empty',
    },
    onDraftChange: () => undefined,
    onPublish: () => undefined,
  }));
  const source = fs.readFileSync(presentationalScreenFiles[0], 'utf8');

  assert.match(html, /disabled=""/);
  assert.match(source, /disabled=\{isDisabled \|\| props\.draft\.isProcessing\}/);
  assert.match(source, /props\.onPublish\(\)/);
});
