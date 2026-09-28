import { parse } from 'csv-parse/sync';
import type { DatasetAnalysis } from '../schemas/csv';

const MAX_COLUMNS = 100;
const SAMPLE_ROW_COUNT = 5;
const TOP_VALUE_COUNT = 5;
const MAX_DISPLAY_VALUE_LENGTH = 200;

type ColumnType = DatasetAnalysis['columns'][number]['type'];

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function displayValue(value: string): string {
  return value.length <= MAX_DISPLAY_VALUE_LENGTH
    ? value
    : `${value.slice(0, MAX_DISPLAY_VALUE_LENGTH - 3)}...`;
}

function uniqueHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>();

  return rawHeaders.map((rawHeader, index) => {
    const base = rawHeader.trim() || `column_${index + 1}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    return occurrence === 1 ? base : `${base}_${occurrence}`;
  });
}

function inferColumnType(values: string[]): ColumnType {
  if (values.length === 0) return 'empty';

  const booleans = new Set(['true', 'false', 'yes', 'no']);
  if (values.every(value => booleans.has(value.toLowerCase()))) return 'boolean';

  const numbers = values.map(Number);
  if (numbers.every(Number.isFinite)) {
    return numbers.every(Number.isInteger) ? 'integer' : 'decimal';
  }

  const datePattern = /^(?:\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})(?:[T\s].*)?$/;
  if (values.every(value => datePattern.test(value) && !Number.isNaN(Date.parse(value)))) return 'date';

  return 'text';
}

function numericSummary(values: string[]) {
  const numbers = values.map(Number).sort((a, b) => a - b);
  const middle = Math.floor(numbers.length / 2);
  const median =
    numbers.length % 2 === 0 ? (numbers[middle - 1] + numbers[middle]) / 2 : numbers[middle];

  return {
    min: numbers[0],
    max: numbers[numbers.length - 1],
    mean: round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length),
    median: round(median),
  };
}

export function analyzeCsv(csvText: string): DatasetAnalysis {
  const records = parse(csvText, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as string[][];

  if (records.length === 0) throw new Error('CSV has no rows');

  const headers = uniqueHeaders(records[0].map(value => String(value ?? '')));
  if (headers.length === 0) throw new Error('CSV has no columns');
  if (headers.length > MAX_COLUMNS) {
    throw new Error(`CSV has ${headers.length} columns; the maximum supported is ${MAX_COLUMNS}`);
  }

  const dataRows = records.slice(1).map(row => row.map(value => String(value ?? '').trim()));
  const inconsistentRows = dataRows.filter(row => row.length !== headers.length).length;
  const normalizedRows = dataRows.map(row => headers.map((_, index) => row[index] ?? ''));

  const columns = headers.map((name, columnIndex) => {
    const values = normalizedRows.map(row => row[columnIndex]);
    const nonEmptyValues = values.filter(value => value !== '');
    const type = inferColumnType(nonEmptyValues);
    const frequencies = new Map<string, number>();

    for (const value of nonEmptyValues) {
      frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
    }

    const topValues = [...frequencies.entries()]
      .sort(([leftValue, leftCount], [rightValue, rightCount]) =>
        rightCount === leftCount ? leftValue.localeCompare(rightValue) : rightCount - leftCount,
      )
      .slice(0, TOP_VALUE_COUNT)
      .map(([value, count]) => ({ value: displayValue(value), count }));

    return {
      name,
      type,
      nonEmptyCount: nonEmptyValues.length,
      missingCount: values.length - nonEmptyValues.length,
      uniqueCount: frequencies.size,
      ...(type === 'integer' || type === 'decimal' ? { numeric: numericSummary(nonEmptyValues) } : {}),
      topValues,
    };
  });

  const sampleRows = normalizedRows.slice(0, SAMPLE_ROW_COUNT).map(row =>
    Object.fromEntries(headers.map((header, index) => [header, displayValue(row[index])])),
  );

  return {
    rowCount: normalizedRows.length,
    columnCount: headers.length,
    columns,
    sampleRows,
    warnings:
      inconsistentRows > 0
        ? [`${inconsistentRows} row${inconsistentRows === 1 ? '' : 's'} had a different number of fields than the header`]
        : [],
  };
}

export function formatAnalysisForPrompt(analysis: DatasetAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}
