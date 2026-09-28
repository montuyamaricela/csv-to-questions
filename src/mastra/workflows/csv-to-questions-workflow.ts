import { createStep, createWorkflow } from '@mastra/core/workflows';
import { csvRequestSchema, questionsResultSchema } from '../schemas/csv';
import { csvFetcherTool } from '../tools/download-csv-tool';
import { generateQuestionsFromTextTool } from '../tools/generate-questions-from-text-tool';

const downloadAndAnalyzeCsvStep = createStep(csvFetcherTool);
const generateQuestionsStep = createStep(generateQuestionsFromTextTool);

export const csvToQuestionsWorkflow = createWorkflow({
  id: 'csv-to-questions',
  description: 'Safely downloads and profiles a CSV, summarizes its data, and creates grounded questions',
  inputSchema: csvRequestSchema,
  outputSchema: questionsResultSchema,
})
  .then(downloadAndAnalyzeCsvStep)
  .then(generateQuestionsStep)
  .commit();
