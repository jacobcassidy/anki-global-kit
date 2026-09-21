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
  submitInputs();
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
 * Submit input answers with hotkey `CTRL + ENTER`.
 */
function submitInputs() {
  const inputAnswerList = document.querySelectorAll('.input-answer');
  if (inputAnswerList.length < 1) return;

  outputAnswerArr = Array.from(inputAnswerList, (inputAnswer) => inputAnswer.value);

  inputAnswerList.forEach((inputAnswer, inputIndex) => {
    if (boundInputElements.has(inputAnswer)) return;
    boundInputElements.add(inputAnswer);

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
  });
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
          outputAnswer.textContent = sessionStorage[outputIndex];
          renderedPlainOutputs.add(outputAnswer);
        } else if (!isAnkiDroid && outputAnswerArr !== undefined) {
          outputAnswer.textContent = outputAnswerArr[outputIndex];
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
