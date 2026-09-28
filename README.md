# CSV to Questions Generator

An agent that safely downloads a CSV, computes a deterministic dataset profile, and produces evidence-grounded questions from that profile. Built with [Mastra](https://mastra.ai).

## Why we built this

The workflow calculates types, missing values, distinct values, common values, and numeric statistics before asking an AI model to summarize or generate questions. This keeps factual claims tied to computed evidence instead of asking a model to infer an entire dataset from a few rows.

## Web experience

The project includes a responsive frontend served by the same Mastra process. Paste a public CSV URL, choose how many questions to create, and review the dataset profile, generated questions, expected answers, and supporting evidence in one page. Mastra Studio remains available separately at `/studio` for development and debugging.

## Features

- **Deterministic profiling**: Computes column types, missing values, unique values, common values, and numeric statistics across the full file.
- **Evidence-grounded questions**: Returns each question with a category, difficulty, expected answer, and supporting evidence.
- **Safer downloads**: Allows only public HTTP(S) URLs and enforces content-type, redirect, timeout, column-count, and 5 MB file-size limits.
- **Standards-compliant parsing**: Handles quoted commas, escaped quotes, BOMs, and multiline fields.
- **Portfolio-ready frontend**: Responsive, accessible UI with a sample dataset, progress feedback, dataset metrics, and copyable results.

## Quick start

1. **Install dependencies**
   - Clone this repository, then run `npm install`.
2. **Add an API key**
   - Copy `.env.example` to `.env` and fill in your Gemini API key as `GOOGLE_API_KEY`.
3. **Start the dev server**
   - Run `npm run dev` and open [localhost:4111](http://localhost:4111) to try it out.

Enter a CSV URL and optionally choose 5–20 questions. The app returns structured questions with answers and evidence. For the underlying workflow view, open [localhost:4111/studio](http://localhost:4111/studio).

**Need a CSV to try?** Grab this world GDP dataset: `https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv`

## Making it yours

Swap in a different model, or wire the agent into your app using the [Mastra Client SDK](https://mastra.ai/docs/server/mastra-client). The agent, tools, and workflow are all in `src/` — edit them directly to fit your use case.

## Development checks

Run `npm run typecheck`, `npm test`, and `npm run build` before deploying changes.

## Deployment

Build the app with `npm run build`, then start the production bundle with:

```bash
node .mastra/output/index.mjs
```

Deploy the contents of `.mastra/output` to a Node.js host, set `GOOGLE_API_KEY` in the host's environment, and expose the service port. The frontend and API are same-origin, so there is no separate frontend deployment or browser-side API key.
