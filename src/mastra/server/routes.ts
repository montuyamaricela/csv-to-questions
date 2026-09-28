import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { registerApiRoute } from '@mastra/core/server';
import { csvRequestSchema } from '../schemas/csv';

const staticAssets = [
  { path: '/', file: 'index.html', contentType: 'text/html; charset=utf-8' },
  { path: '/styles.css', file: 'styles.css', contentType: 'text/css; charset=utf-8' },
  { path: '/app.js', file: 'app.js', contentType: 'text/javascript; charset=utf-8' },
  { path: '/ui-utils.js', file: 'ui-utils.js', contentType: 'text/javascript; charset=utf-8' },
  { path: '/favicon.svg', file: 'favicon.svg', contentType: 'image/svg+xml' },
  { path: '/syntara-logo.png', file: 'syntara-logo.png', contentType: 'image/png' },
  { path: '/syntara-mark.png', file: 'syntara-mark.png', contentType: 'image/png' },
] as const;

const staticRoutes = staticAssets.map(asset =>
  registerApiRoute(asset.path, {
    method: 'GET',
    requiresAuth: false,
    handler: async c => {
      const content = await readFile(join(process.cwd(), asset.file));
      return c.body(content, 200, {
        'Content-Type': asset.contentType,
        'Cache-Control': 'no-cache',
      });
    },
  }),
);

const runCsvQuestionsRoute = registerApiRoute('/generate-questions', {
  method: 'POST',
  requiresAuth: false,
  openapi: {
    summary: 'Generate evidence-grounded questions from a public CSV URL',
    tags: ['CSV Questions'],
    responses: {
      200: { description: 'Dataset profile and generated questions' },
      400: { description: 'Invalid request' },
      500: { description: 'Workflow failed' },
    },
  },
  handler: async c => {
    const parsed = csvRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        {
          error: 'Please provide a valid public CSV URL and choose between 5 and 20 questions.',
          issues: parsed.error.issues,
        },
        400,
      );
    }

    try {
      const workflow = c.get('mastra').getWorkflow('csvToQuestionsWorkflow');
      const run = await workflow.createRun();
      const result = await run.start({
        inputData: parsed.data,
      });

      if (result.status !== 'success') {
        const message = result.status === 'failed' ? result.error?.message : 'The workflow did not complete.';
        return c.json({ error: message || 'The workflow failed.' }, 500);
      }

      return c.json(result.result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate questions right now.';
      return c.json({ error: message }, 500);
    }
  },
});

export const apiRoutes = [...staticRoutes, runCsvQuestionsRoute];
