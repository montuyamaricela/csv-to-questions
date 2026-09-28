import { z } from 'zod';

export const csvRequestSchema = z.object({
  csvUrl: z
    .url('Enter a valid CSV URL')
    .refine(url => ['http:', 'https:'].includes(new URL(url).protocol), 'Only HTTP and HTTPS URLs are allowed'),
  maxQuestions: z.number().int().min(5).max(20).default(10),
});

export const columnProfileSchema = z.object({
  name: z.string(),
  type: z.enum(['empty', 'integer', 'decimal', 'boolean', 'date', 'text']),
  nonEmptyCount: z.number().int().nonnegative(),
  missingCount: z.number().int().nonnegative(),
  uniqueCount: z.number().int().nonnegative(),
  numeric: z
    .object({
      min: z.number(),
      max: z.number(),
      mean: z.number(),
      median: z.number(),
    })
    .optional(),
  topValues: z.array(
    z.object({
      value: z.string(),
      count: z.number().int().positive(),
    }),
  ),
});

export const datasetAnalysisSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().positive(),
  columns: z.array(columnProfileSchema),
  sampleRows: z.array(z.record(z.string(), z.string())),
  warnings: z.array(z.string()),
});

export const csvAnalysisResultSchema = z.object({
  summary: z.string(),
  analysis: datasetAnalysisSchema,
  fileSize: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().positive(),
  characterCount: z.number().int().nonnegative(),
  maxQuestions: z.number().int().min(5).max(20),
});

export const generatedQuestionSchema = z.object({
  question: z.string().min(10),
  category: z.enum(['factual', 'comprehension', 'analysis', 'application']),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  expectedAnswer: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
});

export const questionsResultSchema = csvAnalysisResultSchema.extend({
  questions: z.array(generatedQuestionSchema),
  questionCount: z.number().int().nonnegative(),
  success: z.boolean(),
});

export type DatasetAnalysis = z.infer<typeof datasetAnalysisSchema>;
