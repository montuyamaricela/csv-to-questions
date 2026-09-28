import { parseInlineMarkdown, parseSummaryBlocks, progressStateForElapsed } from '/ui-utils.js';

const SAMPLE_URL = 'https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv';

const form = document.querySelector('#generator-form');
const urlInput = document.querySelector('#csv-url');
const countInput = document.querySelector('#question-count');
const countOutput = document.querySelector('#question-count-value');
const sampleButton = document.querySelector('#sample-button');
const submitButton = form.querySelector('button[type="submit"]');
const formError = document.querySelector('#form-error');
const progressPanel = document.querySelector('#progress-panel');
const progressTitle = document.querySelector('#progress-title');
const progressDescription = document.querySelector('#progress-description');
const progressBar = document.querySelector('#progress-bar');
const progressStatus = document.querySelector('#progress-status');
const progressElapsed = document.querySelector('#progress-elapsed');
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const resultsSection = document.querySelector('#results');
const metricGrid = document.querySelector('#metric-grid');
const summaryContainer = document.querySelector('#dataset-summary');
const columnProfile = document.querySelector('#column-profile');
const questionList = document.querySelector('#question-list');
const questionHeading = document.querySelector('#question-heading');
const newAnalysisButton = document.querySelector('#new-analysis-button');
const copyAllButton = document.querySelector('#copy-all-button');

let currentQuestions = [];
let progressTimer;
let progressStartedAt;

const progressContent = [
  ['Checking the source…', 'Confirming the URL is public, safe, and within the file limit.'],
  ['Profiling every column…', 'Computing types, completeness, distinct values, and numeric statistics.'],
  ['Writing grounded questions…', 'Turning the measured profile into useful questions, answers, and evidence.'],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = '';
}

function updateProgress() {
  const elapsedMs = Date.now() - progressStartedAt;
  const elapsedSeconds = Math.floor(elapsedMs / 1_000);
  const { index, percent } = progressStateForElapsed(elapsedMs);
  const [title, description] = progressContent[index];
  progressTitle.textContent = title;
  progressDescription.textContent =
    index === 2 && elapsedSeconds >= 20
      ? 'Still working—the AI is finishing the question set. Larger datasets can take a little longer.'
      : description;
  progressBar.style.width = `${percent}%`;
  progressStatus.textContent = index === 2 ? 'AI generation in progress' : 'Request active';
  progressElapsed.textContent = `${elapsedSeconds}s elapsed`;
  progressPanel.classList.toggle('is-generating', index === 2);

  progressSteps.forEach((step, stepIndex) => {
    step.classList.toggle('is-active', stepIndex === index);
    step.classList.toggle('is-complete', stepIndex < index);
  });
}

function startProgress() {
  progressStartedAt = Date.now();
  progressPanel.hidden = false;
  updateProgress();
  progressTimer = window.setInterval(updateProgress, 1_000);
}

