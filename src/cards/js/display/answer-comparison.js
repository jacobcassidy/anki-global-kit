/**
 * Render answer text without losing it.
 */
export function getRenderedAnswerText(answerElement) {
  // innerText preserves HTML line breaks, but only when the element has layout.
  // Comparison mode hides the original answer, so measure an invisible copy.
  const copy = answerElement.cloneNode(true);

  copy.style.setProperty('display', 'block', 'important');
  copy.style.setProperty('position', 'absolute', 'important');
  copy.style.setProperty('visibility', 'visible', 'important');
  copy.style.setProperty('opacity', '0', 'important');
  copy.style.setProperty('pointer-events', 'none', 'important');

  // Keep temporary child mutations below the body/#qa nodes watched by initWatchQA.
  answerElement.closest('.global-kit-container').appendChild(copy);
  try {
    return copy.innerText;
  } finally {
    copy.remove();
  }
}

/**
 * Update diff answer characters.
 */
export function diffAnswerCharacters(cardAnswer, typedAnswer) {
  const expected = Array.from(cardAnswer);
  const actual = Array.from(typedAnswer);
  const rows = expected.length + 1;
  const columns = actual.length + 1;

  // Keep memory bounded for unusually large answers; normal card answers use
  // the full LCS diff below and retain character-level comparison.
  if (rows * columns > 1_000_000) {
    return [
      [-1, cardAnswer],
      [1, typedAnswer],
    ].filter(([, text]) => text);
  }

  const lengths = Array.from({ length: rows }, () => new Uint32Array(columns));
  for (let i = expected.length - 1; i >= 0; i--) {
    for (let j = actual.length - 1; j >= 0; j--) {
      lengths[i][j] =
        expected[i] === actual[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const diffs = [];
  const append = (operation, character) => {
    const last = diffs[diffs.length - 1];
    if (last && last[0] === operation) last[1] += character;
    else diffs.push([operation, character]);
  };

  let i = 0;
  let j = 0;
  while (i < expected.length && j < actual.length) {
    if (expected[i] === actual[j]) {
      append(0, expected[i++]);
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      append(-1, expected[i++]);
    } else {
      append(1, actual[j++]);
    }
  }
  while (i < expected.length) append(-1, expected[i++]);
  while (j < actual.length) append(1, actual[j++]);
  return diffs;
}
