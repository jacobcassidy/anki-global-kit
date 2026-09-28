/* exported hasMyCustomScript */
const hasMyCustomScript = true;
const isAnkiPC = typeof pycmd !== 'undefined';
const isAnkiWeb = typeof study !== 'undefined';
const isAnkiDroid = typeof AnkiDroidJS !== 'undefined';
let outputAnswerArr;
const boundInputElements = new WeakSet();
const renderedPlainOutputs = new WeakSet();

/**
 * Initialize the global script.
 */
(function initWatchQA() {
  // Run functions on first load,
  runFunctions();

  // Run functions again when changes are made to the DOM.
  let targetNode;
  if (isAnkiDroid) targetNode = document.querySelector('body');
  else targetNode = document.getElementById('qa');

  const config = { childList: true },
    callback = function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') runFunctions();
        break; // Don't run functions again when changes made to the DOM are created by the functions.
      }
    };
  const observer = new MutationObserver(callback);

  observer.observe(targetNode, config);
})();

/**
 * Run the script functions.
 */
function runFunctions() {
  showInputContainers();
  focusFirstInput();
  watchAnswerInputs();
  showOutputContainers();
  showNotes();
  modifyAnkiWeb();
}

/**
 * Check if an element contains visible content.
 */
function hasVisibleContent(element) {
  return (
    element !== null &&
    (element.innerText.trim() !== '' ||
      element.querySelector('img, svg, canvas, video, audio, iframe, object, embed') !== null)
  );
}

/**
 * Display a .input-container that contains visible content.
 */
function showInputContainers() {
  const inputContainers = document.querySelectorAll('.input-container');
  if (inputContainers.length < 1) return;

  inputContainers.forEach((inputContainer) => {
    const textarea = inputContainer.querySelector('textarea');
    const bonusQuestion = inputContainer.querySelector('.is-bonus .question');
    const typeHint = inputContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);
    addComparisonStyle(textarea);

    // Show primary input container by default.
    if (inputContainer.classList.contains('is-primary')) inputContainer.classList.add('active');

    // Show bonus input container if it has question content.
    if (hasVisibleContent(bonusQuestion)) inputContainer.classList.add('active');
  });
}

/**
 * Add .is-comparison to textarea when it has a comparison value.
 */
function addComparisonStyle(textarea) {
  const textareaDataCompare = textarea.getAttribute('data-compare');
  if (textareaDataCompare) textarea.classList.add('is-comparison');
}

/**
 * Show bonus question if it contains visible content.
 */
function showBonusQuestion(bonusQuestion) {
  if (!bonusQuestion) return;
  if (hasVisibleContent(bonusQuestion)) bonusQuestion.classList.add('active');
}

/**
 * Show type hint if it contains visible content.
 */
function showTypeHint(typeHint) {
  if (!typeHint) return;
  if (hasVisibleContent(typeHint)) typeHint.classList.add('active');
}

/**
 * Focus the first input or textarea if it is not already active.
 */
function focusFirstInput() {
  // Do nothing if an input or textarea is already active.
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.matches('input, textarea') || activeElement.isContentEditable)) return;

  // Otherwise, add focus to first input or textarea if the ID is not #typeans.
  const inputField = document.querySelector('input, textarea');
  if (inputField !== null && inputField.id !== 'typeans') inputField.focus();
}

/**
 * Toggle Markdown markers around the current textarea selection.
 */
