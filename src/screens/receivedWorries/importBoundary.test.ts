import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
