import { isAnkiDroid, isAnkiPC, isAnkiWeb } from '../runtime/platform.js';
import { state } from '../runtime/state.js';
import { handleMarkdownHotkeys } from './markdown-shortcuts.js';
import { handleTabIndentation } from './tab-navigation.js';

/**
 * Watch answer textareas and connect their editing and submission handlers.
 */
export function watchAnswerInputs() {
  const inputAnswerList = document.querySelectorAll('.question-input');
  if (inputAnswerList.length < 1) return;

  state.outputAnswers = Array.from(inputAnswerList, (inputAnswer) => inputAnswer.value);

  inputAnswerList.forEach((inputAnswer, inputIndex) => {
    if (state.boundInputs.has(inputAnswer)) return;
    state.boundInputs.add(inputAnswer);

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
export function handleInputSubmission(inputAnswer, inputIndex) {
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
      state.outputAnswers.splice(inputIndex, 1, inputValue);
    }
  });

  // Return data on AnkiPC keypress.
  if (isAnkiPC) {
    inputAnswer.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') globalThis.pycmd('ans');
    });

    // Return data on AnkiWeb keypress.
  } else if (isAnkiWeb) {
    inputAnswer.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        globalThis.study.drawAnswer();
      }
    });
  }
}