function toggleMarkdownFormatting(textarea, prefix, suffix) {
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

  // Keep code delimiters outside emphasis. When the target includes the
  // delimiters, trim them from the range that bold or italic will change.
  if (isAsteriskStyle && !hasMarkers && contentEnd > contentStart) {
    const selectedContent = value.slice(contentStart, contentEnd);
    if (selectedContent.startsWith('```\n') && selectedContent.endsWith('\n```')) {
      contentStart += 4;
      contentEnd -= 4;
      markerCheckStart = contentStart;
      markerCheckEnd = contentEnd;
    } else {
      let openingTicks = 0;
      let closingTicks = 0;
      while (value[contentStart + openingTicks] === '`') openingTicks++;
      while (value[contentEnd - closingTicks - 1] === '`') closingTicks++;

      if (openingTicks > 0 && openingTicks === closingTicks) {
        contentStart += openingTicks;
        contentEnd -= closingTicks;
        markerCheckStart = contentStart;
        markerCheckEnd = contentEnd;
      }
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
function handleMarkdownHotkeys(textarea, event) {
  const isCKey = event.key.toLowerCase() === 'c' || event.code === 'KeyC';
  if (event.ctrlKey && event.metaKey && isCKey) {
    event.preventDefault();
    event.stopPropagation();
    toggleMarkdownFormatting(textarea, '```\n', '\n```');
    return true;
  }

  if (!event.metaKey) return false;

  const key = event.key.toLowerCase();
  const marker = key === 'b' ? '**' : key === 'i' ? '*' : key === 'c' && event.shiftKey ? '`' : null;
  if (!marker) return false;

  event.preventDefault();
  event.stopPropagation();
  toggleMarkdownFormatting(textarea, marker, marker);
  return true;
}

/**
 * Insert indentation with Tab, or advance focus with Shift+Tab.
 */
function handleTabIndentation(textarea, event) {
  if (event.key !== 'Tab') return;

  if (event.shiftKey) {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'
      )
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return (
        !element.disabled &&
        element.tabIndex >= 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        element.getClientRects().length > 0
      );
    });
    const currentIndex = focusableElements.indexOf(textarea);
    const nextElement = focusableElements[currentIndex + 1];

    if (nextElement) {
      event.preventDefault();
      nextElement.focus();
    }
    return;
  }

  event.preventDefault();

  const topic = document.querySelector('.topic');
  const indentation = topic && /python/i.test(topic.textContent) ? '    ' : '  ';
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  textarea.setRangeText(indentation, start, end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Watch answer textareas and connect their editing and submission handlers.
 */
function watchAnswerInputs() {
  const inputAnswerList = document.querySelectorAll('.input-answer');
  if (inputAnswerList.length < 1) return;

  outputAnswerArr = Array.from(inputAnswerList, (inputAnswer) => inputAnswer.value);

  inputAnswerList.forEach((inputAnswer, inputIndex) => {
    if (boundInputElements.has(inputAnswer)) return;
    boundInputElements.add(inputAnswer);

    inputAnswer.addEventListener('keydown', (event) => {
      if (handleMarkdownHotkeys(inputAnswer, event)) return;
      handleTabIndentation(inputAnswer, event);
    });

    handleInputSubmission(inputAnswer, inputIndex);
  });
}

/**
 * Track an answer textarea's value and submit it with `CTRL + ENTER`.
 */
function handleInputSubmission(inputAnswer, inputIndex) {
  inputAnswer.addEventListener('input', (event) => {
    const inputValue = event.currentTarget.value;

    // Store input data on AnkiDroid
    if (isAnkiDroid) {
      try {
        sessionStorage.setItem(inputIndex, inputValue);
      } catch (error) {
        console.log(`${error.name}: ${error.message}`);
      }
      // Store input data on AnkiPC, AnkiWeb, & AnkiIOS
    } else {
      outputAnswerArr.splice(inputIndex, 1, inputValue);
    }
  });

  // Return data on AnkiPC keypress.
  if (isAnkiPC) {
    inputAnswer.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') pycmd('ans');
    });

    // Return data on AnkiWeb keypress.
  } else if (isAnkiWeb) {
    inputAnswer.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        study.drawAnswer();
      }
    });
  }
}

/**
 * Render answer text without losing it.
 */
