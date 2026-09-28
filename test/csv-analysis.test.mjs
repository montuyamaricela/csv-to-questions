import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeCsv } from '../src/mastra/lib/csv-analysis.ts';

test('parses quoted commas, escaped quotes, and multiline fields', () => {
  const analysis = analyzeCsv('name,notes,score\n"Doe, Jane","Said ""hello""\nand left",10\nBob,,20');

  assert.equal(analysis.rowCount, 2);
  assert.equal(analysis.columnCount, 3);
  assert.equal(analysis.sampleRows[0].name, 'Doe, Jane');
  assert.equal(analysis.sampleRows[0].notes, 'Said "hello"\nand left');
  assert.equal(analysis.columns[2].numeric.mean, 15);
});

test('profiles missing values, numeric statistics, and top values', () => {
  const analysis = analyzeCsv('team,score\nBlue,10\nBlue,20\nRed,\nRed,40');
  const score = analysis.columns.find(column => column.name === 'score');
  const team = analysis.columns.find(column => column.name === 'team');

  assert.deepEqual(score.numeric, { min: 10, max: 40, mean: 23.3333, median: 20 });
  assert.equal(score.missingCount, 1);
  assert.deepEqual(team.topValues, [
    { value: 'Blue', count: 2 },
    { value: 'Red', count: 2 },
  ]);
});

test('normalizes duplicate headers and reports inconsistent rows', () => {
  const analysis = analyzeCsv('value,value\n1,2\n3');

  assert.deepEqual(Object.keys(analysis.sampleRows[0]), ['value', 'value_2']);
  assert.equal(analysis.warnings.length, 1);
});
