import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const screenRoot = path.join(process.cwd(), 'src', 'screens');
const srcRoot = path.join(process.cwd(), 'src');

type StaticImport = {
  readonly source: string;
  readonly resolvedPath: string | null;
};

function listFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}

function listPresentationalScreenFiles(): string[] {
  return listFiles(screenRoot)
    .filter(file => file.endsWith('Screen.tsx'))
    .filter(file => !file.endsWith('Container.tsx'))
    .filter(file => !file.endsWith('.test.ts'))
    .filter(file => !file.endsWith('mapping.ts'))
    .filter(file => !file.endsWith('contract.ts'))
    .sort();
}

function staticImports(source: string, fromFile: string): StaticImport[] {
  const imports = source.matchAll(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g);
  return Array.from(imports, match => {
    const importSource = match[1] ?? '';
    return {
      source: importSource,
      resolvedPath: resolveImportPath(importSource, fromFile),
    };
  });
}

function resolveImportPath(importSource: string, fromFile: string): string | null {
  if (importSource.startsWith('.')) {
    return normalizePath(path.resolve(path.dirname(fromFile), importSource));
  }
  if (importSource.startsWith('src/')) {
    return normalizePath(path.join(process.cwd(), importSource));
  }
  return null;
}

function normalizePath(file: string): string {
  return file.split(path.sep).join('/');
}

function relativeProjectPath(file: string): string {
  return normalizePath(path.relative(process.cwd(), file));
}

function isSrcPath(imported: StaticImport, srcPath: string): boolean {
  const normalizedSrcPath = normalizePath(path.join(srcRoot, srcPath));
  return imported.resolvedPath === normalizedSrcPath
    || imported.resolvedPath?.startsWith(`${normalizedSrcPath}/`) === true
    || imported.resolvedPath?.startsWith(`${normalizedSrcPath}.`) === true
    || imported.source === `src/${srcPath}`
    || imported.source.startsWith(`src/${srcPath}/`);
}

function importMatches(imported: StaticImport, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return imported.source.startsWith(prefix);
  }
  return imported.source === pattern || imported.source.startsWith(`${pattern}/`);
}

const forbiddenPackageImports = [
  'firebase/*',
  'firebase-admin/*',
  'firebase/firestore',
  'firebase/auth',
  'firebase/messaging',
] as const;

const forbiddenSrcImportChecks = [
  ['src/firebase', (imported: StaticImport) => isSrcPath(imported, 'firebase')],
  ['src/services/**/apiClient', (imported: StaticImport) => isSrcPath(imported, 'services') && imported.resolvedPath?.endsWith('/apiClient') === true],
  ['src/services/**/production', (imported: StaticImport) => isSrcPath(imported, 'services') && imported.resolvedPath?.endsWith('/production') === true],
  ['src/services/**/server*', (imported: StaticImport) => isSrcPath(imported, 'services') && imported.resolvedPath?.includes('/server') === true],
  ['server.ts', (imported: StaticImport) => imported.resolvedPath === normalizePath(path.join(process.cwd(), 'server'))],
  ['src/server/**', (imported: StaticImport) => isSrcPath(imported, 'server')],
  ['src/services/userAccount/client', (imported: StaticImport) => isSrcPath(imported, 'services/userAccount/client')],
  ['src/services/pushRegistration/internalLifecycle', (imported: StaticImport) => isSrcPath(imported, 'services/pushRegistration/internalLifecycle')],
  ['src/services/pushRegistration/adapters', (imported: StaticImport) => isSrcPath(imported, 'services/pushRegistration/adapters')],
  ['src/services/pushRegistration/serviceWorker', (imported: StaticImport) => isSrcPath(imported, 'services/pushRegistration/serviceWorker')],
  ['src/services/readState/apiClient', (imported: StaticImport) => isSrcPath(imported, 'services/readState/apiClient')],
  ['src/services/worryPublication/apiClient', (imported: StaticImport) => isSrcPath(imported, 'services/worryPublication/apiClient')],
  ['src/services/replyPublication/apiClient', (imported: StaticImport) => isSrcPath(imported, 'services/replyPublication/apiClient')],
  ['src/services/replyFeedback/production', (imported: StaticImport) => isSrcPath(imported, 'services/replyFeedback/production')],
  ['src/services/deliveries/apiClient', (imported: StaticImport) => isSrcPath(imported, 'services/deliveries/apiClient')],
  ['src/services/appShell/prdNavigationPolicy', (imported: StaticImport) => isSrcPath(imported, 'services/appShell/prdNavigationPolicy')],
] as const;

const forbiddenSourceIdentifiers = [
  'deleteMyAccountViaApi',
  'submitReplyFeedbackWithProductionAdapters',
  'passDeliveryViaApi',
  'fetch(',
  "fetch('/api/",
  'fetch("/api/',
  'routeToWriteWorry',
  'routeToWriteReply',
  'routeToReceivedReplyDetail',
  'routeToMyReplyDetail',
  'routeAfterAuthProfileLoad',
  'routeAfterOnboardingComplete',
  'routeAfterWorryPublish',
  'routeAfterReplyPublish',
  'routeAfterPass',
  'routeAfterFeedbackPublish',
  'backRouteForRoute',
  'tabForRoute',
] as const;

test('discovers every presentational screen file under src/screens', () => {
  assert.deepEqual(
    listPresentationalScreenFiles().map(relativeProjectPath),
    [
      'src/screens/myPage/MyAnswersScreen.tsx',
      'src/screens/myPage/MyPageScreen.tsx',
      'src/screens/myPage/MyWorriesScreen.tsx',
      'src/screens/onboarding/OnboardingScreen.tsx',
      'src/screens/receivedWorries/ReceivedWorriesScreen.tsx',
      'src/screens/replyDetail/ReplyDetailScreen.tsx',
      'src/screens/writeForm/WriteFormScreen.tsx',
    ],
  );
});

test('presentational screens do not import forbidden production, Firebase, server, or mutation modules', () => {
  for (const file of listPresentationalScreenFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    for (const imported of staticImports(source, file)) {
      for (const pattern of forbiddenPackageImports) {
        assert.equal(
          importMatches(imported, pattern),
          false,
          `${relativeProjectPath(file)} imports forbidden package pattern ${pattern} through ${imported.source}`,
        );
      }
      for (const [label, matches] of forbiddenSrcImportChecks) {
        assert.equal(
          matches(imported),
          false,
          `${relativeProjectPath(file)} imports forbidden source ${label} through ${imported.source}`,
        );
      }
    }
  }
});

test('presentational screens stay props/callback-only for route, domain, and mutation behavior', () => {
  for (const file of listPresentationalScreenFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    for (const identifier of forbiddenSourceIdentifiers) {
      assert.equal(
        source.includes(identifier),
        false,
        `${relativeProjectPath(file)} contains forbidden boundary identifier ${identifier}`,
      );
    }
    assert.doesNotMatch(source, /firebase\/(?:firestore|auth|messaging)/);
    assert.doesNotMatch(source, /\bgetDoc\b|\bsetDoc\b|\bupdateDoc\b|\bserverTimestamp\b|\bonAuthStateChanged\b|\bonMessage\b/);
  }
});