function getRenderedAnswerText(answerElement) {
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
function diffAnswerCharacters(cardAnswer, typedAnswer) {
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
  const dmp = new diff_match_patch();

  return dmp.diff_main(encode(cardAnswer), encode(typedAnswer)).map((diff) => [
    diff[0],
    Array.from(diff[1], (token) => {
      const index = token.charCodeAt(0);
      return characters[index < 0xd800 ? index : index - 0x800];
    }).join(''),
  ]);
}

/**
 * Convert common Markdown syntax to safe HTML for the submitted answer.
 */
function markdownToHtml(markdown) {
  const escapeHtml = (text) =>
    text.replace(/[&<>"']/g, (character) => {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return entities[character];
    });

  const renderInline = (text) => {
    const codeSpans = [];
    let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
      const token = `\u0000${codeSpans.length}\u0000`;
      codeSpans.push(`<code>${code}</code>`);
      return token;
    });

    html = html
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\u0000(\d+)\u0000/g, (_, index) => codeSpans[Number(index)]);

    return html;
  };

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let code = [];
  let inCodeBlock = false;
  const listStack = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
      paragraph = [];
    }
  };
  const closeTopList = () => {
    const list = listStack.pop();
    if (list) blocks.push(`</li></${list.type}>`);
  };
  const closeLists = () => {
    while (listStack.length) closeTopList();
  };
  const openList = (type, indent) => {
    blocks.push(`<${type}><li>`);
    listStack.push({ type, indent });
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushParagraph();
      closeLists();
      if (inCodeBlock) {
        blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    const listItem = line.match(/^([ \t]*)(?:([-+*])\s+|(\d+)\.\s+)(.*)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (!line.trim() || heading || listItem || quote) flushParagraph();

    if (!line.trim()) {
      closeLists();
    } else if (heading) {
      closeLists();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (listItem) {
      const indent = listItem[1].replace(/\t/g, '    ').length;
      const nextListType = listItem[3] ? 'ol' : 'ul';

      while (listStack.length && indent < listStack[listStack.length - 1].indent) {
        closeTopList();
      }

      const currentList = listStack[listStack.length - 1];
      if (!currentList) {
        openList(nextListType, indent);
      } else if (indent > currentList.indent) {
        // A more-indented item is nested inside the preceding list item.
        openList(nextListType, indent);
      } else if (indent === currentList.indent && currentList.type !== nextListType) {
        closeTopList();
        openList(nextListType, indent);
      } else {
        // Continue the current list at the same indentation.
        blocks.push('</li><li>');
      }
      blocks.push(renderInline(listItem[4]));
    } else if (quote) {
      closeLists();
      blocks.push(`<blockquote><p>${renderInline(quote[1])}</p></blockquote>`);
    } else {
      closeLists();
      paragraph.push(line);
    }
  }

  flushParagraph();
  closeLists();
  if (inCodeBlock) blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return blocks.join('\n').replace(/<li>\n/g, '<li>');
}

/**
 * Display .output-containers that contain visible content.
 */
function showOutputContainers() {
  const outputContainers = document.querySelectorAll('.output-container');
  if (outputContainers.length < 1) return;

  outputContainers.forEach((outputContainer, outputIndex) => {
    // Keep the existing result when initialization runs again on the same card.
    if (outputContainer.querySelector('.output-comparison-container')) return;

    const answerReference = outputContainer.querySelector('.answer-reference');
    const outputClozes = answerReference.querySelectorAll('.cloze');
    const outputAnswer = outputContainer.querySelector('.answer-submitted');
    const hasCompare = outputAnswer.getAttribute('data-compare');
    const bonusQuestion = outputContainer.querySelector('.is-bonus .question');
    const typeHint = outputContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);

    // Show primary .output-container by default.
    if (outputContainer.classList.contains('is-primary')) outputContainer.classList.add('active');

    // Show bonus output container if it has question content.
    if (hasVisibleContent(bonusQuestion)) outputContainer.classList.add('active');

    // For cloze answers, remove all text except the active cloze(s).
    if (outputClozes.length !== 0) {
      let clozeArr = [];
      outputClozes.forEach((cloze) => {
        clozeArr.push(cloze.innerText);
      });
      answerReference.innerText = clozeArr.join(', ');
    }

    // Run comparison when compare field is active
    if (hasCompare && hasCompare !== '') {
      const cardAnswer = getRenderedAnswerText(answerReference).replace(/\u00a0/g, ' ');

      // Hide output-cols when comparison is active.
      outputContainer.classList.add('has-comparison');

      // Create a comparison element if it doesn't exist.
      const comparisonContainerEl = document.createElement('div');
      const comparisonTitleEl = document.createElement('div');
      const comparisonPreEl = document.createElement('pre');

      comparisonContainerEl.classList.add('box', 'has-comparison');
      comparisonTitleEl.classList.add('title');
      comparisonPreEl.classList.add('comparison');

      if (outputContainer.classList.contains('is-primary')) {
        comparisonTitleEl.innerHTML = 'Answer Comparison';
      } else {
        comparisonTitleEl.innerHTML = 'Bonus Answer Comparison';
      }

      // Don't compare user's answer to card's answer if the user did NOT input an answer.
      if (
        (isAnkiDroid && sessionStorage === undefined) ||
        (isAnkiDroid && sessionStorage[outputIndex] === undefined) ||
        (!isAnkiDroid && outputAnswerArr === undefined) ||
        (!isAnkiDroid && outputAnswerArr[outputIndex] === undefined)
      ) {
        const cardAnswerCharArr = Array.from(cardAnswer);
        const cardAnswerComparisonArr = [];

        cardAnswerCharArr.forEach((cardAnswerChar) => {
          cardAnswerComparisonArr.push('<span class="typeMissed">' + cardAnswerChar + '</span>');
        });

        comparisonPreEl.innerHTML = '\n&darr;\n' + cardAnswerComparisonArr.join('');

        // Compare user's answer to card's answer when user did input an answer.
      } else {
        let typedAnswer;

        // Get typedAnswer value for AnkiDroid.
        if (isAnkiDroid) {
          // console.log(sessionStorage);
          // console.log(outputIndex);
          typedAnswer = sessionStorage[outputIndex];

          // Get typedAnswer value for AnkiPC, AnkiWeb, or AnkiIOS.
        } else {
          typedAnswer = outputAnswerArr[outputIndex];
        }

        const dmpArr = diffAnswerCharacters(cardAnswer, typedAnswer.replace(/\u00a0/g, ' '));
        const dmpMatchTypeAndCharArr = [];
        const typedComparisonArr = [];
        const cardComparisonArr = [];
        let lastCorrectMatchIndex = 0;

        // Create array of individual characters and their match type
        for (let i = 0; i < dmpArr.length; i++) {
          const dmpMatchType = dmpArr[i][0]; // -1, 0, or 1
          const dmpStr = dmpArr[i][1]; // example: 'plus'
          const dmpCharArr = Array.from(dmpStr); // example: ['p', 'l', 'u', 's']
          dmpCharArr.forEach((dmpChar) => {
            const dmpMatchTypeAndChar = [dmpMatchType, dmpChar]; // example: [-1, 'p']
            dmpMatchTypeAndCharArr.push(dmpMatchTypeAndChar);
          });
        }

        // Container characters depending on their match type and add to respective comparison array.
        for (let i = 0; i < dmpMatchTypeAndCharArr.length; i++) {
          const char = dmpMatchTypeAndCharArr[i][1]; // 'p'
          const charMatchType = dmpMatchTypeAndCharArr[i][0]; // -1, 0, or 1
          let containerTypedChar, containerCardChar;

          // Container characters missed (for card answer).
          if (charMatchType === -1) {
            containerCardChar = '<span class="typeMissed">' + char + '</span>';

            // Container characters correct (for both typed and card answers).
          } else if (charMatchType === 0) {
            // Insert dashes in typed answer if needed to align correct matches to card answer.
            if (typedComparisonArr.length < cardComparisonArr.length) {
              const dashesStr = '<span class="typeBad">-</span>';
              let dashesNeeded = cardComparisonArr.length - typedComparisonArr.length;
              let dashesAdded = 0;

              while (dashesNeeded > dashesAdded) {
                typedComparisonArr.splice(lastCorrectMatchIndex + 1, 0, dashesStr);
                dashesAdded++;
              }
            }

            containerTypedChar = '<span class="typeGood">' + char + '</span>';
            containerCardChar = '<span class="typeGood">' + char + '</span>';
            lastCorrectMatchIndex = typedComparisonArr.length;

            // Container characters wrong (for typed answer).
          } else if (charMatchType === 1) {
            containerTypedChar = '<span class="typeBad">' + char + '</span>';
          }

          // Add characters to comparison arrays.
          if (containerTypedChar !== undefined) {
            typedComparisonArr.push(containerTypedChar);
          }
          if (containerCardChar !== undefined) {
            cardComparisonArr.push(containerCardChar);
          }
        }

        // Render the completed comparison once, after processing all characters.
        comparisonPreEl.innerHTML = typedComparisonArr.join('') + '\n&darr;\n' + cardComparisonArr.join('');
      }

      comparisonContainerEl.append(comparisonTitleEl);
      comparisonContainerEl.append(comparisonPreEl);
      outputContainer.append(comparisonContainerEl);

      // Directly output user's answer if comparison is NOT active.
    } else {
      if (outputAnswer && !renderedPlainOutputs.has(outputAnswer)) {
        if (isAnkiDroid && sessionStorage !== undefined) {
          outputAnswer.innerHTML = markdownToHtml(sessionStorage[outputIndex] || '');
          renderedPlainOutputs.add(outputAnswer);
        } else if (!isAnkiDroid && outputAnswerArr !== undefined) {
          outputAnswer.innerHTML = markdownToHtml(outputAnswerArr[outputIndex] || '');
          renderedPlainOutputs.add(outputAnswer);
        }
      }
    }
  });

  // Clear sessionStorage for next card on AnkiDroid
  if (isAnkiDroid) {
    sessionStorage.clear();
  }
}

/**
 * Display .notes-containers that contain visible content.
 */
function showNotes() {
  const notesContainers = document.querySelectorAll('.notes-container');
  if (notesContainers.length < 1) return;

  notesContainers.forEach((notesContainer) => {
    const notesContent = notesContainer.querySelector('.content');
    // Show notes if there is visible note content.
    if (hasVisibleContent(notesContent)) notesContainer.classList.add('active');
  });
}

/**
 * Modify the AnkiWeb layout.
 */
function modifyAnkiWeb() {
  if (isAnkiWeb) {
    const leftStudyMenu = document.getElementById('leftStudyMenu');
    const rightStudyMenu = document.getElementById('rightStudyMenu');
    const studyMenuWrap = document.getElementById('study-menu-wrap');
    // Create and add #study-menu-wrap element if it doesn't already exist.
    if (leftStudyMenu !== null && studyMenuWrap === null) {
      const studyMenuParent = leftStudyMenu.parentNode;
      const menuWrap = document.createElement('div');
      menuWrap.id = 'study-menu-wrap';
      menuWrap.append(leftStudyMenu);
      menuWrap.append(rightStudyMenu);
      studyMenuParent.prepend(menuWrap);
    }
  }
}


/* Standalone answer code syntax highlighting. */

const syntaxLanguageAliases = [
  [/\bpython\b|\bpy\b/i, 'python'],
  [/\bjavascript\b|\bjs\b|\bnode(?:\.js)?\b/i, 'javascript'],
  [/\btypescript\b|\bts\b/i, 'typescript'],
  [/c\+\+|\bcpp\b/i, 'cpp'],
  [/(?:^|\s)c#(?:\s|$)|\bcsharp\b/i, 'csharp'],
  [/\bjava\b/i, 'java'],
  [/\bsql\b/i, 'sql'],
  [/\bbash\b|\bshell\b|\bsh\b/i, 'bash'],
  [/\bjson\b/i, 'json'],
  [/\bruby\b|\brb\b/i, 'ruby'],
  [/\bgolang\b|\bgo\b/i, 'go'],
  [/\brust\b|\brs\b/i, 'rust'],
  [/\bphp\b/i, 'php'],
  [/^\s*c\s*$/i, 'c'],
];

const syntaxLanguageRules = {
  python: {
    comments: '#[^\\n]*',
    keywords:
      'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case',
    builtins:
      'abs all any bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval filter float format frozenset getattr hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip',
  },
  javascript: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield true false null undefined',
    builtins:
      'Array BigInt Boolean Date Error Function JSON Map Math Number Object Promise Proxy Reflect RegExp Set String Symbol WeakMap WeakSet console document globalThis window',
  },
  typescript: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract any as asserts async await boolean break case catch class const constructor continue declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw try type typeof undefined unique unknown var void while with yield',
    builtins: 'Array Boolean Date Error Function Map Math Number Object Promise Record RegExp Set String Symbol WeakMap WeakSet console document window',
  },
  java: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract assert boolean break byte case catch char class const continue default do double else enum exports extends final finally float for if implements import instanceof int interface long module native new opens package permits private protected provides public record requires return short static strictfp super switch synchronized this throw throws to transient try uses void volatile while var yield true false null',
    builtins: 'System String Integer Boolean Character Double Float Long Math Object Runnable Runtime Scanner',
  },
  c: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Complex _Imaginary',
    builtins: 'FILE size_t NULL printf fprintf sprintf scanf malloc calloc realloc free strlen strcmp strcpy',
  },
  cpp: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'alignas alignof asm auto bool break case catch char class const constexpr continue default delete do double else enum explicit export extern false float for friend goto if inline int long namespace new noexcept nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while',
    builtins: 'std cout cin cerr endl string vector map unordered_map set unique_ptr shared_ptr size_t',
  },
  csharp: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract as async await bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while var',
    builtins: 'Console Convert DateTime Dictionary List Math String Task',
  },
  sql: {
    comments: '--[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'add all alter as asc between by case cast check column constraint create cross current_date current_time database default delete desc distinct drop else end exists foreign from full group having in index inner insert into is join key left like limit not null offset on or order outer primary references right row select set table then transaction union unique update use using values view when where with',
    builtins: 'avg count max min sum coalesce concat lower round upper',
  },
  bash: {
    comments: '#[^\\n]*',
    keywords: 'case do done elif else esac fi for function if in select then until while time coproc',
    builtins: 'cd echo eval exec exit export printf pwd read set shift source test unset',
  },
  json: { comments: '(?!)', keywords: 'true false null', builtins: '' },
  ruby: {
    comments: '#[^\\n]*',
    keywords:
      'alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield',
    builtins: 'Array Hash Integer Kernel Math Module Object Range String Symbol',
  },
  go: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr true false iota nil',
    builtins: 'append cap close complex copy delete imag len make new panic print println real recover',
  },
  rust: {
    comments: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type union unsafe use where while bool char str i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64',
    builtins: 'Some None Ok Err Vec String Box Option Result',
  },
  php: {
    comments: '//[^\\n]*|#[^\\n]*|/\\*[\\s\\S]*?\\*/',
    keywords:
      'abstract and array as break callable case catch class clone const continue declare default do else elseif empty endfor endforeach endif endswitch endwhile eval exit extends final finally fn for foreach function global goto if implements include include_once instanceof insteadof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while xor yield true false null',
    builtins: 'count echo isset strlen array_map in_array print_r var_dump',
  },
};

