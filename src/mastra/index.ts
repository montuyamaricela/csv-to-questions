import {
  Observability,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { Mastra } from '@mastra/core/mastra';
import { VercelDeployer } from '@mastra/deployer-vercel';
import { PinoLogger } from '@mastra/loggers';
import { csvToQuestionsWorkflow } from './workflows/csv-to-questions-workflow';
import { textQuestionAgent } from './agents/text-question-agent';
import { csvSummarizationAgent } from './agents/csv-summarization-agent';
import { apiRoutes } from './server/routes';

export const mastra = new Mastra({
  server: {
    studioBase: '/studio',
    apiRoutes,
  },
  workflows: { csvToQuestionsWorkflow },
  agents: {
    textQuestionAgent,
    csvSummarizationAgent,
  },
  deployer: new VercelDeployer({
    maxDuration: 60,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
