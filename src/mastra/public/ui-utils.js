export function progressStateForElapsed(elapsedMs) {
  if (elapsedMs < 2_600) {
    return { index: 0, percent: 14 + (elapsedMs / 2_600) * 20 };
  }

  if (elapsedMs < 5_200) {
    return { index: 1, percent: 40 + ((elapsedMs - 2_600) / 2_600) * 22 };
  }

  return {
    index: 2,
    percent: Math.min(96, 72 + ((elapsedMs - 5_200) / 1_000) * 1.8),
  };
}

export function parseInlineMarkdown(value) {
  const tokens = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: 'text', value: value.slice(cursor, match.index) });
    }

    tokens.push({
      type: match[2] !== undefined ? 'strong' : 'code',
      value: match[2] ?? match[3],
    });
    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) {
    tokens.push({ type: 'text', value: value.slice(cursor) });
  }

  return tokens;
}

export function parseSummaryBlocks(markdown) {
  const blocks = [];

  markdown
    .replaceAll('\r\n', '\n')
    .split('\n')
    .forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) return;

      const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
      const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
      const listType = orderedMatch ? 'ol' : unorderedMatch ? 'ul' : null;

      if (listType) {
        const content = (orderedMatch ?? unorderedMatch)[1];
        const previous = blocks.at(-1);
        if (previous?.type === listType) {
          previous.items.push(parseInlineMarkdown(content));
        } else {
          blocks.push({ type: listType, items: [parseInlineMarkdown(content)] });
        }
        return;
      }

      const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
      const isBoldHeading = /^\*\*[^*]+:\*\*$/.test(line);
      blocks.push({
        type: markdownHeading || isBoldHeading ? 'heading' : 'paragraph',
        tokens: parseInlineMarkdown(markdownHeading?.[1] ?? line),
      });
    });

  return blocks;
}