function getSyntaxLanguage(topicText) {
  const topic = (topicText || '').trim();
  for (const [pattern, language] of syntaxLanguageAliases) {
    if (pattern.test(topic)) return language;
  }
  return null;
}

function escapeSyntaxText(text) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

function highlightCodeText(codeText, language) {
  const rules = syntaxLanguageRules[language];
  const stringPattern =
    "\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?'''|`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'";
  const tokenPattern = new RegExp(
    `(${rules.comments})|(${stringPattern})|(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)|([A-Za-z_$][\\w$]*)|([+\\-*/%=<>!&|^~]+)|([{}()[\\].,:;])`,
    'g'
  );
  const keywords = new Set(rules.keywords.split(/\s+/));
  const builtins = new Set(rules.builtins.split(/\s+/));
  const pieces = [];
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(codeText)) !== null) {
    pieces.push(escapeSyntaxText(codeText.slice(cursor, match.index)));
    const token = match[0];
    let tokenClass = '';

    if (match[1]) tokenClass = 'c1';
    else if (match[2]) tokenClass = 's';
    else if (match[3]) tokenClass = 'm';
    else if (match[4]) {
      if (keywords.has(token)) tokenClass = 'k';
      else if (builtins.has(token)) tokenClass = 'nb';
      else if (/^\s*class\s+$/.test(codeText.slice(Math.max(0, match.index - 12), match.index))) {
        tokenClass = 'nc';
      } else if (/^\s*(?:async\s+)?def\s+$/.test(codeText.slice(Math.max(0, match.index - 16), match.index))) {
        tokenClass = 'nf';
      } else if (/^\s*\(/.test(codeText.slice(match.index + token.length))) {
        tokenClass = 'nf';
      }
    } else if (match[5]) tokenClass = 'o';
    else if (match[6]) tokenClass = 'p';

    const escapedToken = escapeSyntaxText(token);
    pieces.push(tokenClass ? `<span class="${tokenClass}">${escapedToken}</span>` : escapedToken);
    cursor = tokenPattern.lastIndex;
  }

  pieces.push(escapeSyntaxText(codeText.slice(cursor)));
  return pieces.join('');
}

