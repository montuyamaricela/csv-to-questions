import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseInlineMarkdown,
  parseSummaryBlocks,
  progressStateForElapsed,
} from '../src/mastra/public/ui-utils.js';
import { generatedQuestionSchema } from '../src/mastra/schemas/csv.ts';

test('progress remains visibly active while generation is still running', () => {
  const whenGenerationStarts = progressStateForElapsed(5_200);
  const whileStillGenerating = progressStateForElapsed(15_000);

  assert.equal(whenGenerationStarts.index, 2);
  assert.equal(whileStillGenerating.index, 2);
  assert.ok(whileStillGenerating.percent > whenGenerationStarts.percent);
  assert.ok(whileStillGenerating.percent < 100);
});

test('inline Markdown becomes formatting tokens instead of literal markers', () => {
  assert.deepEqual(parseInlineMarkdown('**Dataset Overview:** uses `GDP` values.'), [
    { type: 'strong', value: 'Dataset Overview:' },
    { type: 'text', value: ' uses ' },
    { type: 'code', value: 'GDP' },
    { type: 'text', value: ' values.' },
  ]);
});

test('summary Markdown becomes semantic heading and list blocks', () => {
  const blocks = parseSummaryBlocks('### Dataset Overview:\n\n* **COUNTRY**: 222 distinct values');

  assert.equal(blocks[0].type, 'heading');
  assert.deepEqual(blocks[0].tokens, [{ type: 'text', value: 'Dataset Overview:' }]);
  assert.equal(blocks[1].type, 'ul');
  assert.deepEqual(blocks[1].items[0][0], { type: 'strong', value: 'COUNTRY' });
});

test('an otherwise valid question is not rejected for extra supporting evidence', () => {
  const result = generatedQuestionSchema.safeParse({
    question: 'What pattern is visible in this dataset?',
    category: 'analysis',
    difficulty: 'intermediate',
    expectedAnswer: 'A supported pattern.',
    evidence: ['One', 'Two', 'Three', 'Four', 'Five'],
  });

  assert.equal(result.success, true);
});
