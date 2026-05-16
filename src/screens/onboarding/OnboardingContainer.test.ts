import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('onboarding container orchestrates profile completion, example creation, then route completion callback', () => {
  const source = fs.readFileSync('src/screens/onboarding/OnboardingContainer.tsx', 'utf8');
  const completeIndex = source.indexOf('await completeOnboardingViaApi');
  const exampleIndex = source.indexOf('await createExampleWorriesViaApi');
  const routeIndex = source.indexOf('props.onComplete(result.profile)');

  assert.ok(completeIndex > 0);
  assert.ok(exampleIndex > completeIndex);
  assert.ok(routeIndex > exampleIndex);
});

test('onboarding screen remains presentational while container owns API calls', () => {
  const screen = fs.readFileSync('src/screens/onboarding/OnboardingScreen.tsx', 'utf8');
  const container = fs.readFileSync('src/screens/onboarding/OnboardingContainer.tsx', 'utf8');

  assert.doesNotMatch(screen, /apiClient|firebase|fetch\(|completeOnboardingViaApi|reserveNicknameViaApi/);
  assert.match(container, /reserveNicknameViaApi/);
  assert.match(container, /completeOnboardingViaApi/);
  assert.match(container, /createExampleWorriesViaApi/);
});