function highlightSubmittedCode(container, topicText) {
  const language = getSyntaxLanguage(topicText);
  if (!language) return;

  container.querySelectorAll('pre > code').forEach((code) => {
    if (code.dataset.syntaxHighlighted === 'true') return;
    code.innerHTML = highlightCodeText(code.textContent, language);
    code.classList.add('shigeSyntax', `language-${language}`);
    code.dataset.syntaxHighlighted = 'true';
  });
}


function watchSubmittedCodeBlocks() {
  const highlightCode = (code) => {
    if (!(code instanceof Element) || code.dataset.syntaxHighlighted === 'true') return;
    if (!code.matches('pre > code')) return;

    const topic = document.querySelector('.topic');
    const language = getSyntaxLanguage(topic ? topic.textContent : '');
    if (!language) return;

    code.innerHTML = highlightCodeText(code.textContent, language);
    code.classList.add('shigeSyntax', `language-${language}`);
    code.dataset.syntaxHighlighted = 'true';
  };

  const scan = (node) => {
    if (!(node instanceof Element)) return;
    highlightCode(node);
    node.querySelectorAll('pre > code').forEach(highlightCode);
  };

  document.querySelectorAll('pre > code').forEach(highlightCode);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
  }).observe(document.body, { childList: true, subtree: true });
}

watchSubmittedCodeBlocks();
