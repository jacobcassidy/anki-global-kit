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
  answerElement.closest('.card-inner').appendChild(copy);
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
  // Give each Unicode code point one BMP token so the diff cannot split a pair.
  const characters = Array.from(new Set([...cardAnswer, ...typedAnswer]));

  // Exclude surrogate code units from the token alphabet.
  if (characters.length > 0x10000 - 0x800) {
    return [
      [-1, cardAnswer],
      [1, typedAnswer],
    ].filter(([, text]) => text);
  }

  const tokens = new Map(
    characters.map((char, index) => [
      char,
      String.fromCharCode(index < 0xd800 ? index : index + 0x800),
    ]),
  );
  const encode = (text) => Array.from(text, (char) => tokens.get(char)).join('');
  const dmp = new globalThis.diff_match_patch();

  return dmp.diff_main(encode(cardAnswer), encode(typedAnswer)).map((diff) => [
    diff[0],
    Array.from(diff[1], (token) => {
      const index = token.charCodeAt(0);
      return characters[index < 0xd800 ? index : index - 0x800];
    }).join(''),
  ]);
}