function stopProgress() {
  window.clearInterval(progressTimer);
  progressPanel.hidden = true;
  progressPanel.classList.remove('is-generating');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function completeness(analysis) {
  const cells = analysis.rowCount * analysis.columnCount;
  if (!cells) return '—';
  const missing = analysis.columns.reduce((sum, column) => sum + column.missingCount, 0);
  return `${Math.round(((cells - missing) / cells) * 100)}%`;
}

function renderMetrics(data) {
  const metrics = [
    ['Rows analyzed', data.rowCount.toLocaleString()],
    ['Columns', data.columnCount.toLocaleString()],
    ['Completeness', completeness(data.analysis)],
    ['Source size', formatBytes(data.fileSize)],
  ];

  metricGrid.replaceChildren(
    ...metrics.map(([label, value]) => {
      const card = element('div', 'metric-card');
      card.append(element('span', '', label), element('strong', '', value));
      return card;
    }),
  );
}

function renderColumns(columns) {
  columnProfile.replaceChildren(
    ...columns.map(column => {
      const card = element('div', 'column-card');
      const title = element('div', 'column-title');
      title.append(element('strong', '', column.name), element('span', 'type-pill', column.type));

      const stats = element('div', 'column-stats');
      const unique = element('div');
      unique.append(element('span', '', 'Unique'), element('b', '', column.uniqueCount.toLocaleString()));
      const missing = element('div');
      missing.append(element('span', '', 'Missing'), element('b', '', column.missingCount.toLocaleString()));
      stats.append(unique, missing);

      if (column.numeric) {
        const range = element('div');
        range.append(element('span', '', 'Range'), element('b', '', `${column.numeric.min}–${column.numeric.max}`));
        const average = element('div');
        average.append(element('span', '', 'Average'), element('b', '', String(column.numeric.mean)));
        stats.append(range, average);
      }

      card.append(title, stats);
      return card;
    }),
  );
}

function renderQuestions(questions) {
  questionHeading.textContent = `${questions.length} questions & answers`;
  questionList.replaceChildren(
    ...questions.map((question, index) => {
      const card = element('article', 'question-card');
      const meta = element('div', 'question-meta');
      const tags = element('div', 'question-tags');
      tags.append(
        element('span', 'tag category', question.category),
        element('span', 'tag', question.difficulty),
      );
      meta.append(tags, element('span', 'question-number', `Q.${String(index + 1).padStart(2, '0')}`));

      const answer = element('div', 'answer-box');
      answer.append(element('span', '', 'Expected answer'));
      appendInlineTokens(answer, parseInlineMarkdown(question.expectedAnswer));

      const evidence = element('div', 'evidence-list');
      evidence.append(element('span', '', 'Evidence'));
      const evidenceItems = element('ul');
      evidenceItems.append(
        ...question.evidence.map(item => {
          const evidenceItem = element('li');
          appendInlineTokens(evidenceItem, parseInlineMarkdown(item));
          return evidenceItem;
        }),
      );
      evidence.append(evidenceItems);

      const questionText = element('h4');
      appendInlineTokens(questionText, parseInlineMarkdown(question.question));
      card.append(meta, questionText, answer, evidence);
      return card;
    }),
  );
}

function appendInlineTokens(parent, tokens) {
  tokens.forEach(token => {
    if (token.type === 'text') {
      parent.append(document.createTextNode(token.value));
      return;
    }

    parent.append(element(token.type, '', token.value));
  });
}

function renderSummary(markdown) {
  const fragment = document.createDocumentFragment();

  parseSummaryBlocks(markdown).forEach(block => {
    if (block.type === 'ul' || block.type === 'ol') {
      const list = element(block.type, 'summary-list');
      block.items.forEach(tokens => {
        const item = element('li');
        appendInlineTokens(item, tokens);
        list.append(item);
      });
      fragment.append(list);
      return;
    }

    const container = element(block.type === 'heading' ? 'h4' : 'p');
    appendInlineTokens(container, block.tokens);
    fragment.append(container);
  });

  summaryContainer.replaceChildren(fragment);
}

function renderResults(data) {
  currentQuestions = data.questions;
  renderMetrics(data);
  renderSummary(data.summary);
  renderColumns(data.analysis.columns);
  renderQuestions(data.questions);
  resultsSection.hidden = false;
  resultsSection.focus({ preventScroll: true });
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function questionsAsText() {
  return currentQuestions
    .map(
      (question, index) =>
        `${index + 1}. ${question.question}\nAnswer: ${question.expectedAnswer}\nEvidence: ${question.evidence.join('; ')}`,
    )
    .join('\n\n');
}

countInput.addEventListener('input', () => {
  countOutput.value = countInput.value;
});

sampleButton.addEventListener('click', () => {
  urlInput.value = SAMPLE_URL;
  urlInput.focus();
  clearError();
});

newAnalysisButton.addEventListener('click', () => {
  resultsSection.hidden = true;
  currentQuestions = [];
  urlInput.focus();
  window.scrollTo({ top: document.querySelector('.workspace').offsetTop - 24, behavior: 'smooth' });
});

copyAllButton.addEventListener('click', async () => {
  if (!currentQuestions.length) return;
  try {
    await navigator.clipboard.writeText(questionsAsText());
    copyAllButton.textContent = 'Copied';
    window.setTimeout(() => (copyAllButton.textContent = 'Copy all'), 1800);
  } catch {
    copyAllButton.textContent = 'Copy failed';
    window.setTimeout(() => (copyAllButton.textContent = 'Copy all'), 1800);
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearError();

  if (!form.reportValidity()) return;

  resultsSection.hidden = true;
  submitButton.disabled = true;
  startProgress();

  try {
    const response = await fetch('/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csvUrl: urlInput.value.trim(),
        maxQuestions: Number(countInput.value),
      }),
    });

    const payload = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' }));
    if (!response.ok) throw new Error(payload.error || 'Unable to generate questions right now.');
    renderResults(payload);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Unable to generate questions right now.');
    document.querySelector('.workspace').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    stopProgress();
    submitButton.disabled = false;
  }
});
