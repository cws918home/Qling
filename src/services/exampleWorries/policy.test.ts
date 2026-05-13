import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExampleAutoLikeComment,
  createExampleFeedbackRunAfter,
  selectExampleSeeds,
} from './policy';
import type { ExampleWorrySeed } from './types';

function seed(id: string, categories: string[], status: 'active' | 'inactive' = 'active'): ExampleWorrySeed {
  return { id, content: id, categories, status };
}

test('selects active seeds whose categories intersect interests', () => {
  const selected = selectExampleSeeds({
    seeds: [
      seed('career', ['career']),
      seed('family', ['family']),
      seed('inactive', ['career'], 'inactive'),
      seed('empty', ['health']),
    ],
    interests: ['career', 'family'],
  });

  assert.deepEqual(selected.map(item => item.id), ['career', 'family']);
});

test('caps at five, creates fewer when fewer match, and removes duplicate seed ids', () => {
  const many = selectExampleSeeds({
    seeds: [
      seed('s1', ['career']),
      seed('s1', ['career']),
      seed('s2', ['career']),
      seed('s3', ['career']),
      seed('s4', ['career']),
      seed('s5', ['career']),
      seed('s6', ['career']),
    ],
    interests: ['career'],
  });
  const few = selectExampleSeeds({
    seeds: [seed('s1', ['career']), seed('s2', ['health'])],
    interests: ['career'],
  });

  assert.deepEqual(many.map(item => item.id), ['s1', 's2', 's3', 's4', 's5']);
  assert.deepEqual(few.map(item => item.id), ['s1']);
});

test('uses injected deterministic ordering', () => {
  const selected = selectExampleSeeds({
    seeds: [seed('b', ['career']), seed('a', ['career']), seed('c', ['career'])],
    interests: ['career'],
    order: seeds => [...seeds].reverse(),
  });

  assert.deepEqual(selected.map(item => item.id), ['c', 'a', 'b']);
  assert.deepEqual(selected.map(item => item.selectionIndex), [0, 1, 2]);
});

test('feedback delay stays between five and fifteen minutes and auto comment is null', () => {
  const submittedAt = new Date('2026-05-13T00:00:00.000Z');
  const min = createExampleFeedbackRunAfter({ submittedAt, random: () => 0 });
  const max = createExampleFeedbackRunAfter({ submittedAt, random: () => 1 });
  const clamped = createExampleFeedbackRunAfter({ submittedAt, delayMs: 60 * 1000 });

  assert.equal(min.getTime() - submittedAt.getTime(), 5 * 60 * 1000);
  assert.equal(max.getTime() - submittedAt.getTime(), 15 * 60 * 1000);
  assert.equal(clamped.getTime() - submittedAt.getTime(), 5 * 60 * 1000);
  assert.equal(buildExampleAutoLikeComment(), null);
});
