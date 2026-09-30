/**
 * Toggle Markdown markers around the current textarea selection.
 */
export function toggleMarkdownFormatting(textarea, prefix, suffix) {
  let start = textarea.selectionStart;
  let end = textarea.selectionEnd;
  const value = textarea.value;
  const isAsteriskStyle = prefix === suffix && (prefix === '*' || prefix === '**');
  const countStarsBefore = (position) => {
    let count = 0;
    while (value[position - count - 1] === '*') count++;
    return count;
  };
  const countStarsAfter = (position) => {
    let count = 0;
    while (value[position + count] === '*') count++;
    return count;
  };
  const matchingAsteriskWrapper = (rangeStart, rangeEnd) => {
    const before = countStarsBefore(rangeStart);
    const after = countStarsAfter(rangeEnd);
    return (
      before === after &&
      (prefix === '**' ? before >= 2 : before === 1 || before >= 3)
    );
  };

  // First recognize an empty pair at the caret. This must happen before word
  // detection, otherwise the marker characters can be mistaken for a word.
  let isEmptyAsteriskSyntax = false;
  if (start === end) {
    let emptyWrapperStart = -1;
    let emptyWrapperEnd = -1;

    if (isAsteriskStyle) {
      const before = countStarsBefore(start);
      const after = countStarsAfter(end);
      isEmptyAsteriskSyntax = before > 0 && before === after;
      if (before > 0 && before === after && matchingAsteriskWrapper(start, end)) {
        emptyWrapperStart = start - prefix.length;
        emptyWrapperEnd = end + suffix.length;
      }
    } else if (
      value.slice(start - prefix.length, start) === prefix &&
      value.slice(end, end + suffix.length) === suffix
    ) {
      emptyWrapperStart = start - prefix.length;
      emptyWrapperEnd = end + suffix.length;
    } else {
      // Also tolerate a webview placing the caret just outside a new empty pair.
      const emptySyntax = `${prefix}${suffix}`;
      if (value.slice(start - emptySyntax.length, start) === emptySyntax) {
        emptyWrapperStart = start - emptySyntax.length;
        emptyWrapperEnd = start;
      } else if (value.slice(start, start + emptySyntax.length) === emptySyntax) {
        emptyWrapperStart = start;
        emptyWrapperEnd = start + emptySyntax.length;
      }
    }

    if (emptyWrapperStart >= 0) {
      textarea.setRangeText('', emptyWrapperStart, emptyWrapperEnd, 'end');
      textarea.selectionStart = textarea.selectionEnd = emptyWrapperStart;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  }

  // A selection may include the markers themselves; treat that like selecting
  // the formatted text inside them.
  const selectedText = value.slice(start, end);
  const selectedHasMarkers =
    end > start && selectedText.startsWith(prefix) && selectedText.endsWith(suffix);
  let contentStart = selectedHasMarkers ? start + prefix.length : start;
  let contentEnd = selectedHasMarkers ? end - suffix.length : end;
  let hasMarkers = selectedHasMarkers;
  let markerCheckStart = contentStart;
  let markerCheckEnd = contentEnd;
  let enclosedAsteriskWrapper = false;

  // A caret anywhere inside an asterisk-wrapped span should operate on that
  // span, not mistake its surrounding markers for part of the current word.
  if (isAsteriskStyle && start === end && !selectedHasMarkers) {
    const lastOpeningStar = value.lastIndexOf('*', start - 1);
    const firstClosingStar = value.indexOf('*', start);
    if (lastOpeningStar >= 0 && firstClosingStar >= 0) {
      let openingStart = lastOpeningStar;
      let closingEnd = firstClosingStar + 1;
      while (value[openingStart - 1] === '*') openingStart--;
      while (value[closingEnd] === '*') closingEnd++;

      const openingLength = lastOpeningStar - openingStart + 1;
      const closingLength = closingEnd - firstClosingStar;
      const wrapperContentStart = openingStart + openingLength;
      const wrapperContentEnd = firstClosingStar;
      const content = value.slice(wrapperContentStart, wrapperContentEnd);

      if (
        openingLength === closingLength &&
        wrapperContentStart <= start &&
        wrapperContentEnd >= start &&
        !content.includes('*')
      ) {
        enclosedAsteriskWrapper = true;
        contentStart = wrapperContentStart;
        contentEnd = wrapperContentEnd;
        markerCheckStart = contentStart;
        markerCheckEnd = contentEnd;
        hasMarkers = prefix === '**' ? openingLength >= 2 : openingLength === 1 || openingLength >= 3;
      }
    }
  }

  // Recognize a code span or fenced block even when the caret or selection is
  // somewhere inside its contents rather than directly beside its markers.
  if (!isAsteriskStyle && !selectedHasMarkers) {
    const openingStart = value.lastIndexOf(prefix, start);
    const openingEnd = openingStart + prefix.length;
    const closingStart = value.indexOf(suffix, Math.max(end, openingEnd));

    if (
      openingStart >= 0 &&
      openingEnd <= start &&
      closingStart >= end &&
      !value.slice(openingEnd, closingStart).includes(prefix)
    ) {
      contentStart = openingEnd;
      contentEnd = closingStart;
      markerCheckStart = contentStart;
      markerCheckEnd = contentEnd;
      hasMarkers = true;
    }
  }

  // With no selection, resolve the word before checking its surrounding syntax.
  if (
    start === end &&
    !selectedHasMarkers &&
    !hasMarkers &&
    !isEmptyAsteriskSyntax &&
    !enclosedAsteriskWrapper
  ) {
    const wordBoundary = /[\s,.]/;
    let wordStart = start;
    let wordEnd = end;

    while (wordStart > 0 && !wordBoundary.test(value[wordStart - 1])) wordStart--;
    while (wordEnd < value.length && !wordBoundary.test(value[wordEnd])) wordEnd++;

    if (wordStart !== wordEnd) {
      contentStart = wordStart;
      contentEnd = wordEnd;
      markerCheckStart = wordStart;
      markerCheckEnd = wordEnd;
    }
  }

  if (!hasMarkers) {
    if (isAsteriskStyle) {
      hasMarkers = matchingAsteriskWrapper(markerCheckStart, markerCheckEnd);
    } else {
      hasMarkers =
        markerCheckStart >= prefix.length &&
        value.slice(markerCheckStart - prefix.length, markerCheckStart) === prefix &&
        value.slice(markerCheckEnd, markerCheckEnd + suffix.length) === suffix;
    }
  }

  const rangeStart = hasMarkers ? markerCheckStart - prefix.length : contentStart;
  const rangeEnd = hasMarkers ? markerCheckEnd + suffix.length : contentEnd;
  const textToKeep = value.slice(contentStart, contentEnd);

  textarea.setRangeText(
    hasMarkers ? textToKeep : `${prefix}${textToKeep}${suffix}`,
    rangeStart,
    rangeEnd,
    'end'
  );

  const selectionStart = hasMarkers ? rangeStart : rangeStart + prefix.length;
  const selectionEnd = selectionStart + textToKeep.length;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Handle Markdown formatting shortcuts on an answer textarea.
 */
export function handleMarkdownHotkeys(textarea, event, options = {}) {
  const { inlineCodeEnabled = true, markdownEnabled = true } =
    typeof options === 'boolean' ? { inlineCodeEnabled: options } : options;
  const isCKey = event.key.toLowerCase() === 'c' || event.code === 'KeyC';
  if (markdownEnabled && event.ctrlKey && event.metaKey && isCKey) {
    event.preventDefault();
    event.stopPropagation();
    toggleMarkdownFormatting(textarea, '```\n', '\n```');
    return true;
  }

  if (!event.metaKey) return false;

  const key = event.key.toLowerCase();
  const marker =
    markdownEnabled && key === 'b'
      ? '**'
      : markdownEnabled && key === 'i'
        ? '*'
        : key === 'c' && event.shiftKey && inlineCodeEnabled
          ? '`'
          : null;
  if (!marker) return false;

  event.preventDefault();
  event.stopPropagation();
  toggleMarkdownFormatting(textarea, marker, marker);
  return true;
}
