import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReceivedWorriesScreen } from './ReceivedWorriesScreen';

const presentationalScreenPath = path.join(
  process.cwd(),
  'src',
  'screens',
  'receivedWorries',
  'ReceivedWorriesScreen.tsx',
);

const forbiddenImportSources = [
  'src/firebase',
  'firebase/',
  'services/deliveries',
  'services/readState',
  'services/homeWorryFeed',
  'services/appShell',
] as const;

function importedSources(source: string): string[] {
  const imports = source.matchAll(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g);
  return Array.from(imports, match => match[1] ?? '');
}

test('received-worries presentational screen has no forbidden production imports', () => {
  const source = fs.readFileSync(presentationalScreenPath, 'utf8');

  for (const importSource of importedSources(source)) {
    for (const forbidden of forbiddenImportSources) {
      assert.equal(
        importSource.includes(forbidden),
        false,
        `ReceivedWorriesScreen imports forbidden source ${importSource}`,
      );
    }
  }
});

test('received-worries presentational pass event emits only delivery id', () => {
  const source = fs.readFileSync(presentationalScreenPath, 'utf8');

  assert.match(source, /props\.onPass\(item\.deliveryId\)/);
  assert.doesNotMatch(source, /onPass\(event/);
});

test('received-worries presentational pass click is isolated from card body open', () => {
  const source = fs.readFileSync(presentationalScreenPath, 'utf8');

  assert.equal((source.match(/event\.stopPropagation\(\)/g) ?? []).length, 1);
  assert.match(source, /props\.onOpen\(\{ deliveryId: item\.deliveryId, worryId: item\.worryId \}\)/);
  assert.match(source, /props\.onPass\(item\.deliveryId\)/);
});

test('received-worries presentational pass disabled state is keyed by delivery id', () => {
  const source = fs.readFileSync(presentationalScreenPath, 'utf8');

  assert.match(source, /passingDeliveryIds\.has\(item\.deliveryId\)/);
  assert.match(source, /disabled=\{isPassing\}/);
});

test('received-worries loaded branch renders only provided item data', () => {
  const html = renderToStaticMarkup(createElement(ReceivedWorriesScreen, {
    state: { status: 'ready' },
    items: [
      {
        deliveryId: 'delivery-real-1',
        worryId: 'worry-real-1',
        category: '학업',
        previewText: '실제 컨테이너가 넘긴 고민 본문',
        receivedAt: { label: '방금 전', isoValue: '2026-05-18T00:00:00.000Z' },
        isUnread: true,
      },
    ],
    passingDeliveryIds: [],
    onPass: () => undefined,
    onOpen: () => undefined,
    onReply: () => undefined,
  }));

  assert.match(html, /실제 컨테이너가 넘긴 고민 본문/);
  assert.match(html, /방금 전/);
  assert.match(html, /학업/);
  assert.doesNotMatch(html, /one two three/);
  assert.doesNotMatch(html, /시험이 얼마 안 남았는데/);
});

test('received-worries source keeps card open and pass callbacks wired to item ids', () => {
  const source = fs.readFileSync(presentationalScreenPath, 'utf8');

  assert.match(source, /props\.items\.map\(\(item, index\)/);
  assert.match(source, /props\.onOpen\(\{ deliveryId: item\.deliveryId, worryId: item\.worryId \}\)/);
  assert.match(source, /props\.onPass\(item\.deliveryId\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /const content = item\.bodyText \?\? item\.previewText/);
  assert.match(source, /dateTime=\{item\.receivedAt\.isoValue\}/);
  assert.match(source, /\{item\.receivedAt\.label\}/);
});
