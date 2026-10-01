/**
 * Toggle a Markdown prefix on every line touched by the textarea selection.
 */
export function toggleMarkdownBlock(textarea, format) {
  const value = textarea.value;
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const blockStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const selectionIncludesLineBreak = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n';
  const nextLineStart = value.indexOf('\n', selectionEnd);
  const blockEnd = selectionIncludesLineBreak ? selectionEnd - 1 : nextLineStart === -1 ? value.length : nextLineStart;
  const lines = value.slice(blockStart, blockEnd).split('\n');
  const patterns = {
    'unordered-list': /^([-*+])\s+/,
    'ordered-list': /^\d+\.\s+/,
    blockquote: /^>\s?/,
  };
  const pattern = patterns[format];
  if (!pattern) return;

  const shouldRemove = lines.every((line) => pattern.test(line));
  let listIndex = 0;
  const formattedLines = lines.map((line) => {
    if (shouldRemove) return line.replace(pattern, '');
    if (format === 'unordered-list') return `- ${line}`;
    if (format === 'ordered-list') return `${++listIndex}. ${line}`;
    return `> ${line}`;
  });
  const replacement = formattedLines.join('\n');
  textarea.setRangeText(replacement, blockStart, blockEnd, 'select');
  textarea.selectionStart = blockStart;
  textarea.selectionEnd = blockStart + replacement.length;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

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
    return before === after && (prefix === '**' ? before >= 2 : before === 1 || before >= 3);
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
  const selectedHasMarkers = end > start && selectedText.startsWith(prefix) && selectedText.endsWith(suffix);
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
  if (start === end && !selectedHasMarkers && !hasMarkers && !isEmptyAsteriskSyntax && !enclosedAsteriskWrapper) {
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

  textarea.setRangeText(hasMarkers ? textToKeep : `${prefix}${textToKeep}${suffix}`, rangeStart, rangeEnd, 'end');

  const selectionStart = hasMarkers ? rangeStart : rangeStart + prefix.length;
  const selectionEnd = selectionStart + textToKeep.length;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Handle Markdown formatting shortcuts on a question textarea.
 */
export function handleMarkdownHotkeys(textarea, event, options = {}) {
  const { markdownEnabled = true, hotkeys = {} } =
    typeof options === 'boolean' ? { markdownEnabled: options } : options;
  if (!markdownEnabled || event.isComposing) return false;

  const isMac = navigator.platform.startsWith('Mac');
  const shortcuts = {
    bold: ['Primary+B', '**', '**'],
    italic: ['Primary+I', '*', '*'],
    strikethrough: ['Primary+Shift+X', '~~', '~~'],
    inlineCode: ['Primary+Shift+C', '`', '`'],
    codeBlock: ['CodeBlock+C', '```\n', '\n```'],
    unorderedList: ['', 'unordered-list'],
    orderedList: ['', 'ordered-list'],
    blockquote: ['', 'blockquote'],
  };
  const configured = {
    ...Object.fromEntries(Object.entries(shortcuts).map(([name, value]) => [name, value[0]])),
    ...hotkeys,
  };
  for (const [name, definition] of Object.entries(shortcuts)) {
    const [defaultShortcut, prefix, suffix] = definition;
    const shortcut = configured[name] ?? defaultShortcut;
    if (!shortcut || !matchesMarkdownHotkey(event, shortcut, isMac)) continue;
    event.preventDefault();
    event.stopPropagation();
    if (name === 'unorderedList' || name === 'orderedList' || name === 'blockquote') {
      toggleMarkdownBlock(textarea, prefix);
    } else {
      toggleMarkdownFormatting(textarea, prefix, suffix);
    }
    return true;
  }
  return false;
}

function matchesMarkdownHotkey(event, shortcut, isMac) {
  const parts = shortcut.split('+');
  const key = parts.pop();
  if (!key) return false;
  const eventKey = event.key.toLowerCase();
  const keyMatches = eventKey === key.toLowerCase() || (key.length === 1 && event.code === `Key${key.toUpperCase()}`);
  if (!keyMatches) return false;
  const modifiers = new Set(parts.map((part) => part.toLowerCase()));
  const codeBlock = modifiers.has('codeblock');
  const primary = modifiers.has('primary');
  const control = modifiers.has('control') || (codeBlock && !isMac);
  const meta = modifiers.has('meta') || (primary && isMac) || (codeBlock && isMac);
  const ctrl = control || (primary && !isMac) || codeBlock;
  const alt = modifiers.has('alt') || (codeBlock && !isMac);
  const shift = modifiers.has('shift');
  return event.ctrlKey === ctrl && event.metaKey === meta && event.altKey === alt && event.shiftKey === shift;
}
